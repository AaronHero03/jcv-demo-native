/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import IndicatorDetailScreen from '../screens/IndicatorDetailScreen';
import BarChart from '../components/BarChart';
import IndicatorCard from '../components/IndicatorCard';
import {
  indicatorCategories,
  getIndicatorById,
  getIndicatorsByCategory,
  indicators,
  searchIndicators,
} from '../data/indicators';
import * as AppState from '../context/AppStateContext';
import * as indicatorSummaries from '../data/indicatorSummaries';
import { DEFAULT_FILTER } from '../data/filters';

const mockPush = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ push: mockPush }),
  useRoute: () => ({ params: { tab: 'explorar' } }),
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

describe('indicators data helpers', () => {
  it('retrieves indicators by id, category, and search query', () => {
    expect(indicatorCategories.length).toBeGreaterThan(0);
    const first = indicators[0];
    expect(getIndicatorById(first.id).id).toBe(first.id);
    expect(getIndicatorById('nonexistent-id').id).toBe(first.id);
    expect(getIndicatorsByCategory(first.category).length).toBeGreaterThan(0);
    expect(searchIndicators(first.title.slice(0, 6), 'Todas').length).toBeGreaterThan(0);
  });
});

describe('BarChart & IndicatorCard', () => {
  it('renders BarChart items and handles IndicatorCard press & favorite toggle', async () => {
    await render(
      <BarChart
        items={[
          { label: 'Muy satisfecho', value: 65 },
          { label: 'Satisfecho', value: 25 },
        ]}
      />
    );
    expect(screen.getByText('Muy satisfecho')).toBeTruthy();
    expect(screen.getByText('65%')).toBeTruthy();

    const onPress = jest.fn();
    const onFav = jest.fn();
    await render(
      <IndicatorCard
        indicator={indicators[0]}
        accentColor="#FFC62D"
        isFavorite={false}
        onToggleFavorite={onFav}
        onPress={onPress}
      />
    );
    await fireEvent.press(screen.getByText(indicators[0].title));
    expect(onPress).toHaveBeenCalled();

    await fireEvent.press(screen.getByText('☆'));
    expect(onFav).toHaveBeenCalled();
  });
});

describe('HomeScreen, ExploreScreen, IndicatorDetailScreen', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockPush.mockClear();
    jest.spyOn(AppState, 'useAppState').mockReturnValue(baseState);
    jest.spyOn(indicatorSummaries, 'fetchIndicatorStats').mockResolvedValue({
      stats: {
        indicatorId: indicators[0].id,
        filter: DEFAULT_FILTER,
        series: [{ code: 1, label: 'Positivo', count: 90, pct: 90, isPositive: true }],
        n: 100,
        average: 4.5,
        positivePct: 90,
      },
      origin: 'remote',
    });
  });

  it('renders HomeScreen greeting and featured indicators', async () => {
    await render(<HomeScreen />);
    expect(screen.getByText('Bienvenido, Explorador')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText(indicators[0].title)).toBeTruthy();
    });
  });

  it('shows only userFirstName without email or last name on HomeScreen when signed in', async () => {
    jest.spyOn(AppState, 'useAppState').mockReturnValue({
      ...baseState,
      userMode: 'user',
      userId: 'u1',
      userEmail: 'sofia.perez@tec.mx',
      userFirstName: 'Sofía',
    });

    await render(<HomeScreen />);
    expect(screen.getByText('Hola, Sofía')).toBeTruthy();
    expect(screen.queryByText(/sofia\.perez/i)).toBeNull();
  });

  it('filters indicators in ExploreScreen by search text', async () => {
    await render(<ExploreScreen />);
    const searchInput = screen.getByPlaceholderText('Buscar indicador, tema o pregunta...');
    await fireEvent.changeText(searchInput, 'zzzz-no-match-xyz');
    await waitFor(() => {
      expect(screen.queryByText(indicators[0].title)).toBeNull();
    });
  });

  it('renders IndicatorDetailScreen and toggles favorite', async () => {
    const toggleFavorite = jest.fn();
    jest.spyOn(AppState, 'useAppState').mockReturnValue({ ...baseState, toggleFavorite });

    await render(<IndicatorDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText(indicators[0].title)).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('Guardar en favoritos'));
    expect(toggleFavorite).toHaveBeenCalledWith(indicators[0].id);
  });
});
