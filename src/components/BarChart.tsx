import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export interface BarChartItem {
  label: string;
  value: number;
  secondaryValue?: number;
  valueLabel?: string;
  secondaryLabel?: string;
}

interface BarChartProps {
  items: BarChartItem[];
  maxValue?: number;
  primaryColor?: string;
  secondaryColor?: string;
  unit?: string;
}

/**
 * Gráfica de barras horizontal en React Native puro, compatible con modo simple o comparativo (A vs B).
 */
export default function BarChart({
  items,
  maxValue = 100,
  primaryColor = colors.navy,
  secondaryColor = colors.orange,
  unit = '%',
}: BarChartProps) {
  const safeMax = maxValue > 0 ? maxValue : 100;

  return (
    <View style={styles.container}>
      {items.map((item) => {
        const primaryWidth = Math.min(100, Math.max(0, (item.value / safeMax) * 100));
        const hasSecondary = typeof item.secondaryValue === 'number';
        const secondaryWidth = hasSecondary
          ? Math.min(100, Math.max(0, ((item.secondaryValue ?? 0) / safeMax) * 100))
          : 0;

        return (
          <View key={item.label} style={styles.row}>
            <View style={styles.labelRow}>
              <Text style={styles.label} numberOfLines={2}>
                {item.label}
              </Text>
              <Text style={styles.valueText}>
                {item.valueLabel ?? `${item.value}${unit}`}
                {hasSecondary ? `  vs  ${item.secondaryLabel ?? `${item.secondaryValue}${unit}`}` : ''}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${primaryWidth}%`, backgroundColor: primaryColor }]} />
            </View>
            {hasSecondary && (
              <View style={[styles.track, { marginTop: 4 }]}>
                <View style={[styles.bar, { width: `${secondaryWidth}%`, backgroundColor: secondaryColor }]} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  row: { gap: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  label: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.navy },
  valueText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  track: { height: 10, borderRadius: 6, backgroundColor: '#E8ECEF', overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 6 },
});
