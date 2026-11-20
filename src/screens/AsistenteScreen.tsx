import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRoute, type ParamListBase, type RouteProp } from '@react-navigation/native';
import { askAssistant, MAX_QUESTION_LENGTH, messageForAskError } from '../services/askClient';
import { colors, tabTheme, type TabId } from '../theme/colors';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text: string;
  sources?: string[];
}

const SUGGESTIONS = [
  '¿Qué porcentaje de jóvenes está satisfecho con su vida?',
  '¿Cómo se compara la felicidad entre hombres y mujeres?',
  '¿Cuántos jóvenes se sienten seguros en su escuela?',
];

let messageCounter = 0;
const nextId = () => `m${Date.now()}-${messageCounter++}`;

/**
 * Asistente IA (Fase 2 · Genaro).
 *
 * Seguridad T6: TODA respuesta del modelo se muestra solo dentro de <Text> como texto plano.
 * No se usa WebView, no se interpreta HTML/Markdown y no se abren links automáticamente
 * (las fuentes son identificadores del corpus, no URLs).
 * Privacidad T7: la conversación vive solo en memoria de esta pantalla; no se guarda en el dispositivo.
 */
export default function AsistenteScreen() {
  const route = useRoute<RouteProp<ParamListBase>>();
  const tab = ((route.params as { tab?: TabId } | undefined)?.tab ?? 'inicio') as TabId;
  const theme = tabTheme[tab];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const trimmed = input.trim();
  const tooLong = trimmed.length > MAX_QUESTION_LENGTH;
  const canSend = trimmed.length > 0 && !tooLong && !sending;

  const send = async () => {
    if (!canSend) return;
    const question = trimmed;
    setInput('');
    setSending(true);
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: question }]);
    try {
      const { answer, sources } = await askAssistant(question);
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: answer, sources }]);
    } catch (error) {
      setMessages((prev) => [...prev, { id: nextId(), role: 'error', text: messageForAskError(error) }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.intro, { borderColor: theme.color }]}>
          <Text style={styles.introTitle}>🎙️ Asistente de datos JCV</Text>
          <Text style={styles.introText}>
            Responde preguntas sobre la encuesta Bienestar de Jóvenes AMG 2026 citando sus fuentes. Si algo está fuera
            de la encuesta, te lo dirá.
          </Text>
          <Text style={styles.privacy}>
            🔒 No escribas datos personales. Tus preguntas no se guardan en el teléfono.
          </Text>
        </View>

        {messages.length === 0 && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsTitle}>Prueba con:</Text>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} onPress={() => setInput(s)} style={styles.suggestion} accessibilityRole="button">
                <Text style={styles.suggestionText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubble,
              m.role === 'user' && [styles.userBubble, { backgroundColor: colors.navy }],
              m.role === 'assistant' && styles.assistantBubble,
              m.role === 'error' && styles.errorBubble,
            ]}
          >
            {/* Texto plano siempre: selectable para copiar, sin enlaces automáticos (T6). */}
            <Text selectable style={[styles.bubbleText, m.role === 'user' && styles.userText]}>
              {m.role === 'error' ? `⚠️ ${m.text}` : m.text}
            </Text>
            {m.role === 'assistant' && (
              <Text style={styles.sources}>
                {m.sources && m.sources.length > 0 ? `Fuentes: ${m.sources.join(', ')}` : 'Sin fuentes citadas'}
              </Text>
            )}
          </View>
        ))}

        {sending && (
          <View style={[styles.bubble, styles.assistantBubble, styles.typing]}>
            <ActivityIndicator size="small" color={colors.navy} />
            <Text style={styles.bubbleText}>Consultando la encuesta…</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Escribe tu pregunta sobre la encuesta…"
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
          maxLength={MAX_QUESTION_LENGTH + 50}
          editable={!sending}
          accessibilityLabel="Pregunta para el asistente"
        />
        <View style={styles.composerRow}>
          <Text style={[styles.counter, tooLong && styles.counterError]}>
            {trimmed.length}/{MAX_QUESTION_LENGTH}
            {tooLong ? ' · demasiado larga' : ''}
          </Text>
          <Pressable
            onPress={send}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSend }}
            style={[styles.sendButton, { backgroundColor: canSend ? colors.navy : colors.border }]}
          >
            <Text style={[styles.sendText, !canSend && { color: colors.muted }]}>Enviar</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 24 },
  intro: { padding: 14, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderLeftWidth: 5, gap: 6 },
  introTitle: { fontSize: 16, fontWeight: '800', color: colors.navy },
  introText: { fontSize: 13, color: colors.navy, lineHeight: 19 },
  privacy: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  suggestions: { gap: 8 },
  suggestionsTitle: { fontSize: 12, fontWeight: '800', color: colors.muted, textTransform: 'uppercase' },
  suggestion: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: { fontSize: 13, color: colors.navy, fontWeight: '600' },
  bubble: { maxWidth: '88%', padding: 12, borderRadius: 16, gap: 6 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  errorBubble: { alignSelf: 'flex-start', backgroundColor: '#FFF6E5', borderWidth: 1, borderColor: colors.orange },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bubbleText: { fontSize: 14, color: colors.navy, lineHeight: 20 },
  userText: { color: colors.white },
  sources: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  composer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  input: {
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.navy,
  },
  composerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  counterError: { color: colors.darkPink },
  sendButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  sendText: { fontSize: 14, fontWeight: '800', color: colors.white },
});
