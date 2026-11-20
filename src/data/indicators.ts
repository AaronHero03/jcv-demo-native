import rawSummary from './raw/bienestar_jovenes_2026_resumen.json';

export type IndicatorCategory = 'Bienestar' | 'Educación' | 'Tiempo y Rutina';

export interface IndicatorSeriesPoint {
  code: number;
  label: string;
  count: number;
  pct: number;
}

export interface MunicipalityResult {
  municipality: string;
  n: number;
  average: number | null;
  positivePct: number | null;
}

export interface Indicator {
  id: string;
  title: string;
  category: IndicatorCategory;
  summary: string;
  question: string;
  source: string;
  period: string;
  sampleSize: number;
  average: number;
  positivePct: number;
  unit: string;
  series: IndicatorSeriesPoint[];
  byMunicipality: MunicipalityResult[];
}

interface RawSummaryDataset {
  dataset: string;
  totalRespondents: number;
  municipalities: string[];
  indicators: Indicator[];
}

const dataset = rawSummary as RawSummaryDataset;

export const datasetMeta = {
  name: dataset.dataset,
  totalRespondents: dataset.totalRespondents,
};

export const municipalities: string[] = dataset.municipalities;

export const indicators: Indicator[] = dataset.indicators;

export const indicatorCategories: ('Todas' | IndicatorCategory)[] = [
  'Todas',
  'Bienestar',
  'Educación',
  'Tiempo y Rutina',
];

export function getIndicatorById(id?: string): Indicator {
  return indicators.find((item) => item.id === id) ?? indicators[0];
}

export function getIndicatorsByCategory(category: 'Todas' | IndicatorCategory): Indicator[] {
  if (category === 'Todas') return indicators;
  return indicators.filter((item) => item.category === category);
}

export function searchIndicators(query: string, category: 'Todas' | IndicatorCategory = 'Todas', source: Indicator[] = indicators): Indicator[] {
  const base = category === 'Todas' ? source : source.filter(item => item.category === category);
  const q = query.trim().toLowerCase();
  if (!q) return base;
  return base.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      item.question.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
  );
}
