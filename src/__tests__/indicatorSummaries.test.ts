/// <reference types="jest" />
import { buildStats, getInitialResult, getOfflineStats } from '../data/indicatorSummaries';
import { DEFAULT_FILTER } from '../data/filters';

describe('indicatorSummaries (offline AMG 2026 & buildStats)', () => {
  it('computes n, percentages, average, and positivePct in buildStats', () => {
    const stats = buildStats('Q_6', DEFAULT_FILTER, [
      { code: 1, label: 'Nada', count: 10, pct: 0, isPositive: false },
      { code: 5, label: 'Muy', count: 90, pct: 0, isPositive: true },
    ]);

    expect(stats.n).toBe(100);
    expect(stats.average).toBe(4.6);
    expect(stats.positivePct).toBe(90);
    expect(stats.series[0].pct).toBe(10);
    expect(stats.series[1].pct).toBe(90);
  });

  it('returns offline AMG 2026 stats for general and demographic cuts, and null for tec_2026', () => {
    const general = getOfflineStats('Q_6', DEFAULT_FILTER);
    expect(general).not.toBeNull();
    expect(general!.n).toBeGreaterThan(1000);

    const mujer = getOfflineStats('Q_6', {
      source: 'amg_2026',
      filterType: 'gender',
      filterValue: 'Mujer',
    });
    expect(mujer).not.toBeNull();
    expect(mujer!.n).toBeGreaterThan(0);

    const tec = getOfflineStats('Q_6', {
      source: 'tec_2026',
      filterType: 'general',
      filterValue: 'all',
    });
    expect(tec).toBeNull();
  });

  it('returns offline origin for AMG and unavailable for Tec in getInitialResult', () => {
    const amgRes = getInitialResult('Q_6', DEFAULT_FILTER);
    expect(amgRes.origin).toBe('offline');
    expect(amgRes.stats).not.toBeNull();

    const tecRes = getInitialResult('Q_6', {
      source: 'tec_2026',
      filterType: 'general',
      filterValue: 'all',
    });
    expect(tecRes.origin).toBe('unavailable');
    expect(tecRes.reason).toBe('tec-requires-connection');
  });
});
