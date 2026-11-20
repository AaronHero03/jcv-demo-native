import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Indicator } from '../data/indicators';
import { colors } from '../theme/colors';

/** Métrica a mostrar cuando hay un filtro activo (si no se pasa, se usa el total AMG). */
export interface IndicatorCardMetric {
  positivePct: number | null;
  average: number | null;
  n: number;
  note?: string;
}

interface IndicatorCardProps {
  indicator: Indicator;
  metric?: IndicatorCardMetric | null;
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
  metric,
  accentColor = colors.navy,
  isFavorite = false,
  onToggleFavorite,
  onPress,
}: IndicatorCardProps) {
  const positivePct = metric === undefined ? indicator.positivePct : (metric?.positivePct ?? null);
  const average = metric === undefined ? indicator.average : (metric?.average ?? null);
  const n = metric === undefined ? indicator.sampleSize : (metric?.n ?? 0);
  const footnote = metric?.note ?? `${indicator.period} · n=${n}`;

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
            {positivePct !== null ? `${positivePct}${indicator.unit}` : 'Sin dato'}
          </Text>
          {average !== null && <Text style={styles.metricSub}>Prom. {average}/5</Text>}
        </View>
        <Text style={styles.period} numberOfLines={1}>
          {footnote}
        </Text>
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
  period: { flexShrink: 1, fontSize: 12, color: colors.muted, fontWeight: '600', textAlign: 'right' },
});
