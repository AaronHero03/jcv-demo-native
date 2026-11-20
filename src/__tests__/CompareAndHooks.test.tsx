/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react-native';
import DataStatusBanner from '../components/DataStatusBanner';
import CompareScreen from '../screens/CompareScreen';
import { summarizeOrigin, useIndicatorsStats, useIndicatorStats } from '../hooks/useIndicatorStats';
import { DEFAULT_FILTER } from '../data/filters';
import * as indicatorSummaries from '../data/indicatorSummaries';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: () => ({ params: { tab: 'explorar', indicatorId: 'satisfaccion-vida' } }),
    useFocusEffect: () => {},
  };
});

const makeStats = (
  overrides: Partial<indicatorSummaries.IndicatorStats> = {}
): indicatorSummaries.IndicatorStats => ({
  indicatorId: 'satisfaccion-vida',
  filter: DEFAULT_FILTER,
  series: [{ code: 1, label: 'Satisfecho', count: 90, pct: 90, isPositive: true }],
  n: 100,
  average: 9.0,
  positivePct: 90,
  ...overrides,
});

describe('DataStatusBanner', () => {
  it('renders live, offline, and unavailable messages plus sample warnings', async () => {
    await render(
      <DataStatusBanner
        result={{
          stats: makeStats({ n: 12 }),
          origin: 'remote',
        }}
        sampleSize={12}
      />
    );
    expect(screen.getByText('Datos en vivo desde la base de datos.')).toBeTruthy();
    expect(screen.getByText(/Muestra pequeña \(n=12\)/)).toBeTruthy();

    await render(
      <DataStatusBanner
        result={{ stats: null, origin: 'unavailable', reason: 'tec-requires-connection' }}
      />
    );
    expect(screen.getByText('La Encuesta Tec se consulta en vivo. Conéctate a internet para verla.')).toBeTruthy();

    await render(
      <DataStatusBanner
        result={{
          stats: makeStats({ n: 0 }),
          origin: 'offline',
          reason: 'not-configured',
        }}
        sampleSize={0}
      />
    );
    expect(screen.getByText('Datos locales de la encuesta AMG 2026 (base de datos no configurada).')).toBeTruthy();
    expect(screen.getByText('Aún no hay respuestas para este grupo.')).toBeTruthy();
  });
});

describe('useIndicatorStats & summarizeOrigin', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('loads remote stats and supports refresh', async () => {
    const remoteStats = makeStats({ n: 100 });
    const spy = jest.spyOn(indicatorSummaries, 'fetchIndicatorStats').mockResolvedValue({
      stats: remoteStats,
      origin: 'remote',
    });

    const { result } = await renderHook(() => useIndicatorStats('satisfaccion-vida', DEFAULT_FILTER));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.result.origin).toBe('remote');
    expect(result.current.result.stats?.n).toBe(100);

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => expect(spy).toHaveBeenCalledWith('satisfaccion-vida', DEFAULT_FILTER, { force: true }));
  });

  it('loads batch stats via useIndicatorsStats and summarizes origin', async () => {
    jest.spyOn(indicatorSummaries, 'fetchIndicatorStats').mockResolvedValue({
      stats: makeStats({ n: 50 }),
      origin: 'remote',
    });

    const { result } = await renderHook(() => useIndicatorsStats(['satisfaccion-vida'], DEFAULT_FILTER));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results['satisfaccion-vida'].origin).toBe('remote');

    expect(
      summarizeOrigin([
        { stats: null, origin: 'offline', reason: 'offline' },
        { stats: null, origin: 'remote' },
      ]).origin
    ).toBe('remote');
    expect(summarizeOrigin([]).origin).toBe('unavailable');
  });
});

describe('CompareScreen', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('renders datasets comparison and switches to groups comparison mode', async () => {
    jest.spyOn(indicatorSummaries, 'fetchComparison').mockResolvedValue({
      amg: {
        stats: makeStats({
          n: 2400,
          series: [{ code: 1, label: 'Satisfecho', count: 2194, pct: 91.4, isPositive: true }],
        }),
        origin: 'remote',
      },
      tec: {
        stats: makeStats({
          filter: { ...DEFAULT_FILTER, source: 'tec' },
          n: 120,
          series: [{ code: 1, label: 'Satisfecho', count: 108, pct: 90.0, isPositive: true }],
        }),
        origin: 'remote',
      },
    });
    jest.spyOn(indicatorSummaries, 'fetchIndicatorStats').mockResolvedValue({
      stats: makeStats({
        filter: { source: 'amg', filterType: 'sexo', filterValue: 'Mujer' },
        n: 1200,
        series: [{ code: 1, label: 'Satisfecho', count: 1080, pct: 90, isPositive: true }],
      }),
      origin: 'offline',
      reason: 'offline',
    });

    await render(<CompareScreen />);

    expect(screen.getByText('AMG 2026 vs. Tec')).toBeTruthy();
    expect(screen.getByText('Entre grupos')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText(/AMG 2026 \(n=2400\)/)).toBeTruthy();
      expect(screen.getByText(/Encuesta Tec \(n=120\)/)).toBeTruthy();
    });

    await fireEvent.press(screen.getByText('Entre grupos'));
    await waitFor(() => {
      expect(screen.getByText('Grupo A · azul')).toBeTruthy();
    });
  });
});
