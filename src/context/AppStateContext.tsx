import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '../lib/supabase';
import { clearDraft, draftKey } from '../lib/surveyDraft';
import { surveys } from '../data/surveys';
import { loadCompletions } from '../lib/surveyCatalog';

export interface ForumReply {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface AppStateContextValue {
  userId: string | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  // Acceso de demostración cuando no hay conexión configurada
  userMode: 'guest' | 'user';
  userEmail: string | null;
  isTecVerified: boolean;
  loginAsGuest: () => void;
  loginAsUser: (email?: string) => void;
  verifyTecEmail: (email: string) => boolean;
  logout: () => Promise<void>;

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
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userMode, setUserMode] = useState<'guest' | 'user'>('guest');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isTecVerified, setIsTecVerified] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [completedSurveyIds, setCompletedSurveyIds] = useState<string[]>([]);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, Record<string, string>>>({});
  const [forumRepliesByTopic, setForumRepliesByTopic] = useState<Record<string, ForumReply[]>>({});

  const resetAccount = () => {
    setUserId(null);
    setIsAdmin(false);
    setFavoriteIds([]);
    setCompletedSurveyIds([]);
    setSurveyAnswers({});
    setForumRepliesByTopic({});
    setUserMode('guest');
    setUserEmail(null);
    setIsTecVerified(false);
  };

  useEffect(() => {
    const listener = supabase?.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') resetAccount();
    });
    return () => listener?.data.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase no está configurado.');
    const login = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (login.error) throw login.error;
    try {
      const { data: profile, error } = await supabase.rpc('nico_sync_profile').single<{
        id: string; email: string; role: string; is_tec_verified: boolean;
      }>();
      if (error || !profile) throw error || new Error('No se pudo leer el perfil.');
      const completed = await loadCompletions(profile.id);
      // Recupera la limpieza si la app se cerró entre el registro remoto y el borrado local.
      for (const surveyId of completed) void clearDraft(draftKey(profile.id, surveyId)).catch(() => undefined);
      resetAccount();
      setUserId(profile.id);
      setUserMode('user');
      setUserEmail(profile.email);
      setIsAdmin(profile.role === 'admin');
      setIsTecVerified(profile.is_tec_verified);
      setCompletedSurveyIds(completed);
    } catch (error) {
      await supabase.auth.signOut({ scope: 'local' });
      throw error;
    }
  };

  const loginAsGuest = resetAccount;
  const loginAsUser = (email = 'ciudadano@jalisco.mx') => {
    if (supabase) return;
    setUserMode('user');
    setUserEmail(email);
  };

  const verifyTecEmail = (email: string): boolean => {
    if (supabase) return isTecVerified;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith('@tec.mx') || trimmed.length <= '@tec.mx'.length) {
      return false;
    }
    setUserMode('user');
    setUserEmail(trimmed);
    setIsTecVerified(true);
    return true;
  };

  const logout = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } else if (userEmail) {
      for (const survey of surveys) await clearDraft(draftKey('demo-' + userEmail, survey.id));
    }
    resetAccount();
  };

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const isFavorite = (id: string) => favoriteIds.includes(id);

  const submitSurvey = (surveyId: string, answers: Record<string, string>) => {
    if (!supabase) setSurveyAnswers((prev) => ({ ...prev, [surveyId]: answers }));
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
        userId, isAdmin, signIn, userMode,
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
