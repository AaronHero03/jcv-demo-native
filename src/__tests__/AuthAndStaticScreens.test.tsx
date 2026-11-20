/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import VerificationScreen from '../screens/VerificationScreen';
import AboutScreen from '../screens/AboutScreen';
import MethodologyScreen from '../screens/MethodologyScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import HelpScreen from '../screens/HelpScreen';
import PageScreen from '../screens/PageScreen';
import MapMockScreen from '../screens/MapMockScreen';
import { isQuestionAnswered, isQuestionVisible, answerKeys } from '../data/surveys';
import * as AppState from '../context/AppStateContext';
import * as supabaseMod from '../lib/supabase';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ name: 'inicio', params: { tab: 'drawer' } }),
  useNavigation: () => ({ push: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    const ReactLocal = require('react');
    ReactLocal.useEffect(() => cb(), [cb]);
  },
}));

const baseState: AppState.AppStateContextValue = {
  userMode: 'user',
  userId: null,
  userEmail: '',
  userRole: 'user',
  isAdmin: false,
  isTecVerified: false,
  authLoading: false,
  loginAsGuest: jest.fn(),
  loginAsUser: jest.fn(),
  signInWithPassword: jest.fn(),
  signUpWithPassword: jest.fn(),
  verifyTecEmail: jest.fn((email: string) => email.trim().toLowerCase().endsWith('@tec.mx')),
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

describe('VerificationScreen', () => {
  it('validates @tec.mx emails and shows success or error message', async () => {
    Object.defineProperty(supabaseMod, 'supabase', { value: null, configurable: true });
    jest.spyOn(AppState, 'useAppState').mockReturnValue(baseState);

    await render(<VerificationScreen />);
    const input = screen.getByPlaceholderText('tu.nombre@tec.mx');

    await fireEvent.changeText(input, 'persona@gmail.com');
    await fireEvent.press(screen.getByText('Verificar correo'));
    expect(screen.getByText('Ingresa un correo válido terminado en @tec.mx')).toBeTruthy();

    await fireEvent.changeText(input, 'estudiante@tec.mx');
    await fireEvent.press(screen.getByText('Verificar correo'));
    expect(screen.getByText('Correo institucional verificado correctamente.')).toBeTruthy();
  });
});

describe('Informational & Static Screens', () => {
  it('renders About, Methodology, Privacy, Help, PageScreen, and MapMockScreen without crashing', async () => {
    await render(
      <>
        <AboutScreen />
        <MethodologyScreen />
        <PrivacyScreen />
        <HelpScreen />
        <PageScreen />
        <MapMockScreen />
      </>
    );
    expect(screen.getAllByText(/Jalisco Cómo Vamos/i).length).toBeGreaterThan(0);
  });
});

describe('Survey question helpers', () => {
  it('evaluates visibility, answerKeys, and completeness for single/grid/multi questions', () => {
    const single = { id: 'q1', prompt: 'P1', type: 'single' as const, options: ['Sí', 'No'] };
    const conditional = {
      id: 'q2',
      prompt: 'P2',
      type: 'single' as const,
      options: ['A', 'B'],
      visibleWhen: { key: 'q1', op: 'eq' as const, value: 'Sí' },
    };
    const grid = {
      id: 'q3',
      prompt: 'P3',
      type: 'grid' as const,
      items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      scale: ['1', '5'],
    };

    expect(isQuestionVisible(conditional, { q1: 'No' })).toBe(false);
    expect(isQuestionVisible(conditional, { q1: 'Sí' })).toBe(true);
    expect(answerKeys(single)).toEqual(['q1']);
    expect(answerKeys(grid)).toEqual(['a', 'b']);
    expect(isQuestionAnswered(grid, { a: '1' })).toBe(false);
    expect(isQuestionAnswered(grid, { a: '1', b: '5' })).toBe(true);
  });
});
