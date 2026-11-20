/**
 * Sistema de filtrado (Genaro): tipos y LISTA BLANCA de filtros permitidos.
 *
 * Seguridad (MASVS-CODE-4 / M4): la app nunca arma SQL. Solo envía a las funciones
 * parametrizadas de Supabase valores que existan en esta lista; cualquier otro valor
 * (p. ej. un parámetro de navegación manipulado) se descarta y se usa el filtro por defecto.
 */

export type DatasetSource = 'amg_2026' | 'tec_2026';
export type FilterType = 'general' | 'gender' | 'age_group' | 'estrato';

export interface IndicatorFilter {
  source: DatasetSource;
  filterType: FilterType;
  filterValue: string;
}

export const DATASET_SOURCES: readonly DatasetSource[] = ['amg_2026', 'tec_2026'];
export const FILTER_TYPES: readonly FilterType[] = ['general', 'gender', 'age_group', 'estrato'];
export const GROUP_FILTER_TYPES: readonly Exclude<FilterType, 'general'>[] = ['gender', 'age_group', 'estrato'];

export const FILTER_VALUES: Record<FilterType, readonly string[]> = {
  general: ['all'],
  gender: ['Hombre', 'Mujer'],
  age_group: ['15-19', '20-24', '25-29'],
  estrato: ['Alto', 'Medio', 'Bajo'],
};

export const SOURCE_LABELS: Record<DatasetSource, string> = {
  amg_2026: 'AMG 2026',
  tec_2026: 'Encuesta Tec',
};

export const FILTER_TYPE_LABELS: Record<FilterType, string> = {
  general: 'Todos',
  gender: 'Género',
  age_group: 'Edad',
  estrato: 'Estrato',
};

const VALUE_LABELS: Record<string, string> = {
  all: 'Todos',
  '15-19': '15 a 19 años',
  '20-24': '20 a 24 años',
  '25-29': '25 a 29 años',
  Alto: 'Estrato alto',
  Medio: 'Estrato medio',
  Bajo: 'Estrato bajo',
};

export const DEFAULT_FILTER: IndicatorFilter = {
  source: 'amg_2026',
  filterType: 'general',
  filterValue: 'all',
};

/** Muestra mínima para considerar un corte como confiable (por debajo se muestra advertencia). */
export const LOW_SAMPLE_THRESHOLD = 30;

export function filterValueLabel(value: string): string {
  return VALUE_LABELS[value] ?? value;
}

export function isValidFilter(value: unknown): value is IndicatorFilter {
  if (!value || typeof value !== 'object') return false;
  const f = value as Record<string, unknown>;
  if (typeof f.source !== 'string' || !DATASET_SOURCES.includes(f.source as DatasetSource)) return false;
  if (typeof f.filterType !== 'string' || !FILTER_TYPES.includes(f.filterType as FilterType)) return false;
  return typeof f.filterValue === 'string' && FILTER_VALUES[f.filterType as FilterType].includes(f.filterValue);
}

/** Devuelve el filtro si es válido; si no, el filtro por defecto (nunca propaga valores desconocidos). */
export function sanitizeFilter(value: unknown): IndicatorFilter {
  return isValidFilter(value) ? { ...value } : { ...DEFAULT_FILTER };
}

/** Cambia el tipo de corte y selecciona automáticamente su primer valor válido. */
export function withFilterType(filter: IndicatorFilter, filterType: FilterType): IndicatorFilter {
  return { ...filter, filterType, filterValue: FILTER_VALUES[filterType][0] };
}

export function filterKey(filter: IndicatorFilter): string {
  return `${filter.source}|${filter.filterType}|${filter.filterValue}`;
}

export function describeFilter(filter: IndicatorFilter): string {
  const group = filter.filterType === 'general' ? 'Todos los jóvenes' : filterValueLabel(filter.filterValue);
  return `${SOURCE_LABELS[filter.source]} · ${group}`;
}
