import { loadPublishedIndicators } from '../lib/publication';
import { useFocusedData } from '../hooks/useFocusedData';
import LoadNotice from '../components/LoadNotice';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppState } from '../context/AppStateContext';
import { loadNews } from '../lib/community';
import { colors } from '../theme/colors';

export default function FavoritesScreen() {
  const { favoriteIds, toggleFavorite } = useAppState();

  const published = useFocusedData(loadPublishedIndicators);
  const news = useFocusedData(loadNews);
  if (!news.data || !published.data) return <LoadNotice error={news.error || published.error} retry={() => { news.refresh(); published.refresh(); }} />;
  const favIndicators = published.data.filter((ind) => favoriteIds.includes(ind.id));
  const favNews = news.data.filter((n) => favoriteIds.includes(n.id));
  const isEmpty = favIndicators.length === 0 && favNews.length === 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {isEmpty ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>⭐</Text>
          <Text style={styles.emptyTitle}>Aún no tienes favoritos</Text>
          <Text style={styles.emptyText}>
            Toca la estrella en cualquier indicador o noticia para guardarlo aquí.
          </Text>
        </View>
      ) : (
        <>
          {favIndicators.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Indicadores ({favIndicators.length})</Text>
              {favIndicators.map((ind) => (
                <View key={ind.id} style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.info}>
                      <Text style={styles.badge}>{ind.category}</Text>
                      <Text style={styles.title}>{ind.title}</Text>
                      <Text style={styles.meta}>
                        {ind.positivePct}% · {ind.period}
                      </Text>
                    </View>
                    <Pressable onPress={() => toggleFavorite(ind.id)} hitSlop={10}>
                      <Text style={styles.star}>⭐</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </>
          )}

          {favNews.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Noticias ({favNews.length})</Text>
              {favNews.map((n) => (
                <View key={n.id} style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.info}>
                      <Text style={styles.badge}>
                        {n.source} · {n.date}
                      </Text>
                      <Text style={styles.title}>{n.title}</Text>
                    </View>
                    <Pressable onPress={() => toggleFavorite(n.id, 'news')} hitSlop={10}>
                      <Text style={styles.star}>⭐</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.navy, marginTop: 4 },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1, gap: 4 },
  badge: { fontSize: 12, fontWeight: '700', color: colors.muted },
  title: { fontSize: 16, fontWeight: '800', color: colors.navy },
  meta: { fontSize: 13, fontWeight: '700', color: colors.navy },
  star: { fontSize: 22 },
  emptyBox: { alignItems: 'center', padding: 36, gap: 8 },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.navy },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
});
