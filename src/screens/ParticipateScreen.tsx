import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Hero from '../components/Hero';
import { useAppState } from '../context/AppStateContext';
import { surveys } from '../data/surveys';
import { colors, tabTheme } from '../theme/colors';

export default function ParticipateScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { completedSurveyIds } = useAppState();
  const theme = tabTheme.participar;

  const available = surveys.filter((s) => !completedSurveyIds.includes(s.id));
  const completed = surveys.filter((s) => completedSurveyIds.includes(s.id));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Hero
        page={{
          emoji: '📝',
          title: 'Participar',
          text: 'Responde encuestas ciudadanas y consulta tu historial de participación.',
        }}
        color={theme.color}
        ink={theme.ink}
      />

      <Text style={styles.sectionTitle}>Encuestas disponibles ({available.length})</Text>
      {available.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>¡Has respondido todas las encuestas disponibles por ahora!</Text>
        </View>
      ) : (
        available.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => navigation.push('encuesta', { tab: 'participar', surveyId: s.id })}
            style={styles.card}
          >
            <View style={styles.cardTop}>
              <Text style={styles.period}>{s.period}</Text>
              <Text style={styles.duration}>~{s.estimatedMinutes} min · {s.questions.length} preguntas</Text>
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.desc}>{s.description}</Text>
            <View style={[styles.cta, { backgroundColor: theme.color }]}>
              <Text style={[styles.ctaText, { color: theme.ink }]}>Responder encuesta ›</Text>
            </View>
          </Pressable>
        ))
      )}

      <Text style={styles.sectionTitle}>Completadas ({completed.length})</Text>
      {completed.length === 0 ? (
        <Text style={styles.mutedText}>Aún no has completado encuestas en esta sesión.</Text>
      ) : (
        completed.map((s) => (
          <View key={s.id} style={[styles.card, styles.completedCard]}>
            <Text style={styles.completedBadge}>✅ Completada</Text>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.desc}>{s.period}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.navy, marginTop: 4 },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E1E5E8',
    gap: 8,
  },
  completedCard: { opacity: 0.85 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  period: { fontSize: 12, fontWeight: '800', color: colors.darkPink },
  duration: { fontSize: 12, fontWeight: '600', color: colors.muted },
  title: { fontSize: 17, fontWeight: '800', color: colors.navy },
  desc: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  cta: { marginTop: 4, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  ctaText: { fontSize: 14, fontWeight: '800' },
  completedBadge: { fontSize: 12, fontWeight: '800', color: '#2E8B57' },
  emptyCard: { padding: 16, borderRadius: 16, backgroundColor: '#EAF6EE' },
  emptyText: { fontSize: 14, fontWeight: '700', color: '#2E8B57' },
  mutedText: { fontSize: 13, color: colors.muted },
});
