import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

// Botón que lleva a otra pantalla (hace push en el stack).
export default function NavRow({ emoji, label, tint, onPress }: { emoji: string; label: string; tint: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && { borderColor: tint, transform: [{ scale: 0.98 }] }]}>
      <View style={[styles.emojiBox, { backgroundColor: `${tint}33` }]}><Text style={styles.emoji}>{emoji}</Text></View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E1E5E8', backgroundColor: colors.white },
  emojiBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 20 },
  label: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.navy },
  chevron: { fontSize: 26, color: colors.muted },
});
