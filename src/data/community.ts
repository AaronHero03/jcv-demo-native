export interface NewsItem {
  id: string;
  title: string;
  source: string;
  date: string;
  summary: string;
}

export interface ForumComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface ForumTopic {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  body: string;
  initialReplies: ForumComment[];
}

export const newsItems: NewsItem[] = [
  {
    id: 'news-bienestar-2026',
    title: 'Resultados de la Encuesta Bienestar de Jóvenes Jul–Ago 2026',
    source: 'Jalisco Cómo Vamos',
    date: 'Sep 2026',
    summary:
      'Más de 1,200 jóvenes del Área Metropolitana de Guadalajara compartieron su percepción sobre calidad de vida, seguridad escolar y educación superior.',
  },
  {
    id: 'news-educacion-superior',
    title: 'Alta valoración de la educación superior entre juventudes del AMG',
    source: 'Observatorio Ciudadano JCV',
    date: 'Ago 2026',
    summary:
      'Los resultados muestran un amplio consenso sobre la importancia de la universidad para el desarrollo personal y laboral en los seis municipios evaluados.',
  },
  {
    id: 'news-tiempo-libre',
    title: 'Uso del tiempo libre y bienestar emocional en jóvenes',
    source: 'Jalisco Cómo Vamos',
    date: 'Ago 2026',
    summary:
      'El equilibrio entre actividades diarias, estudio y recreación emerge como uno de los factores clave de satisfacción personal.',
  },
];

export const forumTopics: ForumTopic[] = [
  {
    id: 'topic-transporte',
    title: '¿Cómo mejorar el transporte público hacia las universidades?',
    author: 'María G. · Zapopan',
    createdAt: 'Hace 2 días',
    body: 'Muchos estudiantes dedicamos más de una hora por trayecto. ¿Qué rutas o frecuencias consideran prioritarias en su municipio?',
    initialReplies: [
      {
        id: 'r1',
        author: 'Carlos R. · Tlaquepaque',
        text: 'Ampliar los horarios nocturnos y mejorar la conexión alimentadora con las líneas del tren ligero ayudaría muchísimo.',
        createdAt: 'Hace 1 día',
      },
      {
        id: 'r2',
        author: 'Ana L. · Guadalajara',
        text: 'También hace falta mayor iluminación en paraderos cercanos a preparatorias y campus.',
        createdAt: 'Hace 18 h',
      },
    ],
  },
  {
    id: 'topic-espacios-seguros',
    title: 'Espacios seguros y áreas verdes para el tiempo libre',
    author: 'Diego M. · Tonalá',
    createdAt: 'Hace 4 días',
    body: 'En la encuesta destaca la relación entre tiempo libre y bienestar. ¿Qué parques o centros culturales recomiendan recuperar en su colonia?',
    initialReplies: [
      {
        id: 'r3',
        author: 'Sofía V. · Tlajomulco',
        text: 'Faltan canchas con alumbrado y actividades culturales gratuitas los fines de semana.',
        createdAt: 'Hace 3 días',
      },
    ],
  },
];

export function getTopicById(id?: string): ForumTopic {
  return forumTopics.find((t) => t.id === id) ?? forumTopics[0];
}
