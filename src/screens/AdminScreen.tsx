import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import LoadNotice from '../components/LoadNotice';
import { useAppState } from '../context/AppStateContext';
import { useFocusedData } from '../hooks/useFocusedData';
import { confirmOnDevice } from '../lib/deviceConfirmation';
import { changePublication, loadPublications, publicationTypes, type PublicationType } from '../lib/publication';
import { messageOf } from '../lib/supabase';
import { colors } from '../theme/colors';

export default function AdminScreen() {
  const { isAdmin, userId } = useAppState();
  return isAdmin && userId ? <PublicationPanel key={userId} /> : <LoadNotice text="Se requiere una cuenta administradora." />;
}

function PublicationPanel() {
  const [kind, setKind] = useState<PublicationType>('surveys');
  const rows = useFocusedData(useCallback(() => loadPublications(kind), [kind]));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);

  async function toggle(id: string, title: string, visible: boolean) {
    if (working.current) return;
    working.current = true; setBusy(true); setMessage('');
    try {
      await confirmOnDevice((visible ? 'Publicar ' : 'Ocultar ') + title);
      await changePublication(kind, id, visible);
      rows.refresh();
      setMessage(visible ? 'Contenido publicado.' : 'Contenido oculto.');
    } catch (e) { setMessage(messageOf(e)); }
    finally { setBusy(false); working.current = false; }
  }

  return <ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.heading}>Publicación de contenido</Text>
    <View style={styles.tabs}>{(Object.keys(publicationTypes) as PublicationType[]).map(type =>
      <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected: kind === type }}
        disabled={busy} onPress={() => { setKind(type); setMessage(''); }} style={[styles.tab, kind === type && styles.active]}>
        <Text style={{ color: kind === type ? colors.white : colors.navy }}>{publicationTypes[type]}</Text>
      </Pressable>)}</View>
    {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
    {!rows.data ? <LoadNotice error={rows.error} retry={rows.refresh} /> : rows.data.length === 0 ?
      <LoadNotice text="Todavía no hay elementos en esta sección." /> : rows.data.map(row =>
        <View key={row.id} style={styles.card}>
          <Text style={styles.title}>{row.title}</Text>
          <Text>{row.visible ? 'Publicado' : 'Oculto'}</Text>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => toggle(row.id, row.title, !row.visible)}>
            <Text style={styles.link}>{row.visible ? 'Ocultar' : 'Publicar'}</Text>
          </Pressable>
        </View>)}
  </ScrollView>;
}
const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 }, heading: { fontWeight: '800', fontSize: 21, color: colors.navy },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tab: { padding: 12, borderRadius: 12, backgroundColor: colors.white }, active: { backgroundColor: colors.navy },
  card: { gap: 8, padding: 16, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  title: { fontWeight: '700', color: colors.navy, fontSize: 16 }, link: { paddingVertical: 6, fontWeight: '700', color: colors.navy },
});
