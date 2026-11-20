# Plan Individual — Nico (Encuesta Tec, Comunidad, Admin, Stripe Checkout y Hardening CI)

**Rol:** Captura de Encuesta Tec, Comunidad y Admin (Fase 1) + Pagos con Stripe Checkout y Seguridad CI/SBOM (Fase 2).

---

## Fase 1 — Captura de Encuesta Tec, Comunidad y Panel Admin

**Ramas (PR hacia `dev`):** `nico/encuesta-tec-supabase`, `nico/comunidad-admin-supabase`

### 1. Captura de encuesta externa Tec (`nico/encuesta-tec-supabase`)
- [ ] Conectar `ParticipateScreen.tsx` y `SurveyScreen.tsx` a las tablas `surveys`, `survey_questions` y `survey_submissions` en Supabase.
- [ ] Guardar el progreso parcial de la encuesta en `AsyncStorage` (borrador local no sensible) y limpiarlo al enviar la respuesta final.
- [ ] Validar en cliente y servidor que todas las respuestas correspondan a opciones válidas (`MASVS-CODE-4`), evitando duplicados por usuario.

### 2. Comunidad y Panel de Administración (`nico/comunidad-admin-supabase`)
- [ ] Conectar `NewsScreen.tsx`, `ForumScreen.tsx` y `TopicScreen.tsx` a `news`, `forum_topics` y `forum_replies` en Supabase (con validación de textos antes de enviar).
- [ ] *(Opcional)* Agregar suscripción en vivo (`Realtime`) en `TopicScreen.tsx` para ver respuestas nuevas sin recargar.
- [ ] Implementar `src/screens/AdminScreen.tsx` (`Proceso 5.0` del DFD) y conectarlo en el menú lateral:
  - Permitir publicar u ocultar (`is_published`) indicadores, encuestas, noticias o temas del foro.
  - Exigir rol `'admin'` validado en Supabase y confirmación biométrica/PIN con `expo-local-authentication` (`MASVS-AUTH-3`).

**Dependencias en Fase 1:**
- Depende de Carlos (`src/types/database.ts`, tablas `surveys*`, `news`, `forum_*` y reglas RLS) y de Aaron (`src/lib/supabase.ts` y sesión JWT).
- Mientras llegan esos PRs a `dev`, puedes avanzar en la UI del borrador local y formularios usando la firma de `AppStateContext.tsx`.

---

## Fase 2 — Stripe Checkout y Hardening de Cadena de Suministro (`MASVS`)

**Ramas (PR hacia `dev`):** `nico/stripe-checkout-donations`, `nico/masvs-hardening-ci`

### 1. Integración con Stripe Checkout (`nico/stripe-checkout-donations`)
- [ ] Instalar `expo-web-browser` y `expo-local-authentication` con `npx expo install` (funciona directo en Expo Go sin rebuild nativo).
- [ ] Crear Edge Function `supabase/functions/create-checkout-session/index.ts`:
  - Valida JWT del usuario y monto positivo (`amount_mxn > 0`).
  - Crea la sesión de pago en **Stripe Checkout** usando `STRIPE_SECRET_KEY` (solo en servidor).
  - Inserta registro `'pending'` en `donations` y devuelve la URL segura de Stripe.
- [ ] Crear Edge Function `supabase/functions/stripe-webhook/index.ts`:
  - Verifica la firma `Stripe-Signature` del webhook y actualiza `donations.status` a `'succeeded'` o `'failed'` en Supabase.
- [ ] Conectar `src/screens/DonationsScreen.tsx`:
  - Pedir confirmación biométrica/PIN (`LocalAuthentication.authenticateAsync`, `MASVS-AUTH-3`) antes de iniciar el pago.
  - Abrir la URL de Stripe con `WebBrowser.openBrowserAsync(...)` y mostrar el historial/estado de donativos desde `donations`.

### 2. Hardening MASVS y CI (`nico/masvs-hardening-ci`)
- [ ] Configurar versiones mínimas de Android/iOS con soporte de parches en `app.json` (`MASVS-CODE-1`).
- [ ] Agregar workflow `.github/workflows/security-checks.yml` que corra `npx tsc --noEmit`, `npx expo lint`, `npm audit --audit-level=high` (`MASVS-CODE-3` / `M2`) y genere el archivo **SBOM** (`cyclonedx-npm`) como evidencia para Stage 4.

**Dependencias en Fase 2:**
- Usa la tabla `donations` (creada por Carlos en Fase 1) y el JWT de sesión (creado por Aaron en Fase 1), sin bloqueos externos.
