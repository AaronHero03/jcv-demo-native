import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LOW_SAMPLE_THRESHOLD } from '../data/filters';
import type { StatsResult } from '../data/indicatorSummaries';
import { colors } from '../theme/colors';

interface DataStatusBannerProps {
  result: StatsResult;
  loading?: boolean;
  /** Si se pasa, también avisa de muestras pequeñas o vacías. */
  sampleSize?: number | null;
}

/** Explica cuando hay respaldo sin conexión, datos no disponibles o muestras pequeñas. */
export default function DataStatusBanner({ result, loading, sampleSize }: DataStatusBannerProps) {
  const status = loading
    ? ({ tone: 'live', text: 'Consultando datos actualizados…' } as const)
    : describe(result);
  const n = result.stats && typeof sampleSize === 'number' ? sampleSize : null;
  const showEmptySample = n === 0;
  const showLowSample = n !== null && n > 0 && n < LOW_SAMPLE_THRESHOLD;

  if (!status && !showEmptySample && !showLowSample) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      {status && (
        <View style={[styles.banner, toneStyles[status.tone]]}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.navy} />
          ) : (
            <Text style={styles.dot}>{icons[status.tone]}</Text>
          )}
          <Text style={styles.text}>{status.text}</Text>
        </View>
      )}
      {showEmptySample && (
        <View style={[styles.banner, toneStyles.warn]}>
          <Text style={styles.dot}>ℹ️</Text>
          <Text style={styles.text}>Aún no hay respuestas para este grupo.</Text>
        </View>
      )}
      {showLowSample && (
        <View style={[styles.banner, toneStyles.warn]}>
          <Text style={styles.dot}>⚠️</Text>
          <Text style={styles.text}>
            Muestra pequeña (n={n}). El resultado no es representativo; interprétalo con cautela.
          </Text>
        </View>
      )}
    </View>
  );
}

type Tone = 'live' | 'offline' | 'warn';

function describe(result: StatsResult): { tone: Tone; text: string } | null {
  if (result.origin === 'remote') return null;
  if (result.origin === 'offline') {
    return result.reason === 'not-configured'
      ? { tone: 'offline', text: 'Datos locales de la encuesta AMG 2026 (base de datos no configurada).' }
      : { tone: 'offline', text: 'Sin conexión: mostrando el respaldo local de la encuesta AMG 2026.' };
  }
  switch (result.reason) {
    case 'tec-requires-connection':
      return { tone: 'warn', text: 'La Encuesta Tec se consulta en vivo. Conéctate a internet para verla.' };
    case 'invalid-filter':
      return { tone: 'warn', text: 'Filtro no válido. Se muestran los datos generales.' };
    default:
      return { tone: 'warn', text: 'Sin datos disponibles para esta combinación.' };
  }
}

const icons: Record<Tone, string> = { live: '🟢', offline: '📴', warn: '⚠️' };

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  dot: { fontSize: 12 },
  text: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.navy },
});

const toneStyles = StyleSheet.create({
  live: { backgroundColor: '#EEF7E6', borderColor: '#D5E04D' },
  offline: { backgroundColor: '#EEF2F8', borderColor: '#C9D5E6' },
  warn: { backgroundColor: '#FFF6E5', borderColor: '#F8981D' },
});
