import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type ParamListBase, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BarChart from '../components/BarChart';
import NavRow from '../components/NavRow';
import { useAppState } from '../context/AppStateContext';
import { getIndicatorById } from '../data/indicators';
import { colors, tabTheme, type TabId } from '../theme/colors';

export default function IndicatorDetailScreen() {
  const route = useRoute<RouteProp<ParamListBase>>();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const params = route.params as { tab?: TabId; indicatorId?: string } | undefined;
  const tab = params?.tab ?? 'explorar';
  const theme = tabTheme[tab];
  const indicator = getIndicatorById(params?.indicatorId);
  const { isFavorite, toggleFavorite } = useAppState();
  const fav = isFavorite(indicator.id);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.headerCard, { backgroundColor: theme.color }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.category, { color: theme.ink }]}>{indicator.category}</Text>
          <Pressable onPress={() => toggleFavorite(indicator.id)} style={styles.favButton}>
            <Text style={styles.favText}>{fav ? '⭐ Guardado' : '☆ Guardar'}</Text>
          </Pressable>
        </View>
        <Text style={[styles.title, { color: theme.ink }]}>{indicator.title}</Text>
        <View style={styles.kpiRow}>
          <Text style={[styles.kpiValue, { color: theme.ink }]}>
            {indicator.positivePct}
            {indicator.unit}
          </Text>
          <Text style={[styles.kpiSub, { color: theme.ink }]}>
            Promedio {indicator.average} / 5
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pregunta aplicada</Text>
        <Text style={styles.questionText}>{indicator.question}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Distribución de respuestas ({indicator.period})</Text>
        <BarChart
          items={indicator.series.map((s) => ({
            label: s.label,
            value: s.pct,
            valueLabel: `${s.pct}%`,
          }))}
          primaryColor={theme.color === colors.yellow ? colors.navy : theme.color}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ficha técnica</Text>
        <Text style={styles.metaText}>Fuente: {indicator.source}</Text>
        <Text style={styles.metaText}>Periodo: {indicator.period}</Text>
        <Text style={styles.metaText}>Respuestas válidas: {indicator.sampleSize}</Text>
      </View>

      <View style={styles.actions}>
        <NavRow
          emoji="⚖️"
          label="Comparar municipios (A/B)"
          tint={theme.color}
          onPress={() => navigation.push('comparar', { tab, indicatorId: indicator.id })}
        />
        <NavRow
          emoji="🗺️"
          label="Ver desglose por municipio"
          tint={theme.color}
          onPress={() => navigation.push('mapa', { tab, indicatorId: indicator.id })}
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
  actions: { gap: 10 },
});
