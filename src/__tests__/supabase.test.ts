/// <reference types="jest" />
import * as SecureStore from 'expo-secure-store';

let capturedStorage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
} | null = null;

const mockCreateClient = jest.fn((_url: string, _key: string, opts: { auth: { storage: typeof capturedStorage } }) => {
  capturedStorage = opts.auth.storage;
  return { auth: { stopAutoRefresh: jest.fn() } };
});

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
    capturedStorage = null;
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

  it('initializes Supabase client and delegates to expo-secure-store on native', async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-test';
    const { Platform } = require('react-native');
    const secureStoreMod = require('expo-secure-store');
    Platform.OS = 'ios';

    const mod = require('../lib/supabase');
    expect(mod.isSupabaseConfigured).toBe(true);
    expect(capturedStorage).not.toBeNull();

    await capturedStorage!.setItem('sb-token', 'jwt-123');
    expect(secureStoreMod.setItemAsync).toHaveBeenCalledWith('sb-token', 'jwt-123');

    const val = await capturedStorage!.getItem('sb-token');
    expect(secureStoreMod.getItemAsync).toHaveBeenCalledWith('sb-token');
    expect(val).toBe('mock-jwt-token');

    await capturedStorage!.removeItem('sb-token');
    expect(secureStoreMod.deleteItemAsync).toHaveBeenCalledWith('sb-token');
  });

  it('falls back to memory/sessionStorage on web without calling SecureStore', async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-test';
    const { Platform } = require('react-native');
    Platform.OS = 'web';

    require('../lib/supabase');
    expect(capturedStorage).not.toBeNull();

    await capturedStorage!.setItem('sb-web-token', 'jwt-web');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();

    const val = await capturedStorage!.getItem('sb-web-token');
    expect(val).toBe('jwt-web');

    await capturedStorage!.removeItem('sb-web-token');
    expect(await capturedStorage!.getItem('sb-web-token')).toBeNull();
  });
});
