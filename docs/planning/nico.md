# Plan Individual — Nico (Encuesta Tec, Comunidad, Admin, Stripe Checkout y Hardening CI)

**Rol:** Captura de Encuesta Tec, Comunidad y Admin (Fase 1) + Pagos con Stripe Checkout y Seguridad CI/SBOM (Fase 2).

---

## Fase 1 — Captura de Encuesta Tec, Comunidad y Panel Admin

**Ramas (PR hacia `dev`):** `nico/encuesta-tec-supabase`, `nico/comunidad-admin-supabase`

### 1. Captura de encuesta externa Tec (`nico/encuesta-tec-supabase`)
- [x] Conectar `ParticipateScreen.tsx` y `SurveyScreen.tsx` a Supabase (`surveyCatalog.ts`, `surveyDraft.ts`) con cifrado local de borrador (`draftCipher.ts` / `draftCipher.web.ts`).

### 2. Comunidad y Panel de Administración (`nico/comunidad-admin-supabase`)
- [x] Conectar `NewsScreen.tsx`, `ForumScreen.tsx` y `TopicScreen.tsx` a Supabase (`src/lib/community.ts`).
- [x] Implementar `src/screens/AdminScreen.tsx` (`Proceso 5.0`), `src/lib/publication.ts` y confirmación biométrica/dispositivo (`src/lib/deviceConfirmation.ts` $\rightarrow$ `MASVS-AUTH-3`).

### 3. Integración con Stripe Checkout y CI (`nico/stripe-checkout-donations`, `nico/masvs-hardening-ci`)
- [x] Crear Edge Functions `create-checkout-session` y `stripe-webhook` con pruebas en `supabase/functions/payments_test.ts`.
- [x] Conectar `DonationsScreen.tsx` a Stripe Checkout con confirmación biométrica.
- [x] Agregar `.github/workflows/security-checks.yml` (`npm audit` + SBOM) y `tests/nico-database.test.mjs`.
- [ ] Resolver conflictos al hacer merge con los PRs de Aaron (#6/#7/#8) y Genaro (#5) en `dev`.

**Dependencias en Fase 2:**
- Usa la tabla `donations` (creada por Carlos en Fase 1) y el JWT de sesión (creado por Aaron en Fase 1), sin bloqueos externos.
