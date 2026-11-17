export interface SurveyQuestion {
  id: string;
  prompt: string;
  options: string[];
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  period: string;
  estimatedMinutes: number;
  questions: SurveyQuestion[];
}

export const surveys: Survey[] = [
  {
    id: 'bienestar-juvenil-2026',
    title: 'Bienestar Juvenil 2026 (Muestra rápida)',
    description: 'Cuestionario basado en los reactivos principales de la encuesta Bienestar de Jóvenes Jul–Ago 2026.',
    period: 'Jul–Ago 2026',
    estimatedMinutes: 2,
    questions: [
      {
        id: 'q6',
        prompt: 'En una escala del 1 al 5, ¿qué tan satisfecha(o) estás con tu vida en general?',
        options: [
          '1. Nada satisfecha(o)',
          '2. Poco satisfecha(o)',
          '3. Ni satisfecha(o), ni insatisfecha(o)',
          '4. Algo satisfecha(o)',
          '5. Muy satisfecha(o)',
        ],
      },
      {
        id: 'q16',
        prompt: '¿Qué tan segura(o) te sientes en tu escuela o centro de trabajo?',
        options: [
          '1. Nada segura(o)',
          '2. Poco segura(o)',
          '3. Algo segura(o)',
          '4. Muy segura(o)',
          '5. Totalmente segura(o)',
        ],
      },
      {
        id: 'q17',
        prompt: 'Para ti, ¿qué importancia tiene hoy la educación superior?',
        options: [
          '1. Ninguna importancia',
          '2. Poca importancia',
          '3. Algo de importancia',
          '4. Mucha importancia',
          '5. Total importancia',
        ],
      },
    ],
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
        prompt: '¿Qué medio de transporte utilizas con mayor frecuencia?',
        options: ['Transporte público (camión / tren)', 'Automóvil particular', 'Bicicleta o caminar', 'Plataforma / taxi'],
      },
      {
        id: 'm2',
        prompt: '¿Qué tan satisfecha(o) estás con el uso del tiempo libre que tienes?',
        options: ['1. Nada satisfecha(o)', '2. Poco satisfecha(o)', '3. Neutral', '4. Algo satisfecha(o)', '5. Muy satisfecha(o)'],
      },
    ],
  },
];

export function getSurveyById(id?: string): Survey {
  return surveys.find((s) => s.id === id) ?? surveys[0];
}
