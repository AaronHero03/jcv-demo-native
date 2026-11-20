# Plan Individual — Nico (Encuesta Tec, Comunidad, Admin, Stripe Checkout y Hardening CI)

Las casillas marcadas corresponden al código incluido. Al final encontrarás los pasos para conectarlo y las comprobaciones pendientes en un dispositivo.

**Rol:** Captura de Encuesta Tec, Comunidad y Admin (Fase 1) + Pagos con Stripe Checkout y Seguridad CI/SBOM (Fase 2).

---

## Fase 1 — Captura de Encuesta Tec, Comunidad y Panel Admin

**Ramas (PR hacia `dev`):** `nico/encuesta-tec-supabase`, `nico/comunidad-admin-supabase`

### 1. Captura de encuesta externa Tec (`nico/encuesta-tec-supabase`)
- [x] Conectar `ParticipateScreen.tsx` y `SurveyScreen.tsx` a las tablas `surveys`, `survey_questions` y `survey_submissions` en Supabase.
- [x] Guardar el progreso parcial de la encuesta en `AsyncStorage` (borrador local no sensible) y limpiarlo al enviar la respuesta final.
- [x] Validar en cliente y servidor que todas las respuestas correspondan a opciones válidas (`MASVS-CODE-4`), evitando duplicados por usuario.

### 2. Comunidad y Panel de Administración (`nico/comunidad-admin-supabase`)
- [x] Conectar `NewsScreen.tsx`, `ForumScreen.tsx` y `TopicScreen.tsx` a `news`, `forum_topics` y `forum_replies` en Supabase (con validación de textos antes de enviar).
- [ ] *(Opcional)* Agregar suscripción en vivo (`Realtime`) en `TopicScreen.tsx` para ver respuestas nuevas sin recargar.
- [x] Implementar `src/screens/AdminScreen.tsx` (`Proceso 5.0` del DFD) y conectarlo en el menú lateral:
  - Permitir publicar u ocultar (`is_published`) indicadores, encuestas, noticias o temas del foro.
  - Exigir rol `'admin'` validado en Supabase y confirmación biométrica/PIN con `expo-local-authentication` (`MASVS-AUTH-3`).

**Dependencias en Fase 1:**
- Depende de Carlos (`src/types/database.ts`, tablas `surveys*`, `news`, `forum_*` y reglas RLS) y de Aaron (`src/lib/supabase.ts` y sesión JWT).
- Mientras llegan esos PRs a `dev`, puedes avanzar en la UI del borrador local y formularios usando la firma de `AppStateContext.tsx`.

---

## Fase 2 — Stripe Checkout y Hardening de Cadena de Suministro (`MASVS`)

**Ramas (PR hacia `dev`):** `nico/stripe-checkout-donations`, `nico/masvs-hardening-ci`

### 1. Integración con Stripe Checkout (`nico/stripe-checkout-donations`)
- [x] Instalar `expo-web-browser` y `expo-local-authentication` con `npx expo install` (Face ID en iOS requiere una compilación de desarrollo).
- [x] Crear Edge Function `supabase/functions/create-checkout-session/index.ts`:
  - Valida JWT del usuario y monto positivo (`amount_mxn > 0`).
  - Crea la sesión de pago en **Stripe Checkout** usando `STRIPE_SECRET_KEY` (solo en servidor).
  - Inserta registro `'pending'` en `donations` y devuelve la URL segura de Stripe.
- [x] Crear Edge Function `supabase/functions/stripe-webhook/index.ts`:
  - Verifica la firma `Stripe-Signature` del webhook y actualiza `donations.status` a `'succeeded'` o `'failed'` en Supabase.
- [x] Conectar `src/screens/DonationsScreen.tsx`:
  - Pedir confirmación biométrica/PIN (`LocalAuthentication.authenticateAsync`, `MASVS-AUTH-3`) antes de iniciar el pago.
  - Abrir la URL de Stripe con `WebBrowser.openBrowserAsync(...)` y mostrar el historial/estado de donativos desde `donations`.

### 2. Hardening MASVS y CI (`nico/masvs-hardening-ci`)
- [x] Configurar versiones mínimas de Android/iOS con soporte de parches en `app.json` (`MASVS-CODE-1`).
- [x] Agregar workflow `.github/workflows/security-checks.yml` que corra `npx tsc --noEmit`, `npx expo lint`, `npm audit --audit-level=high` (`MASVS-CODE-3` / `M2`) y genere el archivo **SBOM** (`cyclonedx-npm`) como evidencia para Stage 4.

**Dependencias en Fase 2:**
- Usa la tabla `donations` (creada por Carlos en Fase 1) y el JWT de sesión (creado por Aaron en Fase 1), sin bloqueos externos.

## Ejecutar esta entrega

Aplica los archivos del ZIP en la raíz de una copia de `jcv-demo-native-main`, junto a `package.json`. Para integrar en una rama que ya tenga trabajo de otras personas, combina los cambios de los archivos compartidos con Git, en particular `src/context/AppStateContext.tsx`, `src/lib/supabase.ts` y `package-lock.json`.

Desde esa carpeta, con Node.js 24, ejecuta estos comandos.

```sh
npm ci
npx expo start
```

Sin variables de entorno, **Entrar a la demo** permite recorrer el cuestionario con respuestas ficticias. Responde una pregunta, vuelve a Participar y abre otra vez la encuesta para recuperar el borrador. Completa las cinco secciones para ver el acuse y el registro de participación de esa sesión.

### Conectar las funciones de la fase 1

