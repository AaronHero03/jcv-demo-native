// Respuestas de una encuesta: clave = id de la variable (igual que en el libro de códigos), valor = texto elegido.
export type SurveyAnswers = Record<string, string>;

export interface SurveyItem {
  id: string;
  label: string;
}

interface BaseQuestion {
  id: string;
  prompt: string;
  /** Texto de apoyo opcional bajo la pregunta. */
  hint?: string;
  /** Sección (paso) del cuestionario. Si la encuesta no usa secciones, se muestra todo en una página. */
  section?: string;
  /** Pregunta condicional: solo se muestra (y se envía) si regresa true. */
  showIf?: (answers: SurveyAnswers) => boolean;
}

/** Opción única. `compact` muestra las opciones como fichas en renglón (para listas cortas o numéricas). */
export interface SingleQuestion extends BaseQuestion {
  type: 'single';
  options: string[];
  compact?: boolean;
}

/** Opción múltiple: cada inciso se guarda como "Sí" / "No" con su propio id (como en la base original). */
export interface MultiQuestion extends BaseQuestion {
  type: 'multi';
  items: SurveyItem[];
  noneLabel: string;
}

/** Batería con la misma escala de 5 puntos para varios incisos. Cada inciso se guarda con su propio id. */
export interface GridQuestion extends BaseQuestion {
  type: 'grid';
  scale: string[];
  items: SurveyItem[];
}

export type SurveyQuestion = SingleQuestion | MultiQuestion | GridQuestion;

export interface Survey {
  id: string;
  title: string;
  description: string;
  period: string;
  estimatedMinutes: number;
  questions: SurveyQuestion[];
}

/** Ids bajo los que se guardan las respuestas de una pregunta. */
export function answerKeys(q: SurveyQuestion): string[] {
  return q.type === 'single' ? [q.id] : q.items.map((item) => item.id);
}

export function isQuestionVisible(q: SurveyQuestion, answers: SurveyAnswers): boolean {
  return q.showIf ? q.showIf(answers) : true;
}

export function isQuestionAnswered(q: SurveyQuestion, answers: SurveyAnswers): boolean {
  return answerKeys(q).every((key) => Boolean(answers[key]));
}

const SATISFACCION = ['Nada satisfecha(o)', 'Poco satisfecha(o)', 'Ni satisfecha(o), ni insatisfecha(o)', 'Algo satisfecha(o)', 'Muy satisfecha(o)'];
const FRECUENCIA = ['Nunca', 'Pocas veces', 'Algunas veces', 'Muchas veces', 'Siempre'];
const ACUERDO = ['Muy en desacuerdo', 'En desacuerdo', 'Ni de acuerdo, ni en desacuerdo', 'De acuerdo', 'Muy de acuerdo'];
const DIAS = ['1 día', '2 días', '3 días', '4 días', '5 días', '6 días', '7 días'];
const NO_RESPONDER = 'Prefiero no responder';

const S1 = 'Sobre ti';
const S2 = 'Cómo te sientes';
const S3 = 'Tu vida diaria';
const S4 = 'Tu entorno';
const S5 = 'Participación';

