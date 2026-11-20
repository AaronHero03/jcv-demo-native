/// <reference types="jest" />
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import FilterBar from '../components/FilterBar';
import { DEFAULT_FILTER } from '../data/filters';
import AsistenteScreen from '../screens/AsistenteScreen';
import { askAssistant, AskError } from '../services/askClient';

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { tab: 'inicio' } }),
}));

jest.mock('../services/askClient', () => {
  const actual = jest.requireActual('../services/askClient');
  return {
    ...actual,
    askAssistant: jest.fn(),
  };
});

describe('FilterBar & AsistenteScreen', () => {
  jest.setTimeout(15000);
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders FilterBar options and updates source/group filters', async () => {
    const onChange = jest.fn();
    await render(
      <FilterBar value={DEFAULT_FILTER} onChange={onChange} accentColor="#FFC62D" accentInk="#003E79" />
    );

    await fireEvent.press(screen.getByText('Encuesta Tec'));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_FILTER, source: 'tec_2026' });

    await fireEvent.press(screen.getByText('Género'));
    expect(onChange).toHaveBeenCalledWith({
      source: 'amg_2026',
      filterType: 'gender',
      filterValue: 'Hombre',
    });
  });

  it('sends question in AsistenteScreen, displays answer & sources, and handles errors', async () => {
    (askAssistant as jest.Mock).mockResolvedValueOnce({
      answer: 'El 91.4% está satisfecho con su vida.',
      sources: ['Q_6'],
    });

    await render(<AsistenteScreen />);
    const input = screen.getByPlaceholderText(/Escribe tu pregunta sobre la encuesta/i);
    await fireEvent.changeText(input, '¿Qué tan satisfechos están?');
    await fireEvent.press(screen.getByText('Enviar'));

    await waitFor(() => {
      expect(screen.getByText('El 91.4% está satisfecho con su vida.')).toBeTruthy();
      expect(screen.getByText('Fuentes: Q_6')).toBeTruthy();
    });

    (askAssistant as jest.Mock).mockRejectedValueOnce(new AskError('rate_limited', 429));
    await fireEvent.changeText(input, 'Otra pregunta');
    await fireEvent.press(screen.getByText('Enviar'));

    await waitFor(() => {
      expect(screen.getByText(/Hiciste demasiadas preguntas en poco tiempo/i)).toBeTruthy();
    });
  });
});