1. En el proyecto Supabase de pruebas, aplica en orden los dos archivos de `supabase/migrations/`. La primera migración crea los contratos de Carlos que usan estas pantallas, las políticas de acceso y los procedimientos. La segunda carga la encuesta con sus opciones y condiciones, los indicadores públicos del resumen y las noticias incluidas en la demo. Los datos de participación empiezan vacíos. Si `dev` ya tiene migraciones del equipo, revisa las definiciones y permisos compartidos al integrar.
2. Copia `.env.example` a `.env.local`. Pon la URL HTTPS del proyecto en `EXPO_PUBLIC_SUPABASE_URL` y la clave pública en `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Reinicia Expo.
3. En Supabase Authentication usa una cuenta de prueba con correo confirmado. Inicia sesión en la bienvenida. La encuesta Tec requiere correo confirmado del dominio `tec.mx`. Una cuenta particular puede participar en el foro. Los borradores se asocian a la cuenta y a la encuesta.
4. Para probar administración, inicia sesión una vez para crear el perfil. Desde el panel de Supabase, el responsable del proyecto puede asignar `role = 'admin'` al perfil de prueba. Vuelve a iniciar sesión y abre **Menú → Administración**. Publicar u ocultar requiere biometría o código del dispositivo. Prueba con una noticia y comprueba su visibilidad desde otra cuenta.
5. En **Comunidad → Foro**, crea un tema y responde desde otra cuenta. Los hilos se recargan al volver a la pantalla o al pulsar **Actualizar respuestas**. La suscripción Realtime del plan queda como mejora opcional.

El cliente compartido en `src/lib/supabase.ts` conserva la sesión en memoria y utiliza las cuentas existentes. Al cerrar la aplicación hay que volver a iniciar sesión. Aarón puede conectar aquí su persistencia segura y su flujo de registro. El borrador usa AES-GCM, AsyncStorage y una clave de SecureStore en móvil o una CryptoKey de IndexedDB en web. El cliente y PostgreSQL validan las mismas opciones. Un envío repetido por la misma cuenta conserva una sola fila.

### Probar Stripe en modo de prueba

1. En el proyecto Supabase de pruebas despliega las funciones incluidas. Desde la raíz del repositorio y con la CLI vinculada al proyecto correcto:

   ```sh
   npx supabase functions deploy create-checkout-session
   npx supabase functions deploy stripe-webhook
   ```

2. En el entorno de pruebas de Stripe, registra el destino `https://<REF_DEL_PROYECTO>.supabase.co/functions/v1/stripe-webhook`. Selecciona los eventos `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded` y `checkout.session.async_payment_failed`.
3. En los **secretos de las Edge Functions de Supabase**, configura `STRIPE_SECRET_KEY` con la clave secreta de pruebas de Stripe y `STRIPE_WEBHOOK_SECRET` con el secreto de firma de ese destino. La app móvil solo necesita las dos variables públicas de Supabase.
4. En Android o iOS, entra con una cuenta de pruebas y abre **Menú → Donativos**. Elige, por ejemplo, **$50 MXN**. Confirma el bloqueo local y completa Stripe Checkout con un método de prueba de Stripe. Vuelve a **Mis donativos → Actualizar historial**. El pago cambia de **Pendiente** a **Confirmado** cuando llega el webhook firmado. Cerrar el navegador conserva el estado comunicado por Stripe. [Pruebas de Stripe](https://docs.stripe.com/testing)
5. Para Face ID en iOS usa una compilación de desarrollo con el permiso de Face ID. En web puedes consultar contenido e historial. Las operaciones de publicar u ocultar y de abrir Checkout requieren la confirmación local de Android o iOS. Esta entrega fija el mínimo de instalación en Android 15 (API 35) e iOS 18. [Expo LocalAuthentication](https://docs.expo.dev/versions/v58.0.0/sdk/local-authentication/)

### Verificación reproducible

```sh
npx tsc --noEmit
npx expo lint
node --test tests/nico-database.test.mjs
deno test --allow-env --config supabase/functions/deno.json supabase/functions/payments_test.ts
npm audit --audit-level=high
npx cyclonedx-npm --package-lock-only --output-format JSON --output-file sbom.cdx.json
```

Las pruebas de base de datos ejecutan las migraciones en PostgreSQL local con PGlite. Cubren opciones y preguntas condicionales, duplicados, roles, moderación e historial privado. Las pruebas de pagos ejercitan los manejadores con el SDK de Stripe, firmas generadas para la prueba y servicios HTTP simulados. El workflow `.github/workflows/security-checks.yml` vuelve a generar el informe de auditoría y el inventario CycloneDX en cada PR a `dev` o `main`. Los dos informes se pueden descargar desde la ejecución del workflow en GitHub Actions.

Para la evidencia de Stage 4 queda ejecutar el flujo con el proyecto Supabase del equipo, Stripe en modo de prueba y un teléfono con bloqueo configurado. Las capturas del dispositivo, la entrega real del webhook de pruebas y la ejecución en GitHub Actions corresponden a ese entorno.

**Resultado local del 20 de noviembre de 2026.** Pasaron TypeScript, lint, las seis pruebas de base de datos y los cuatro escenarios de pagos con servicios simulados. Expo exportó los paquetes de Android, iOS y web. Se recorrieron las cinco secciones de la encuesta en la interfaz web con un DOM de prueba, incluida la recuperación del borrador después de recargar y su eliminación al enviar. `npm audit` reportó cero hallazgos altos o críticos y tres moderados en la cadena de `minimatch`, `@expo/fingerprint` y `expo`.
