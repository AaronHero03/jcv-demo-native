import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

// Botón que lleva a otra pantalla (hace push en el stack).
export default function NavRow({ emoji, label, tint, onPress }: { emoji: string; label: string; tint: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && { borderColor: tint, transform: [{ scale: 0.98 }] }]}>
      <View style={[styles.emojiBox, { backgroundColor: `${tint}22` }]}><Text style={styles.emoji}>{emoji}</Text></View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  emojiBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 17 },
  label: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.navy },
  chevron: { fontSize: 24, color: colors.muted },
});
