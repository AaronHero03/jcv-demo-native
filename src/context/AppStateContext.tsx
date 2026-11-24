import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { clearStoredAuthTokens, isSupabaseConfigured, supabase } from '../lib/supabase';
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

export interface SignUpDetails {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface AppStateContextValue {
  // Sesión (Supabase Auth con respaldo de modo invitado)
  userMode: 'guest' | 'user';
  userId: string | null;
  userEmail: string | null;
  userFirstName: string | null;
  userRole: UserRole;
  isAdmin: boolean;
  isTecVerified: boolean;
  authLoading: boolean;
  loginAsGuest: () => void;
  loginAsUser: (email?: string) => void;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUpWithPassword: (email: string, password: string, details?: SignUpDetails) => Promise<AuthResult>;
  verifyTecEmail: (email: string) => boolean;
  logout: () => Promise<void> | void;

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
  const [userFirstName, setUserFirstName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [isTecVerified, setIsTecVerified] = useState(false);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [completedSurveyIds, setCompletedSurveyIds] = useState<string[]>([]);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, Record<string, string>>>({});
  const [forumRepliesByTopic, setForumRepliesByTopic] = useState<Record<string, ForumReply[]>>({});

  const loadUserRemoteData = async (uid: string, email: string | null, fallbackFirstName?: string | null) => {
    if (!supabase) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_tec_verified, first_name')
      .eq('id', uid)
      .maybeSingle();

    if (profile) {
      setUserRole((profile.role as UserRole) ?? 'user');
      setIsTecVerified(Boolean(profile.is_tec_verified));
      const profileName = typeof profile.first_name === 'string' ? profile.first_name.trim() : '';
      setUserFirstName(profileName || fallbackFirstName?.trim() || null);
    } else {
      if (email) {
        const isTec = email.toLowerCase().endsWith('@tec.mx');
        setUserRole(isTec ? 'tec_verified' : 'user');
        setIsTecVerified(isTec);
      }
      setUserFirstName(fallbackFirstName?.trim() || null);
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
        const metaName = typeof session.user.user_metadata?.first_name === 'string'
          ? session.user.user_metadata.first_name
          : null;
        setUserMode('user');
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? null);
        loadUserRemoteData(session.user.id, session.user.email ?? null, metaName);
      }
      setAuthLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        const metaName = typeof session.user.user_metadata?.first_name === 'string'
          ? session.user.user_metadata.first_name
          : null;
        setUserMode('user');
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? null);
        loadUserRemoteData(session.user.id, session.user.email ?? null, metaName);
      } else {
        setUserMode('guest');
        setUserId(null);
        setUserEmail(null);
        setUserFirstName(null);
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
    setUserFirstName(null);
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
    const metaName = typeof data.user.user_metadata?.first_name === 'string'
      ? data.user.user_metadata.first_name
      : null;
    setUserMode('user');
    setUserId(data.user.id);
    setUserEmail(data.user.email ?? cleanEmail);
    await loadUserRemoteData(data.user.id, data.user.email ?? cleanEmail, metaName);
    return { ok: true };
  };

  const signUpWithPassword = async (
    email: string,
    password: string,
    details?: SignUpDetails
  ): Promise<AuthResult> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanFirstName = details?.firstName?.trim().replace(/[\u0000-\u001F\u007F]/g, '') ?? '';
    const cleanLastName = details?.lastName?.trim().replace(/[\u0000-\u001F\u007F]/g, '') ?? '';
    const cleanPhone = details?.phone?.replace(/[\s()-]/g, '').trim() ?? '';

    if (details) {
      if (!cleanFirstName || cleanFirstName.length > 80) {
        return { ok: false, error: 'Ingresa tu(s) nombre(s).' };
      }
      if (!cleanLastName || cleanLastName.length > 80) {
        return { ok: false, error: 'Ingresa tus apellidos.' };
      }
      if (!/^\+?\d{7,15}$/.test(cleanPhone)) {
        return { ok: false, error: 'Ingresa un teléfono válido (7 a 15 dígitos).' };
      }
    }
    if (!cleanEmail || password.length < 6) {
      return { ok: false, error: 'Usa un correo válido y contraseña de al menos 6 caracteres.' };
    }
    if (!supabase) {
      if (cleanFirstName) setUserFirstName(cleanFirstName);
      loginAsUser(cleanEmail);
      return { ok: true };
    }
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          first_name: cleanFirstName || undefined,
          last_name: cleanLastName || undefined,
          phone: cleanPhone || undefined,
        },
      },
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    if (cleanFirstName) {
      setUserFirstName(cleanFirstName);
    }
    if (data.user) {
      const isTec = cleanEmail.endsWith('@tec.mx');
      const profileUpdate: Record<string, string | boolean> = {};
      if (cleanFirstName) profileUpdate.first_name = cleanFirstName;
      if (cleanLastName) profileUpdate.last_name = cleanLastName;
      if (cleanPhone) profileUpdate.phone = cleanPhone;
      if (isTec) profileUpdate.is_tec_verified = true;

      if (Object.keys(profileUpdate).length > 0) {
        await supabase
          .from('profiles')
          .update(profileUpdate)
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

  const logout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Ignoramos errores de red; borramos el almacenamiento local abajo.
      }
      await clearStoredAuthTokens();
    }
    setUserMode('guest');
    setUserId(null);
    setUserEmail(null);
    setUserFirstName(null);
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
        userFirstName,
        userRole,
        isAdmin: userRole === 'admin',
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
