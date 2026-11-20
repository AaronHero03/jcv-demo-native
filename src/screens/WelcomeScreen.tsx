import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../context/AppStateContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { colors } from '../theme/colors';

const dots = [colors.brightYellow, colors.orange, colors.pink, colors.green, colors.yellow];

export default function WelcomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { loginAsGuest, loginAsUser, signInWithPassword, signUpWithPassword } = useAppState();

  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleGuest = () => {
    loginAsGuest();
    navigation.replace('Main');
  };

  const handleUser = () => {
    if (!isSupabaseConfigured) {
      loginAsUser('ciudadano@jalisco.mx');
      navigation.replace('Main');
      return;
    }
    setShowAuthForm(true);
    setErrorMsg(null);
  };

  const handleAuthSubmit = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    const res = isRegister
      ? await signUpWithPassword(email, password)
      : await signInWithPassword(email, password);
    setSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error ?? 'Error de autenticación.');
      return;
    }
    navigation.replace('Main');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.dots}>
        {dots.map((c) => (
          <View key={c} style={[styles.dot, { backgroundColor: c }]} />
        ))}
      </View>
      <Text style={styles.eyebrow}>JALISCO CÓMO VAMOS</Text>
      <Text style={styles.title}>Datos para entender cómo vivimos.</Text>

      {showAuthForm ? (
        <View style={styles.form}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Correo electrónico"
            placeholderTextColor="rgba(255,255,255,0.55)"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña (mín. 6 caracteres)"
            placeholderTextColor="rgba(255,255,255,0.55)"
            secureTextEntry
            style={styles.input}
          />
          {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
          <Pressable
            style={[styles.button, { backgroundColor: colors.yellow }]}
            onPress={handleAuthSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.navy} />
            ) : (
              <Text style={styles.buttonText}>{isRegister ? 'Crear cuenta' : 'Entrar'}</Text>
            )}
          </Pressable>
          <Pressable onPress={() => setIsRegister((prev) => !prev)} style={styles.switchBtn}>
            <Text style={styles.switchText}>
              {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </Text>
          </Pressable>
          <Pressable onPress={() => setShowAuthForm(false)} style={styles.switchBtn}>
            <Text style={styles.switchText}>Volver</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Pressable style={[styles.button, { backgroundColor: colors.yellow }]} onPress={handleGuest}>
            <Text style={styles.buttonText}>Explorar sin cuenta</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.outline]} onPress={handleUser}>
            <Text style={[styles.buttonText, { color: colors.white }]}>Iniciar sesión</Text>
          </Pressable>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 26, backgroundColor: colors.navy },
  dots: { flexDirection: 'row', gap: 10, marginBottom: 26 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  eyebrow: { color: '#83DED4', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: colors.white, fontSize: 34, fontWeight: '800', marginTop: 8, marginBottom: 30 },
  button: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  outline: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  buttonText: { color: colors.navy, fontSize: 16, fontWeight: '700' },
  form: { gap: 10 },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 14,
    color: colors.white,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  errorText: { color: colors.brightYellow, fontSize: 13, fontWeight: '700' },
  switchBtn: { alignItems: 'center', paddingVertical: 6 },
  switchText: { color: '#83DED4', fontSize: 13, fontWeight: '700' },
});
