/// <reference types="jest" />
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AppStateProvider } from '../context/AppStateContext';
import WelcomeScreen from '../screens/WelcomeScreen';

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

jest.mock('../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

describe('WelcomeScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
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

    fireEvent.press(screen.getByText('Iniciar sesión'));
    expect(mockReplace).toHaveBeenCalledWith('Main');
  });
});
