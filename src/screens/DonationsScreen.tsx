import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { openBrowserAsync } from 'expo-web-browser';
import LoadNotice from '../components/LoadNotice';
import Hero from '../components/Hero';
import { useAppState } from '../context/AppStateContext';
import { useFocusedData } from '../hooks/useFocusedData';
import { confirmOnDevice } from '../lib/deviceConfirmation';
import { database, messageOf, supabase } from '../lib/supabase';
import { colors } from '../theme/colors';

const statusLabel: Record<string,string> = { pending: 'Pendiente', succeeded: 'Confirmado', failed: 'No completado' };
const presets = [30, 50, 100, 500];

export default function DonationsScreen() {
  const { userId } = useAppState();
  return <ScrollView contentContainerStyle={styles.content}>
    <Hero page={{ emoji: '💛', title: 'Donativos', text: 'Apoya las encuestas y el análisis ciudadano independiente en Jalisco.' }}
      color={colors.navy} ink={colors.white} />
    {userId && supabase ? <Checkout key={userId} userId={userId} /> :
      <LoadNotice text={supabase ? 'Inicia sesión para donar y consultar tus donativos.' : 'Vista previa. El pago se habilita al conectar Supabase y Stripe.'} />}
  </ScrollView>;
}

function Checkout({ userId }: { userId: string }) {
  const [amountText, setAmountText] = useState('50');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const attempt = useRef<{ amount: number; id: string } | null>(null);
  const history = useFocusedData(useCallback(async () => {
    const { data, error } = await database().from('donations').select('id,amount_mxn,status,created_at')
      .eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }, [userId]));
  const refresh = history.refresh;
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => listener.remove();
  }, [refresh]);

  const start = async () => {
    if (busyRef.current) return;
    const amount = Number(amountText);
    if (!/^\d+$/.test(amountText) || !Number.isSafeInteger(amount) || amount < 10 || amount > 999999) {
      setMessage('Elige un monto entero entre $10 y $999,999 MXN.'); return;
    }
    busyRef.current = true; setBusy(true); setMessage('');
    try {
      await confirmOnDevice('Confirmar donativo de $' + amount + ' MXN');
      if (attempt.current?.amount !== amount) attempt.current = { amount, id: randomUUID() };
      const { data, error } = await database().functions.invoke('create-checkout-session', {
        body: { amount_mxn: amount, request_id: attempt.current.id },
      });
      if (error) throw error;
      if (typeof data?.url !== 'string' || new URL(data.url).origin !== 'https://checkout.stripe.com') {
        throw new Error('No se recibió un enlace válido de Stripe Checkout.');
      }
      await openBrowserAsync(data.url);
      attempt.current = null;
      setMessage('Consulta el historial para ver la confirmación de Stripe.');
    } catch (e) { setMessage(messageOf(e)); }
    finally { refresh(); busyRef.current = false; setBusy(false); }
  };

  return <>
    <View style={styles.card}>
      <Text style={styles.heading}>Monto en pesos mexicanos</Text>
      <View style={styles.row}>{presets.map(n =>
        <Pressable key={n} disabled={busy} accessibilityRole="button" onPress={() => setAmountText(String(n))}
          style={[styles.pill, amountText === String(n) && styles.selected]}>
          <Text style={styles.label}>${n}</Text>
        </Pressable>)}</View>
      <TextInput accessibilityLabel="Monto en pesos mexicanos" keyboardType="number-pad" value={amountText}
        editable={!busy} onChangeText={setAmountText} maxLength={8} style={styles.input} />
      <Pressable accessibilityRole="button" disabled={busy} onPress={start} style={styles.button}>
        <Text style={styles.action}>{busy ? 'Abriendo…' : 'Continuar a Stripe Checkout'}</Text>
      </Pressable>
      {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
    </View>
    <View style={styles.card}>
      <Text style={styles.heading}>Mis donativos</Text>
      <Pressable accessibilityRole="button" onPress={refresh}><Text style={styles.label}>Actualizar historial</Text></Pressable>
      {!history.data ? <LoadNotice error={history.error} retry={refresh} /> :
        history.data.length === 0 ? <Text>Todavía no tienes donativos.</Text> : history.data.map(row =>
          <Text key={row.id}>${row.amount_mxn} MXN · {statusLabel[row.status] || row.status} · {new Date(row.created_at).toLocaleDateString('es-MX')}</Text>)}
    </View>
  </>;
}
const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 }, card: { padding: 16, gap: 12, borderRadius: 16, backgroundColor: colors.white },
  heading: { color: colors.navy, fontSize: 17, fontWeight: '800' }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  label: { fontWeight: '700', color: colors.navy }, pill: { backgroundColor: colors.background, padding: 12, borderRadius: 10 },
  selected: { backgroundColor: colors.yellow }, input: { padding: 12, borderColor: colors.border, borderWidth: 1, borderRadius: 10 },
  button: { alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: colors.navy }, action: { color: colors.white, fontWeight: '700' },
});
