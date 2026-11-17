import { createContext, useContext, useState, type ReactNode } from 'react';

export interface ForumReply {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface AppStateContextValue {
  // Sesión simulada
  userMode: 'guest' | 'user';
  userEmail: string | null;
  isTecVerified: boolean;
  loginAsGuest: () => void;
  loginAsUser: (email?: string) => void;
  verifyTecEmail: (email: string) => boolean;
  logout: () => void;

  // Favoritos (IDs reales de indicadores o noticias)
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;

  // Encuestas
  completedSurveyIds: string[];
  surveyAnswers: Record<string, Record<string, string>>;
  submitSurvey: (surveyId: string, answers: Record<string, string>) => void;

  // Foro (respuestas agregadas durante la sesión)
  forumRepliesByTopic: Record<string, ForumReply[]>;
  addForumReply: (topicId: string, author: string, text: string) => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

/**
 * Proveedor de estado global en memoria para la sesión actual (favoritos, encuestas, foro y sesión demo).
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [userMode, setUserMode] = useState<'guest' | 'user'>('guest');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isTecVerified, setIsTecVerified] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [completedSurveyIds, setCompletedSurveyIds] = useState<string[]>([]);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, Record<string, string>>>({});
  const [forumRepliesByTopic, setForumRepliesByTopic] = useState<Record<string, ForumReply[]>>({});

  const loginAsGuest = () => {
    setUserMode('guest');
    setUserEmail(null);
    setIsTecVerified(false);
  };

  const loginAsUser = (email = 'ciudadano@jalisco.mx') => {
    setUserMode('user');
    setUserEmail(email);
  };

  const verifyTecEmail = (email: string): boolean => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith('@tec.mx') || trimmed.length <= '@tec.mx'.length) {
      return false;
    }
    setUserMode('user');
    setUserEmail(trimmed);
    setIsTecVerified(true);
    return true;
  };

  const logout = () => {
    setUserMode('guest');
    setUserEmail(null);
    setIsTecVerified(false);
    setFavoriteIds([]);
    setCompletedSurveyIds([]);
    setSurveyAnswers({});
    setForumRepliesByTopic({});
  };

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const isFavorite = (id: string) => favoriteIds.includes(id);

  const submitSurvey = (surveyId: string, answers: Record<string, string>) => {
    setSurveyAnswers((prev) => ({ ...prev, [surveyId]: answers }));
    setCompletedSurveyIds((prev) => (prev.includes(surveyId) ? prev : [...prev, surveyId]));
  };

  const addForumReply = (topicId: string, author: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const reply: ForumReply = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: author.trim() || 'Ciudadano',
      text: trimmed,
      createdAt: 'Justo ahora',
    };
    setForumRepliesByTopic((prev) => ({
      ...prev,
      [topicId]: [...(prev[topicId] ?? []), reply],
    }));
  };

  return (
    <AppStateContext.Provider
      value={{
        userMode,
        userEmail,
        isTecVerified,
        loginAsGuest,
        loginAsUser,
        verifyTecEmail,
        logout,
        favoriteIds,
        toggleFavorite,
        isFavorite,
        completedSurveyIds,
        surveyAnswers,
        submitSurvey,
        forumRepliesByTopic,
        addForumReply,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

/**
 * Hook para acceder al estado global de la aplicación.
 */
export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState debe usarse dentro de AppStateProvider');
  }
  return ctx;
}
