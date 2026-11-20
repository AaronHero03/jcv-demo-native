import AsyncStorage from '@react-native-async-storage/async-storage';
import { indicators } from '../data/indicators';
import { database, supabase } from './supabase';

export const publicationTypes = {
  indicators: 'Indicadores', surveys: 'Encuestas', news: 'Noticias', forum_topics: 'Temas del foro',
} as const;
export type PublicationType = keyof typeof publicationTypes;

export async function loadPublications(kind: PublicationType) {
  const field = kind === 'surveys' ? 'is_active' : 'is_published';
  const { data, error } = await database().from(kind).select('id,title,' + field).order('title');
  if (error) throw error;
  return (data as unknown as Record<string, unknown>[]).map(r => ({
    id: String(r.id), title: String(r.title), visible: r[field] === true,
  }));
}

export async function changePublication(kind: PublicationType, id: string, visible: boolean) {
  const { error } = await database().rpc('nico_set_publication', { p_kind: kind, p_id: id, p_visible: visible });
  if (error) throw error;
}

// Los gráficos del ZIP usan el resumen AMG distribuido por el equipo.
// Conserva para lectura offline los IDs de su última publicación conocida.
export async function loadPublishedIndicators() {
  if (!supabase) return indicators;
  const key = 'jcv.published.indicators:' + process.env.EXPO_PUBLIC_SUPABASE_URL;
  const { data, error, status } = await supabase.from('indicators').select('id').eq('is_published', true);
  let ids: string[];
  if (error) {
    if (status !== 0) throw error;
    const cached = await AsyncStorage.getItem(key);
    if (!cached) throw new Error('Conecta la app una vez para descargar el catálogo de indicadores.');
    ids = JSON.parse(cached);
  } else {
    ids = data.map(row => row.id);
    await AsyncStorage.setItem(key, JSON.stringify(ids)).catch(() => undefined);
  }
  return indicators.filter(item => ids.includes(item.id));
}
