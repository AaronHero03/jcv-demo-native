import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Hero from '../components/Hero';
import { useAppState } from '../context/AppStateContext';
import { forumTopics, newsItems } from '../data/community';
import { datasetMeta, indicators } from '../data/indicators';
import { surveys } from '../data/surveys';
import { colors, tabTheme } from '../theme/colors';

export default function AdminScreen() {
  const { userMode, userEmail, favoriteIds, completedSurveyIds, forumRepliesByTopic, logout } =
    useAppState();
  const theme = tabTheme.drawer;

  const extraReplies = Object.values(forumRepliesByTopic).reduce((acc, list) => acc + list.length, 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Hero
        page={{
          emoji: '🛠️',
          title: 'Administración',
          text: 'Resumen operativo del catálogo y estado de la sesión actual.',
        }}
        color={theme.color}
        ink={theme.ink}
      />

      {userMode === 'guest' ? (
        <View style={styles.warnCard}>
          <Text style={styles.warnTitle}>Acceso limitado (Modo Invitado)</Text>
          <Text style={styles.warnText}>
            Inicia sesión desde la pantalla de bienvenida para habilitar las herramientas de
            administración.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Catálogo cargado</Text>
            <Text style={styles.row}>• Dataset: {datasetMeta.name}</Text>
            <Text style={styles.row}>• Encuestados: {datasetMeta.totalRespondents}</Text>
            <Text style={styles.row}>• Indicadores activos: {indicators.length}</Text>
            <Text style={styles.row}>• Encuestas configuradas: {surveys.length}</Text>
            <Text style={styles.row}>
              • Noticias / Temas de foro: {newsItems.length} / {forumTopics.length}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Actividad de sesión ({userEmail})</Text>
            <Text style={styles.row}>• Favoritos guardados: {favoriteIds.length}</Text>
            <Text style={styles.row}>• Encuestas completadas: {completedSurveyIds.length}</Text>
            <Text style={styles.row}>• Comentarios nuevos en foro: {extraReplies}</Text>

            <Pressable onPress={logout} style={styles.resetBtn}>
              <Text style={styles.resetText}>Reiniciar estado de sesión</Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  warnCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFF4D6',
    borderWidth: 1,
    borderColor: colors.yellow,
    gap: 6,
  },
  warnTitle: { fontSize: 16, fontWeight: '800', color: colors.navy },
  warnText: { fontSize: 14, color: colors.navy, lineHeight: 20 },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E1E5E8',
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.navy },
  row: { fontSize: 14, color: colors.navy },
  resetBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.pink,
    alignItems: 'center',
  },
  resetText: { fontSize: 14, fontWeight: '800', color: colors.white },
});
