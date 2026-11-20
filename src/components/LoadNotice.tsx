import { Pressable, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export default function LoadNotice({ error, retry, text = 'Cargando…' }:
  { error?: string; retry?: () => void; text?: string }) {
  return <View style={{ padding: 16, gap: 8 }}>
    <Text accessibilityLiveRegion="polite" style={{ color: colors.navy }}>{error || text}</Text>
    {error && retry && <Pressable accessibilityRole="button" onPress={retry}>
      <Text style={{ color: colors.navy, fontWeight: '700' }}>Reintentar</Text>
    </Pressable>}
  </View>;
}
