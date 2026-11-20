/// <reference types="jest" />
import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { AppStateProvider, useAppState } from '../context/AppStateContext';

const mockInsert = jest.fn(async (): Promise<{ error: { code?: string; message: string } | null }> => ({
  error: null,
}));
const mockDeleteEq2 = jest.fn(async (): Promise<{ error: { code?: string; message: string } | null }> => ({
  error: null,
}));
const mockDeleteEq1 = jest.fn(() => ({ eq: mockDeleteEq2 }));
const mockDelete = jest.fn(() => ({ eq: mockDeleteEq1 }));
const mockUpdateEq = jest.fn(async () => ({ error: null }));
const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));
const mockSelectEqFav = jest.fn(async () => ({ data: [{ item_id: 'Q_7' }], error: null }));
const mockMaybeSingle = jest.fn(async () => ({
  data: { role: 'tec_verified', is_tec_verified: true },
  error: null,
}));
const mockSelectEqProf = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));

const mockFrom = jest.fn((table: string) => {
  if (table === 'favorites') {
    return {
      select: jest.fn(() => ({ eq: mockSelectEqFav })),
      insert: mockInsert,
      delete: mockDelete,
    };
  }
  return {
    select: jest.fn(() => ({ eq: mockSelectEqProf })),
    update: mockUpdate,
  };
});

jest.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: { user: { id: 'uid-123', email: 'user@tec.mx' } } },
      })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signUp: jest.fn(async () => ({
        data: { user: { id: 'uid-123', email: 'user@tec.mx' } },
        error: null,
      })),
      signInWithPassword: jest.fn(async () => ({
        data: { user: { id: 'uid-123', email: 'user@tec.mx' } },
        error: null,
      })),
      signOut: jest.fn(async () => ({ error: null })),
    },
    from: (table: string) => mockFrom(table),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppStateProvider>{children}</AppStateProvider>
);

describe('AppStateContext Supabase DB writes (profiles & favorites)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockDeleteEq2.mockResolvedValue({ error: null });
  });

  it('inserts multiple different favorites (indicator + news) and deletes them', async () => {
    const { result } = await renderHook(() => useAppState(), { wrapper });

    await act(async () => {
      result.current.toggleFavorite('Q_6', 'indicator');
      result.current.toggleFavorite('news-bienestar-2026', 'news');
    });

    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'uid-123',
      item_id: 'Q_6',
      item_type: 'indicator',
    });
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'uid-123',
      item_id: 'news-bienestar-2026',
      item_type: 'news',
    });
    expect(result.current.isFavorite('Q_6')).toBe(true);
    expect(result.current.isFavorite('news-bienestar-2026')).toBe(true);

    await act(async () => {
      result.current.toggleFavorite('Q_6', 'indicator');
    });

    expect(mockDelete).toHaveBeenCalled();
    expect(mockDeleteEq1).toHaveBeenCalledWith('user_id', 'uid-123');
    expect(mockDeleteEq2).toHaveBeenCalledWith('item_id', 'Q_6');
  });

  it('rolls back optimistic favorite insert on FK/RLS error (409 / 23503) and keeps on 23505', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = await renderHook(() => useAppState(), { wrapper });

    mockInsert.mockResolvedValueOnce({
      error: { code: '23503', message: 'violates foreign key constraint "favorites_user_id_fkey"' },
    });

    await act(async () => {
      result.current.toggleFavorite('Q_8', 'indicator');
    });

    expect(result.current.isFavorite('Q_8')).toBe(false);
    expect(warnSpy).toHaveBeenCalled();

    mockInsert.mockResolvedValueOnce({
      error: { code: '23505', message: 'duplicate key' },
    });

    await act(async () => {
      result.current.toggleFavorite('Q_9', 'indicator');
    });

    expect(result.current.isFavorite('Q_9')).toBe(true);
    warnSpy.mockRestore();
  });

  it('rolls back optimistic favorite delete when Supabase delete fails', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = await renderHook(() => useAppState(), { wrapper });

    // Q_7 was loaded from mockSelectEqFav on mount
    expect(result.current.isFavorite('Q_7')).toBe(true);

    mockDeleteEq2.mockResolvedValueOnce({
      error: { code: '42501', message: 'permission denied' },
    });

    await act(async () => {
      result.current.toggleFavorite('Q_7', 'indicator');
    });

    expect(result.current.isFavorite('Q_7')).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('loads remote profile and favorites on signInWithPassword and updates is_tec_verified on signUp', async () => {
    const { result } = await renderHook(() => useAppState(), { wrapper });

    await act(async () => {
      const res = await result.current.signInWithPassword('user@tec.mx', 'Secret123');
      expect(res.ok).toBe(true);
    });

    expect(result.current.userId).toBe('uid-123');
    expect(result.current.isTecVerified).toBe(true);
    expect(result.current.favoriteIds).toContain('Q_7');

    await act(async () => {
      const res = await result.current.signUpWithPassword('nuevo@tec.mx', 'Secret123');
      expect(res.ok).toBe(true);
    });

    expect(mockUpdate).toHaveBeenCalledWith({ is_tec_verified: true });
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'uid-123');
  });

  it('updates only is_tec_verified (without role escalation) on verifyTecEmail', async () => {
    const { result } = await renderHook(() => useAppState(), { wrapper });

    await act(async () => {
      result.current.verifyTecEmail('aaron@tec.mx');
    });

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith({ is_tec_verified: true });
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'uid-123');
  });
});
