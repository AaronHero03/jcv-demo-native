import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const configurationError = Boolean(url) !== Boolean(key)
  ? 'Configura tanto la URL como la clave pública de Supabase en .env.local.' : '';

// La rama de integración usa una sesión en memoria. Aarón puede sustituir este
// único cliente por el suyo cuando integre el almacenamiento seguro de sesiones.
export const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: false, detectSessionInUrl: false, autoRefreshToken: true },
}) : null;

export function database() {
  if (!supabase) throw new Error('Conecta Supabase para usar esta función.');
  return supabase;
}

export function messageOf(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return 'No se pudo completar la operación. Vuelve a intentarlo.';
}
