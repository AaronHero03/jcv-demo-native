/**
 * Capa de datos de resúmenes filtrados (Genaro).
 *
 * 1. Intenta consultar Supabase con las funciones parametrizadas de Carlos:
 *    - get_filtered_indicator(p_indicator_id, p_dataset_source, p_filter_type, p_filter_value)
 *    - compare_datasets(p_indicator_id, p_filter_type, p_filter_value)
 * 2. Si no hay conexión (o Supabase no está configurado), usa el respaldo local AMG 2026
 *    (`raw/amg_2026_filtros_offline.json`), generado del CSV original sin ponderar.
 * 3. La encuesta Tec es en vivo: sin conexión se informa que no está disponible.
 *
 * Todo lo que llega del servidor se valida antes de usarse (no se confía en la forma de la respuesta).
 * Contrato esperado de las RPC: ver docs/genaro/contrato-datos.md.
 */
import offlineBreakdowns from './raw/amg_2026_filtros_offline.json';
import {
  filterKey,
  isValidFilter,
  type DatasetSource,
  type FilterType,
  type IndicatorFilter,
} from './filters';
import { callRpc, isSupabaseConfigured, RemoteError } from '../services/supabaseRest';

export interface OptionResult {
  code: number;
  label: string;
  count: number;
  pct: number;
  isPositive: boolean;
}

export interface IndicatorStats {
  indicatorId: string;
  filter: IndicatorFilter;
  series: OptionResult[];
  n: number;
  average: number | null;
  positivePct: number | null;
}

/** remote = Supabase en vivo · offline = respaldo local · unavailable = sin datos que mostrar. */
export type DataOrigin = 'remote' | 'offline' | 'unavailable';
export type UnavailableReason = 'not-configured' | 'offline' | 'tec-requires-connection' | 'invalid-filter';

export interface StatsResult {
  stats: IndicatorStats | null;
  origin: DataOrigin;
  /** Por qué no se usó Supabase (si aplica). */
  reason?: UnavailableReason;
}

export interface ComparisonResult {
  amg: StatsResult;
  tec: StatsResult;
}

interface OfflineRow {
  dataset_source: string;
  indicator_id: string;
  filter_type: string;
  filter_value: string;
  code: number;
  label: string;
  count: number;
  pct: number;
}

const offlineRows = (offlineBreakdowns as { rows: OfflineRow[] }).rows;
const POSITIVE_MIN_CODE = 4;
const REMOTE_CACHE_TTL_MS = 60_000;
const remoteCache = new Map<string, { at: number; value: StatsResult }>();

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** Calcula n, promedio (1–5) y % positivo (opciones 4–5) a partir de los conteos por opción. */
export function buildStats(indicatorId: string, filter: IndicatorFilter, options: OptionResult[]): IndicatorStats {
  const series = [...options].sort((a, b) => a.code - b.code);
  const n = series.reduce((acc, o) => acc + o.count, 0);
  const withPct = series.map((o) => ({ ...o, pct: n > 0 ? round((o.count * 100) / n, 1) : 0 }));
  const average = n > 0 ? round(series.reduce((acc, o) => acc + o.code * o.count, 0) / n, 2) : null;
  const positive = series.filter((o) => o.isPositive).reduce((acc, o) => acc + o.count, 0);
  return {
    indicatorId,
    filter,
    series: withPct,
    n,
    average,
    positivePct: n > 0 ? round((positive * 100) / n, 1) : null,
  };
}

/** Respaldo sin internet: solo existe para AMG 2026. */
export function getOfflineStats(indicatorId: string, filter: IndicatorFilter): IndicatorStats | null {
  if (filter.source !== 'amg_2026') return null;
  const rows = offlineRows.filter(
    (r) =>
      r.indicator_id === indicatorId &&
      r.filter_type === filter.filterType &&
      r.filter_value === filter.filterValue
  );
  if (rows.length === 0) return null;
  return buildStats(
    indicatorId,
    filter,
    rows.map((r) => ({ code: r.code, label: r.label, count: r.count, pct: r.pct, isPositive: r.code >= POSITIVE_MIN_CODE }))
  );
}

/** Resultado inmediato (sin red) para pintar la pantalla mientras llega Supabase. */
export function getInitialResult(indicatorId: string, filter: IndicatorFilter): StatsResult {
  const cached = remoteCache.get(`${indicatorId}|${filterKey(filter)}`);
  if (cached && Date.now() - cached.at < REMOTE_CACHE_TTL_MS) return cached.value;
  const stats = getOfflineStats(indicatorId, filter);
  return stats ? { stats, origin: 'offline' } : { stats: null, origin: 'unavailable', reason: 'tec-requires-connection' };
}

