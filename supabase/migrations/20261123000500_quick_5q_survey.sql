-- Encuesta rápida de 5 preguntas reales de AMG 2026.
INSERT INTO public.surveys (id, title, description, is_active) VALUES
  ('bienestar-rapida-5q', 'Bienestar Juvenil 2026 (Evaluación Rápida)', 'Encuesta breve de 5 reactivos de la encuesta real para seguimiento rápido.', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.survey_questions (id, survey_id, indicator_id, prompt, options, sort_order) VALUES
  ('rapida_Q_2', 'bienestar-rapida-5q', 'Q_2', '¿En qué municipio vives?', '{"section":"Sobre ti","type":"single","options":["El Salto","Guadalajara","San Pedro Tlaquepaque","Tlajomulco de Zúñiga","Tonalá","Zapopan"]}', 1),
  ('rapida_Q_71', 'bienestar-rapida-5q', 'Q_71', '¿Cómo describes tu identidad de género?', '{"section":"Sobre ti","type":"single","options":["Hombre","Mujer","Otra","Prefiero no responder"]}', 2),
  ('rapida_Q_6', 'bienestar-rapida-5q', 'Q_6', 'En general, ¿qué tan satisfecha(o) estás con tu vida?', '{"section":"Cómo te sientes","type":"single","options":["Nada satisfecha(o)","Poco satisfecha(o)","Ni satisfecha(o), ni insatisfecha(o)","Algo satisfecha(o)","Muy satisfecha(o)"]}', 3),
  ('rapida_Q_7', 'bienestar-rapida-5q', 'Q_7', '¿Cómo calificarías tu calidad de vida?', '{"section":"Cómo te sientes","type":"single","options":["Muy baja","Baja","Ni baja, ni alta","Alta","Muy alta"]}', 4),
  ('rapida_Q_8', 'bienestar-rapida-5q', 'Q_8', 'En general, ¿qué tan feliz eres?', '{"section":"Cómo te sientes","type":"single","options":["Nada feliz","Poco feliz","Ni feliz, ni infeliz","Algo feliz","Muy feliz"]}', 5)
ON CONFLICT (id) DO NOTHING;