// Subconjunto de la encuesta Bienestar de Jóvenes Jul–Ago 2026 (Libro de Códigos JCV).
// Se conserva la redacción y las escalas originales para poder comparar con la base levantada en campo.
const bienestarQuestions: SurveyQuestion[] = [
  // 1 · Sobre ti (filtros para Comparar / Mapa)
  {
    id: 'Q_2',
    section: S1,
    type: 'single',
    prompt: '¿En qué municipio vives?',
    options: ['El Salto', 'Guadalajara', 'San Pedro Tlaquepaque', 'Tlajomulco de Zúñiga', 'Tonalá', 'Zapopan'],
  },
  {
    id: 'Q_72',
    section: S1,
    type: 'single',
    compact: true,
    prompt: '¿Cuántos años cumplidos tienes?',
    options: Array.from({ length: 15 }, (_, i) => String(15 + i)),
  },
  {
    id: 'Q_71',
    section: S1,
    type: 'single',
    prompt: '¿Cómo describes tu identidad de género?',
    options: ['Hombre', 'Mujer', 'Otra', NO_RESPONDER],
  },
  {
    id: 'Q_74recode',
    section: S1,
    type: 'single',
    prompt: '¿Cuál es tu nivel de escolaridad?',
    hint: 'El último nivel que cursas o cursaste.',
    options: ['Sin estudios', 'Primaria', 'Secundaria', 'Carrera comercial', 'Carrera técnica', 'Preparatoria', 'Licenciatura', 'Maestría', 'Doctorado'],
  },
  {
    id: 'T_Q_13',
    section: S1,
    type: 'multi',
    prompt: '¿Cuáles de estas actividades realizas diariamente o de manera regular?',
    hint: 'Puedes elegir varias.',
    items: [
      { id: 'T_Q_13_1', label: 'Estudias (dentro del sistema escolar)' },
      { id: 'T_Q_13_2', label: 'Trabajas de tiempo completo' },
      { id: 'T_Q_13_3', label: 'Trabajas de medio tiempo o jornada parcial' },
      { id: 'T_Q_13_4', label: 'Trabajas en tu hogar (sin remuneración económica)' },
      { id: 'T_Q_13_5', label: 'Cuidas a niñas, niños, personas mayores o con enfermedad o discapacidad (sin remuneración)' },
    ],
    noneLabel: 'Ninguna de estas',
  },
  {
    id: 'Q_34',
    section: S1,
    type: 'single',
    prompt: '¿Con quién vives?',
    options: ['Sola(o)', 'Familiares', 'Pareja', 'Amigos o conocidos', 'Otra persona'],
  },
  {
    id: 'Q_32',
    section: S1,
    type: 'single',
    prompt: 'Con el total del ingreso familiar, dirías que en tu hogar…',
    options: [
      'Les alcanza bien y pueden ahorrar',
      'Les alcanza justo, sin grandes dificultades',
      'No les alcanza y tienen dificultades',
      'No les alcanza y tienen grandes dificultades',
      NO_RESPONDER,
    ],
  },

  // 2 · Cómo te sientes (bienestar subjetivo)
  {
    id: 'Q_6',
    section: S2,
    type: 'single',
    prompt: 'En general, ¿qué tan satisfecha(o) estás con tu vida?',
    options: SATISFACCION,
  },
  {
    id: 'Q_8',
    section: S2,
    type: 'single',
    prompt: 'En general, ¿qué tan feliz eres?',
    options: ['Nada feliz', 'Poco feliz', 'Ni feliz, ni infeliz', 'Algo feliz', 'Muy feliz'],
  },
  {
    id: 'Q_42',
    section: S2,
    type: 'single',
    prompt: '¿Qué tan de acuerdo estás en que las cosas que haces en tu vida valen la pena?',
    options: ACUERDO,
  },
  {
    id: 'T_Q_11',
    section: S2,
    type: 'grid',
    prompt: '¿Con qué frecuencia experimentas los siguientes estados de ánimo?',
    scale: FRECUENCIA,
    items: [
      { id: 'T_Q_11_1', label: 'Te sientes contenta(o)' },
      { id: 'T_Q_11_2', label: 'Te sientes tranquila(o)' },
      { id: 'T_Q_11_3', label: 'Te sientes angustiada(o) / asustada(o)' },
      { id: 'T_Q_11_4', label: 'Te sientes triste' },
      { id: 'T_Q_11_5', label: 'Te sientes enojada(o)' },
      { id: 'T_Q_11_6', label: 'Enfrentas problemas para dormir' },
    ],
  },
  {
    id: 'Q_41',
    section: S2,
    type: 'single',
    prompt: 'Considerando esto, ¿cómo calificarías tu salud mental?',
    hint: 'La salud mental se refiere a tu bienestar emocional: tu estado de ánimo en el día a día, si te sientes tranquila(o) y contenta(o) o si experimentas constantemente ansiedad, tristeza, angustia o estrés.',
    options: ['Muy mala', 'Mala', 'Ni buena, ni mala', 'Buena', 'Muy buena'],
  },

  // 3 · Tu vida diaria
  {
    id: 'satisfaccion_ambitos',
    section: S3,
    type: 'grid',
    prompt: '¿Qué tan satisfecha(o) estás con…?',
    scale: SATISFACCION,
    items: [
      { id: 'Q_31', label: 'Tu vida familiar' },
      { id: 'Q_14', label: 'Tus actividades diarias' },
      { id: 'Q_36', label: 'Tu salud' },
      { id: 'Q_20', label: 'El uso de tu tiempo libre' },
      { id: 'Q_33', label: 'La casa en la que vives' },
    ],
  },
  {
    id: 'Q_16',
    section: S3,
    type: 'single',
    prompt: '¿Qué tan segura(o) te sientes en la escuela?',
    options: ['Nada segura(o)', 'Poco segura(o)', 'Algo segura(o)', 'Muy segura(o)', 'Totalmente segura(o)'],
    showIf: (answers) => answers.T_Q_13_1 === 'Sí',
  },
  {
    id: 'Q_30',
    section: S3,
    type: 'single',
    prompt: 'Actualmente, ¿cuál consideras que es el problema más importante en tu familia?',
    options: [
      'Los ingresos familiares son insuficientes para cubrir los gastos',
      'Desempleo de algún miembro de la familia',
      'Falta de comunicación o dificultades para convivir',
      'Enfermedades o adicciones de miembros del hogar',
      'Inestabilidad emocional de algún miembro de la familia',
      'Violencia familiar',
      'Otro problema',
      'No hay ningún problema, todo está bien',
    ],
  },
  {
    id: 'T_Q_12',
    section: S3,
    type: 'grid',
    prompt: '¿Con qué frecuencia ocurren estas situaciones en tu hogar?',
    scale: FRECUENCIA,
    items: [
      { id: 'T_Q_12_1', label: 'Están juntos en algún momento del día (comer, conversar, ver televisión)' },
      { id: 'T_Q_12_2', label: 'Felicitan a quien hace bien las cosas' },
      { id: 'T_Q_12_3', label: 'Discuten, gritan o insultan' },
    ],
  },
  {
    id: 'Q_39',
    section: S3,
    type: 'single',
    compact: true,
    prompt: '¿Cuántos días a la semana haces ejercicio o practicas un deporte?',
    options: ['No hago ejercicio', 'Con menos frecuencia', ...DIAS],
  },
  {
    id: 'Q_38',
    section: S3,
    type: 'single',
    compact: true,
    prompt: 'En caso de que tomes bebidas alcohólicas, ¿cuántos días a la semana, en promedio, las consumes?',
    options: ['No consumo bebidas alcohólicas', 'Con menos frecuencia', ...DIAS, NO_RESPONDER],
  },
  {
    id: 'Q_25',
    section: S3,
    type: 'single',
    prompt: '¿Con qué frecuencia utilizas un chatbot de inteligencia artificial (IA) como ChatGPT, Copilot, Gemini, etc.?',
    options: ['Nunca', 'Una vez por semana o con menos frecuencia', 'Varias veces por semana', 'Aproximadamente una vez al día', 'Varias veces al día'],
  },

  // 4 · Tu entorno
  {
    id: 'T_Q_43',
    section: S4,
    type: 'grid',
    prompt: '¿Qué tan seguro consideras que es vivir en…?',
    scale: ['Nada seguro', 'Poco seguro', 'Ni seguro, ni inseguro', 'Algo seguro', 'Muy seguro'],
    items: [
      { id: 'T_Q_43_1', label: 'Tu ciudad' },
      { id: 'T_Q_43_2', label: 'Tu colonia' },
    ],
  },
  {
    id: 'T_Q_58',
    section: S4,
    type: 'grid',
    prompt: '¿Qué tan de acuerdo estás con las siguientes afirmaciones?',
    scale: ACUERDO,
    items: [
      { id: 'T_Q_58_1', label: 'Me encuentro satisfecha(o) con el barrio en el que vivo' },
      { id: 'T_Q_58_2', label: 'Si tengo un problema, hay personas en el área donde vivo que me ayudarán' },
    ],
  },
  {
    id: 'Q_46',
    section: S4,
    type: 'single',
    prompt: '¿Fuiste víctima de algún delito en los últimos doce meses?',
    options: ['Sí, de un delito', 'Sí, de más de un delito', 'No', NO_RESPONDER],
  },
  {
    id: 'T_Q_63',
    section: S4,
    type: 'multi',
    prompt: 'En los últimos 12 meses, ¿has sido discriminada(o) por alguno de estos motivos?',
    hint: 'Puedes elegir varios.',
    items: [
      { id: 'T_Q_63_1', label: 'Apariencia física' },
      { id: 'T_Q_63_2', label: 'Género' },
      { id: 'T_Q_63_3', label: 'Nivel económico o social' },
      { id: 'T_Q_63_4', label: 'Creencias y valores' },
      { id: 'T_Q_63_5', label: 'Posiciones políticas' },
      { id: 'T_Q_63_6', label: 'Orientación sexual' },
      { id: 'T_Q_63_7', label: 'Estado civil' },
      { id: 'T_Q_63_8', label: 'Edad' },
      { id: 'T_Q_63_9', label: 'Alguna discapacidad' },
      { id: 'T_Q_63_10', label: 'Origen étnico' },
      { id: 'T_Q_63_11', label: 'Color de piel' },
      { id: 'T_Q_63_12', label: 'Otra razón' },
    ],
    noneLabel: 'No he sido discriminada(o)',
  },
  {
    id: 'Q_69',
    section: S4,
    type: 'single',
    prompt: '¿Qué medio de transporte usas principalmente para ir a tu trabajo, escuela o actividades diarias?',
    options: [
      'Camión / Macrobús',
      'Tren ligero',
      'Taxi / Uber',
      'Vehículo particular',
      'Motocicleta',
      'Bicicleta',
      'Caminando',
      'Mototaxi',
      'Patín o scooter',
      'Otro medio',
      'No me desplazo',
    ],
  },
  {
    id: 'Q_70recode',
    section: S4,
    type: 'single',
    prompt: 'En un día normal, ¿cuánto tiempo dedicas a transportarte?',
    options: ['Hasta 30 minutos', 'De 31 a 60 minutos', 'De 61 a 90 minutos', 'De 91 a 120 minutos', 'De 121 a 180 minutos', 'Más de 180 minutos'],
    showIf: (answers) => answers.Q_69 !== 'No me desplazo',
  },

  // 5 · Participación y confianza
  {
    id: 'Q_66',
    section: S5,
    type: 'single',
    prompt: '¿Cuánto te interesan los asuntos públicos y la política?',
    options: ['Nada', 'Poco', 'Ni algo, ni poco', 'Algo', 'Mucho'],
  },
  {
    id: 'Q_67',
    section: S5,
    type: 'single',
    prompt: '¿Con cuál de las siguientes frases te sientes más de acuerdo?',
    options: [
      'La democracia es preferible a cualquier otra forma de gobierno',
      'En algunas circunstancias, un gobierno autoritario es preferible a uno democrático',
      'A la gente como uno, nos da lo mismo un régimen democrático que uno no democrático',
    ],
  },
  {
    id: 'T_Q_60',
    section: S5,
    type: 'multi',
    prompt: 'En los últimos 12 meses, ¿en cuáles de estas formas de participación ciudadana participaste?',
    hint: 'Puedes elegir varias.',
    items: [
      { id: 'T_Q_60_1', label: 'Votar' },
      { id: 'T_Q_60_2', label: 'Firmar peticiones' },
      { id: 'T_Q_60_3', label: 'Protestar o manifestarse' },
      { id: 'T_Q_60_4', label: 'Compartir información en redes sociales' },
      { id: 'T_Q_60_5', label: 'Participar con un partido u organización política' },
      { id: 'T_Q_60_6', label: 'Participar en colectivos ciudadanos en favor de la comunidad' },
      { id: 'T_Q_60_7', label: 'Participar en acciones sobre causas globales' },
    ],
    noneLabel: 'En ninguna',
  },
  {
    id: 'T_Q_65',
    section: S5,
    type: 'grid',
    prompt: '¿Cuánta confianza tienes en…?',
    scale: ['Nada', 'Poca', 'Ni algo, ni poca', 'Algo', 'Mucha'],
    items: [
      { id: 'T_Q_65_6', label: 'El gobierno municipal' },
      { id: 'T_Q_65_7', label: 'El gobierno estatal' },
      { id: 'T_Q_65_8', label: 'El gobierno federal' },
      { id: 'T_Q_65_12', label: 'La policía' },
      { id: 'T_Q_65_5', label: 'Los partidos políticos' },
    ],
  },
];

