/**
 * Acceso mínimo a Supabase por HTTPS para la capa de datos de Genaro (filtros, comparativa y /ask).
 *
 * Se usa `fetch` directo contra PostgREST/Edge Functions para no depender (ni chocar) con
 * `src/lib/supabase.ts` de Aaron. Cuando ese cliente exista, Aaron solo debe llamar una vez a
 * `registerAccessTokenProvider(() => session?.access_token ?? null)` para que las peticiones
 * viajen con el JWT del usuario en lugar de la llave pública `anon`.
 *
 * Seguridad:
 *  - MASVS-NETWORK-1: solo se aceptan URLs `https://`. `http://` se permite únicamente en builds de
 *    desarrollo (`__DEV__`), para Supabase local (`supabase start`) y el servidor de evals; en
 *    producción cualquier URL http se rechaza.
 *  - MASVS-CODE-4: solo se pueden invocar las funciones RPC de la lista blanca, con parámetros
 *    nombrados (PostgREST los envía como parámetros, nunca como SQL concatenado).
 *  - La llave `anon` es pública por diseño (protegida con RLS); `service_role` y la llave de
 *    Gemini nunca viven en la app.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const REMOTE_TIMEOUT_MS = 8000;

export type RpcName = 'get_filtered_indicator' | 'compare_datasets';

export class RemoteError extends Error {
  constructor(
    message: string,
    public readonly kind: 'not_configured' | 'insecure_url' | 'timeout' | 'network' | 'http' | 'bad_response',
    public readonly status?: number
  ) {
    super(message);
    this.name = 'RemoteError';
  }
}

type AccessTokenProvider = () => string | null | undefined | Promise<string | null | undefined>;
let accessTokenProvider: AccessTokenProvider | null = null;

/** Punto de integración con la sesión real (Supabase Auth de Aaron). */
export function registerAccessTokenProvider(provider: AccessTokenProvider | null): void {
  accessTokenProvider = provider;
}

export async function getAccessToken(): Promise<string | null> {
  if (!accessTokenProvider) return null;
  try {
    const token = await accessTokenProvider();
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

export function getSupabaseUrl(): string | null {
  return SUPABASE_URL && SUPABASE_URL.trim() ? SUPABASE_URL.trim().replace(/\/+$/, '') : null;
}

export function getAnonKey(): string | null {
  return SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.trim() ? SUPABASE_ANON_KEY.trim() : null;
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  return Boolean(url && getAnonKey() && isAllowedUrl(url, true));
}

/** HTTPS obligatorio; http solo en desarrollo y solo si se permite explícitamente. */
export function isAllowedUrl(url: string, allowDevHttp = false): boolean {
  if (url.startsWith('https://')) return true;
  return allowDevHttp && __DEV__ && url.startsWith('http://');
}

export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new RemoteError('Tiempo de espera agotado', 'timeout');
    throw new RemoteError(error instanceof Error ? error.message : 'Error de red', 'network');
  } finally {
    clearTimeout(timer);
  }
}

/** Cabeceras comunes: llave pública + JWT del usuario si hay sesión. */
export async function buildAuthHeaders(): Promise<Record<string, string>> {
  const anon = getAnonKey();
  const token = await getAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (anon) headers.apikey = anon;
  const bearer = token ?? anon;
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  return headers;
}

/** Llama a una función guardada (RPC) de la lista blanca y devuelve el JSON sin interpretar. */
export async function callRpc(name: RpcName, params: Record<string, string>): Promise<unknown> {
  const baseUrl = getSupabaseUrl();
  if (!baseUrl || !getAnonKey()) throw new RemoteError('Supabase no configurado', 'not_configured');
  if (!isAllowedUrl(baseUrl, true)) throw new RemoteError('La URL de Supabase debe usar HTTPS', 'insecure_url');

  const response = await fetchWithTimeout(
    `${baseUrl}/rest/v1/rpc/${name}`,
    { method: 'POST', headers: await buildAuthHeaders(), body: JSON.stringify(params) },
    REMOTE_TIMEOUT_MS
  );
  if (!response.ok) throw new RemoteError(`RPC ${name} respondió ${response.status}`, 'http', response.status);
  try {
    return await response.json();
  } catch {
    throw new RemoteError(`RPC ${name} devolvió una respuesta no válida`, 'bad_response');
  }
}
