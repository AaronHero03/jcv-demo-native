import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRoute, type ParamListBase, type RouteProp } from '@react-navigation/native';
import BarChart from '../components/BarChart';
import DataStatusBanner from '../components/DataStatusBanner';
import { Chip } from '../components/FilterBar';
import {
  DATASET_SOURCES,
  FILTER_TYPE_LABELS,
  FILTER_TYPES,
  FILTER_VALUES,
  filterValueLabel,
  GROUP_FILTER_TYPES,
  sanitizeFilter,
  SOURCE_LABELS,
  type DatasetSource,
  type FilterType,
  type IndicatorFilter,
} from '../data/filters';
import { getIndicatorById, indicators } from '../data/indicators';
import { fetchComparison, type ComparisonResult, type IndicatorStats, type StatsResult } from '../data/indicatorSummaries';
import { useIndicatorStats } from '../hooks/useIndicatorStats';
import { colors, tabTheme, type TabId } from '../theme/colors';

type CompareMode = 'datasets' | 'groups';
type GroupType = Exclude<FilterType, 'general'>;

const LIVE_REFRESH_MS = 30_000;
const COLOR_A = colors.navy;
const COLOR_B = colors.orange;

export default function CompareScreen() {
  const route = useRoute<RouteProp<ParamListBase>>();
  const params = route.params as
    | { tab?: TabId; indicatorId?: string; mode?: unknown; filter?: unknown }
    | undefined;
  const theme = tabTheme[params?.tab ?? 'explorar'];
  const initialFilter = sanitizeFilter(params?.filter);

  const [mode, setMode] = useState<CompareMode>(params?.mode === 'groups' ? 'groups' : 'datasets');
  const [indicatorId, setIndicatorId] = useState(() => getIndicatorById(params?.indicatorId).id);
  const indicator = getIndicatorById(indicatorId);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.segment}>
        {(
          [
            ['datasets', 'AMG 2026 vs. Tec'],
            ['groups', 'Entre grupos'],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setMode(value)}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === value }}
            style={[styles.segmentItem, mode === value && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentText, mode === value && styles.segmentTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>1. Elige un indicador</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {indicators.map((item) => (
          <Chip
            key={item.id}
            label={item.title}
            active={item.id === indicator.id}
            onPress={() => setIndicatorId(item.id)}
            accentColor={theme.color}
            accentInk={theme.ink}
          />
        ))}
      </ScrollView>

      {mode === 'datasets' ? (
        <DatasetsComparison indicatorId={indicator.id} initialFilter={initialFilter} />
      ) : (
        <GroupsComparison indicatorId={indicator.id} initialFilter={initialFilter} />
      )}
    </ScrollView>
  );
}

/* ───────────── Modo 1: AMG 2026 vs. Encuesta Tec (en vivo) ───────────── */