export const surveys: Survey[] = [
  {
    id: 'bienestar-juvenil-2026',
    title: 'Bienestar Juvenil 2026',
    description: 'Versión corta de la encuesta Bienestar de Jóvenes: cómo te sientes, tu vida diaria, tu entorno y tu participación.',
    period: 'Jul–Ago 2026',
    estimatedMinutes: 9,
    questions: bienestarQuestions,
  },
  {
    id: 'movilidad-amg-2026',
    title: 'Percepción de Movilidad y Tiempo Libre',
    description: 'Evalúa el uso de transporte público y disponibilidad de tiempo libre en tu municipio.',
    period: 'Ago 2026',
    estimatedMinutes: 2,
    questions: [
      {
        id: 'm1',
        type: 'single',
        prompt: '¿Qué medio de transporte utilizas con mayor frecuencia?',
        options: ['Transporte público (camión / tren)', 'Automóvil particular', 'Bicicleta o caminar', 'Plataforma / taxi'],
      },
      {
        id: 'm2',
        type: 'single',
        prompt: '¿Qué tan satisfecha(o) estás con el uso del tiempo libre que tienes?',
        options: ['1. Nada satisfecha(o)', '2. Poco satisfecha(o)', '3. Neutral', '4. Algo satisfecha(o)', '5. Muy satisfecha(o)'],
      },
    ],
  },
];

export function getSurveyById(id?: string): Survey {
  return surveys.find((s) => s.id === id) ?? surveys[0];
}
