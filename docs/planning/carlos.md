# Plan Individual — Carlos (Base de Datos, Seguridad, ETL y Consultas)

**Rol:** Arquitecto de Base de Datos y Seguridad de Datos (`D1: Main Database`).  
**Trabajo dividido en:** Fase 1 (base completa) y Fase 2 (soporte de consultas y auditoría final).

---

## Fase 1 — Base Sólida, Encuestas y Consultas

**Ramas (PR hacia `dev`):** `carlos/supabase-schema-rls`, `carlos/etl-amg-2026`, `carlos/rpc-filtros-comparativa`

### 1. Crear esquema SQL completo en Supabase (`carlos/supabase-schema-rls`)

- [ ] Ejecutar este esquema en el SQL Editor de Supabase (incluye las tablas de Fase 1 y deja listas `donations` y `assistant_logs` para Fase 2):

```sql
-- 1. Dimensiones (temas de la encuesta)
CREATE TABLE dimensions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0
);

-- 2. Diccionario de indicadores / preguntas
CREATE TABLE indicators (
  id TEXT PRIMARY KEY,
  dimension_id TEXT NOT NULL REFERENCES dimensions(id),
  title TEXT NOT NULL,
  question_text TEXT NOT NULL,
  scale_type TEXT NOT NULL,           -- 'likert_5' | 'categorical' | 'binary'
  sample_size INT NOT NULL,
  average NUMERIC(4,2),
  positive_pct NUMERIC(5,2),
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- 3. Diccionario de opciones (catálogo conectado por llave foránea)
CREATE TABLE indicator_options (
  id SERIAL PRIMARY KEY,
  indicator_id TEXT NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
  code INT NOT NULL,
  label TEXT NOT NULL,
  is_positive BOOLEAN DEFAULT false,
  UNIQUE (indicator_id, code)
);

-- 4. Resúmenes precalculados por filtro y origen ('amg_2026' o 'tec_2026')
CREATE TABLE indicator_summaries (
  id SERIAL PRIMARY KEY,
  dataset_source TEXT NOT NULL DEFAULT 'amg_2026',
  indicator_id TEXT NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
  option_id INT NOT NULL REFERENCES indicator_options(id) ON DELETE CASCADE,
  filter_type TEXT NOT NULL,          -- 'general' | 'gender' | 'age_group' | 'estrato'
  filter_value TEXT NOT NULL,         -- 'all' | 'Hombre' | 'Mujer' | '15-19' | 'Alto'...
  count INT NOT NULL,
  pct NUMERIC(5,2) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  UNIQUE (dataset_source, indicator_id, option_id, filter_type, filter_value)
);

CREATE INDEX idx_summaries_lookup
  ON indicator_summaries (indicator_id, dataset_source, filter_type, filter_value);

-- 5. Perfiles de usuario y roles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'tec_verified', 'admin')),
  is_tec_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Favoritos
CREATE TABLE favorites (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('indicator', 'news')),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

-- 7. Encuesta externa Tec
CREATE TABLE surveys (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE survey_questions (
  id TEXT PRIMARY KEY,
  survey_id TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  indicator_id TEXT REFERENCES indicators(id),
  prompt TEXT NOT NULL,
  options JSONB NOT NULL,
  sort_order INT DEFAULT 0
);

CREATE TABLE survey_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (survey_id, user_id)
);

-- 8. Comunidad (noticias y foro)
CREATE TABLE news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  published_date TEXT NOT NULL,
  summary TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

CREATE TABLE forum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  author_label TEXT NOT NULL,
  body TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  author_label TEXT NOT NULL,
  body TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Donativos Stripe (preparada para Fase 2)
CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  amount_mxn INT NOT NULL CHECK (amount_mxn > 0),
  stripe_session_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Registro de uso del asistente IA (preparada para Fase 2, sin texto de pregunta)
CREATE TABLE assistant_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  status_code INT NOT NULL,
  question_length INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

- [ ] Publicar `src/types/database.ts` en `dev` con los tipos TypeScript de tablas y respuestas de consultas (esto desbloquea a Aaron, Genaro y Nico desde el Día 1).

### 2. Reglas de acceso por fila (`RLS`) y auditoría (`carlos/supabase-schema-rls`)

- [ ] Activar **Row Level Security (RLS)** en todas las tablas (`MASVS-AUTH-1/2`, `T5`).
- [ ] Reglas:
  - Indicadores, opciones, resúmenes, noticias y encuestas: lectura pública solo si `is_published = true` / `is_active = true`; edición exclusiva para `role = 'admin'`.
  - `profiles`: cada usuario solo ve/edita su propio perfil sin poder cambiar su `role` a `'admin'`.
  - `favorites`, `survey_submissions`, `donations`: cada usuario solo accede donde `auth.uid() = user_id`.
  - `donations.status` y `assistant_logs`: solo modificables/insertables desde el servidor (`service_role`).

### 3. Carga de datos AMG 2026 (`carlos/etl-amg-2026`)

- [ ] Escribir script (`scripts/etl_amg_2026.py`) que lea `Base de Datos_Bienestar de Jovenes - Jul-Ago 2026.csv` y el diccionario JSON.
- [ ] Insertar `dimensions`, `indicators`, `indicator_options` y los resúmenes `amg_2026` en `indicator_summaries` por `general`, `gender`, `age_group` y `estrato` (sin cortes por mes y sin desglose por municipio no significativo).
- [ ] Exportar `src/data/raw/amg_2026_summaries.json` para que la app siga funcionando _offline_.

### 4. Consultas parametrizadas y agregación Tec (`carlos/rpc-filtros-comparativa`)

- [ ] Crear función guardada `get_filtered_indicator(p_indicator_id, p_dataset_source, p_filter_type, p_filter_value)` (`MASVS-CODE-4`).
- [ ] Crear función `compare_datasets(p_indicator_id, p_filter_type, p_filter_value)` (`amg_2026` vs. `tec_2026`).
- [ ] Crear trigger o función que actualice los resúmenes de `tec_2026` cuando entre una respuesta nueva en `survey_submissions`.
- [ ] Insertar datos semilla de prueba en `surveys`, `survey_questions`, `survey_submissions` y `news`.

---

## Fase 2 — Soporte a `/ask`, Stripe y Auditoría Stage 4

- [ ] Verificar que `/ask` pueda consultar `indicators`, `indicator_options` e `indicator_summaries` mediante función parametrizada de solo lectura.
- [ ] Validar en pruebas que ningún usuario desde la app pueda alterar `donations.status` ni leer `assistant_logs`, y entregar evidencia de RLS para el reporte de **Stage 4**.
