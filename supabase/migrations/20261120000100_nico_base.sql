-- Contratos usados por los módulos de Nico, tomados de docs/planning/carlos.md.
CREATE TABLE IF NOT EXISTS public.dimensions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.indicators (
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

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'tec_verified', 'admin')),
  is_tec_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.surveys (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.survey_questions (
  id TEXT PRIMARY KEY,
  survey_id TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  indicator_id TEXT REFERENCES indicators(id),
  prompt TEXT NOT NULL,
  options JSONB NOT NULL,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.survey_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (survey_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  published_date TEXT NOT NULL,
  summary TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS public.forum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  author_label TEXT NOT NULL,
  body TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  author_label TEXT NOT NULL,
  body TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  amount_mxn INT NOT NULL CHECK (amount_mxn > 0),
  stripe_session_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Los clientes solo leen lo que corresponde a su sesión. Las escrituras pasan
-- por procedimientos con permisos específicos o por las funciones de pagos.
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['dimensions','indicators','profiles','surveys','survey_questions',
                               'survey_submissions','news','forum_topics','forum_replies','donations']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;

REVOKE ALL ON public.profiles, public.survey_submissions, public.donations,
  public.news, public.forum_topics, public.forum_replies, public.surveys,
  public.survey_questions, public.indicators, public.dimensions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.dimensions, public.indicators, public.news, public.surveys, public.survey_questions TO anon, authenticated;
GRANT SELECT (id,title,body,author_label,is_published,created_at) ON public.forum_topics TO anon, authenticated;
GRANT SELECT (id,topic_id,body,author_label,is_published,created_at) ON public.forum_replies TO anon, authenticated;
GRANT SELECT ON public.profiles, public.donations TO authenticated;
GRANT SELECT (survey_id, user_id, submitted_at) ON public.survey_submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.donations TO service_role;

CREATE OR REPLACE FUNCTION public.nico_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
$$;
REVOKE ALL ON FUNCTION public.nico_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nico_is_admin() TO anon, authenticated;

CREATE POLICY nico_profile_read ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY nico_own_donations ON public.donations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY nico_own_completion ON public.survey_submissions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY nico_dimensions ON public.dimensions FOR SELECT USING (true);
CREATE POLICY nico_indicators ON public.indicators FOR SELECT USING (is_published OR public.nico_is_admin());
CREATE POLICY nico_news ON public.news FOR SELECT USING (is_published OR public.nico_is_admin());
CREATE POLICY nico_topics ON public.forum_topics FOR SELECT USING (is_published OR public.nico_is_admin());
CREATE POLICY nico_surveys ON public.surveys FOR SELECT USING (is_active OR public.nico_is_admin());
CREATE POLICY nico_questions ON public.survey_questions FOR SELECT USING
  (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id));
CREATE POLICY nico_replies ON public.forum_replies FOR SELECT USING
  ((is_published AND EXISTS (SELECT 1 FROM public.forum_topics t WHERE t.id = topic_id AND t.is_published))
    OR public.nico_is_admin());

-- Solo el servicio de identidad confirma el correo. La app no puede asignar roles.
CREATE OR REPLACE FUNCTION public.nico_sync_profile() RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE account auth.users%ROWTYPE; tec boolean; result public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO STRICT account FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  tec := lower(split_part(account.email, '@', 2)) = 'tec.mx';
  INSERT INTO public.profiles AS existing (id, email, is_tec_verified, role)
    VALUES (account.id, account.email, tec, CASE WHEN tec THEN 'tec_verified' ELSE 'user' END)
    ON CONFLICT (id) DO UPDATE SET email = excluded.email, is_tec_verified = excluded.is_tec_verified,
      role = CASE WHEN existing.role = 'admin' THEN 'admin' ELSE excluded.role END
    RETURNING * INTO result;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.nico_submit_survey(p_survey text, p_answers jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  q record; spec jsonb; cond jsonb; choices jsonb; answer_key text; keys text[];
  expected text[] := '{}'; written integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL
                 AND lower(split_part(email,'@',2)) = 'tec.mx') THEN
    RAISE EXCEPTION 'Se requiere un correo Tec confirmado.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.survey_submissions WHERE user_id = auth.uid() AND survey_id = p_survey) THEN
    RETURN false;
  END IF;
  PERFORM 1 FROM public.surveys WHERE id = p_survey AND is_active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La encuesta ya no está disponible.'; END IF;
  IF jsonb_typeof(p_answers) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Respuestas inválidas.'; END IF;
  FOR q IN SELECT id, options FROM public.survey_questions WHERE survey_id = p_survey ORDER BY sort_order, id
  LOOP
    spec := q.options;
    cond := spec->'visibleWhen';
    IF cond IS NOT NULL THEN
      IF cond->>'op' NOT IN ('eq','ne') OR cond->>'key' IS NULL OR cond->>'value' IS NULL THEN
        RAISE EXCEPTION 'Condición inválida en el cuestionario.';
      END IF;
      IF NOT ((cond->>'key') = ANY(expected)) OR
         ((p_answers->>(cond->>'key') = cond->>'value') IS DISTINCT FROM (cond->>'op' = 'eq')) THEN
        CONTINUE;
      END IF;
    END IF;
    IF jsonb_typeof(spec) = 'array' OR spec->>'type' = 'single' THEN
      choices := CASE WHEN jsonb_typeof(spec) = 'array' THEN spec ELSE spec->'options' END;
      keys := ARRAY[q.id];
    ELSIF spec->>'type' IN ('grid','multi') THEN
      choices := CASE WHEN spec->>'type' = 'grid' THEN spec->'scale' ELSE '["Sí","No"]'::jsonb END;
      keys := ARRAY(SELECT item->>'id' FROM jsonb_array_elements(spec->'items') AS item);
    ELSE RAISE EXCEPTION 'Tipo de pregunta inválido.';
    END IF;
    IF cardinality(keys) = 0 OR jsonb_typeof(choices) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Opciones inválidas en el cuestionario.';
    END IF;
    FOREACH answer_key IN ARRAY keys LOOP
      IF answer_key IS NULL OR answer_key = ANY(expected) OR
         jsonb_typeof(p_answers->answer_key) IS DISTINCT FROM 'string' OR NOT (choices ? (p_answers->>answer_key)) THEN
        RAISE EXCEPTION 'Falta una respuesta o la opción ya no es válida.';
      END IF;
      expected := array_append(expected, answer_key);
    END LOOP;
  END LOOP;
  IF cardinality(expected) = 0 OR p_answers - expected <> '{}'::jsonb THEN
    RAISE EXCEPTION 'El cuestionario contiene preguntas adicionales o está vacío.';
  END IF;
  INSERT INTO public.survey_submissions(survey_id,user_id,answers) VALUES (p_survey,auth.uid(),p_answers)
    ON CONFLICT (survey_id,user_id) DO NOTHING;
  GET DIAGNOSTICS written = ROW_COUNT;
  RETURN written = 1;
END $$;

CREATE OR REPLACE FUNCTION public.nico_post_topic(p_title text, p_body text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result uuid;
BEGIN
  p_title := regexp_replace(p_title, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  p_body := regexp_replace(p_body, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  IF auth.uid() IS NULL OR coalesce(length(trim(p_title)),0) NOT BETWEEN 1 AND 140
    OR coalesce(length(trim(p_body)),0) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Revisa el título y el texto.'; END IF;
  INSERT INTO public.forum_topics(user_id,title,body,author_label)
    VALUES (auth.uid(),trim(p_title),trim(p_body),'Participante') RETURNING id INTO result;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.nico_post_reply(p_topic uuid, p_body text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result uuid;
BEGIN
  p_body := regexp_replace(p_body, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  IF auth.uid() IS NULL OR coalesce(length(trim(p_body)),0) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'Escribe una respuesta de hasta 2000 caracteres.';
  END IF;
  PERFORM 1 FROM public.forum_topics WHERE id = p_topic AND is_published FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Este tema ya no está publicado.'; END IF;
  INSERT INTO public.forum_replies(topic_id,user_id,author_label,body)
    VALUES (p_topic,auth.uid(),'Participante',trim(p_body)) RETURNING id INTO result;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.nico_set_publication(p_kind text, p_id text, p_visible boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.nico_is_admin() THEN RAISE EXCEPTION 'Se requiere el rol de administración.' USING ERRCODE = '42501'; END IF;
  IF p_visible IS NULL THEN RAISE EXCEPTION 'Estado de publicación inválido.'; END IF;
  CASE p_kind
    WHEN 'indicators' THEN UPDATE public.indicators SET is_published=p_visible, updated_at=now(), updated_by=auth.uid() WHERE id=p_id;
    WHEN 'news' THEN UPDATE public.news SET is_published=p_visible, updated_at=now(), updated_by=auth.uid() WHERE id=p_id;
    WHEN 'forum_topics' THEN UPDATE public.forum_topics SET is_published=p_visible WHERE id=p_id::uuid;
    WHEN 'surveys' THEN UPDATE public.surveys SET is_active=p_visible WHERE id=p_id;
    ELSE RAISE EXCEPTION 'Tipo de contenido inválido.';
  END CASE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El contenido ya no está disponible.'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.nico_sync_profile(), public.nico_submit_survey(text,jsonb),
  public.nico_post_topic(text,text), public.nico_post_reply(uuid,text),
  public.nico_set_publication(text,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nico_sync_profile(), public.nico_submit_survey(text,jsonb),
  public.nico_post_topic(text,text), public.nico_post_reply(uuid,text),
  public.nico_set_publication(text,text,boolean) TO authenticated;
