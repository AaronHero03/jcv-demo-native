import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute, type ParamListBase, type RouteProp } from '@react-navigation/native';
import { getIndicatorById, indicators } from '../data/indicators';
import { colors, tabTheme, type TabId } from '../theme/colors';

function getStatusColor(pct: number | null): string {
  if (pct === null) return colors.muted;
  if (pct >= 75) return '#2E8B57';
  if (pct >= 55) return colors.orange;
  return colors.pink;
}

export default function MapMockScreen() {
  const route = useRoute<RouteProp<ParamListBase>>();
  const params = route.params as { tab?: TabId; indicatorId?: string } | undefined;
  const theme = tabTheme[params?.tab ?? 'explorar'];

  const [selectedId, setSelectedId] = useState(() => getIndicatorById(params?.indicatorId).id);
  const indicator = getIndicatorById(selectedId);

  const sortedMunicipalities = useMemo(
    () =>
      [...indicator.byMunicipality].sort((a, b) => (b.positivePct ?? -1) - (a.positivePct ?? -1)),
    [indicator]
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Indicador por municipio (AMG)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {indicators.map((item) => {
          const active = item.id === indicator.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setSelectedId(item.id)}
              style={[styles.chip, active && { backgroundColor: theme.color, borderColor: theme.color }]}
            >
              <Text style={[styles.chipText, active && { color: theme.ink }]}>{item.title}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          🗺️ Desglose territorial real de {indicator.period} · Promedio AMG: {indicator.positivePct}%
        </Text>
      </View>

      {sortedMunicipalities.map((row, idx) => {
        const badgeColor = getStatusColor(row.positivePct);
        const barWidth = row.positivePct !== null ? Math.min(100, Math.max(0, row.positivePct)) : 0;

        return (
          <View key={row.municipality} style={styles.muniCard}>
            <View style={styles.muniHeader}>
              <Text style={styles.rank}>#{idx + 1}</Text>
              <Text style={styles.muniName}>{row.municipality}</Text>
              <View style={[styles.badge, { backgroundColor: `${badgeColor}20` }]}>
                <Text style={[styles.badgeText, { color: badgeColor }]}>
                  {row.positivePct !== null ? `${row.positivePct}%` : 'Sin dato'}
                </Text>
              </View>
            </View>
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${barWidth}%`, backgroundColor: badgeColor }]} />
            </View>
            <Text style={styles.muniMeta}>
              Promedio: {row.average !== null ? `${row.average} / 5` : 'N/D'} · Encuestados: {row.n}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.navy },
  chips: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E1E5E8',
  },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.navy },
  noteBox: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#EAF0F6',
  },
  noteText: { fontSize: 13, fontWeight: '600', color: colors.navy },
  muniCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E1E5E8',
    gap: 8,
  },
  muniHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rank: { fontSize: 13, fontWeight: '800', color: colors.muted, width: 26 },
  muniName: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.navy },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 13, fontWeight: '800' },
  track: { height: 8, borderRadius: 6, backgroundColor: '#E8ECEF', overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 6 },
  muniMeta: { fontSize: 12, color: colors.muted },
});
