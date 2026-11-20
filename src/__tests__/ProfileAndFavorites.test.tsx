/// <reference types="jest" />
import React, { useEffect } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AppStateProvider, useAppState } from '../context/AppStateContext';
import ProfileScreen from '../screens/ProfileScreen';
import FavoritesScreen from '../screens/FavoritesScreen';

const mockPush = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ push: mockPush }),
  useFocusEffect: (cb: () => void) => {
    const ReactLocal = require('react');
    ReactLocal.useEffect(() => cb(), [cb]);
  },
}));

jest.mock('../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

function SeedFavorites({ items }: { items: { id: string; type: 'indicator' | 'news' }[] }) {
  const { toggleFavorite, verifyTecEmail } = useAppState();
  useEffect(() => {
    verifyTecEmail('aaron@tec.mx');
    for (const item of items) {
      toggleFavorite(item.id, item.type);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

describe('ProfileScreen & FavoritesScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('shows guest mode by default in ProfileScreen and navigates to favorites', async () => {
    await render(
      <AppStateProvider>
        <ProfileScreen />
      </AppStateProvider>
    );

    expect(screen.getByText('Invitado')).toBeTruthy();
    expect(screen.getByText('Modo invitado (sin cuenta)')).toBeTruthy();

    fireEvent.press(screen.getByText('Mis favoritos'));
    expect(mockPush).toHaveBeenCalledWith('favoritos', { tab: 'perfil' });
  });

  it('shows TEC verified badge and favorite count in ProfileScreen', async () => {
    await render(
      <AppStateProvider>
        <SeedFavorites items={[{ id: 'Q_6', type: 'indicator' }]} />
        <ProfileScreen />
      </AppStateProvider>
    );

    expect(screen.getByText('Mi Perfil')).toBeTruthy();
    expect(screen.getByText('aaron@tec.mx · 🎓 Verificado TEC')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('shows empty state and toggles saved indicator/news favorites in FavoritesScreen', async () => {
    await render(
      <AppStateProvider>
        <FavoritesScreen />
      </AppStateProvider>
    );
    expect(screen.getByText('Aún no tienes favoritos')).toBeTruthy();

    await render(
      <AppStateProvider>
        <SeedFavorites
          items={[
            { id: 'Q_6', type: 'indicator' },
            { id: 'news-bienestar-2026', type: 'news' },
          ]}
        />
        <FavoritesScreen />
      </AppStateProvider>
    );

    expect(screen.getByText('Indicadores (1)')).toBeTruthy();
    expect(screen.getByText('Noticias (1)')).toBeTruthy();
    expect(screen.getByText('Satisfacción con la vida')).toBeTruthy();
    expect(screen.getByText('Resultados de la Encuesta Bienestar de Jóvenes Jul–Ago 2026')).toBeTruthy();

    const stars = screen.getAllByText('⭐');
    await fireEvent.press(stars[0]);
    expect(screen.queryByText('Satisfacción con la vida')).toBeNull();
  });
});
