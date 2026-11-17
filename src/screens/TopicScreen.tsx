import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRoute, type ParamListBase, type RouteProp } from '@react-navigation/native';
import { useAppState } from '../context/AppStateContext';
import { getTopicById } from '../data/community';
import { colors, tabTheme } from '../theme/colors';

export default function TopicScreen() {
  const route = useRoute<RouteProp<ParamListBase>>();
  const params = route.params as { topicId?: string } | undefined;
  const topic = getTopicById(params?.topicId);
  const { userMode, userEmail, forumRepliesByTopic, addForumReply } = useAppState();
  const [draft, setDraft] = useState('');
  const theme = tabTheme.comunidad;

  const allReplies = [...topic.initialReplies, ...(forumRepliesByTopic[topic.id] ?? [])];

  const handleSend = () => {
    if (!draft.trim()) return;
    const author = userMode === 'user' && userEmail ? userEmail.split('@')[0] : 'Invitado';
    addForumReply(topic.id, author, draft);
    setDraft('');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.postCard}>
        <Text style={styles.meta}>
          {topic.author} · {topic.createdAt}
        </Text>
        <Text style={styles.title}>{topic.title}</Text>
        <Text style={styles.body}>{topic.body}</Text>
      </View>

      <Text style={styles.sectionTitle}>Respuestas ({allReplies.length})</Text>
      {allReplies.map((reply) => (
        <View key={reply.id} style={styles.replyCard}>
          <View style={styles.replyHeader}>
            <Text style={styles.replyAuthor}>{reply.author}</Text>
            <Text style={styles.replyTime}>{reply.createdAt}</Text>
          </View>
          <Text style={styles.replyText}>{reply.text}</Text>
        </View>
      ))}

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Escribe una respuesta para la comunidad..."
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
        />
        <Pressable onPress={handleSend} style={[styles.sendBtn, { backgroundColor: theme.color }]}>
          <Text style={[styles.sendText, { color: theme.ink }]}>Publicar</Text>
        </Pressable>
      </View>
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
