# Contrato de datos — parte de Genaro (filtros, comparativa y asistente)

Este documento explica qué espera la app de Genaro del backend de **Carlos** (RPC) y de la sesión de **Aaron** (JWT y `/ask`). No modifica archivos de ellos.

## 1. Variables de entorno (`.env.local`, ya ignorado por Git)

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key pública>
# Opcional: si no se define, se usa ${SUPABASE_URL}/functions/v1/ask (o http://localhost:3001/ask en desarrollo)
EXPO_PUBLIC_ASK_URL=
```

- Solo van llaves **públicas**. `service_role`, `GEMINI_API_KEY` y `STRIPE_SECRET_KEY` nunca se ponen en variables `EXPO_PUBLIC_` porque quedan visibles en la app compilada.
- Sin estas variables la app sigue funcionando con el respaldo local AMG 2026.
- En builds de producción solo se aceptan URLs `https://`. `http://` solo se permite con `__DEV__`, para `supabase start` o `evals/ask-server.js`.

## 2. Funciones RPC que consume la app (Carlos)

La app llama `POST /rest/v1/rpc/<función>` con parámetros nombrados. Solo envía valores de la lista blanca de [src/data/filters.ts](../../src/data/filters.ts):

| Parámetro | Valores permitidos |
| :-- | :-- |
| `p_dataset_source` | `amg_2026`, `tec_2026` |
| `p_filter_type` | `general`, `gender`, `age_group`, `estrato` |
| `p_filter_value` | `all` · `Hombre`, `Mujer` · `15-19`, `20-24`, `25-29` · `Alto`, `Medio`, `Bajo` |

### `get_filtered_indicator(p_indicator_id, p_dataset_source, p_filter_type, p_filter_value)`

Debe devolver **una fila por opción de respuesta**:

| Columna | Tipo | Nota |
| :-- | :-- | :-- |
| `code` | int | Código de la opción (1–5). También se acepta `option_code`. |
| `label` | text | Etiqueta de la opción. |
| `count` | int | Conteo sin ponderar. |
| `pct` | numeric | Opcional: la app recalcula el porcentaje con los conteos. |
| `is_positive` | boolean | Opcional; si falta, se considera positivo `code >= 4`. |

Ejemplo de implementación sugerida (solo lectura, `SECURITY INVOKER`, respeta RLS):

```sql
CREATE OR REPLACE FUNCTION get_filtered_indicator(
  p_indicator_id TEXT, p_dataset_source TEXT, p_filter_type TEXT, p_filter_value TEXT)
RETURNS TABLE (code INT, label TEXT, count INT, pct NUMERIC, is_positive BOOLEAN)
LANGUAGE sql STABLE AS $$
  SELECT o.code, o.label, s.count, s.pct, o.is_positive
  FROM indicator_summaries s
  JOIN indicator_options o ON o.id = s.option_id
  JOIN indicators i ON i.id = s.indicator_id AND i.is_published
  WHERE s.indicator_id = p_indicator_id
    AND s.dataset_source = p_dataset_source
    AND s.filter_type = p_filter_type
    AND s.filter_value = p_filter_value
  ORDER BY o.code;
$$;
```

### `compare_datasets(p_indicator_id, p_filter_type, p_filter_value)`

Devuelve las mismas columnas **más `dataset_source`** (`amg_2026` o `tec_2026`), con las filas de ambos estudios. Si la encuesta Tec no tiene respuestas, basta con no devolver filas `tec_2026`: la app muestra "Aún no hay respuestas".

## 3. Respaldo offline

- [src/data/raw/amg_2026_filtros_offline.json](../../src/data/raw/amg_2026_filtros_offline.json) se genera con `python -I scripts/genaro_offline_breakdowns.py` a partir del CSV original. Los conteos no están ponderados y el corte `general` se verifica contra `bienestar_jovenes_2026_resumen.json`.
- Las filas usan el mismo formato que `indicator_summaries`. Cuando Carlos publique `amg_2026_summaries.json`, basta con cambiar el `import` en [src/data/indicatorSummaries.ts](../../src/data/indicatorSummaries.ts).
- La encuesta Tec es solo en vivo: sin conexión, la app avisa que requiere internet.

## 4. Sesión (Aaron)

Cuando exista `src/lib/supabase.ts`, registrar el JWT una sola vez (por ejemplo en `AppStateContext.tsx`):

```ts
import { registerAccessTokenProvider } from '../services/supabaseRest';

registerAccessTokenProvider(async () => (await supabase.auth.getSession()).data.session?.access_token ?? null);
```

Desde ese momento, las RPC y `/ask` viajan con `Authorization: Bearer <JWT del usuario>`. Si no hay sesión, se usa la llave `anon`.

## 5. Contrato de `/ask` (Edge Function de Aaron)

- **Petición:** `POST { "question": string }` con `Authorization: Bearer <JWT>` y `apikey: <anon>`.
- **Respuesta 200:** `{ "answer": string, "sources": string[] }`. Las fuentes son IDs del corpus (por ejemplo `Q_6`, `DOC-ALCANCE`), no URLs.
- **Errores que la app traduce a mensajes claros:**
  - `401`/`403`: sin sesión.
  - `413`: más de 500 caracteres.
  - `429`: más de 30 peticiones por minuto.
  - `503`: servicio o presupuesto agotado.
- **Pendiente para Aaron (T7):** [evals/ask-server.js](../../evals/ask-server.js) imprime en consola los primeros 60 caracteres de la pregunta. La Edge Function no debe registrar el texto, solo `user_id`, `status_code` y `question_length`.

## 6. Controles de seguridad implementados en esta parte (evidencia para Stage 4)

| Control | Dónde |
| :-- | :-- |
| MASVS-CODE-4: lista blanca de filtros y parámetros validados, incluso los que llegan por navegación | `src/data/filters.ts` (`isValidFilter`, `sanitizeFilter`), `IndicatorDetailScreen`, `CompareScreen` |
| MASVS-CODE-4: solo RPC de lista blanca, con parámetros nombrados (sin SQL dinámico) | `src/services/supabaseRest.ts` (`RpcName`, `callRpc`) |
| MASVS-CODE-4: validación de la forma de las respuestas del servidor | `parseOptionRows` en `indicatorSummaries.ts`, `parseAskResponse` en `askClient.ts` |
| MASVS-NETWORK-1: HTTPS obligatorio en producción y timeouts | `isAllowedUrl`, `fetchWithTimeout` en `supabaseRest.ts` |
| MASVS-AUTH-1: el JWT viaja al backend; la autorización la decide el servidor | `buildAuthHeaders`, `registerAccessTokenProvider` |
| T6 / MASVS-PLATFORM: la respuesta de la IA se muestra solo en `<Text>` (sin WebView, HTML ni links automáticos) y se limpian caracteres de control | `AsistenteScreen.tsx`, `toPlainText` en `askClient.ts` |
| T1: límite de 500 caracteres en el cliente y manejo de 413, 429 y 503 | `askClient.ts`, `AsistenteScreen.tsx` |
| T7 / MASVS-PRIVACY: la conversación vive solo en memoria y no se guarda ni se registra en el dispositivo | `AsistenteScreen.tsx` |
| Calidad de datos: aviso de muestras pequeñas (n < 30) y sin desglose municipal | `DataStatusBanner.tsx`, `IndicatorDetailScreen.tsx` |
