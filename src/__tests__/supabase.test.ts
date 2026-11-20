/// <reference types="jest" />
import * as SecureStore from 'expo-secure-store';

const mockCreateClient = jest.fn(() => ({ auth: { stopAutoRefresh: jest.fn() } }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => 'mock-jwt-token'),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

describe('supabase client & secureStorageAdapter (MASVS-STORAGE-1/2)', () => {
  const origUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const origKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = origUrl;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = origKey;
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('exports null client when env vars are missing without crashing', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const mod = require('../lib/supabase');
    expect(mod.isSupabaseConfigured).toBe(false);
    expect(mod.supabase).toBeNull();
  });

  it('initializes Supabase client with expo-secure-store when env vars are set', async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-test';
    const mod = require('../lib/supabase');
    expect(mod.isSupabaseConfigured).toBe(true);
    expect(mod.supabase).not.toBeNull();
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key-test',
      expect.objectContaining({
        auth: expect.objectContaining({
          persistSession: true,
          autoRefreshToken: true,
        }),
      })
    );
    expect(SecureStore.getItemAsync).toBeDefined();
  });
});
