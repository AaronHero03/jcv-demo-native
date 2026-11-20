import { useState } from 'react';
import { supabase, messageOf, configurationError } from '../lib/supabase';
import { TextInput, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../context/AppStateContext';
import { colors } from '../theme/colors';

const dots = [colors.brightYellow, colors.orange, colors.pink, colors.green, colors.yellow];

export default function WelcomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { loginAsGuest, loginAsUser, signIn } = useAppState();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // replace (no push): al entrar, el botón atrás no regresa a la Bienvenida.
  const handleGuest = () => {
    loginAsGuest();
    navigation.replace('Main');
  };

  const handleUser = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (supabase) await signIn(email, password);
      else loginAsUser();
      navigation.replace('Main');
    } catch (e) { setError(messageOf(e)); }
    finally { setBusy(false); }
  };

  if (configurationError) return <SafeAreaView style={styles.screen}><Text style={{ color: colors.white }}>{configurationError}</Text></SafeAreaView>;
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.dots}>{dots.map((c) => <View key={c} style={[styles.dot, { backgroundColor: c }]} />)}</View>
      <Text style={styles.eyebrow}>JALISCO CÓMO VAMOS</Text>
      <Text style={styles.title}>Datos para entender cómo vivimos.</Text>
      {supabase ? <>
        <TextInput accessibilityLabel="Correo" placeholder="Correo electrónico" value={email} onChangeText={setEmail}
          autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={styles.field} />
        <TextInput accessibilityLabel="Contraseña" placeholder="Contraseña" value={password} onChangeText={setPassword}
          secureTextEntry autoComplete="current-password" style={styles.field} />
      </> : <Text style={{ color: colors.white }}>Vista previa local · Usa respuestas ficticias</Text>}
      {error ? <Text accessibilityLiveRegion="polite" style={{ color: colors.white }}>{error}</Text> : null}
      <Pressable disabled={busy} style={[styles.button, { backgroundColor: colors.yellow }]} onPress={handleGuest}><Text style={styles.buttonText}>Explorar sin cuenta</Text></Pressable>
      <Pressable disabled={busy} style={[styles.button, styles.outline]} onPress={handleUser}><Text style={[styles.buttonText, { color: colors.white }]}>{busy ? 'Entrando…' : supabase ? 'Iniciar sesión' : 'Entrar a la demo'}</Text></Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  field: { backgroundColor: colors.white, padding: 12, borderRadius: 12, marginBottom: 8, color: colors.navy },
  screen: { flex: 1, justifyContent: 'center', padding: 26, backgroundColor: colors.navy },
  dots: { flexDirection: 'row', gap: 10, marginBottom: 26 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  eyebrow: { color: '#83DED4', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: colors.white, fontSize: 34, fontWeight: '800', marginTop: 8, marginBottom: 30 },
  button: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  outline: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  buttonText: { color: colors.navy, fontSize: 16, fontWeight: '700' },
});