function toNumber(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/** Valida y normaliza filas de las RPC. Filas mal formadas se descartan. */
function parseOptionRows(payload: unknown): (OptionResult & { source?: DatasetSource })[] {
  if (!Array.isArray(payload)) throw new RemoteError('Respuesta RPC no es una lista', 'bad_response');
  const parsed: (OptionResult & { source?: DatasetSource })[] = [];
  for (const raw of payload) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const code = toNumber(row.code ?? row.option_code);
    const count = toNumber(row.count);
    const pct = toNumber(row.pct);
    const label = typeof row.label === 'string' ? row.label.slice(0, 120) : null;
    if (code === null || count === null || count < 0 || label === null) continue;
    const source =
      row.dataset_source === 'amg_2026' || row.dataset_source === 'tec_2026' ? row.dataset_source : undefined;
    parsed.push({
      code,
      label,
      count: Math.round(count),
      pct: pct ?? 0,
      isPositive: typeof row.is_positive === 'boolean' ? row.is_positive : code >= POSITIVE_MIN_CODE,
      source,
    });
  }
  return parsed;
}

function fallbackFor(indicatorId: string, filter: IndicatorFilter, error: unknown): StatsResult {
  const reason: UnavailableReason =
    error instanceof RemoteError && error.kind === 'not_configured' ? 'not-configured' : 'offline';
  const stats = getOfflineStats(indicatorId, filter);
  if (stats) return { stats, origin: 'offline', reason };
  return { stats: null, origin: 'unavailable', reason: filter.source === 'tec_2026' ? 'tec-requires-connection' : reason };
}

/** Consulta un indicador con filtro: Supabase primero, respaldo local si falla. */
export async function fetchIndicatorStats(
  indicatorId: string,
  filter: IndicatorFilter,
  options: { force?: boolean } = {}
): Promise<StatsResult> {
  if (!isValidFilter(filter)) return { stats: null, origin: 'unavailable', reason: 'invalid-filter' };
  const key = `${indicatorId}|${filterKey(filter)}`;
  const cached = remoteCache.get(key);
  if (!options.force && cached && Date.now() - cached.at < REMOTE_CACHE_TTL_MS) return cached.value;

  try {
    if (!isSupabaseConfigured()) throw new RemoteError('Supabase no configurado', 'not_configured');
    const payload = await callRpc('get_filtered_indicator', {
      p_indicator_id: indicatorId,
      p_dataset_source: filter.source,
      p_filter_type: filter.filterType,
      p_filter_value: filter.filterValue,
    });
    const value: StatsResult = { stats: buildStats(indicatorId, filter, parseOptionRows(payload)), origin: 'remote' };
    remoteCache.set(key, { at: Date.now(), value });
    return value;
  } catch (error) {
    return fallbackFor(indicatorId, filter, error);
  }
}

/** Comparativa AMG 2026 vs. Encuesta Tec para el mismo corte demográfico. */
export async function fetchComparison(
  indicatorId: string,
  filterType: FilterType,
  filterValue: string
): Promise<ComparisonResult> {
  const amgFilter: IndicatorFilter = { source: 'amg_2026', filterType, filterValue };
  const tecFilter: IndicatorFilter = { source: 'tec_2026', filterType, filterValue };
  if (!isValidFilter(amgFilter)) {
    const invalid: StatsResult = { stats: null, origin: 'unavailable', reason: 'invalid-filter' };
    return { amg: invalid, tec: invalid };
  }

  try {
    if (!isSupabaseConfigured()) throw new RemoteError('Supabase no configurado', 'not_configured');
    const rows = parseOptionRows(
      await callRpc('compare_datasets', {
        p_indicator_id: indicatorId,
        p_filter_type: filterType,
        p_filter_value: filterValue,
      })
    );
    const amgRows = rows.filter((r) => r.source === 'amg_2026');
    const tecRows = rows.filter((r) => r.source === 'tec_2026');
    return {
      // Si Supabase no trae AMG para ese corte, se completa con el respaldo local.
      amg: amgRows.length
        ? { stats: buildStats(indicatorId, amgFilter, amgRows), origin: 'remote' }
        : fallbackFor(indicatorId, amgFilter, new RemoteError('Sin filas AMG', 'bad_response')),
      tec: { stats: buildStats(indicatorId, tecFilter, tecRows), origin: 'remote' },
    };
  } catch (error) {
    return { amg: fallbackFor(indicatorId, amgFilter, error), tec: fallbackFor(indicatorId, tecFilter, error) };
  }
}

/** Convierte un resultado en la métrica compacta que muestran las tarjetas de indicador. */
export function toCardMetric(result: StatsResult): {
  positivePct: number | null;
  average: number | null;
  n: number;
  note?: string;
} {
  if (!result.stats) {
    return {
      positivePct: null,
      average: null,
      n: 0,
      note: result.reason === 'tec-requires-connection' ? 'Requiere conexión' : 'Sin datos',
    };
  }
  const { positivePct, average, n } = result.stats;
  return { positivePct, average, n, note: n === 0 ? 'Sin respuestas aún' : undefined };
}
