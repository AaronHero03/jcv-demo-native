import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { useNavigation, useRoute, type ParamListBase, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppState } from '../context/AppStateContext';
import {
  answerKeys,
  type Survey,
  isQuestionAnswered,
  isQuestionVisible,
  type GridQuestion,
  type MultiQuestion,
  type SingleQuestion,
  type SurveyAnswers,
  type SurveyQuestion,
} from '../data/surveys';
import { colors, tabTheme } from '../theme/colors';

import LoadNotice from '../components/LoadNotice';
import { useFocusedData } from '../hooks/useFocusedData';
import { loadSurveys, sendSurvey } from '../lib/surveyCatalog';
import { supabase, messageOf } from '../lib/supabase';
import { clearDraft, draftKey, readDraft, saveDraft } from '../lib/surveyDraft';

const theme = tabTheme.participar;

interface Section {
  title: string;
  questions: SurveyQuestion[];
}

// Agrupa las preguntas por sección respetando el orden del cuestionario.
function groupBySection(questions: SurveyQuestion[]): Section[] {
  const sections: Section[] = [];
  for (const q of questions) {
    const title = q.section ?? '';
    const last = sections[sections.length - 1];
    if (last && last.title === title) last.questions.push(q);
    else sections.push({ title, questions: [q] });
  }
  return sections;
}

export default function SurveyScreen() {
  const route = useRoute<RouteProp<ParamListBase>>();
  const params = route.params as { surveyId?: string } | undefined;
  const { userId, isTecVerified, userMode, userEmail, completedSurveyIds } = useAppState();
  const catalog = useFocusedData(loadSurveys);
  if (!catalog.data) return <LoadNotice error={catalog.error} retry={catalog.refresh} />;
  const survey = catalog.data.find(item => item.id === params?.surveyId);
  if (!survey?.questions.length) return <LoadNotice text="Esta encuesta no está disponible." />;
  if (completedSurveyIds.includes(survey.id)) return <LoadNotice text="Ya respondiste esta encuesta." />;
  if (userMode !== 'user' || (supabase && (!userId || !isTecVerified))) {
    return <LoadNotice text="Para responder, inicia sesión con tu cuenta Tec verificada." />;
  }
  const scope = draftKey(userId || 'demo-' + (userEmail || 'local'), survey.id);
  return <SurveyForm key={scope} survey={survey} storageKey={scope} />;
}

