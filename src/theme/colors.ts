// Paleta del manual de marca JCV (spec §15). Todos los colores viven aquí para no repetirlos en cada pantalla.
export const colors = {
  navy: '#003E79',
  yellow: '#FFC425',
  brightYellow: '#FFEE00',
  orange: '#F8981D',
  pink: '#ED1849',
  darkPink: '#C60C46',
  green: '#D5E04D',
  background: '#F7F8F6',
  muted: '#667287',
  white: '#FFFFFF',
  border: '#E6E9EC',
  track: '#EDF0F2',
};

export type TabId = 'inicio' | 'explorar' | 'participar' | 'comunidad' | 'perfil';

// Un color por pestaña: el usuario sabe en qué sección está. "ink" = color de texto con buen contraste.
export const tabTheme: Record<TabId | 'drawer', { color: string; ink: string }> = {
  inicio: { color: colors.navy, ink: colors.white },
  explorar: { color: colors.orange, ink: colors.navy },
  participar: { color: colors.darkPink, ink: colors.white },
  comunidad: { color: colors.green, ink: colors.navy },
  perfil: { color: colors.yellow, ink: colors.navy },
  drawer: { color: colors.navy, ink: colors.white },
};
