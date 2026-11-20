import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { FavoriteItemType, UserRole } from '../types/database';

export interface ForumReply {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

export interface AppStateContextValue {
  // Sesión (Supabase Auth con respaldo de modo invitado)
  userMode: 'guest' | 'user';
  userId: string | null;
  userEmail: string | null;
  userRole: UserRole;
  isTecVerified: boolean;
  authLoading: boolean;
  loginAsGuest: () => void;
  loginAsUser: (email?: string) => void;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUpWithPassword: (email: string, password: string) => Promise<AuthResult>;
  verifyTecEmail: (email: string) => boolean;
  logout: () => void;

  // Favoritos (IDs reales de indicadores o noticias)
  favoriteIds: string[];
  toggleFavorite: (id: string, itemType?: FavoriteItemType) => void;
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
 * Proveedor de estado global con Supabase Auth (expo-secure-store) y respaldo en memoria.
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [userMode, setUserMode] = useState<'guest' | 'user'>('guest');
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [isTecVerified, setIsTecVerified] = useState(false);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [completedSurveyIds, setCompletedSurveyIds] = useState<string[]>([]);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, Record<string, string>>>({});
  const [forumRepliesByTopic, setForumRepliesByTopic] = useState<Record<string, ForumReply[]>>({});

  const loadUserRemoteData = async (uid: string, email: string | null) => {
    if (!supabase) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_tec_verified')
      .eq('id', uid)
      .maybeSingle();

    if (profile) {
      setUserRole((profile.role as UserRole) ?? 'user');
      setIsTecVerified(Boolean(profile.is_tec_verified));
    } else if (email) {
      const isTec = email.toLowerCase().endsWith('@tec.mx');
      setUserRole(isTec ? 'tec_verified' : 'user');
      setIsTecVerified(isTec);
    }

    const { data: favs } = await supabase
      .from('favorites')
      .select('item_id')
      .eq('user_id', uid);

    if (favs) {
      setFavoriteIds(favs.map((f) => String(f.item_id)));
    }
  };

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session = data.session;
      if (session?.user) {
        setUserMode('user');
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? null);
        loadUserRemoteData(session.user.id, session.user.email ?? null);
      }
      setAuthLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUserMode('user');
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? null);
        loadUserRemoteData(session.user.id, session.user.email ?? null);
      } else {
        setUserMode('guest');
        setUserId(null);
        setUserEmail(null);
        setUserRole('user');
        setIsTecVerified(false);
        setFavoriteIds([]);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const loginAsGuest = () => {
    setUserMode('guest');
    setUserId(null);
    setUserEmail(null);
    setUserRole('user');
    setIsTecVerified(false);
  };

  const loginAsUser = (email = 'ciudadano@jalisco.mx') => {
    setUserMode('user');
    setUserEmail(email);
  };

  const signInWithPassword = async (email: string, password: string): Promise<AuthResult> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { ok: false, error: 'Ingresa tu correo y contraseña.' };
    }
    if (!supabase) {
      loginAsUser(cleanEmail);
      return { ok: true };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error || !data.user) {
      return { ok: false, error: error?.message ?? 'No se pudo iniciar sesión.' };
    }
    setUserMode('user');
    setUserId(data.user.id);
    setUserEmail(data.user.email ?? cleanEmail);
    await loadUserRemoteData(data.user.id, data.user.email ?? cleanEmail);
    return { ok: true };
  };

  const signUpWithPassword = async (email: string, password: string): Promise<AuthResult> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || password.length < 6) {
      return { ok: false, error: 'Usa un correo válido y contraseña de al menos 6 caracteres.' };
    }
    if (!supabase) {
      loginAsUser(cleanEmail);
      return { ok: true };
    }
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    if (data.user) {
      const isTec = cleanEmail.endsWith('@tec.mx');
      if (isTec) {
        await supabase
          .from('profiles')
          .update({ is_tec_verified: true })
          .eq('id', data.user.id);
      }
    }
    return { ok: true };
  };

  const verifyTecEmail = (email: string): boolean => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith('@tec.mx') || trimmed.length <= '@tec.mx'.length) {
      return false;
    }
    setUserMode('user');
    setUserEmail(trimmed);
    setUserRole((prev) => (prev === 'admin' ? 'admin' : 'tec_verified'));
    setIsTecVerified(true);

    if (supabase && userId) {
      void supabase
        .from('profiles')
        .update({ is_tec_verified: true })
        .eq('id', userId);
    }
    return true;
  };

  const logout = () => {
    if (supabase) {
      void supabase.auth.signOut();
    }
    setUserMode('guest');
    setUserId(null);
    setUserEmail(null);
    setUserRole('user');
    setIsTecVerified(false);
    setFavoriteIds([]);
    setCompletedSurveyIds([]);
    setSurveyAnswers({});
    setForumRepliesByTopic({});
  };

  const toggleFavorite = (id: string, itemType: FavoriteItemType = 'indicator') => {
    const exists = favoriteIds.includes(id);
    setFavoriteIds((prev) => (exists ? prev.filter((item) => item !== id) : [...prev, id]));

    if (supabase && userId) {
      if (exists) {
        void supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('item_id', id)
          .then(({ error }) => {
            if (error) {
              console.warn('[favorites] Error al eliminar:', error.message);
              setFavoriteIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
            }
          });
      } else {
        void supabase
          .from('favorites')
          .insert({
            user_id: userId,
            item_id: id,
            item_type: itemType,
          })
          .then(({ error }) => {
            if (error && error.code !== '23505') {
              console.warn('[favorites] Error al guardar:', error.message);
              setFavoriteIds((prev) => prev.filter((item) => item !== id));
            }
          });
      }
    }
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
        userId,
        userEmail,
        userRole,
        isTecVerified,
        authLoading,
        loginAsGuest,
        loginAsUser,
        signInWithPassword,
        signUpWithPassword,
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
