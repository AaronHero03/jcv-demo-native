import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Indicator } from '../data/indicators';
import { colors } from '../theme/colors';

interface IndicatorCardProps {
  indicator: Indicator;
  accentColor?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onPress: () => void;
}

/**
 * Tarjeta resumen de indicador con métrica destacada y acceso opcional a favoritos.
 */
export default function IndicatorCard({
  indicator,
  accentColor = colors.navy,
  isFavorite = false,
  onToggleFavorite,
  onPress,
}: IndicatorCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && { borderColor: accentColor, transform: [{ scale: 0.99 }] }]}
    >
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: `${accentColor}22` }]}>
          <Text style={[styles.badgeText, { color: colors.navy }]}>{indicator.category}</Text>
        </View>
        {onToggleFavorite && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            hitSlop={10}
            accessibilityLabel={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          >
            <Text style={styles.star}>{isFavorite ? '⭐' : '☆'}</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.title}>{indicator.title}</Text>
      <Text style={styles.summary} numberOfLines={2}>
        {indicator.summary}
      </Text>

      <View style={styles.footer}>
        <View style={styles.metricGroup}>
          <Text style={styles.metricValue}>
            {indicator.positivePct}
            {indicator.unit}
          </Text>
          <Text style={styles.metricSub}>Prom. {indicator.average}/5</Text>
        </View>
        <Text style={styles.period}>{indicator.period}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  star: { fontSize: 18 },
  title: { fontSize: 16, fontWeight: '800', color: colors.navy },
  summary: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.track,
  },
  metricGroup: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  metricValue: { fontSize: 22, fontWeight: '800', color: colors.navy },
  metricSub: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  period: { fontSize: 12, color: colors.muted, fontWeight: '600' },
});
