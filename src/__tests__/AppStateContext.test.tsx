/// <reference types="jest" />
import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { AppStateProvider, useAppState } from '../context/AppStateContext';

jest.mock('../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppStateProvider>{children}</AppStateProvider>
);

describe('AppStateContext (Auth, TEC verification, Favorites & Logout)', () => {
  it('starts in guest mode and logs in as user', async () => {
    const { result } = await renderHook(() => useAppState(), { wrapper });
    expect(result.current.userMode).toBe('guest');
    expect(result.current.userEmail).toBeNull();

    await act(async () => {
      result.current.loginAsUser('ciudadano@jalisco.mx');
    });

    expect(result.current.userMode).toBe('user');
    expect(result.current.userEmail).toBe('ciudadano@jalisco.mx');
  });

  it('validates @tec.mx emails and rejects non-tec emails', async () => {
    const { result } = await renderHook(() => useAppState(), { wrapper });

    let okInvalid = true;
    await act(async () => {
      okInvalid = result.current.verifyTecEmail('usuario@gmail.com');
    });
    expect(okInvalid).toBe(false);
    expect(result.current.isTecVerified).toBe(false);

    let okValid = false;
    await act(async () => {
      okValid = result.current.verifyTecEmail('A00574813@tec.mx');
    });
    expect(okValid).toBe(true);
    expect(result.current.isTecVerified).toBe(true);
    expect(result.current.userRole).toBe('tec_verified');
    expect(result.current.userEmail).toBe('a00574813@tec.mx');
  });

  it('rejects empty credentials and short passwords on signUpWithPassword', async () => {
    const { result } = await renderHook(() => useAppState(), { wrapper });

    const signInRes = await result.current.signInWithPassword('', '');
    expect(signInRes.ok).toBe(false);

    const signUpRes = await result.current.signUpWithPassword('test@tec.mx', '123');
    expect(signUpRes.ok).toBe(false);
  });

  it('toggles favorites and clears all state on logout', async () => {
    const { result } = await renderHook(() => useAppState(), { wrapper });

    await act(async () => {
      await result.current.signInWithPassword('demo@tec.mx', 'password123');
      result.current.toggleFavorite('Q_6', 'indicator');
      result.current.submitSurvey('bienestar-2026', { Q_6: '5' });
    });

    expect(result.current.isFavorite('Q_6')).toBe(true);
    expect(result.current.completedSurveyIds).toContain('bienestar-2026');

    await act(async () => {
      result.current.logout();
    });

    expect(result.current.userMode).toBe('guest');
    expect(result.current.userEmail).toBeNull();
    expect(result.current.isTecVerified).toBe(false);
    expect(result.current.favoriteIds).toEqual([]);
    expect(result.current.completedSurveyIds).toEqual([]);
  });
});
