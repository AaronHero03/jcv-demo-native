import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DataStatusBanner from '../components/DataStatusBanner';
import FilterBar from '../components/FilterBar';
import Hero from '../components/Hero';
import IndicatorCard from '../components/IndicatorCard';
import NavRow from '../components/NavRow';
import { useAppState } from '../context/AppStateContext';
import { DEFAULT_FILTER, type IndicatorFilter } from '../data/filters';
import { datasetMeta, indicators } from '../data/indicators';
import { toCardMetric } from '../data/indicatorSummaries';
import { summarizeOrigin, useIndicatorsStats } from '../hooks/useIndicatorStats';
import { colors, tabTheme } from '../theme/colors';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { userMode, userEmail, isFavorite, toggleFavorite } = useAppState();
  const theme = tabTheme.inicio;
  const featured = indicators.slice(0, 3);
  const [filter, setFilter] = useState<IndicatorFilter>(DEFAULT_FILTER);
  const { results, loading } = useIndicatorsStats(
    featured.map((i) => i.id),
    filter
  );

  const greeting =
    userMode === 'user' && userEmail
      ? `Hola, ${userEmail.split('@')[0]}`
      : 'Bienvenido, Explorador';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Hero
        page={{
          emoji: '🏠',
          title: greeting,
          text: `${datasetMeta.name} · ${datasetMeta.totalRespondents} jóvenes encuestados en el AMG.`,
        }}
        color={theme.color}
        ink={theme.ink}
      />

      <Text style={styles.sectionTitle}>Indicadores destacados</Text>
      <FilterBar value={filter} onChange={setFilter} accentColor={theme.color} accentInk={theme.ink} />
      <DataStatusBanner result={summarizeOrigin(Object.values(results))} loading={loading} />
      {featured.map((item) => (
        <IndicatorCard
          key={item.id}
          indicator={item}
          metric={results[item.id] ? toCardMetric(results[item.id]) : undefined}
          accentColor={theme.color}
          isFavorite={isFavorite(item.id)}
          onToggleFavorite={() => toggleFavorite(item.id)}
          onPress={() => navigation.push('indicador', { tab: 'inicio', indicatorId: item.id, filter })}
        />
      ))}

      <Text style={styles.sectionTitle}>Accesos rápidos</Text>
      <View style={styles.links}>
        <NavRow
          emoji="🔎"
          label="Explorar todos los indicadores"
          tint={colors.orange}
          onPress={() => navigation.navigate('explorarTab')}
        />
        <NavRow
          emoji="⚖️"
          label="Comparar AMG 2026 vs. Encuesta Tec"
          tint={colors.navy}
          onPress={() => navigation.push('comparar', { tab: 'inicio' })}
        />
        <NavRow
          emoji="📝"
          label="Responder encuesta vigente"
          tint={colors.darkPink}
          onPress={() => navigation.navigate('participarTab')}
        />
        <NavRow
          emoji="🎙️"
          label="Preguntar al asistente"
          tint={theme.color}
          onPress={() => navigation.push('asistente', { tab: 'inicio' })}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.navy, marginTop: 6 },
  links: { gap: 10 },
});