function DatasetsComparison({ indicatorId, initialFilter }: { indicatorId: string; initialFilter: IndicatorFilter }) {
  const [filterType, setFilterType] = useState<FilterType>(initialFilter.filterType);
  const [filterValue, setFilterValue] = useState(initialFilter.filterValue);
  const [tick, setTick] = useState(0);
  const requestKey = `${indicatorId}|${filterType}|${filterValue}|${tick}`;
  const [state, setState] = useState<{ requestKey: string; data: ComparisonResult; at: Date } | null>(null);

  useEffect(() => {
    let active = true;
    fetchComparison(indicatorId, filterType, filterValue).then((data) => {
      if (active) setState({ requestKey, data, at: new Date() });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const loading = state?.requestKey !== requestKey;
  const data = state?.data ?? null;
  const updatedAt = state?.at ?? null;

  // "Tiempo real": mientras la pantalla está visible se vuelve a consultar cada 30 s
  // para reflejar respuestas nuevas de la Encuesta Tec.
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => setTick((t) => t + 1), LIVE_REFRESH_MS);
      return () => clearInterval(timer);
    }, [])
  );

  const amg = data?.amg.stats ?? null;
  const tec = data?.tec.stats ?? null;
  const tecHasData = Boolean(tec && tec.n > 0);

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>2. Mismo grupo en ambos estudios</Text>
        <ChipLine
          options={FILTER_TYPES.map((t) => ({ value: t, label: FILTER_TYPE_LABELS[t] }))}
          selected={filterType}
          onSelect={(t) => {
            setFilterType(t);
            setFilterValue(FILTER_VALUES[t][0]);
          }}
        />
        {filterType !== 'general' && (
          <ChipLine
            options={FILTER_VALUES[filterType].map((v) => ({ value: v, label: filterValueLabel(v) }))}
            selected={filterValue}
            onSelect={setFilterValue}
            small
          />
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Distribución de respuestas</Text>
          <Pressable onPress={() => setTick((t) => t + 1)} accessibilityRole="button" hitSlop={8}>
            {loading ? <ActivityIndicator size="small" color={colors.navy} /> : <Text style={styles.refresh}>↻ Actualizar</Text>}
          </Pressable>
        </View>
        <Legend a={`AMG 2026${amg ? ` (n=${amg.n})` : ''}`} b={`Encuesta Tec${tec ? ` (n=${tec.n})` : ''}`} />

        {data && <SideStatus label="AMG 2026" result={data.amg} />}
        {data && <SideStatus label="Encuesta Tec" result={data.tec} />}
        {data && data.tec.origin === 'remote' && !tecHasData && (
          <Text style={styles.note}>
            La Encuesta Tec aún no tiene respuestas para este indicador y grupo (o el indicador no forma parte de
            esa encuesta). Se muestra solo AMG 2026.
          </Text>
        )}

        <DistributionChart a={amg} b={tecHasData ? tec : null} />
        <PositiveSummary labelA="AMG 2026" labelB="Encuesta Tec" a={amg} b={tecHasData ? tec : null} />
        {updatedAt && (
          <Text style={styles.updated}>
            Última consulta: {updatedAt.toLocaleTimeString()} · se actualiza cada 30 s mientras ves esta pantalla
          </Text>
        )}
      </View>
    </>
  );
}

/* ───────────── Modo 2: comparación entre grupos de un mismo estudio ───────────── */

function GroupsComparison({ indicatorId, initialFilter }: { indicatorId: string; initialFilter: IndicatorFilter }) {
  const [source, setSource] = useState<DatasetSource>(initialFilter.source);
  const [groupType, setGroupType] = useState<GroupType>(
    initialFilter.filterType === 'general' ? 'gender' : initialFilter.filterType
  );
  const values = FILTER_VALUES[groupType];
  const [valueA, setValueA] = useState(values[0]);
  const [valueB, setValueB] = useState(values[values.length - 1]);

  const filterA: IndicatorFilter = { source, filterType: groupType, filterValue: valueA };
  const filterB: IndicatorFilter = { source, filterType: groupType, filterValue: valueB };
  const a = useIndicatorStats(indicatorId, filterA);
  const b = useIndicatorStats(indicatorId, filterB);
  const statsA = a.result.stats && a.result.stats.n > 0 ? a.result.stats : null;
  const statsB = b.result.stats && b.result.stats.n > 0 ? b.result.stats : null;

  const changeGroupType = (next: GroupType) => {
    const nextValues = FILTER_VALUES[next];
    setGroupType(next);
    setValueA(nextValues[0]);
    setValueB(nextValues[nextValues.length - 1]);
  };

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>2. Estudio</Text>
        <ChipLine
          options={DATASET_SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] }))}
          selected={source}
          onSelect={setSource}
        />
        <Text style={styles.sectionTitle}>3. Tipo de grupo</Text>
        <ChipLine
          options={GROUP_FILTER_TYPES.map((t) => ({ value: t, label: FILTER_TYPE_LABELS[t] }))}
          selected={groupType}
          onSelect={changeGroupType}
        />
        <Text style={styles.sectionTitle}>Grupo A · azul</Text>
        <ChipLine
          options={values.map((v) => ({ value: v, label: filterValueLabel(v) }))}
          selected={valueA}
          onSelect={setValueA}
          small
          color={COLOR_A}
        />
        <Text style={styles.sectionTitle}>Grupo B · naranja</Text>
        <ChipLine
          options={values.map((v) => ({ value: v, label: filterValueLabel(v) }))}
          selected={valueB}
          onSelect={setValueB}
          small
          color={COLOR_B}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Distribución de respuestas · {SOURCE_LABELS[source]}</Text>
        <Legend
          a={`${filterValueLabel(valueA)}${statsA ? ` (n=${statsA.n})` : ''}`}
          b={`${filterValueLabel(valueB)}${statsB ? ` (n=${statsB.n})` : ''}`}
        />
        <SideStatus label={filterValueLabel(valueA)} result={a.result} loading={a.loading} />
        <SideStatus label={filterValueLabel(valueB)} result={b.result} loading={b.loading} />
        {valueA === valueB && <Text style={styles.note}>Elige dos grupos distintos para comparar.</Text>}
        <DistributionChart a={statsA} b={statsB} />
        <PositiveSummary labelA={filterValueLabel(valueA)} labelB={filterValueLabel(valueB)} a={statsA} b={statsB} />
      </View>
    </>
  );
}

