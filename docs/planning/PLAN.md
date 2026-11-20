# Plan Maestro — Visión General (Fase 1 y Fase 2)

Este proyecto se divide en **dos fases ágiles** para reducir dependencias entre participantes y construir primero una base sólida de datos, cuentas y encuestas antes de conectar los servicios externos (Stripe y el Asistente IA).

- **[PLAN_FASE1.md](PLAN_FASE1.md):** Base de datos en Supabase, cuentas (`Auth`), sistema de filtrado, encuesta externa Tec, comparativa AMG vs. Tec, comunidad y panel Admin.
- **[PLAN_FASE2.md](PLAN_FASE2.md):** Integración de servicios externos (**Stripe Checkout** para donativos y **Asistente IA `/ask` con Gemini**), más el cierre de seguridad CI / Stage 4.

## Guías Individuales (divididas en Fase 1 y Fase 2)
- [carlos.md](carlos.md) — Base de datos, carga de datos AMG 2026, agregación Tec, seguridad y consultas
- [aaron.md](aaron.md) — Cuentas (`Auth`), almacenamiento seguro, Perfil/Favoritos (Fase 1) y `/ask` con Gemini (Fase 2)
- [genaro.md](genaro.md) — Sistema de filtrado, Comparativa AMG vs. Tec (Fase 1) y pantalla de Chat IA (Fase 2)
- [nico.md](nico.md) — Captura de encuesta Tec, Comunidad, Admin (Fase 1), Stripe Checkout y CI/SBOM (Fase 2)

---

## Cómo está estructurada la Base de Datos (`D1` en Supabase)

En lugar de crear una tabla distinta para cada pregunta o dimensión de la encuesta, agrupamos la información analítica en **4 tablas conectadas** (el SQL completo está en [carlos.md](carlos.md)), contemplando desde el inicio las tablas que usará la Fase 2 (`donations` y `assistant_logs`):

1. **`dimensions`**: temas de la encuesta (Bienestar, Educación, Seguridad, etc.).
2. **`indicators`**: preguntas e indicadores con su título, promedio general y si están publicados.
3. **`indicator_options`** *(diccionario)*: opciones válidas de cada pregunta (`1 = Nada satisfecha`, `5 = Muy satisfecha`).
4. **`indicator_summaries`**: totales y porcentajes ya calculados por filtro (`general`, `gender`, `age_group`, `estrato`) y marcados con `dataset_source` (`amg_2026` o `tec_2026`).

```mermaid
erDiagram
  dimensions ||--o{ indicators : "agrupa"
  indicators ||--o{ indicator_options : "tiene opciones"
  indicators ||--o{ indicator_summaries : "tiene resultados"
  indicator_options ||--o{ indicator_summaries : "identifica opcion"

  profiles ||--o{ favorites : "guarda"
  profiles ||--o{ survey_submissions : "responde"
  profiles ||--o{ forum_topics : "publica"
  profiles ||--o{ forum_replies : "comenta"
  profiles ||--o{ donations : "dona"

  surveys ||--o{ survey_questions : "contiene"
  surveys ||--o{ survey_submissions : "recibe"
  forum_topics ||--o{ forum_replies : "tiene"
```

---

## Metodología Git (aplica para ambas fases)
- **Ramas por función:** `[nombre]/[funcion-implementada]` (ej. `carlos/supabase-schema`, `nico/encuesta-tec`, `aaron/auth-perfil`, `genaro/filtros-comparativa`).
- **Integración:** todo trabajo parte de `dev` y entra por PR hacia **`dev`** (con revisión de al menos 1 compañero + `npx tsc --noEmit` + `npx expo lint`).
- **Producción:** al cerrar cada fase en `dev`, se abre PR **`dev` $\rightarrow$ `main`**.
