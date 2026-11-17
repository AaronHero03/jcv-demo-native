import type { TabId } from '../theme/colors';

// Contenido de cada pantalla. Separado de la UI: cambiar textos no obliga a tocar componentes.
export type PageId =
  | 'inicio' | 'explorar' | 'indicador' | 'comparar' | 'mapa' | 'asistente'
  | 'participar' | 'encuesta' | 'enviada'
  | 'comunidad' | 'noticias' | 'foro' | 'tema'
  | 'perfil' | 'favoritos' | 'verificacion'
  | 'acerca' | 'metodologia' | 'privacidad' | 'ayuda' | 'admin';

export type Page = { emoji: string; title: string; text: string; links?: [label: string, to: PageId][] };

export const pages: Record<PageId, Page> = {
  inicio: { emoji: '🏠', title: 'Inicio', text: 'Indicadores destacados, encuestas vigentes y noticias recientes.', links: [['Ver indicador destacado', 'indicador'], ['Preguntar al asistente', 'asistente']] },
  explorar: { emoji: '🔎', title: 'Explorar', text: 'Busca resultados por tema o encuesta.', links: [['Bienestar subjetivo', 'indicador'], ['Comparar A/B', 'comparar'], ['Mapa municipal', 'mapa']] },
  indicador: { emoji: '📊', title: 'Indicador', text: 'Pregunta, gráfica, fuente y periodo.', links: [['Comparar', 'comparar'], ['Ver en mapa', 'mapa'], ['Preguntar al asistente', 'asistente']] },
  comparar: { emoji: '⚖️', title: 'Comparar A/B', text: 'Dos grupos con filtros independientes.' },
  mapa: { emoji: '🗺️', title: 'Mapa municipal', text: 'Resultados por municipio.' },
  asistente: { emoji: '🎙️', title: 'Asistente', text: 'Pregunta por texto o voz sobre los resultados.' },
  participar: { emoji: '📝', title: 'Participar', text: 'Encuestas disponibles, en progreso y completadas.', links: [['Bienestar Juvenil 2026', 'encuesta']] },
  encuesta: { emoji: '✍️', title: 'Cuestionario', text: 'Responde las preguntas y envía.', links: [['Enviar respuestas', 'enviada']] },
  enviada: { emoji: '🎉', title: '¡Gracias!', text: 'Tu respuesta fue enviada.' },
  comunidad: { emoji: '🤝', title: 'Comunidad', text: 'Noticias y foro ciudadano.', links: [['Noticias', 'noticias'], ['Foro', 'foro']] },
  noticias: { emoji: '📰', title: 'Noticias', text: 'Enlaces a medios con resumen editorial.', links: [['Conversar en el foro', 'tema']] },
  foro: { emoji: '💬', title: 'Foro', text: 'Temas de la comunidad.', links: [['¿Cómo mejorar el transporte?', 'tema']] },
  tema: { emoji: '🗨️', title: 'Tema del foro', text: 'Publicación y respuestas.' },
  perfil: { emoji: '👤', title: 'Perfil', text: 'Tus datos, favoritos y participación.', links: [['Favoritos', 'favoritos'], ['Verificación TEC', 'verificacion']] },
  favoritos: { emoji: '⭐', title: 'Favoritos', text: 'Indicadores y noticias guardadas.' },
  verificacion: { emoji: '🎓', title: 'Verificación TEC', text: 'Verifica tu correo institucional.' },
  acerca: { emoji: 'ℹ️', title: 'Acerca de JCV', text: 'Quiénes somos.' },
  metodologia: { emoji: '🧪', title: 'Metodología', text: 'Cómo se obtienen los datos.' },
  privacidad: { emoji: '🔒', title: 'Privacidad', text: 'Aviso de privacidad.' },
  ayuda: { emoji: '❓', title: 'Ayuda', text: 'Preguntas frecuentes.' },
  admin: { emoji: '🛠️', title: 'Administración', text: 'Solo personal autorizado.' },
};

// BOTTOM TABS: los 5 destinos principales del spec (§5).
export const tabs: { id: TabId; label: string; emoji: string }[] = [
  { id: 'inicio', label: 'Inicio', emoji: '🏠' },
  { id: 'explorar', label: 'Explorar', emoji: '🔎' },
  { id: 'participar', label: 'Participar', emoji: '📝' },
  { id: 'comunidad', label: 'Comunidad', emoji: '🤝' },
  { id: 'perfil', label: 'Perfil', emoji: '👤' },
];

// STACK: pantallas que puede apilar cada pestaña (la primera es la raíz).
export const tabStacks: Record<TabId, PageId[]> = {
  inicio: ['inicio', 'indicador', 'comparar', 'mapa', 'asistente'],
  explorar: ['explorar', 'indicador', 'comparar', 'mapa', 'asistente'],
  participar: ['participar', 'encuesta', 'enviada'],
  comunidad: ['comunidad', 'noticias', 'foro', 'tema'],
  perfil: ['perfil', 'favoritos', 'verificacion'],
};

// DRAWER: páginas secundarias (spec §5 «Información» y «Administración»).
export const drawerPages: PageId[] = ['acerca', 'metodologia', 'privacidad', 'ayuda', 'admin'];
