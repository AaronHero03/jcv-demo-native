import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type ParamListBase, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppState } from '../context/AppStateContext';
import { getSurveyById } from '../data/surveys';
import { colors, tabTheme } from '../theme/colors';

export default function SurveyScreen() {
  const route = useRoute<RouteProp<ParamListBase>>();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const params = route.params as { surveyId?: string } | undefined;
  const survey = getSurveyById(params?.surveyId);
  const { submitSurvey } = useAppState();
  const theme = tabTheme.participar;

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const selectOption = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
    setError(null);
  };

  const handleSubmit = () => {
    const missing = survey.questions.some((q) => !answers[q.id]);
    if (missing) {
      setError('Por favor responde todas las preguntas antes de enviar.');
      return;
    }
    submitSurvey(survey.id, answers);
    navigation.replace('enviada', { tab: 'participar' });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{survey.title}</Text>
        <Text style={styles.desc}>{survey.description}</Text>
      </View>

      {survey.questions.map((q, idx) => (
        <View key={q.id} style={styles.questionCard}>
          <Text style={styles.questionPrompt}>
            {idx + 1}. {q.prompt}
          </Text>
          <View style={styles.options}>
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => selectOption(q.id, opt)}
                  style={[
                    styles.option,
                    selected && { backgroundColor: `${theme.color}18`, borderColor: theme.color },
                  ]}
                >
                  <Text style={[styles.optionText, selected && { color: theme.color, fontWeight: '800' }]}>
                    {selected ? '● ' : '○ '}
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Pressable onPress={handleSubmit} style={[styles.submitBtn, { backgroundColor: theme.color }]}>
        <Text style={[styles.submitText, { color: theme.ink }]}>Enviar respuestas</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 36 },
  header: { gap: 4 },
  title: { fontSize: 20, fontWeight: '800', color: colors.navy },
  desc: { fontSize: 13, color: colors.muted },
  questionCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E1E5E8',
    gap: 10,
  },
  questionPrompt: { fontSize: 15, fontWeight: '700', color: colors.navy, lineHeight: 20 },
  options: { gap: 8 },
  option: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E5E8',
    backgroundColor: colors.background,
  },
  optionText: { fontSize: 14, color: colors.navy },
  errorText: { fontSize: 13, fontWeight: '700', color: colors.pink, textAlign: 'center' },
  submitBtn: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  submitText: { fontSize: 16, fontWeight: '800' },
});
