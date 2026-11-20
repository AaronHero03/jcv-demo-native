/**
 * Cliente del Asistente IA (`/ask`) — lado app (Genaro).
 *
 * Contrato: POST { question } → 200 { answer: string, sources: string[] }.
 * Errores: 401/403 sin sesión válida · 413 pregunta > 500 caracteres · 429 > 30 peticiones/min ·
 * 503 servicio o presupuesto diario agotado.
 *
 * Controles en la app (los controles fuertes D1/D2/D3 viven en la Edge Function de Aaron):
 *  - MASVS-NETWORK-1: solo HTTPS (http únicamente en desarrollo contra evals/ask-server.js).
 *  - MASVS-AUTH-1: se envía el JWT del usuario (si hay sesión) en `Authorization`.
 *  - MASVS-CODE-4: longitud máxima validada antes de enviar y respuesta validada antes de mostrarse.
 *  - T6: la respuesta se trata como texto plano no confiable (sin HTML, sin links automáticos).
 *  - T7 / MASVS-PRIVACY: no se guarda ni se registra el texto de las preguntas en el dispositivo.
 */
import { buildAuthHeaders, fetchWithTimeout, getSupabaseUrl, isAllowedUrl, RemoteError } from './supabaseRest';

export const MAX_QUESTION_LENGTH = 500;
const ASK_TIMEOUT_MS = 30_000;
const MAX_ANSWER_LENGTH = 4000;
const MAX_SOURCES = 12;
const SOURCE_ID_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;
const DEV_LOCAL_ASK_URL = 'http://localhost:3001/ask';

export interface AskAnswer {
  answer: string;
  sources: string[];
}

export type AskErrorCode =
  | 'empty'
  | 'too_long'
  | 'unauthorized'
  | 'rate_limited'
  | 'unavailable'
  | 'timeout'
  | 'network'
  | 'not_configured'
  | 'insecure_url'
  | 'bad_response'
  | 'server';

export class AskError extends Error {
  constructor(
    public readonly code: AskErrorCode,
    public readonly status?: number
  ) {
    super(code);
    this.name = 'AskError';
  }
}

/** URL del servicio: variable explícita → Edge Function de Supabase → servidor local (solo desarrollo). */
export function resolveAskUrl(): string | null {
  const explicit = process.env.EXPO_PUBLIC_ASK_URL?.trim();
  if (explicit) return explicit;
  const supabaseUrl = getSupabaseUrl();
  if (supabaseUrl) return `${supabaseUrl}/functions/v1/ask`;
  return __DEV__ ? DEV_LOCAL_ASK_URL : null;
}

/** Quita caracteres de control (excepto saltos de línea) para mostrar solo texto plano. */
function toPlainText(value: string, maxLength: number): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, maxLength);
}

/** Valida la forma de la respuesta; cualquier cosa inesperada se rechaza. */
export function parseAskResponse(payload: unknown): AskAnswer {
  if (!payload || typeof payload !== 'object') throw new AskError('bad_response');
  const body = payload as Record<string, unknown>;
  if (typeof body.answer !== 'string' || !Array.isArray(body.sources)) throw new AskError('bad_response');
  const answer = toPlainText(body.answer, MAX_ANSWER_LENGTH);
  if (!answer) throw new AskError('bad_response');
  const sources = body.sources
    .filter((s): s is string => typeof s === 'string' && SOURCE_ID_PATTERN.test(s))
    .slice(0, MAX_SOURCES);
  return { answer, sources: Array.from(new Set(sources)) };
}

function errorForStatus(status: number): AskError {
  if (status === 401 || status === 403) return new AskError('unauthorized', status);
  if (status === 413) return new AskError('too_long', status);
  if (status === 429) return new AskError('rate_limited', status);
  if (status === 503) return new AskError('unavailable', status);
  return new AskError('server', status);
}

export async function askAssistant(rawQuestion: string): Promise<AskAnswer> {
  const question = rawQuestion.trim();
  if (!question) throw new AskError('empty');
  if (question.length > MAX_QUESTION_LENGTH) throw new AskError('too_long');

  const url = resolveAskUrl();
  if (!url) throw new AskError('not_configured');
  if (!isAllowedUrl(url, true)) throw new AskError('insecure_url');

  let response: Response;
  try {
    response = await fetchWithTimeout(
      url,
      { method: 'POST', headers: await buildAuthHeaders(), body: JSON.stringify({ question }) },
      ASK_TIMEOUT_MS
    );
  } catch (error) {
    if (error instanceof RemoteError && error.kind === 'timeout') throw new AskError('timeout');
    throw new AskError('network');
  }

  if (!response.ok) throw errorForStatus(response.status);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AskError('bad_response');
  }
  return parseAskResponse(payload);
}

/** Mensajes claros para la persona usuaria (sin detalles técnicos internos). */
export function messageForAskError(error: unknown): string {
  const code: AskErrorCode = error instanceof AskError ? error.code : 'server';
  switch (code) {
    case 'empty':
      return 'Escribe una pregunta antes de enviar.';
    case 'too_long':
      return `Tu pregunta es muy larga. Resúmela en máximo ${MAX_QUESTION_LENGTH} caracteres.`;
    case 'rate_limited':
      return 'Hiciste demasiadas preguntas en poco tiempo. Espera un minuto e inténtalo de nuevo.';
    case 'unavailable':
      return 'El asistente no está disponible en este momento (servicio saturado o límite diario alcanzado). Intenta más tarde.';
    case 'unauthorized':
      return 'Necesitas iniciar sesión con una cuenta válida para usar el asistente.';
    case 'timeout':
      return 'El asistente tardó demasiado en responder. Inténtalo de nuevo.';
    case 'network':
      return 'No hay conexión con el asistente. Revisa tu internet.';
    case 'not_configured':
      return 'El asistente no está configurado en esta versión de la app.';
    case 'insecure_url':
      return 'Conexión bloqueada: el asistente solo se usa por una conexión segura (HTTPS).';
    case 'bad_response':
      return 'Recibimos una respuesta no válida del asistente, así que no la mostramos.';
    default:
      return 'Ocurrió un error inesperado con el asistente. Inténtalo de nuevo.';
  }
}
