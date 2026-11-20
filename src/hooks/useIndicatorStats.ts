import { useCallback, useEffect, useMemo, useState } from 'react';
import { filterKey, type IndicatorFilter } from '../data/filters';
import { fetchIndicatorStats, getInitialResult, type StatsResult } from '../data/indicatorSummaries';

/**
 * Un indicador con filtro: muestra al instante el respaldo local y luego lo reemplaza
 * con la respuesta de Supabase cuando llega. `loading` se deriva comparando la llave de la
 * última respuesta con la de la petición actual (sin setState síncrono dentro del efecto).
 */
export function useIndicatorStats(indicatorId: string, filter: IndicatorFilter) {
  const baseKey = `${indicatorId}|${filterKey(filter)}`;
  const [tick, setTick] = useState(0);
  const requestKey = `${baseKey}|${tick}`;
  const [state, setState] = useState<{ baseKey: string; requestKey: string; result: StatsResult } | null>(null);

  useEffect(() => {
    let active = true;
    fetchIndicatorStats(indicatorId, filter, { force: tick > 0 }).then((result) => {
      if (active) setState({ baseKey, requestKey, result });
    });
    return () => {
      active = false;
    };
    // `requestKey` resume indicador + filtro + reintento; el objeto `filter` cambia de identidad en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const initial = useMemo(
    () => getInitialResult(indicatorId, filter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseKey]
  );
  const result = state && state.baseKey === baseKey ? state.result : initial;
  const loading = state?.requestKey !== requestKey;
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { result, loading, refresh };
}

/** Varios indicadores con el mismo filtro (listas de Inicio y Explorar). */
export function useIndicatorsStats(indicatorIds: string[], filter: IndicatorFilter) {
  const requestKey = `${indicatorIds.join(',')}|${filterKey(filter)}`;
  const [state, setState] = useState<{ requestKey: string; results: Record<string, StatsResult> } | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all(indicatorIds.map((id) => fetchIndicatorStats(id, filter).then((r) => [id, r] as const))).then(
      (entries) => {
        if (active) setState({ requestKey, results: Object.fromEntries(entries) });
      }
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const initial = useMemo(
    () => Object.fromEntries(indicatorIds.map((id) => [id, getInitialResult(id, filter)])) as Record<string, StatsResult>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestKey]
  );
  const loading = state?.requestKey !== requestKey;
  return { results: loading ? initial : state.results, loading };
}

/** Origen global de una lista: en vivo si alguno llegó de Supabase. */
export function summarizeOrigin(results: StatsResult[]): StatsResult {
  return (
    results.find((r) => r.origin === 'remote') ??
    results.find((r) => r.origin === 'offline') ??
    results[0] ?? { stats: null, origin: 'unavailable', reason: 'offline' }
  );
}
