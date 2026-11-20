import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Hero from '../components/Hero';
import NavRow from '../components/NavRow';
import { loadNews, loadTopics } from '../lib/community';
import { useFocusedData } from '../hooks/useFocusedData';
import LoadNotice from '../components/LoadNotice';
import { colors, tabTheme } from '../theme/colors';

export default function CommunityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const theme = tabTheme.comunidad;

  const news = useFocusedData(loadNews);
  const topics = useFocusedData(loadTopics);
  if (!news.data || !topics.data) return <LoadNotice error={news.error || topics.error} retry={() => { news.refresh(); topics.refresh(); }} />;
  const newsItems = news.data;
  const forumTopics = topics.data;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Hero
        page={{
          emoji: '🤝',
          title: 'Comunidad',
          text: `${newsItems.length} noticias recientes y ${forumTopics.length} temas activos en el foro ciudadano.`,
        }}
        color={theme.color}
        ink={theme.ink}
      />

      <Text style={styles.sectionTitle}>Secciones</Text>
      <View style={styles.links}>
        <NavRow
          emoji="📰"
          label={`Noticias (${newsItems.length})`}
          tint={theme.color}
          onPress={() => navigation.push('noticias', { tab: 'comunidad' })}
        />
        <NavRow
          emoji="💬"
          label={`Foro ciudadano (${forumTopics.length} temas)`}
          tint={theme.color}
          onPress={() => navigation.push('foro', { tab: 'comunidad' })}
        />
      </View>

      {newsItems.length > 0 && <>
      <Text style={styles.sectionTitle}>Última noticia</Text>
      <View style={styles.previewCard}>
        <Text style={styles.meta}>
          {newsItems[0].source} · {newsItems[0].date}
        </Text>
        <Text style={styles.previewTitle}>{newsItems[0].title}</Text>
        <Text style={styles.previewBody}>{newsItems[0].summary}</Text>
      </View>
      </>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.navy, marginTop: 4 },
  links: { gap: 10 },
  previewCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  meta: { fontSize: 12, fontWeight: '700', color: colors.muted },
  previewTitle: { fontSize: 16, fontWeight: '800', color: colors.navy },
  previewBody: { fontSize: 13, color: colors.muted, lineHeight: 18 },
});
