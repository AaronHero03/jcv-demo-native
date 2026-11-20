# Fase 2 — Servicios Externos (Stripe Checkout, Asistente IA `/ask`) y Cierre MASVS

**Objetivo:** Conectar los dos servicios externos del DFD (`Proceso 4.0`) sobre la base sólida construida en la Fase 1 y completar la auditoría final de seguridad (**Stage 4**).  
**Prerrequisito:** Fase 1 fusionada en `dev` (tablas `donations` y `assistant_logs` ya creadas, `Auth` y consultas de indicadores funcionando).

---

## 1. Reparto en Fase 2

| Integrante | Responsabilidad en Fase 2 | Entregables |
| :--- | :--- | :--- |
| **Aaron** | Backend del Asistente IA: Edge Function `/ask` con **Gemini** + defensas `D1`, `D2`, `D3` + registro sin texto (`T7`) + evaluación con `evals/`. | `supabase/functions/ask/index.ts`, reporte `evals/results.json` |
| **Genaro** | Pantalla real del Asistente (`AsistenteScreen.tsx`) conectada a `/ask` con renderizado seguro en `<Text>` (`T6`) y manejo de límites (`413`, `429`, `503`). | `AsistenteScreen.tsx`, conexión en `TabStack.tsx` |
| **Nico** | Integración real de **Stripe Checkout** (`create-checkout-session` + `stripe-webhook` + `expo-web-browser` + biometría) en `DonationsScreen.tsx` + CI (`npm audit` y SBOM). | Edge Functions de Stripe, `DonationsScreen.tsx`, `.github/workflows/security-checks.yml` |
| **Carlos** | Ajustes de consultas SQL para `/ask`, verificación de políticas RLS en `donations` / `assistant_logs` y pruebas de acceso para Stage 4. | Evidencia SQL/RLS y soporte a `/ask` |

---

## 2. Arquitectura de Integraciones Externas (`Proceso 4.0`)

### A. Asistente IA (`/ask` con Gemini)
1. La app envía `{ question }` con el JWT del usuario a la Edge Function `/ask` (HTTPS).
2. **D1 (Anti-abuso):** valida JWT, máximo 500 caracteres (`HTTP 413`), máximo 30 peticiones/minuto (`HTTP 429`) y tope de presupuesto diario (`HTTP 503`).
3. **D2 / D3 (Anti-inyección y Cero alucinaciones):** consulta las tablas/RPCs de Carlos en Supabase, envía solo esas filas a **Gemini (`gemini-3.5-flash-lite`)**, bloquea cualquier fuga del marcador secreto y verifica que toda cifra de la respuesta coincida con los datos consultados.
4. **Privacidad (`T7`):** guarda en `assistant_logs` únicamente `user_id`, `status_code` y `question_length` (nunca el texto de la pregunta).

### B. Donativos con Stripe Checkout
1. En `DonationsScreen.tsx`, el usuario elige monto y confirma con biometría/PIN (`expo-local-authentication` $\rightarrow$ `MASVS-AUTH-3`).
2. La app llama a la Edge Function `create-checkout-session` (con su JWT), que crea el pago en **Stripe** (usando `STRIPE_SECRET_KEY` solo en servidor), guarda la fila `'pending'` en `donations` y devuelve la URL segura de Stripe.
3. La app abre Stripe Checkout en `expo-web-browser` (funciona directo en Expo Go).
4. Cuando el pago termina, Stripe llama a `stripe-webhook`, que verifica la firma y cambia `donations.status` a `'succeeded'`.

---

## 3. Dependencias Explícitas en Fase 2
- **Genaro $\rightarrow$ Aaron (`/ask`):** Genaro no necesita esperar el despliegue en Supabase para empezar `AsistenteScreen.tsx`; puede probar contra el servidor local `http://localhost:3001/ask` (`evals/ask-server.js`) que ya usa el mismo formato `{ answer, sources[] }`.
- **Nico $\rightarrow$ Carlos/Aaron:** `DonationsScreen.tsx` usa la tabla `donations` (creada por Carlos en Fase 1) y el JWT de sesión (creado por Aaron en Fase 1), por lo que Nico puede trabajar en paralelo desde el Día 1 de Fase 2.

---

## 4. Criterios de Aceptación de Fase 2 (para PR `dev` $\rightarrow$ `main` y Stage 4)
- [ ] `DonationsScreen.tsx` completa un donativo de prueba en Stripe Checkout y actualiza su estado vía webhook.
- [ ] `AsistenteScreen.tsx` responde preguntas de la encuesta AMG/Tec desde `/ask` citando fuentes y declinando preguntas fuera de alcance.
- [ ] La suite `evals/` cumple los umbrales fijados en [evals/README.md](../../evals/README.md).
- [ ] `npm audit`, SBOM, `npx tsc --noEmit` y `npx expo lint` pasan en CI, dejando lista la evidencia para los 10+ requisitos **MASVS** de Stage 4.
