import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type ParamListBase, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BarChart from '../components/BarChart';
import DataStatusBanner from '../components/DataStatusBanner';
import FilterBar from '../components/FilterBar';
import NavRow from '../components/NavRow';
import { useAppState } from '../context/AppStateContext';
import { describeFilter, sanitizeFilter, type IndicatorFilter } from '../data/filters';
import { getIndicatorById } from '../data/indicators';
import { useIndicatorStats } from '../hooks/useIndicatorStats';
import { colors, tabTheme, type TabId } from '../theme/colors';

export default function IndicatorDetailScreen() {
  const route = useRoute<RouteProp<ParamListBase>>();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const params = route.params as { tab?: TabId; indicatorId?: string; filter?: unknown } | undefined;
  const tab = params?.tab ?? 'explorar';
  const theme = tabTheme[tab];
  const indicator = getIndicatorById(params?.indicatorId);
  // El filtro llega por parámetros de navegación: se valida contra la lista blanca antes de usarlo.
  const [filter, setFilter] = useState<IndicatorFilter>(() => sanitizeFilter(params?.filter));
  const { result, loading, refresh } = useIndicatorStats(indicator.id, filter);
  const { isFavorite, toggleFavorite } = useAppState();
  const fav = isFavorite(indicator.id);
  const stats = result.stats;
  const chartColor = theme.color === colors.yellow ? colors.navy : theme.color;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.headerCard, { backgroundColor: theme.color }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.category, { color: theme.ink }]}>{indicator.category}</Text>
          <Pressable
            onPress={() => toggleFavorite(indicator.id)}
            style={styles.favButton}
            accessibilityRole="button"
            accessibilityLabel={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          >
            <Text style={styles.favText}>{fav ? '⭐ Guardado' : '☆ Guardar'}</Text>
          </Pressable>
        </View>
        <Text style={[styles.title, { color: theme.ink }]}>{indicator.title}</Text>
        <View style={styles.kpiRow}>
          <Text style={[styles.kpiValue, { color: theme.ink }]}>
            {stats?.positivePct != null ? `${stats.positivePct}${indicator.unit}` : 'Sin dato'}
          </Text>
          {stats?.average != null && (
            <Text style={[styles.kpiSub, { color: theme.ink }]}>Promedio {stats.average} / 5</Text>
          )}
        </View>
        <Text style={[styles.kpiCaption, { color: theme.ink }]}>
          {describeFilter(filter)} · respuestas positivas (4–5)
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Filtrar resultados</Text>
        <FilterBar value={filter} onChange={setFilter} accentColor={theme.color} accentInk={theme.ink} />
        <DataStatusBanner result={result} loading={loading} sampleSize={stats?.n ?? null} />
        {(result.reason === 'offline' || result.reason === 'tec-requires-connection') && !loading && (
          <Pressable onPress={refresh} style={styles.retry} accessibilityRole="button">
            <Text style={styles.retryText}>↻ Reintentar conexión</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pregunta aplicada</Text>
        <Text style={styles.questionText}>{indicator.question}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Distribución de respuestas ({indicator.period})</Text>
        {stats && stats.n > 0 ? (
          <BarChart
            items={stats.series.map((s) => ({
              label: s.label,
              value: s.pct,
              valueLabel: `${s.pct}% (${s.count})`,
            }))}
            primaryColor={chartColor}
          />
        ) : (
          <Text style={styles.emptyText}>
            {filter.source === 'tec_2026'
              ? 'La Encuesta Tec todavía no tiene respuestas para este indicador y grupo, o no hay conexión.'
              : 'No hay datos para esta combinación de filtros.'}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ficha técnica</Text>
        <Text style={styles.metaText}>Fuente: {filter.source === 'tec_2026' ? 'Encuesta externa Tec 2026 (en vivo)' : indicator.source}</Text>
        <Text style={styles.metaText}>Periodo: {indicator.period}</Text>
        <Text style={styles.metaText}>Respuestas válidas en este corte: {stats?.n ?? 0}</Text>
        <Text style={styles.metaText}>
          Cifras sin ponderar. No se muestran desgloses por municipio porque sus muestras no son representativas.
        </Text>
      </View>

      <View style={styles.actions}>
        <NavRow
          emoji="⚖️"
          label="Comparar AMG 2026 vs. Encuesta Tec"
          tint={theme.color}
          onPress={() =>
            navigation.push('comparar', { tab, indicatorId: indicator.id, mode: 'datasets', filter })
          }
        />
        <NavRow
          emoji="👥"
          label="Comparar entre grupos (género, edad, estrato)"
          tint={theme.color}
          onPress={() => navigation.push('comparar', { tab, indicatorId: indicator.id, mode: 'groups', filter })}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  headerCard: { padding: 18, borderRadius: 20, gap: 8 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  category: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  favButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  favText: { fontSize: 12, fontWeight: '800', color: colors.navy },
  title: { fontSize: 22, fontWeight: '800' },
  kpiRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  kpiValue: { fontSize: 30, fontWeight: '800' },
  kpiSub: { fontSize: 13, fontWeight: '600', opacity: 0.9 },
  kpiCaption: { fontSize: 12, fontWeight: '600', opacity: 0.85 },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardTitle: { fontSize: 13, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  questionText: { fontSize: 14, color: colors.navy, lineHeight: 20 },
  metaText: { fontSize: 13, color: colors.muted },
  emptyText: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  retry: { alignSelf: 'flex-start', paddingVertical: 4 },
  retryText: { fontSize: 13, fontWeight: '800', color: colors.navy },
  actions: { gap: 10 },
});
