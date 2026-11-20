/// <reference types="jest" />
import {
  DEFAULT_FILTER,
  describeFilter,
  filterKey,
  filterValueLabel,
  isValidFilter,
  sanitizeFilter,
  withFilterType,
} from '../data/filters';

describe('filters whitelist & sanitization (MASVS-CODE-4)', () => {
  it('accepts valid filters and rejects manipulated or SQL-like values', () => {
    expect(isValidFilter({ source: 'amg_2026', filterType: 'gender', filterValue: 'Mujer' })).toBe(true);
    expect(isValidFilter({ source: 'tec_2026', filterType: 'estrato', filterValue: 'Alto' })).toBe(true);

    expect(isValidFilter(null)).toBe(false);
    expect(isValidFilter({ source: 'DROP TABLE', filterType: 'general', filterValue: 'all' })).toBe(false);
    expect(isValidFilter({ source: 'amg_2026', filterType: 'municipality', filterValue: 'Zapopan' })).toBe(false);
    expect(isValidFilter({ source: 'amg_2026', filterType: 'gender', filterValue: 'Otro; --' })).toBe(false);
  });

  it('sanitizes invalid filters back to DEFAULT_FILTER', () => {
    expect(sanitizeFilter({ source: 'hacked', filterType: 'gender', filterValue: 'Mujer' })).toEqual(DEFAULT_FILTER);
    const valid = { source: 'tec_2026' as const, filterType: 'age_group' as const, filterValue: '15-19' };
    expect(sanitizeFilter(valid)).toEqual(valid);
  });

  it('switches filterType cleanly and formats keys and labels', () => {
    const next = withFilterType(DEFAULT_FILTER, 'estrato');
    expect(next).toEqual({ source: 'amg_2026', filterType: 'estrato', filterValue: 'Alto' });
    expect(filterKey(next)).toBe('amg_2026|estrato|Alto');
    expect(filterValueLabel('15-19')).toBe('15 a 19 años');
    expect(describeFilter(next)).toBe('AMG 2026 · Estrato alto');
  });
});
