import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  DATASET_SOURCES,
  FILTER_TYPE_LABELS,
  FILTER_TYPES,
  FILTER_VALUES,
  filterValueLabel,
  SOURCE_LABELS,
  withFilterType,
  type IndicatorFilter,
} from '../data/filters';
import { indicatorCategories, type IndicatorCategory } from '../data/indicators';
import { colors } from '../theme/colors';

export type DimensionOption = 'Todas' | IndicatorCategory;

interface FilterBarProps {
  value: IndicatorFilter;
  onChange: (next: IndicatorFilter) => void;
  accentColor: string;
  accentInk: string;
  /** Si se pasa, se muestra la fila de dimensión (tema de la encuesta). */
  dimension?: DimensionOption;
  onDimensionChange?: (next: DimensionOption) => void;
  showSource?: boolean;
}

/**
 * Barra de filtros reutilizable: fuente (AMG 2026 / Encuesta Tec), dimensión y corte demográfico
 * (género, edad, estrato). Solo ofrece valores de la lista blanca de `data/filters.ts`.
 */
export default function FilterBar({
  value,
  onChange,
  accentColor,
  accentInk,
  dimension,
  onDimensionChange,
  showSource = true,
}: FilterBarProps) {
  return (
    <View style={styles.container}>
      {showSource && (
        <ChipRow label="Fuente">
          {DATASET_SOURCES.map((source) => (
            <Chip
              key={source}
              label={SOURCE_LABELS[source]}
              active={value.source === source}
              onPress={() => onChange({ ...value, source })}
              accentColor={accentColor}
              accentInk={accentInk}
            />
          ))}
        </ChipRow>
      )}

      {dimension !== undefined && onDimensionChange && (
        <ChipRow label="Dimensión">
          {indicatorCategories.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              active={dimension === cat}
              onPress={() => onDimensionChange(cat)}
              accentColor={accentColor}
              accentInk={accentInk}
            />
          ))}
        </ChipRow>
      )}

      <ChipRow label="Grupo">
        {FILTER_TYPES.map((type) => (
          <Chip
            key={type}
            label={FILTER_TYPE_LABELS[type]}
            active={value.filterType === type}
            onPress={() => onChange(withFilterType(value, type))}
            accentColor={accentColor}
            accentInk={accentInk}
          />
        ))}
      </ChipRow>

      {value.filterType !== 'general' && (
        <ChipRow label="">
          {FILTER_VALUES[value.filterType].map((v) => (
            <Chip
              key={v}
              label={filterValueLabel(v)}
              active={value.filterValue === v}
              onPress={() => onChange({ ...value, filterValue: v })}
              accentColor={colors.navy}
              accentInk={colors.white}
              small
            />
          ))}
        </ChipRow>
      )}
    </View>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      {label ? <Text style={styles.rowLabel}>{label}</Text> : <View style={styles.rowLabelSpacer} />}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {children}
      </ScrollView>
    </View>
  );
}

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  accentColor: string;
  accentInk: string;
  small?: boolean;
}

export function Chip({ label, active, onPress, accentColor, accentInk, small }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.chip,
        small && styles.chipSmall,
        active && { backgroundColor: accentColor, borderColor: accentColor },
      ]}
    >
      <Text style={[styles.chipText, small && styles.chipTextSmall, active && { color: accentInk }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { width: 70, fontSize: 11, fontWeight: '800', color: colors.muted, textTransform: 'uppercase' },
  rowLabelSpacer: { width: 70 },
  chips: { gap: 6, paddingVertical: 2, paddingRight: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSmall: { paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.navy },
  chipTextSmall: { fontSize: 12 },
});
