import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
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
          El borrador de tu encuesta se guarda cifrado en este dispositivo para que puedas retomarlo. Al completar el envío, la app elimina el borrador.
          {supabase ? ' Las respuestas enviadas se guardan en Supabase, vinculadas a tu cuenta para registrar tu participación. Las publicaciones visibles del foro se comparten con la comunidad.' : ' En esta vista previa, las respuestas enviadas y los comentarios del foro permanecen en la sesión de demostración.'}
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
          {supabase ? 'La cuenta institucional con correo confirmado habilita la encuesta Tec. Los donativos se procesan en Stripe Checkout. Puedes consultar su monto y estado desde tu cuenta.' : 'La cuenta y la insignia de esta vista previa son de demostración.'}
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