/* ───────────── Piezas compartidas ───────────── */

function ChipLine<T extends string>({
  options,
  selected,
  onSelect,
  small,
  color = colors.navy,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  small?: boolean;
  color?: string;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((o) => (
        <Chip
          key={o.value}
          label={o.label}
          active={o.value === selected}
          onPress={() => onSelect(o.value)}
          accentColor={color}
          accentInk={color === COLOR_B ? colors.navy : colors.white}
          small={small}
        />
      ))}
    </View>
  );
}

function Legend({ a, b }: { a: string; b: string }) {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: COLOR_A }]} />
        <Text style={styles.legendText}>{a}</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: COLOR_B }]} />
        <Text style={styles.legendText}>{b}</Text>
      </View>
    </View>
  );
}

/** Solo muestra avisos relevantes (sin conexión, muestra pequeña, sin datos) para cada lado. */
function SideStatus({ label, result, loading }: { label: string; result: StatsResult; loading?: boolean }) {
  const n = result.stats?.n ?? null;
  const relevant = loading || result.origin === 'unavailable' || (n !== null && n < 30) || result.reason === 'offline';
  if (!relevant) return null;
  return (
    <View style={styles.sideStatus}>
      <Text style={styles.sideLabel}>{label}</Text>
      <DataStatusBanner result={result} loading={loading} sampleSize={n} />
    </View>
  );
}

function DistributionChart({ a, b }: { a: IndicatorStats | null; b: IndicatorStats | null }) {
  const base = a ?? b;
  if (!base) return <Text style={styles.note}>No hay datos para graficar con esta selección.</Text>;
  return (
    <BarChart
      items={base.series.map((option) => {
        const pa = a?.series.find((s) => s.code === option.code)?.pct;
        const pb = b?.series.find((s) => s.code === option.code)?.pct;
        return {
          label: option.label,
          value: pa ?? 0,
          valueLabel: pa !== undefined ? `${pa}%` : '—',
          secondaryValue: b ? (pb ?? 0) : undefined,
          secondaryLabel: pb !== undefined ? `${pb}%` : '—',
        };
      })}
      primaryColor={a ? COLOR_A : COLOR_B}
      secondaryColor={COLOR_B}
    />
  );
}

function PositiveSummary({
  labelA,
  labelB,
  a,
  b,
}: {
  labelA: string;
  labelB: string;
  a: IndicatorStats | null;
  b: IndicatorStats | null;
}) {
  const pa = a?.positivePct ?? null;
  const pb = b?.positivePct ?? null;
  const diff = pa !== null && pb !== null ? Math.round((pa - pb) * 10) / 10 : null;
  return (
    <View style={styles.summary}>
      <SummaryRow label={`% positivo · ${labelA}`} value={pa !== null ? `${pa}%` : 'Sin dato'} />
      <SummaryRow label={`% positivo · ${labelB}`} value={pb !== null ? `${pb}%` : 'Sin dato'} />
      <SummaryRow
        label="Diferencia (A − B)"
        value={diff !== null ? `${diff > 0 ? '+' : ''}${diff} pts` : 'No disponible'}
        strong
      />
    </View>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  segmentItemActive: { backgroundColor: colors.navy },
  segmentText: { fontSize: 13, fontWeight: '800', color: colors.navy },
  segmentTextActive: { color: colors.white },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.navy },
  chips: { gap: 8, paddingVertical: 2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.navy, flexShrink: 1 },
  refresh: { fontSize: 13, fontWeight: '800', color: colors.navy },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '700', color: colors.navy },
  sideStatus: { gap: 4 },
  sideLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, textTransform: 'uppercase' },
  note: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  updated: { fontSize: 11, color: colors.muted },
  summary: { paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEF1F4', gap: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  summaryLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.muted },
  summaryValue: { fontSize: 14, fontWeight: '800', color: colors.navy },
  summaryStrong: { fontSize: 15 },
});
