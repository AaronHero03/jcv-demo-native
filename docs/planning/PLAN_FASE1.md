# Fase 1 — Base Sólida, Encuestas, Filtros, Cuentas y Comunidad

**Objetivo:** Migrar la app de datos estáticos a **Supabase** con seguridad base (`MASVS`), cuentas reales, sistema de filtrado, captura en vivo de la encuesta externa Tec, comparativa **AMG 2026 vs. Tec**, comunidad y panel de administración.  
*(Las integraciones externas de Stripe y Chat IA quedan preparadas en la base de datos pero se conectan en [PLAN_FASE2.md](PLAN_FASE2.md)).*

---

## 1. Reparto Balanceado en Fase 1

| Integrante | Responsabilidad en Fase 1 | Pantallas / Módulos |
| :--- | :--- | :--- |
| **Carlos** | Esquema SQL completo (incluyendo tablas preparadas para Fase 2), reglas de acceso, carga de AMG 2026, agregación en vivo Tec y consultas seguras de filtrado/comparativa. | Supabase SQL, script ETL, `src/types/database.ts`, `amg_2026_summaries.json` |
| **Aaron** | Conexión base a Supabase con almacenamiento seguro de tokens (`expo-secure-store`), registro/login, verificación `@tec.mx`, Perfil y Favoritos. | `src/lib/supabase.ts`, `AppStateContext.tsx`, `WelcomeScreen`, `VerificationScreen`, `ProfileScreen`, `FavoritesScreen` |
| **Genaro** | Sistema de filtrado, respaldo *offline* de AMG 2026 y conexión de pantallas analíticas + comparativa AMG vs. Tec. | `indicators.ts`, `HomeScreen`, `ExploreScreen`, `IndicatorDetailScreen`, `CompareScreen` |
| **Nico** | Captura de encuesta externa Tec (con borrador local), Comunidad (Noticias/Foro) y Panel Admin (`5.0`) para publicar/ocultar contenido. | `ParticipateScreen`, `SurveyScreen`, `NewsScreen`, `ForumScreen`, `TopicScreen`, `AdminScreen` |

---

## 2. Servicios de Supabase en Fase 1

- **Base de datos PostgreSQL:** guarda los resúmenes `amg_2026`, respuestas en vivo `tec_2026`, perfiles, favoritos, noticias, foro y deja listas las tablas `donations` y `assistant_logs` para Fase 2.
- **Supabase Auth:** manejo seguro de contraseñas (`MASVS-CRYPTO-1`), sesiones JWT (`MASVS-AUTH-1/2`) y verificación de correo `@tec.mx`.
- **Reglas de acceso por fila (RLS):** nadie puede leer o modificar datos de otro usuario, y solo `role = 'admin'` puede ocultar/publicar contenido.
- **Consultas seguras guardadas (RPC):** funciones fijas en la base de datos para filtrar y comparar sin armar SQL dinámico desde el teléfono (`MASVS-CODE-4`).
- **Realtime (opcional):** ver comentarios nuevos del foro en tiempo real.

---

## 3. Dependencias Explícitas en Fase 1 (y cómo evitar bloqueos)

1. **Día 1 — Carlos publica contratos (`src/types/database.ts`):**
   - Aaron, Genaro y Nico necesitan los nombres de tablas y respuestas de consultas. Carlos sube primero las interfaces TypeScript a `dev` antes de terminar toda la carga de datos.
2. **Sesión y cliente Supabase (`src/lib/supabase.ts`):**
   - Genaro (favoritos autenticados) y Nico (enviar encuesta Tec, publicar en foro, panel Admin) dependen de que Aaron suba `src/lib/supabase.ts` y `AppStateContext.tsx` a `dev`.
   - *Cómo avanzar sin esperar:* Genaro puede conectar primero los filtros públicos de indicadores (que no requieren login) y usar el JSON local; Nico puede armar la UI de encuesta Tec, borrador local y formularios usando la firma de `useAppState()`.
3. **Datos semilla `tec_2026`:**
   - Para que Genaro pruebe la comparativa AMG vs. Tec antes de que Nico termine la pantalla de encuesta, Carlos inserta algunas respuestas de prueba en `survey_submissions`.

---

## 4. Criterios de Aceptación de Fase 1 (para pasar a `main`)
- [ ] `npx tsc --noEmit` y `npx expo lint` terminan con 0 errores.
- [ ] La encuesta **Bienestar Joven AMG 2026** se consulta desde Supabase y sigue funcionando **sin internet** gracias al respaldo local.
- [ ] Es posible aplicar filtros (dimensión, género, edad, estrato) y comparar **AMG 2026 vs. Encuesta Tec**.
- [ ] Un usuario puede registrarse, verificar correo `@tec.mx`, responder la encuesta Tec, guardar favoritos y comentar en el foro.
- [ ] Un administrador puede ocultar/publicar contenido desde `AdminScreen` con verificación biométrica (`MASVS-AUTH-3`).
