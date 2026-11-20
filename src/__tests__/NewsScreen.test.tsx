/// <reference types="jest" />
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import NewsScreen from '../screens/NewsScreen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => {
    const ReactLocal = require('react');
    ReactLocal.useEffect(() => cb(), [cb]);
  },
}));

const mockToggleFavorite = jest.fn();

jest.mock('../context/AppStateContext', () => ({
  useAppState: () => ({
    isFavorite: () => false,
    toggleFavorite: mockToggleFavorite,
  }),
}));

describe('NewsScreen favorites', () => {
  beforeEach(() => {
    mockToggleFavorite.mockClear();
  });

  it('passes itemType="news" when toggling a news favorite', async () => {
    await render(<NewsScreen />);
    const stars = await waitFor(() => screen.getAllByText('☆'));
    await fireEvent.press(stars[0]);

    expect(mockToggleFavorite).toHaveBeenCalledWith('news-bienestar-2026', 'news');
  });
});
