import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DataStatusBanner from '../components/DataStatusBanner';
import FilterBar, { type DimensionOption } from '../components/FilterBar';
import IndicatorCard from '../components/IndicatorCard';
import { useAppState } from '../context/AppStateContext';
import { DEFAULT_FILTER, describeFilter, type IndicatorFilter } from '../data/filters';
import { searchIndicators } from '../data/indicators';
import { toCardMetric } from '../data/indicatorSummaries';
import { summarizeOrigin, useIndicatorsStats } from '../hooks/useIndicatorStats';
import { colors, tabTheme } from '../theme/colors';

const MAX_QUERY_LENGTH = 80;

export default function ExploreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { isFavorite, toggleFavorite } = useAppState();
  const [query, setQuery] = useState('');
  const [dimension, setDimension] = useState<DimensionOption>('Todas');
  const [filter, setFilter] = useState<IndicatorFilter>(DEFAULT_FILTER);
  const theme = tabTheme.explorar;

  // Búsqueda y filtros combinados: texto + dimensión filtran la lista; el corte demográfico cambia las cifras.
  const results = useMemo(() => searchIndicators(query, dimension), [query, dimension]);
  const ids = useMemo(() => results.map((r) => r.id), [results]);
  const { results: statsById, loading } = useIndicatorsStats(ids, filter);
  const listOrigin = summarizeOrigin(Object.values(statsById));

  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
        <TextInput
          value={query}
          onChangeText={(text) => setQuery(text.slice(0, MAX_QUERY_LENGTH))}
          maxLength={MAX_QUERY_LENGTH}
          placeholder="Buscar indicador, tema o pregunta..."
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        <FilterBar
          value={filter}
          onChange={setFilter}
          dimension={dimension}
          onDimensionChange={setDimension}
          accentColor={theme.color}
          accentInk={theme.ink}
        />
        {results.length > 0 && <DataStatusBanner result={listOrigin} loading={loading} />}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          results.length > 0 ? (
            <Text style={styles.resultsMeta}>
              {results.length} indicador{results.length === 1 ? '' : 'es'} · {describeFilter(filter)}
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <IndicatorCard
            indicator={item}
            metric={statsById[item.id] ? toCardMetric(statsById[item.id]) : undefined}
            accentColor={theme.color}
            isFavorite={isFavorite(item.id)}
            onToggleFavorite={() => toggleFavorite(item.id)}
            onPress={() => navigation.push('indicador', { tab: 'explorar', indicatorId: item.id, filter })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🔎</Text>
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptyText}>
              No hay indicadores que coincidan con “{query.trim()}” en {dimension === 'Todas' ? 'ninguna dimensión' : dimension}.
              Prueba otra palabra o cambia la dimensión.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  controls: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 10 },
  searchInput: {
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.navy,
  },
  resultsMeta: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 2 },
  listContent: { padding: 16, paddingTop: 6, gap: 10, paddingBottom: 32 },
  emptyBox: { alignItems: 'center', padding: 32, gap: 6 },
  emptyEmoji: { fontSize: 34 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.navy },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});
