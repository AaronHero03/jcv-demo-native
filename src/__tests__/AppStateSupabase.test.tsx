/// <reference types="jest" />
import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { AppStateProvider, useAppState } from '../context/AppStateContext';

const mockInsert = jest.fn(async () => ({ error: null }));
const mockDeleteEq2 = jest.fn(async () => ({ error: null }));
const mockDeleteEq1 = jest.fn(() => ({ eq: mockDeleteEq2 }));
const mockDelete = jest.fn(() => ({ eq: mockDeleteEq1 }));
const mockUpdateEq = jest.fn(async () => ({ error: null }));
const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));
const mockSelectEqFav = jest.fn(async () => ({ data: [{ item_id: 'Q_7' }], error: null }));
const mockMaybeSingle = jest.fn(async () => ({ data: { role: 'user', is_tec_verified: false }, error: null }));
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
  });

  it('inserts and deletes favorites using RLS-compatible calls (insert, not upsert)', async () => {
    const { result } = await renderHook(() => useAppState(), { wrapper });

    await act(async () => {
      result.current.toggleFavorite('Q_6', 'indicator');
    });

    expect(mockFrom).toHaveBeenCalledWith('favorites');
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'uid-123',
      item_id: 'Q_6',
      item_type: 'indicator',
    });

    await act(async () => {
      result.current.toggleFavorite('Q_6', 'indicator');
    });

    expect(mockDelete).toHaveBeenCalled();
    expect(mockDeleteEq1).toHaveBeenCalledWith('user_id', 'uid-123');
    expect(mockDeleteEq2).toHaveBeenCalledWith('item_id', 'Q_6');
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
