import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Hero from '../components/Hero';
import { colors, tabTheme } from '../theme/colors';

const faqs = [
  {
    q: '¿Cómo busco y filtro indicadores?',
    a: 'Ve a la pestaña Explorar, escribe una palabra clave en el buscador o selecciona una categoría (Bienestar, Educación, Tiempo y Rutina).',
  },
  {
    q: '¿Cómo comparo dos municipios?',
    a: 'Abre cualquier indicador y toca "Comparar municipios (A/B)" para elegir Municipio A y Municipio B de forma independiente.',
  },
  {
    q: '¿Dónde veo mis indicadores y noticias guardadas?',
    a: 'Toca la estrella ☆ en cualquier indicador o noticia y consúltalos desde Perfil → Favoritos.',
  },
  {
    q: '¿Para qué sirve la Verificación TEC?',
    a: 'Con Supabase conectado, una cuenta con correo @tec.mx confirmado habilita la participación en la encuesta Tec. En Perfil puedes consultar tu estado.',
  },
];

export default function HelpScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const theme = tabTheme.drawer;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Hero
        page={{
          emoji: '❓',
          title: 'Ayuda',
          text: 'Preguntas frecuentes sobre el uso de Jalisco Cómo Vamos.',
        }}
        color={theme.color}
        ink={theme.ink}
      />

      {faqs.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <Pressable
            key={item.q}
            onPress={() => setOpenIndex(isOpen ? null : idx)}
            style={styles.card}
          >
            <View style={styles.headerRow}>
              <Text style={styles.question}>{item.q}</Text>
              <Text style={styles.chevron}>{isOpen ? '−' : '+'}</Text>
            </View>
            {isOpen && <Text style={styles.answer}>{item.a}</Text>}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E1E5E8',
    gap: 8,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  question: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.navy },
  chevron: { fontSize: 20, fontWeight: '800', color: colors.muted },
  answer: { fontSize: 14, color: colors.muted, lineHeight: 20 },
});
