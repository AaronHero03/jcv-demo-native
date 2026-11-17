import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Hero from '../components/Hero';
import { datasetMeta, municipalities } from '../data/indicators';
import { colors, tabTheme } from '../theme/colors';

export default function AboutScreen() {
  const theme = tabTheme.drawer;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Hero
        page={{
          emoji: 'ℹ️',
          title: 'Acerca de JCV',
          text: 'Observatorio ciudadano para entender cómo vivimos en Jalisco.',
        }}
        color={theme.color}
        ink={theme.ink}
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>¿Quiénes somos?</Text>
        <Text style={styles.body}>
          Jalisco Cómo Vamos es un observatorio ciudadano independiente que mide, analiza y difunde
          indicadores de calidad de vida y percepción ciudadana en el Área Metropolitana de Guadalajara.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cobertura actual ({municipalities.length} municipios)</Text>
        <View style={styles.chips}>
          {municipalities.map((m) => (
            <View key={m} style={styles.chip}>
              <Text style={styles.chipText}>{m}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.meta}>
          Dataset integrado: {datasetMeta.name} ({datasetMeta.totalRespondents} participantes).
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E1E5E8',
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.navy },
  body: { fontSize: 14, color: colors.navy, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#EAF0F6',
  },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.navy },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
