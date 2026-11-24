import { Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { registerAccessTokenProvider } from '../services/supabaseRest';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const memoryStorage = new Map<string, string>();

/**
 * Adapter de almacenamiento seguro para JWT/sesión (MASVS-STORAGE-1/2).
 * En iOS/Android usa expo-secure-store (Keychain/Keystore); en web usa memoria.
 */
const secureStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem(key);
      }
      return memoryStorage.get(key) ?? null;
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
        return;
      }
      memoryStorage.set(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
        return;
      }
      memoryStorage.delete(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: secureStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

if (supabase) {
  const client = supabase;
  registerAccessTokenProvider(async () => {
    const { data } = await client.auth.getSession();
    return data.session?.access_token ?? null;
  });
}

export function database(): SupabaseClient {
  if (!supabase) throw new Error('Conecta Supabase para usar esta función.');
  return supabase;
}

export function messageOf(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'No se pudo completar la operación. Vuelve a intentarlo.';
}
