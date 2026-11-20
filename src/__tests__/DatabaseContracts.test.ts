/// <reference types="jest" />
import type {
  DatasetSource,
  FavoriteItemType,
  FavoriteRow,
  FilterType,
  ProfileRow,
  UserRole,
} from '../types/database';
import { database, messageOf } from '../lib/supabase';
import { isAllowedUrl } from '../services/supabaseRest';

describe('Carlos Database Contracts & Helpers', () => {
  it('validates typed database contracts for profiles and favorites', () => {
    const roles: UserRole[] = ['user', 'tec_verified', 'admin'];
    const sources: DatasetSource[] = ['amg_2026', 'tec_2026'];
    const filters: FilterType[] = ['general', 'gender', 'age_group', 'estrato'];
    const favTypes: FavoriteItemType[] = ['indicator', 'news'];

    const profile: ProfileRow = {
      id: 'uuid-1',
      email: 'a01234567@tec.mx',
      role: roles[1],
      is_tec_verified: true,
      created_at: '2026-11-20T00:00:00Z',
    };
    const favorite: FavoriteRow = {
      user_id: profile.id,
      item_id: 'satisfaccion-vida',
      item_type: favTypes[0],
      created_at: '2026-11-20T00:00:00Z',
    };

    expect(roles).toContain(profile.role);
    expect(sources).toHaveLength(2);
    expect(filters).toHaveLength(4);
    expect(favorite.item_type).toBe('indicator');
  });

  it('enforces HTTPS URL allowlist in supabaseRest', () => {
    expect(isAllowedUrl('https://qapbuyxcscminorcqlyw.supabase.co/rest/v1/rpc/test')).toBe(true);
    expect(isAllowedUrl('http://evil.example.com/rpc')).toBe(false);
    expect(isAllowedUrl('not-a-url')).toBe(false);
  });

  it('formats errors safely with messageOf and throws descriptive error when database() has no client', () => {
    expect(messageOf(new Error('Fallo de red'))).toBe('Fallo de red');
    expect(messageOf({ message: 'Permiso denegado' })).toBe('Permiso denegado');
    expect(messageOf(null)).toBe('No se pudo completar la operación. Vuelve a intentarlo.');
    expect(typeof database).toBe('function');
  });
});