function SurveyForm({ survey, storageKey }: { survey: Survey; storageKey: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { submitSurvey } = useAppState();
  const sections = useMemo(() => groupBySection(survey.questions), [survey]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [showMissing, setShowMissing] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const [ready, setReady] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const locked = useRef(false);
  const latest = useRef({ step: 0, answers: {} as SurveyAnswers });
  const count = sections.length;
  useEffect(() => {
    let active = true;
    readDraft(storageKey).then(value => {
      if (!active) return;
      if (value) {
        const restored = Math.max(0, Math.min(value.step, count - 1));
        latest.current = { step: restored, answers: value.answers };
        setStep(restored); setAnswers(value.answers);
      }
      setReady(true);
    }).catch(() => { if (active) setRecovery(true); });
    return () => { active = false; };
  }, [storageKey, count, loadAttempt]);

  const save = (nextStep: number, nextAnswers: SurveyAnswers) => {
    latest.current = { step: nextStep, answers: nextAnswers };
    saveDraft(storageKey, latest.current).then(() => setDraftError(''))
      .catch(() => setDraftError('El dispositivo no pudo guardar el borrador. Mantén abierta la encuesta.'));
  };
  const finish = async (finalAnswers: SurveyAnswers) => {
    await clearDraft(storageKey);
    navigation.replace('enviada', { tab: 'participar' });
    submitSurvey(survey.id, finalAnswers);
  };
  if (accepted) return <LoadNotice error="La encuesta se recibió. Falta eliminar el borrador de este dispositivo."
    retry={() => { void finish(latest.current.answers).catch(() => setAccepted(true)); }} />;
  if (recovery) return <View style={styles.content}>
    <LoadNotice error={draftError || 'No se pudo abrir el borrador guardado.'} retry={() => {
      setRecovery(false); setLoadAttempt(attempt => attempt + 1);
    }} />
    <Pressable accessibilityRole="button" onPress={async () => {
      try { await clearDraft(storageKey); setRecovery(false); setReady(true); setDraftError(''); }
      catch { setDraftError('El dispositivo no permitió eliminar el borrador. Reintenta cuando haya espacio disponible.'); }
    }}><Text style={styles.btnSecondaryText}>Descartar borrador y comenzar de nuevo</Text></Pressable>
  </View>;
  if (!ready) return <LoadNotice text="Abriendo el cuestionario…" />;
  const section = sections[step];
  const visibleQuestions = section.questions.filter((q) => isQuestionVisible(q, answers));
  const isLast = step === sections.length - 1;
  const hasSteps = sections.length > 1;

  const updateAnswers = (patch: SurveyAnswers) => {
    if (locked.current) return;
    const next = { ...latest.current.answers, ...patch };
    setAnswers(next); save(latest.current.step, next);
  };

  const goTo = (next: number) => {
    if (locked.current) return;
    save(next, latest.current.answers);
    setStep(next);
    setShowMissing(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleNext = async () => {
    if (locked.current) return;
    setError('');
    if (visibleQuestions.some((q) => !isQuestionAnswered(q, answers))) {
      setShowMissing(true);
      return;
    }
    if (!isLast) {
      goTo(step + 1);
      return;
    }
    // Solo se envían las respuestas de preguntas visibles (descarta condicionales que quedaron ocultas).
    const invalid = sections.findIndex(item => item.questions.some(q => isQuestionVisible(q, answers) && !isQuestionAnswered(q, answers)));
    if (invalid >= 0) { goTo(invalid); setShowMissing(true); return; }
    const finalAnswers: SurveyAnswers = {};
    survey.questions
      .filter((q) => isQuestionVisible(q, answers))
      .forEach((q) => answerKeys(q).forEach((key) => (finalAnswers[key] = answers[key])));
    locked.current = true;
    setSending(true);
    try {
      if (supabase) await sendSurvey(survey.id, finalAnswers);
      // Responder de nuevo después de una pérdida de red también reconoce el envío previo.
      try { await finish(finalAnswers); }
      catch { setAccepted(true); }
    } catch (e) { setError(messageOf(e)); locked.current = false; setSending(false); }
  };

  return (
    <View style={styles.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.surveyTitle}>{survey.title}</Text>
          {hasSteps ? (
            <>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${((step + 1) / sections.length) * 100}%` }]} />
              </View>
              <Text style={styles.stepText}>
                Paso {step + 1} de {sections.length} · <Text style={styles.stepTitle}>{section.title}</Text>
              </Text>
            </>
          ) : (
            <Text style={styles.desc}>{survey.description}</Text>
          )}
        </View>

        {visibleQuestions.map((q) => {
          const missing = showMissing && !isQuestionAnswered(q, answers);
          return (
            <View key={q.id} style={[styles.card, missing && styles.cardMissing]}>
              <Text style={styles.prompt}>{q.prompt}</Text>
              {q.hint && <Text style={styles.hint}>{q.hint}</Text>}
              {q.type === 'single' && <SingleInput q={q} answers={answers} onChange={updateAnswers} />}
              {q.type === 'multi' && <MultiInput q={q} answers={answers} onChange={updateAnswers} />}
              {q.type === 'grid' && <GridInput q={q} answers={answers} onChange={updateAnswers} />}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        {draftError ? <Text style={styles.errorText}>{draftError}</Text> : null}
        {error ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text> : null}
        {showMissing && <Text style={styles.errorText}>Responde las preguntas marcadas para continuar.</Text>}
        <View style={styles.footerRow}>
          {step > 0 && (
            <Pressable onPress={() => goTo(step - 1)} style={[styles.btn, styles.btnSecondary]} accessibilityRole="button">
              <Text style={styles.btnSecondaryText}>Anterior</Text>
            </Pressable>
          )}
          <Pressable disabled={sending} onPress={handleNext} style={[styles.btn, styles.btnPrimary]} accessibilityRole="button">
            <Text style={styles.btnPrimaryText}>{sending ? 'Enviando…' : isLast ? 'Enviar respuestas' : 'Siguiente'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type InputProps<Q> = { q: Q; answers: SurveyAnswers; onChange: (patch: SurveyAnswers) => void };

function SingleInput({ q, answers, onChange }: InputProps<SingleQuestion>) {
  const value = answers[q.id];

  if (q.compact) {
    return (
      <View style={styles.chips}>
        {q.options.map((opt) => {
          const selected = value === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange({ [q.id]: opt })}
              style={[styles.chip, selected && styles.chipSelected]}
              accessibilityRole="radio"
              aria-checked={selected}
              accessibilityState={{ checked: selected }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.options}>
      {q.options.map((opt) => {
        const selected = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange({ [q.id]: opt })}
            style={[styles.option, selected && styles.optionSelected]}
            accessibilityRole="radio"
            aria-checked={selected}
            accessibilityState={{ checked: selected }}
          >
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected && <View style={styles.radioDot} />}
            </View>
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MultiInput({ q, answers, onChange }: InputProps<MultiQuestion>) {
  const allNo = Object.fromEntries(q.items.map((item) => [item.id, 'No']));
  const answered = q.items.every((item) => answers[item.id]);
  const noneSelected = answered && q.items.every((item) => answers[item.id] === 'No');

  const toggle = (id: string) => {
    const base = answered ? {} : allNo;
    onChange({ ...base, [id]: answers[id] === 'Sí' ? 'No' : 'Sí' });
  };

  const renderRow = (key: string, label: string, checked: boolean, onPress: () => void) => (
    <Pressable
      key={key}
      onPress={onPress}
      style={[styles.option, checked && styles.optionSelected]}
      accessibilityRole="checkbox"
      aria-checked={checked}
      accessibilityState={{ checked }}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkMark}>✓</Text>}
      </View>
      <Text style={[styles.optionText, checked && styles.optionTextSelected]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.options}>
      {q.items.map((item) => renderRow(item.id, item.label, answers[item.id] === 'Sí', () => toggle(item.id)))}
      <View style={styles.divider} />
      {renderRow(`${q.id}-none`, q.noneLabel, noneSelected, () => onChange(allNo))}
    </View>
  );
}

function GridInput({ q, answers, onChange }: InputProps<GridQuestion>) {
  const first = q.scale[0];
  const last = q.scale[q.scale.length - 1];

  return (
    <View style={styles.grid}>
      <Text style={styles.legend}>
        1 = {first} · {q.scale.length} = {last}
      </Text>
      {q.items.map((item) => {
        const value = answers[item.id];
        return (
          <View key={item.id} style={styles.gridItem}>
            <Text style={styles.gridLabel}>{item.label}</Text>
            <View style={styles.scaleRow}>
              {q.scale.map((label, idx) => {
                const selected = value === label;
                return (
                  <Pressable
                    key={label}
                    onPress={() => onChange({ [item.id]: label })}
                    style={[styles.scaleBtn, selected && styles.scaleBtnSelected]}
                    accessibilityRole="radio"
                    accessibilityLabel={`${item.label}: ${label}`}
                    aria-checked={selected}
                    accessibilityState={{ checked: selected }}
                  >
                    <Text style={[styles.scaleText, selected && styles.scaleTextSelected]}>{idx + 1}</Text>
                  </Pressable>
                );
              })}
            </View>
            {value && <Text style={styles.scaleValue}>{value}</Text>}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  header: { gap: 8, marginBottom: 4 },
  surveyTitle: { fontSize: 20, fontWeight: '800', color: colors.navy },
  desc: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 3, backgroundColor: theme.color },
  stepText: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  stepTitle: { color: colors.navy, fontWeight: '800' },

  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  cardMissing: { borderColor: colors.pink },
  prompt: { fontSize: 16, fontWeight: '700', color: colors.navy, lineHeight: 22 },
  hint: { fontSize: 13, color: colors.muted, lineHeight: 18, marginTop: -6 },

  options: { gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionSelected: { borderColor: theme.color, backgroundColor: `${theme.color}0D` },
  optionText: { flex: 1, fontSize: 14, color: colors.navy, lineHeight: 19 },
  optionTextSelected: { fontWeight: '700' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C3CAD2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: theme.color },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.color },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#C3CAD2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { borderColor: theme.color, backgroundColor: theme.color },
  checkMark: { color: colors.white, fontSize: 12, fontWeight: '800', lineHeight: 14 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minWidth: 44,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  chipSelected: { borderColor: theme.color, backgroundColor: theme.color },
  chipText: { fontSize: 14, color: colors.navy, fontWeight: '600' },
  chipTextSelected: { color: theme.ink },

  grid: { gap: 14 },
  legend: { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: -4 },
  gridItem: { gap: 8 },
  gridLabel: { fontSize: 14, color: colors.navy, lineHeight: 19 },
  scaleRow: { flexDirection: 'row', gap: 8 },
  scaleBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleBtnSelected: { borderColor: theme.color, backgroundColor: theme.color },
  scaleText: { fontSize: 15, fontWeight: '700', color: colors.navy },
  scaleTextSelected: { color: theme.ink },
  scaleValue: { fontSize: 12, fontWeight: '700', color: theme.color },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: theme.color },
  btnPrimaryText: { fontSize: 15, fontWeight: '800', color: theme.ink },
  btnSecondary: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  btnSecondaryText: { fontSize: 15, fontWeight: '700', color: colors.navy },
  errorText: { fontSize: 13, fontWeight: '700', color: colors.pink, textAlign: 'center' },
});
