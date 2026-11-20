/// <reference types="jest" />
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppStateProvider } from '../context/AppStateContext';
import WelcomeScreen from '../screens/WelcomeScreen';
import * as AppState from '../context/AppStateContext';

const mockReplace = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockReplace }),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
  };
});

let mockSupabaseConfigured = false;

jest.mock('../lib/supabase', () => ({
  get isSupabaseConfigured() {
    return mockSupabaseConfigured;
  },
  supabase: null,
}));

describe('WelcomeScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockSupabaseConfigured = false;
    jest.restoreAllMocks();
  });

  it('renders guest and login buttons and navigates on guest press', async () => {
    await render(
      <AppStateProvider>
        <WelcomeScreen />
      </AppStateProvider>
    );

    fireEvent.press(screen.getByText('Explorar sin cuenta'));
    expect(mockReplace).toHaveBeenCalledWith('Main');
  });

  it('navigates on login press when Supabase is in local demo mode', async () => {
    await render(
      <AppStateProvider>
        <WelcomeScreen />
      </AppStateProvider>
    );

    await fireEvent.press(screen.getByText('Iniciar sesión'));
    expect(mockReplace).toHaveBeenCalledWith('Main');
  });

  it('shows Nombres, Apellidos, and Teléfono on registration and submits them', async () => {
    const signUpSpy = jest.fn(async () => ({ ok: true }));
    mockSupabaseConfigured = true;
    jest.spyOn(AppState, 'useAppState').mockReturnValue({
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
      signUpWithPassword: signUpSpy,
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
    });

    await render(<WelcomeScreen />);
    await fireEvent.press(screen.getByText('Iniciar sesión'));
    await fireEvent.press(screen.getByText('¿No tienes cuenta? Regístrate'));

    await fireEvent.changeText(screen.getByPlaceholderText('Nombres'), 'Sofía');
    await fireEvent.changeText(screen.getByPlaceholderText('Apellidos'), 'Pérez López');
    await fireEvent.changeText(screen.getByPlaceholderText('Teléfono (10 dígitos)'), '3312345678');
    await fireEvent.changeText(screen.getByPlaceholderText('Correo electrónico'), 'sofia@tec.mx');
    await fireEvent.changeText(screen.getByPlaceholderText('Contraseña (mín. 6 caracteres)'), 'secret123');
    await fireEvent.press(screen.getByText('Crear cuenta'));

    await waitFor(() => {
      expect(signUpSpy).toHaveBeenCalledWith('sofia@tec.mx', 'secret123', {
        firstName: 'Sofía',
        lastName: 'Pérez López',
        phone: '3312345678',
      });
      expect(mockReplace).toHaveBeenCalledWith('Main');
    });
  });
});
