import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppState } from '../context/AppStateContext';
import { newsItems } from '../data/community';
import { colors } from '../theme/colors';

export default function NewsScreen() {
  const { isFavorite, toggleFavorite } = useAppState();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {newsItems.map((item) => {
        const fav = isFavorite(item.id);
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.topRow}>
              <Text style={styles.meta}>
                {item.source} · {item.date}
              </Text>
              <Pressable onPress={() => toggleFavorite(item.id, 'news')} hitSlop={10}>
                <Text style={styles.star}>{fav ? '⭐' : '☆'}</Text>
              </Pressable>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.summary}>{item.summary}</Text>
          </View>
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
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 12, fontWeight: '700', color: colors.muted },
  star: { fontSize: 20 },
  title: { fontSize: 17, fontWeight: '800', color: colors.navy },
  summary: { fontSize: 14, color: colors.muted, lineHeight: 20 },
});
