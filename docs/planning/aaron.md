# Plan Individual — Aaron (Auth, Almacenamiento Seguro, Perfil y Asistente IA `/ask`)

**Rol:** Cuentas de usuario (`Auth`), Seguridad de Sesión (`MASVS-STORAGE`), Perfil/Favoritos (Fase 1) y Backend IA `/ask` (Fase 2).

---

## Fase 1 — Cuentas, Almacenamiento Seguro, Perfil y Favoritos

**Ramas (PR hacia `dev`):** `aaron/supabase-auth-secure-storage`, `aaron/perfil-favoritos-supabase`

### 1. Cliente Supabase y almacenamiento seguro (`aaron/supabase-auth-secure-storage`)
- [x] Instalar `@supabase/supabase-js` y `expo-secure-store` con `npx expo install`.
- [x] Crear `src/lib/supabase.ts` usando `expo-secure-store` para guardar el token de sesión en el almacén seguro del teléfono (`MASVS-STORAGE-1`, `MASVS-STORAGE-2`).
- [x] Actualizar `src/context/AppStateContext.tsx`, `WelcomeScreen.tsx` y `DrawerContent.tsx` para usar inicio/cierre de sesión real con Supabase Auth (manteniendo el modo invitado de solo lectura).
- [x] Conectar `VerificationScreen.tsx` a verificación real de correo `@tec.mx` para actualizar `profiles.is_tec_verified` y `role = 'tec_verified'`.

### 2. Perfil y Favoritos en la nube (`aaron/perfil-favoritos-supabase`)
- [x] Conectar `ProfileScreen.tsx` para mostrar estado de sesión real, insignia `@tec.mx` y conteos reales.
- [x] Conectar `FavoritesScreen.tsx` y el contexto `toggleFavorite` a la tabla `favorites` de Supabase (con respaldo en memoria si el usuario está en modo invitado).

**Dependencias en Fase 1:**
- Depende de Carlos (`src/types/database.ts`, tablas `profiles` y `favorites`).
- Desbloquea a Genaro y Nico al publicar `src/lib/supabase.ts` y la sesión en `AppStateContext.tsx`.

---

## Fase 2 — Edge Function `/ask` con Gemini y Evaluación

**Rama (PR hacia `dev`):** `aaron/edge-ask-gemini`

### 1. Implementar Edge Function `/ask` (`supabase/functions/ask/index.ts`)
- [x] Migrar la lógica probada de `evals/ask-server.js` a Supabase Edge Functions usando **Gemini (`gemini-3.5-flash-lite`)** con `GEMINI_API_KEY` guardado como secreto en Supabase.
- [x] Aplicar controles del Threat Model:
  - **D1 (`T1`):** validar JWT de usuario, máximo 30 peticiones/minuto (`HTTP 429`), máximo 500 caracteres (`HTTP 413`) y tope de presupuesto diario (`HTTP 503`).
  - **D2 (`T2`):** separar instrucciones de la pregunta del usuario, usar marcador secreto (bloqueando si se filtra) y rechazar preguntas fuera de alcance según `DOC-ALCANCE`.
  - **D3 (`T3`):** consultar datos usando las funciones parametrizadas/tablas de Carlos (`MASVS-CODE-4`), devolver `{ answer, sources[] }` y verificar en servidor que toda cifra coincida con las filas devueltas.
  - **T7:** registrar en `assistant_logs` solo `user_id`, `status_code` y `question_length` (**sin guardar el texto de la pregunta**).
- [ ] Conectar `evals/promptfooconfig.yaml` a la URL desplegada de `/ask`, correr `evals/` y verificar los umbrales de [evals/README.md](../../evals/README.md).

**Dependencias en Fase 2:**
- Genaro puede ir desarrollando `AsistenteScreen.tsx` contra `http://localhost:3001/ask` (`evals/ask-server.js`) mientras despliegas `/ask` en Supabase.
