/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AdminScreen from '../screens/AdminScreen';
import DonationsScreen from '../screens/DonationsScreen';
import SurveyScreen from '../screens/SurveyScreen';
import * as AppState from '../context/AppStateContext';
import * as deviceConfirmation from '../lib/deviceConfirmation';
import * as publication from '../lib/publication';
import * as surveyCatalog from '../lib/surveyCatalog';
import * as supabaseMod from '../lib/supabase';
import { openBrowserAsync } from 'expo-web-browser';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useFocusEffect: (cb: () => void) => {
      const ReactLocal = require('react');
      ReactLocal.useEffect(() => cb(), [cb]);
    },
    useNavigation: () => ({ replace: jest.fn(), navigate: jest.fn() }),
    useRoute: () => ({ params: { surveyId: 'encuesta-tec-bienestar' } }),
  };
});

jest.mock('expo-crypto', () => ({
  randomUUID: () => '11111111-1111-4111-8111-111111111111',
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(async () => ({ type: 'opened' })),
}));

const baseState: AppState.AppStateContextValue = {
  userMode: 'guest',
  userId: null,
  userEmail: null,
  userFirstName: null,
  userRole: 'user',
  isAdmin: false,
  isTecVerified: false,
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

describe('AdminScreen', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('blocks non-admin users', async () => {
    jest.spyOn(AppState, 'useAppState').mockReturnValue({ ...baseState, userId: 'u1', isAdmin: false });
    await render(<AdminScreen />);
    expect(screen.getByText('Se requiere una cuenta administradora.')).toBeTruthy();
  });

  it('allows admins to load and toggle publication with device confirmation', async () => {
    jest.spyOn(AppState, 'useAppState').mockReturnValue({
      ...baseState,
      userMode: 'user',
      userId: 'admin-1',
      userRole: 'admin',
      isAdmin: true,
    });
    jest.spyOn(publication, 'loadPublications').mockResolvedValue([
      { id: 's1', title: 'Encuesta Jóvenes', visible: false },
    ]);
    jest.spyOn(deviceConfirmation, 'confirmOnDevice').mockResolvedValue(undefined);
    const changeSpy = jest.spyOn(publication, 'changePublication').mockResolvedValue(undefined);

    await render(<AdminScreen />);

    await waitFor(() => {
      expect(screen.getByText('Encuesta Jóvenes')).toBeTruthy();
    });

    await fireEvent.press(screen.getByText('Publicar'));
    await waitFor(() => {
      expect(changeSpy).toHaveBeenCalledWith('surveys', 's1', true);
      expect(screen.getByText('Contenido publicado.')).toBeTruthy();
    });
  });
});

describe('DonationsScreen', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('shows notice when user is not signed in or supabase is null', async () => {
    jest.spyOn(AppState, 'useAppState').mockReturnValue({ ...baseState, userId: null });
    await render(<DonationsScreen />);
    expect(screen.getByText(/Vista previa|Inicia sesión para donar/)).toBeTruthy();
  });

  it('validates amount bounds and opens valid Stripe Checkout URL', async () => {
    const mockInvoke = jest.fn().mockResolvedValue({
      data: { url: 'https://checkout.stripe.com/c/pay/cs_test_123' },
      error: null,
    });
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({ data: [], error: null }),
          }),
        }),
      }),
      functions: { invoke: mockInvoke },
    } as unknown as NonNullable<typeof supabaseMod.supabase>;
    jest.spyOn(supabaseMod, 'database').mockReturnValue(fakeClient);
    Object.defineProperty(supabaseMod, 'supabase', { value: fakeClient, configurable: true });
    jest.spyOn(AppState, 'useAppState').mockReturnValue({ ...baseState, userMode: 'user', userId: 'u1' });
    jest.spyOn(deviceConfirmation, 'confirmOnDevice').mockResolvedValue(undefined);

    await render(<DonationsScreen />);

    const input = screen.getByLabelText('Monto en pesos mexicanos');
    await fireEvent.changeText(input, '5');
    await fireEvent.press(screen.getByText('Continuar a Stripe Checkout'));
    expect(screen.getByText('Elige un monto entero entre $10 y $999,999 MXN.')).toBeTruthy();

    await fireEvent.changeText(input, '100');
    await fireEvent.press(screen.getByText('Continuar a Stripe Checkout'));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('create-checkout-session', {
        body: { amount_mxn: 100, request_id: '11111111-1111-4111-8111-111111111111' },
      });
      expect(openBrowserAsync).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_123');
    });
  });
});

describe('SurveyScreen', () => {
  it('blocks unverified/guest users and already-completed surveys', async () => {
    jest.spyOn(surveyCatalog, 'loadSurveys').mockResolvedValue([
      {
        id: 'encuesta-tec-bienestar',
        title: 'Bienestar Tec',
        description: 'Desc',
        period: '2026',
        estimatedMinutes: 5,
        questions: [{ id: 'q1', prompt: '¿Cómo estás?', type: 'single', options: ['Bien', 'Mal'] }],
      },
    ]);

    jest.spyOn(AppState, 'useAppState').mockReturnValue({
      ...baseState,
      userMode: 'guest',
      completedSurveyIds: [],
    });
    await render(<SurveyScreen />);
    await waitFor(() => {
      expect(screen.getByText('Para responder, inicia sesión con tu cuenta Tec verificada.')).toBeTruthy();
    });

    jest.spyOn(AppState, 'useAppState').mockReturnValue({
      ...baseState,
      userMode: 'user',
      userId: 'u1',
      isTecVerified: true,
      completedSurveyIds: ['encuesta-tec-bienestar'],
    });
    await render(<SurveyScreen />);
    await waitFor(() => {
      expect(screen.getByText('Ya respondiste esta encuesta.')).toBeTruthy();
    });
  });
});
