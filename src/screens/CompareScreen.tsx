import { loadPublishedIndicators } from '../lib/publication';
import { useFocusedData } from '../hooks/useFocusedData';
import LoadNotice from '../components/LoadNotice';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute, type ParamListBase, type RouteProp } from '@react-navigation/native';
import BarChart from '../components/BarChart';
import { municipalities } from '../data/indicators';
import { colors, tabTheme, type TabId } from '../theme/colors';

export default function CompareScreen() {
  const route = useRoute<RouteProp<ParamListBase>>();
  const params = route.params as { tab?: TabId; indicatorId?: string } | undefined;
  const theme = tabTheme[params?.tab ?? 'explorar'];

  const [selectedIndicatorId, setSelectedIndicatorId] = useState(params?.indicatorId);
  const [muniA, setMuniA] = useState(municipalities[1] ?? municipalities[0] ?? 'Guadalajara');
  const [muniB, setMuniB] = useState(municipalities[5] ?? municipalities[1] ?? 'Zapopan');

  const published = useFocusedData(loadPublishedIndicators);
  if (!published.data) return <LoadNotice error={published.error} retry={published.refresh} />;
  const indicators = published.data;
  const indicator = indicators.find(i => i.id === selectedIndicatorId) || indicators[0];
  if (!indicator) return <LoadNotice text="No hay indicadores publicados." />;
  const resA = indicator.byMunicipality.find((m) => m.municipality === muniA);
  const resB = indicator.byMunicipality.find((m) => m.municipality === muniB);

  const posA = resA?.positivePct ?? null;
  const posB = resB?.positivePct ?? null;
  const diff = posA !== null && posB !== null ? Number((posA - posB).toFixed(1)) : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>1. Elige un indicador</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {indicators.map((item) => {
          const active = item.id === indicator.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setSelectedIndicatorId(item.id)}
              style={[styles.chip, active && { backgroundColor: theme.color, borderColor: theme.color }]}
            >
              <Text style={[styles.chipText, active && { color: theme.ink }]}>{item.title}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>2. Municipio A (Azul)</Text>
        <View style={styles.muniGrid}>
          {municipalities.map((m) => {
            const active = m === muniA;
            return (
              <Pressable
                key={`A-${m}`}
                onPress={() => setMuniA(m)}
                style={[styles.muniPill, active && { backgroundColor: colors.navy, borderColor: colors.navy }]}
              >
                <Text style={[styles.muniText, active && { color: colors.white }]}>{m}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>3. Municipio B (Naranja)</Text>
        <View style={styles.muniGrid}>
          {municipalities.map((m) => {
            const active = m === muniB;
            return (
              <Pressable
                key={`B-${m}`}
                onPress={() => setMuniB(m)}
                style={[styles.muniPill, active && { backgroundColor: colors.orange, borderColor: colors.orange }]}
              >
                <Text style={[styles.muniText, active && { color: colors.navy }]}>{m}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Comparativa: {indicator.title}</Text>
        <BarChart
          items={[
            {
              label: `${muniA} (n=${resA?.n ?? 0})`,
              value: posA ?? 0,
              valueLabel: posA !== null ? `${posA}%` : 'Sin dato',
            },
            {
              label: `${muniB} (n=${resB?.n ?? 0})`,
              value: posB ?? 0,
              valueLabel: posB !== null ? `${posB}%` : 'Sin dato',
            },
          ]}
          primaryColor={colors.navy}
        />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Diferencia (A − B):</Text>
          <Text style={styles.summaryValue}>
            {diff !== null ? `${diff > 0 ? '+' : ''}${diff} pts %` : 'No disponible'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.navy },
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.navy },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.navy },
  muniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muniPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muniText: { fontSize: 12, fontWeight: '700', color: colors.navy },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F4',
  },
  summaryLabel: { fontSize: 14, fontWeight: '700', color: colors.muted },
  summaryValue: { fontSize: 15, fontWeight: '800', color: colors.navy },
});
