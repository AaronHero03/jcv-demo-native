import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../context/AppStateContext';
import { colors } from '../theme/colors';

const dots = [colors.brightYellow, colors.orange, colors.pink, colors.green, colors.yellow];

export default function WelcomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { loginAsGuest, loginAsUser } = useAppState();

  // replace (no push): al entrar, el botón atrás no regresa a la Bienvenida.
  const handleGuest = () => {
    loginAsGuest();
    navigation.replace('Main');
  };

  const handleUser = () => {
    loginAsUser('ciudadano@jalisco.mx');
    navigation.replace('Main');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.dots}>{dots.map((c) => <View key={c} style={[styles.dot, { backgroundColor: c }]} />)}</View>
      <Text style={styles.eyebrow}>JALISCO CÓMO VAMOS</Text>
      <Text style={styles.title}>Datos para entender cómo vivimos.</Text>
      <Pressable style={[styles.button, { backgroundColor: colors.yellow }]} onPress={handleGuest}><Text style={styles.buttonText}>Explorar sin cuenta</Text></Pressable>
      <Pressable style={[styles.button, styles.outline]} onPress={handleUser}><Text style={[styles.buttonText, { color: colors.white }]}>Iniciar sesión</Text></Pressable>
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
});
