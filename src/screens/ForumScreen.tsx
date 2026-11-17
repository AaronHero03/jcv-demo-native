import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppState } from '../context/AppStateContext';
import { forumTopics } from '../data/community';
import { colors } from '../theme/colors';

export default function ForumScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { forumRepliesByTopic } = useAppState();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {forumTopics.map((topic) => {
        const extraReplies = forumRepliesByTopic[topic.id]?.length ?? 0;
        const totalReplies = topic.initialReplies.length + extraReplies;

        return (
          <Pressable
            key={topic.id}
            onPress={() => navigation.push('tema', { tab: 'comunidad', topicId: topic.id })}
            style={styles.card}
          >
            <Text style={styles.meta}>
              {topic.author} · {topic.createdAt}
            </Text>
            <Text style={styles.title}>{topic.title}</Text>
            <Text style={styles.body} numberOfLines={2}>
              {topic.body}
            </Text>
            <View style={styles.footer}>
              <Text style={styles.replies}>💬 {totalReplies} respuestas</Text>
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
