import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Hero from '../components/Hero';
import { colors, tabTheme } from '../theme/colors';

export default function PrivacyScreen() {
  const theme = tabTheme.drawer;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Hero
        page={{
          emoji: '🔒',
          title: 'Privacidad',
          text: 'Cómo protegemos tu información en la aplicación.',
        }}
        color={theme.color}
        ink={theme.ink}
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. Datos en tu dispositivo</Text>
        <Text style={styles.body}>
          En esta versión, tus favoritos, respuestas de encuestas y comentarios del foro se almacenan
          únicamente en memoria durante la sesión activa y se reinician al cerrar sesión.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Anonimato estadístico</Text>
        <Text style={styles.body}>
          Los resultados mostrados de la Encuesta Bienestar de Jóvenes 2026 son agregados estadísticos
          anónimos. Nunca se muestran datos personales de los participantes.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>3. Verificación institucional</Text>
        <Text style={styles.body}>
          El correo @tec.mx ingresado en Perfil se utiliza únicamente para activar tu insignia de
          comunidad universitaria dentro de la app.
        </Text>
      </View>
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
    borderColor: '#E1E5E8',
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.navy },
  body: { fontSize: 14, color: colors.navy, lineHeight: 20 },
});
