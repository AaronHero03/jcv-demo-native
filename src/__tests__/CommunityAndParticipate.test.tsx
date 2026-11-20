/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor, renderHook } from '@testing-library/react-native';
import CommunityScreen from '../screens/CommunityScreen';
import ForumScreen from '../screens/ForumScreen';
import TopicScreen from '../screens/TopicScreen';
import ParticipateScreen from '../screens/ParticipateScreen';
import LoadNotice from '../components/LoadNotice';
import Hero from '../components/Hero';
import NavRow from '../components/NavRow';
import { useFocusedData } from '../hooks/useFocusedData';
import * as AppState from '../context/AppStateContext';
import * as communityLib from '../lib/community';
import * as surveyCatalog from '../lib/surveyCatalog';
import * as supabaseMod from '../lib/supabase';

const mockPush = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ push: mockPush }),
  useRoute: () => ({ params: { topicId: 'topic-1' } }),
  useFocusEffect: (cb: () => void) => {
    const ReactLocal = require('react');
    ReactLocal.useEffect(() => cb(), [cb]);
  },
}));

const baseState: AppState.AppStateContextValue = {
  userMode: 'user',
  userId: 'user-1',
  userEmail: 'ana@tec.mx',
  userFirstName: 'Ana',
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
  completedSurveyIds: ['done-1'],
  surveyAnswers: {},
  submitSurvey: jest.fn(),
  forumRepliesByTopic: {},
  addForumReply: jest.fn(),
};

describe('UI primitives & useFocusedData', () => {
  it('renders Hero, NavRow, and LoadNotice error/retry', async () => {
    const retry = jest.fn();
    await render(
      <>
        <Hero page={{ emoji: '📊', title: 'Título', text: 'Subtítulo' }} color="#003E79" ink="#FFFFFF" />
        <NavRow emoji="📰" label="Noticias" tint="#003E79" onPress={retry} />
        <LoadNotice error="Fallo temporal" retry={retry} />
      </>
    );

    expect(screen.getByText('Título')).toBeTruthy();
    expect(screen.getByText('Noticias')).toBeTruthy();
    expect(screen.getByText('Fallo temporal')).toBeTruthy();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(retry).toHaveBeenCalled();
  });

  it('loads data with useFocusedData', async () => {
    const load = async () => ['ok'];
    const { result } = await renderHook(() => useFocusedData(load));
    await waitFor(() => expect(result.current.data).toEqual(['ok']));
  });
});

describe('CommunityScreen, ForumScreen, TopicScreen, ParticipateScreen', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockPush.mockClear();
    jest.spyOn(AppState, 'useAppState').mockReturnValue(baseState);
  });

  it('renders CommunityScreen navigation items', async () => {
    await render(<CommunityScreen />);
    expect(screen.getByText('Comunidad')).toBeTruthy();
  });

  it('renders ForumScreen topics and posts a new topic', async () => {
    jest.spyOn(communityLib, 'loadTopics').mockResolvedValue([
      { id: 't1', title: 'Transporte', body: 'Opiniones', author: 'Luis', createdAt: '2026-10-01' },
    ]);
    const postSpy = jest.spyOn(communityLib, 'postTopic').mockResolvedValue('t2');

    await render(<ForumScreen />);
    await waitFor(() => expect(screen.getByText('Transporte')).toBeTruthy());

    await fireEvent.changeText(screen.getByLabelText('Título del tema'), 'Seguridad');
    await fireEvent.changeText(screen.getByLabelText('Texto del tema'), '¿Cómo mejorar?');
    await fireEvent.press(screen.getByText('Publicar tema'));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('Seguridad', '¿Cómo mejorar?');
      expect(mockPush).toHaveBeenCalledWith('tema', { tab: 'comunidad', topicId: 't2' });
    });
  });

  it('renders TopicScreen thread and sends local reply when offline', async () => {
    Object.defineProperty(supabaseMod, 'supabase', { value: null, configurable: true });
    const addForumReply = jest.fn();
    jest.spyOn(AppState, 'useAppState').mockReturnValue({ ...baseState, addForumReply });
    jest.spyOn(communityLib, 'loadThread').mockResolvedValue({
      topic: { id: 'topic-1', title: 'Espacios', body: 'Parques', author: 'Ana', createdAt: '2026-10-01' },
      replies: [{ id: 'r1', author: 'Carlos', text: 'De acuerdo', createdAt: '2026-10-02' }],
    });

    await render(<TopicScreen />);
    await waitFor(() => expect(screen.getByText('Espacios')).toBeTruthy());
    expect(screen.getByText('De acuerdo')).toBeTruthy();

    await fireEvent.changeText(screen.getByPlaceholderText(/Escribe una respuesta/i), 'Excelente idea');
    await fireEvent.press(screen.getByText('Publicar'));

    await waitFor(() => {
      expect(addForumReply).toHaveBeenCalledWith('topic-1', 'ana', 'Excelente idea');
    });
  });

  it('renders ParticipateScreen with available and completed surveys', async () => {
    jest.spyOn(surveyCatalog, 'loadSurveys').mockResolvedValue([
      {
        id: 'open-1',
        title: 'Encuesta Abierta',
        description: 'Desc',
        period: '2026',
        estimatedMinutes: 3,
        questions: [{ id: 'q1', prompt: 'P1', type: 'single', options: ['Si', 'No'] }],
      },
      {
        id: 'done-1',
        title: 'Encuesta Completada',
        description: 'Desc',
        period: '2026',
        estimatedMinutes: 3,
        questions: [{ id: 'q1', prompt: 'P1', type: 'single', options: ['Si', 'No'] }],
      },
    ]);

    await render(<ParticipateScreen />);
    await waitFor(() => {
      expect(screen.getByText('Encuestas disponibles (1)')).toBeTruthy();
      expect(screen.getByText('Completadas (1)')).toBeTruthy();
    });

    await fireEvent.press(screen.getByText('Encuesta Abierta'));
    expect(mockPush).toHaveBeenCalledWith('encuesta', { tab: 'participar', surveyId: 'open-1' });
  });
});
