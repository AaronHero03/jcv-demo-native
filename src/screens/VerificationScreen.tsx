import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppState } from '../context/AppStateContext';
import { colors, tabTheme } from '../theme/colors';

export default function VerificationScreen() {
  const { isTecVerified, userEmail, verifyTecEmail } = useAppState();
  const [email, setEmail] = useState(userEmail ?? '');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const theme = tabTheme.perfil;

  const handleVerify = () => {
    const ok = verifyTecEmail(email);
    if (ok) {
      setMessage({ type: 'ok', text: 'Correo institucional verificado correctamente.' });
    } else {
      setMessage({ type: 'err', text: 'Ingresa un correo válido terminado en @tec.mx' });
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.emoji}>🎓</Text>
        <Text style={styles.title}>Verificación institucional TEC</Text>
        <Text style={styles.desc}>
          Valida tu correo @tec.mx para activar tu insignia de comunidad universitaria.
        </Text>

        {isTecVerified ? (
          <View style={styles.verifiedBox}>
            <Text style={styles.verifiedText}>✅ Cuenta verificada: {userEmail}</Text>
          </View>
        ) : (
          <>
            <TextInput
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setMessage(null);
              }}
              placeholder="tu.nombre@tec.mx"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <Pressable onPress={handleVerify} style={[styles.btn, { backgroundColor: theme.color }]}>
              <Text style={[styles.btnText, { color: theme.ink }]}>Verificar correo</Text>
            </Pressable>
          </>
        )}

        {message && (
          <Text style={[styles.msg, message.type === 'err' ? styles.err : styles.ok]}>
            {message.text}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  card: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E1E5E8',
    gap: 12,
  },
  emoji: { fontSize: 34 },
  title: { fontSize: 20, fontWeight: '800', color: colors.navy },
  desc: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#E1E5E8',
    fontSize: 15,
    color: colors.navy,
  },
  btn: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '800' },
  verifiedBox: { padding: 14, borderRadius: 12, backgroundColor: '#EAF6EE' },
  verifiedText: { fontSize: 14, fontWeight: '700', color: '#2E8B57' },
  msg: { fontSize: 13, fontWeight: '700' },
  ok: { color: '#2E8B57' },
  err: { color: colors.pink },
});
