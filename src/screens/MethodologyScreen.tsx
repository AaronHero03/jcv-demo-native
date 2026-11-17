import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Hero from '../components/Hero';
import { datasetMeta, indicators, municipalities } from '../data/indicators';
import { colors, tabTheme } from '../theme/colors';

export default function MethodologyScreen() {
  const theme = tabTheme.drawer;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Hero
        page={{
          emoji: '🧪',
          title: 'Metodología',
          text: 'Cómo se levantan, validan y calculan los indicadores.',
        }}
        color={theme.color}
        ink={theme.ink}
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ficha de levantamiento</Text>
        <Text style={styles.row}>• Estudio: {datasetMeta.name}</Text>
        <Text style={styles.row}>• Muestra total: {datasetMeta.totalRespondents} jóvenes encuestados</Text>
        <Text style={styles.row}>• Cobertura: {municipalities.length} municipios del AMG</Text>
        <Text style={styles.row}>• Indicadores activos: {indicators.length} reactivos principales</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cálculo de métricas</Text>
        <Text style={styles.body}>
          Los reactivos evaluados utilizan una escala del 1 al 5. Para cada indicador se reportan dos
          métricas principales:
        </Text>
        <Text style={styles.row}>
          1. <Text style={styles.bold}>Porcentaje positivo:</Text> proporción de respuestas en los
          niveles 4 y 5 sobre el total de respuestas válidas.
        </Text>
        <Text style={styles.row}>
          2. <Text style={styles.bold}>Promedio (1–5):</Text> media aritmética excluyendo respuestas
          &quot;No sabe / No contestó&quot; o &quot;No aplica&quot;.
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
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.navy },
  body: { fontSize: 14, color: colors.navy, lineHeight: 20 },
  row: { fontSize: 14, color: colors.navy, lineHeight: 20 },
  bold: { fontWeight: '800' },
});
