import { useRef, useState } from 'react';
import { TextInput, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppState } from '../context/AppStateContext';
import { displayDate, loadTopics, postTopic } from '../lib/community';
import { useFocusedData } from '../hooks/useFocusedData';
import { supabase, messageOf } from '../lib/supabase';
import LoadNotice from '../components/LoadNotice';
import { colors } from '../theme/colors';

export default function ForumScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { userId } = useAppState();
  const topics = useFocusedData(loadTopics);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const posting = useRef(false);
  const submit = async () => {
    if (posting.current || !userId || !title.trim() || !body.trim()) return;
    posting.current = true; setBusy(true); setError('');
    try {
      const id = await postTopic(title, body);
      setTitle(''); setBody(''); topics.refresh();
      navigation.push('tema', { tab: 'comunidad', topicId: id });
    } catch (e) { setError(messageOf(e)); }
    finally { posting.current = false; setBusy(false); }
  };
  if (!topics.data) return <LoadNotice error={topics.error} retry={topics.refresh} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {userId && <View style={styles.card}>
        <Text style={styles.title}>Nuevo tema</Text>
        <TextInput accessibilityLabel="Título del tema" placeholder="Título" value={title} onChangeText={setTitle} maxLength={140} />
        <TextInput accessibilityLabel="Texto del tema" placeholder="Comparte tu pregunta u opinión" value={body} onChangeText={setBody} multiline maxLength={2000} />
        <Pressable accessibilityRole="button" onPress={submit} disabled={busy || !title.trim() || !body.trim()}>
          <Text style={styles.link}>{busy ? 'Publicando…' : 'Publicar tema'}</Text>
        </Pressable>
        {error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}
      </View>}
      {!topics.data.length && <LoadNotice text="Aún no hay temas publicados." />}
      {!userId && supabase && <Text style={styles.meta}>Inicia sesión para crear un tema o responder.</Text>}
      {topics.data.map((topic) => {
        return (
          <Pressable
            key={topic.id}
            onPress={() => navigation.push('tema', { tab: 'comunidad', topicId: topic.id })}
            style={styles.card}
          >
            <Text style={styles.meta}>
              {topic.author} · {displayDate(topic.createdAt)}
            </Text>
            <Text style={styles.title}>{topic.title}</Text>
            <Text style={styles.body} numberOfLines={2}>
              {topic.body}
            </Text>
            <View style={styles.footer}>
              <Text style={styles.link}>Ver hilo ›</Text>
            </View>
          </Pressable>
        );
      })}
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
    borderColor: colors.border,
    gap: 8,
  },
  meta: { fontSize: 12, fontWeight: '700', color: colors.muted },
  title: { fontSize: 17, fontWeight: '800', color: colors.navy },
  body: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  replies: { fontSize: 13, fontWeight: '700', color: colors.navy },
  link: { fontSize: 13, fontWeight: '800', color: colors.navy },
});
