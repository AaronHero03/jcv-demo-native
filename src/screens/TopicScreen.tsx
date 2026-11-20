import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRoute, type ParamListBase, type RouteProp } from '@react-navigation/native';
import { useAppState } from '../context/AppStateContext';
import { displayDate, loadThread, postReply } from '../lib/community';
import { useFocusedData } from '../hooks/useFocusedData';
import { supabase, messageOf } from '../lib/supabase';
import LoadNotice from '../components/LoadNotice';
import { colors, tabTheme } from '../theme/colors';

export default function TopicScreen() {
  const route = useRoute<RouteProp<ParamListBase>>();
  const params = route.params as { topicId?: string } | undefined;
  const topicId = params?.topicId || '';
  const thread = useFocusedData(useCallback(() => loadThread(topicId), [topicId]));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const posting = useRef(false);
  const { userMode, userEmail, forumRepliesByTopic, addForumReply } = useAppState();
  const [draft, setDraft] = useState('');
  const theme = tabTheme.comunidad;

  if (thread.data === undefined) return <LoadNotice error={thread.error} retry={thread.refresh} />;
  if (!thread.data) return <LoadNotice text="Este tema ya no está publicado." />;
  const { topic, replies } = thread.data;
  const allReplies = supabase ? replies : [...replies, ...(forumRepliesByTopic[topic.id] || [])];

  const handleSend = async () => {
    if (posting.current || userMode !== 'user' || !draft.trim()) return;
    posting.current = true; setBusy(true); setError('');
    try {
      if (supabase) await postReply(topic.id, draft);
      else {
        const author = userEmail ? userEmail.split('@')[0] : 'Participante';
        addForumReply(topic.id, author, draft);
      }
      setDraft('');
      thread.refresh();
    } catch (e) { setError(messageOf(e)); }
    finally { posting.current = false; setBusy(false); }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.postCard}>
        <Text style={styles.meta}>
          {topic.author} · {displayDate(topic.createdAt)}
        </Text>
        <Text style={styles.title}>{topic.title}</Text>
        <Text style={styles.body}>{topic.body}</Text>
      </View>

      <Text style={styles.sectionTitle}>Respuestas ({allReplies.length})</Text>
      {allReplies.map((reply) => (
        <View key={reply.id} style={styles.replyCard}>
          <View style={styles.replyHeader}>
            <Text style={styles.replyAuthor}>{reply.author}</Text>
            <Text style={styles.replyTime}>{displayDate(reply.createdAt)}</Text>
          </View>
          <Text style={styles.replyText}>{reply.text}</Text>
        </View>
      ))}

      <Pressable accessibilityRole="button" onPress={thread.refresh}><Text style={styles.meta}>Actualizar respuestas</Text></Pressable>
      {userMode === 'user' ? <View style={styles.composer}>
        <TextInput
          maxLength={2000}
          value={draft}
          onChangeText={setDraft}
          placeholder="Escribe una respuesta para la comunidad..."
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
        />
        <Pressable disabled={busy || !draft.trim()} onPress={handleSend} style={[styles.sendBtn, { backgroundColor: theme.color }]}>
          <Text style={[styles.sendText, { color: theme.ink }]}>{busy ? 'Publicando…' : 'Publicar'}</Text>
        </Pressable>
        {error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}
      </View> : <Text style={styles.meta}>Inicia sesión para responder.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 10, paddingBottom: 36 },
  postCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  meta: { fontSize: 12, fontWeight: '700', color: colors.muted },
  title: { fontSize: 18, fontWeight: '800', color: colors.navy },
  body: { fontSize: 14, color: colors.navy, lineHeight: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.navy, marginTop: 6 },
  replyCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  replyHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  replyAuthor: { fontSize: 13, fontWeight: '800', color: colors.navy },
  replyTime: { fontSize: 12, color: colors.muted },
  replyText: { fontSize: 14, color: colors.navy, lineHeight: 19 },
  composer: {
    marginTop: 6,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  input: { minHeight: 64, fontSize: 14, color: colors.navy, textAlignVertical: 'top' },
  sendBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  sendText: { fontSize: 14, fontWeight: '800' },
});
