/// <reference types="jest" />
import React from 'react';
import { AppState as RNAppState, Platform, Text } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import InactivityLockGate, { INACTIVITY_TIMEOUT_MS } from '../components/InactivityLockGate';
import * as AppStateCtx from '../context/AppStateContext';
import * as deviceConfirmation from '../lib/deviceConfirmation';

const baseState: AppStateCtx.AppStateContextValue = {
  userMode: 'user',
  userId: 'u1',
  userEmail: 'sofia@tec.mx',
  userFirstName: 'Sofía',
  userRole: 'tec_verified',
  isAdmin: false,
  isTecVerified: true,
  authLoading: false,
  loginAsGuest: jest.fn(),
  loginAsUser: jest.fn(),
  signInWithPassword: jest.fn(),
  signUpWithPassword: jest.fn(),
  verifyTecEmail: jest.fn(),
  logout: jest.fn(),
  favoriteIds: [],
  toggleFavorite: jest.fn(),
  isFavorite: () => false,
  completedSurveyIds: [],
  surveyAnswers: {},
  submitSurvey: jest.fn(),
  forumRepliesByTopic: {},
  addForumReply: jest.fn(),
};

describe('InactivityLockGate (MASVS-AUTH-2)', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.restoreAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  });

  it('locks after inactivity timeout and unlocks with local device confirmation', async () => {
    jest.spyOn(AppStateCtx, 'useAppState').mockReturnValue(baseState);
    const confirmSpy = jest.spyOn(deviceConfirmation, 'confirmOnDevice').mockResolvedValue(undefined);

    await render(
      <InactivityLockGate>
        <Text>Contenido protegido</Text>
      </InactivityLockGate>
    );

    expect(screen.queryByText('Sesión bloqueada por inactividad')).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(INACTIVITY_TIMEOUT_MS + 30_000);
    });

    await waitFor(() => {
      expect(screen.getByText('Sesión bloqueada por inactividad')).toBeTruthy();
    });

    await fireEvent.press(screen.getByText('Desbloquear con biometría / PIN'));
    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(screen.queryByText('Sesión bloqueada por inactividad')).toBeNull();
    });
  });

  it('locks when returning from background after timeout and allows logout', async () => {
    let listener: ((state: string) => void) | undefined;
    jest.spyOn(RNAppState, 'addEventListener').mockImplementation((_ev, cb) => {
      listener = cb as (state: string) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof RNAppState.addEventListener>;
    });
    const logout = jest.fn();
    jest.spyOn(AppStateCtx, 'useAppState').mockReturnValue({ ...baseState, logout });

    await render(
      <InactivityLockGate>
        <Text>Contenido protegido</Text>
      </InactivityLockGate>
    );

    await act(async () => {
      listener?.('background');
      jest.advanceTimersByTime(INACTIVITY_TIMEOUT_MS + 1000);
      listener?.('active');
    });

    await waitFor(() => {
      expect(screen.getByText('Sesión bloqueada por inactividad')).toBeTruthy();
    });

    await fireEvent.press(screen.getByText('Cerrar sesión'));
    expect(logout).toHaveBeenCalled();
  });
});
