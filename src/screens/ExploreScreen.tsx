import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import IndicatorCard from '../components/IndicatorCard';
import { useAppState } from '../context/AppStateContext';
import { indicatorCategories, searchIndicators, type IndicatorCategory } from '../data/indicators';
import { colors, tabTheme } from '../theme/colors';

export default function ExploreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { isFavorite, toggleFavorite } = useAppState();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'Todas' | IndicatorCategory>('Todas');
  const theme = tabTheme.explorar;

  const results = useMemo(() => searchIndicators(query, category), [query, category]);

  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar indicador, tema o pregunta..."
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          clearButtonMode="while-editing"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {indicatorCategories.map((cat) => {
            const active = cat === category;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.chip,
                  active && { backgroundColor: theme.color, borderColor: theme.color },
                ]}
              >
                <Text style={[styles.chipText, active && { color: theme.ink }]}>{cat}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <IndicatorCard
            indicator={item}
            accentColor={theme.color}
            isFavorite={isFavorite(item.id)}
            onToggleFavorite={() => toggleFavorite(item.id)}
            onPress={() => navigation.push('indicador', { tab: 'explorar', indicatorId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🔎</Text>
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptyText}>Intenta con otra palabra clave o cambia de categoría.</Text>
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
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.navy },
  listContent: { padding: 16, paddingTop: 6, gap: 10, paddingBottom: 32 },
  emptyBox: { alignItems: 'center', padding: 32, gap: 6 },
  emptyEmoji: { fontSize: 34 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.navy },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});
