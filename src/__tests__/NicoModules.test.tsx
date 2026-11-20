/// <reference types="jest" />
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { encryptDraft, decryptDraft } from '../lib/draftCipher';
import { confirmOnDevice } from '../lib/deviceConfirmation';
import { draftKey, saveDraft, readDraft, clearDraft } from '../lib/surveyDraft';
import { loadPublications, changePublication, loadPublishedIndicators } from '../lib/publication';
import { loadNews, loadTopics, loadThread, postTopic, postReply, displayDate } from '../lib/community';
import { loadSurveys, loadCompletions, sendSurvey } from '../lib/surveyCatalog';
import { indicators } from '../data/indicators';
import * as supabaseMod from '../lib/supabase';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-crypto', () => {
  const mockKey = {
    encoded: jest.fn(async () => 'bW9jay1rZXk='),
  };
  return {
    AESEncryptionKey: {
      import: jest.fn(async () => mockKey),
      generate: jest.fn(async () => mockKey),
    },
    AESSealedData: {
      fromCombined: jest.fn((b64: string) => ({ combinedValue: b64 })),
    },
    aesEncryptAsync: jest.fn(async (bytes: Uint8Array) => ({
      combined: () => new TextDecoder().decode(bytes),
    })),
    aesDecryptAsync: jest.fn(async (sealed: { combinedValue: string }) => {
      return new TextEncoder().encode(sealed.combinedValue);
    }),
  };
});

jest.mock('expo-local-authentication', () => ({
  authenticateAsync: jest.fn(),
}));

describe('draftCipher', () => {
  it('generates key once in SecureStore and encrypts/decrypts round-trip', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
    const cipher = await encryptDraft('{"step":1}', 'scope-a');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'jcv.survey.draft-key.v1',
      'bW9jay1rZXk=',
      expect.any(Object)
    );

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('bW9jay1rZXk=');
    const plain = await decryptDraft(cipher, 'scope-a');
    expect(plain).toBe('{"step":1}');
  });
});

describe('deviceConfirmation', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  });

  it('rejects unsupported platforms like web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    await expect(confirmOnDevice('Confirmar')).rejects.toThrow(/Android o iOS/);
  });

  it('prompts LocalAuthentication on ios/android and throws on cancel', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValueOnce({ success: false });
    await expect(confirmOnDevice('Publicar')).rejects.toThrow(/No se confirmó/);

    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValueOnce({ success: true });
    await expect(confirmOnDevice('Publicar')).resolves.toBeUndefined();
  });
});

describe('surveyDraft', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('builds encoded draftKey, saves, reads, and clears drafts', async () => {
    const key = draftKey('user/1', 'tec:2026');
    expect(key).toBe('jcv.draft.v1:user%2F1:tec%3A2026');

    await saveDraft(key, { step: 2, answers: { q1: 'Bien' } });
    const restored = await readDraft(key);
    expect(restored).toEqual({ step: 2, answers: { q1: 'Bien' } });

    await clearDraft(key);
    expect(await readDraft(key)).toBeNull();
  });

  it('throws on corrupted draft payload', async () => {
    const key = draftKey('u1', 's1');
    await AsyncStorage.setItem(key, JSON.stringify({ step: 'bad', answers: {} }));
    await expect(readDraft(key)).rejects.toThrow('Borrador ilegible.');
  });
});

describe('publication, community, and surveyCatalog with mocked supabase', () => {
  const mockRpc = jest.fn();
  const mockFrom = jest.fn();

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    const fakeClient = { from: mockFrom, rpc: mockRpc } as unknown as NonNullable<typeof supabaseMod.supabase>;
    jest.spyOn(supabaseMod, 'database').mockReturnValue(fakeClient);
    Object.defineProperty(supabaseMod, 'supabase', { value: fakeClient, configurable: true });
  });

  it('loads and toggles publications', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        order: async () => ({
          data: [{ id: 's1', title: 'Encuesta 1', is_active: true }],
          error: null,
        }),
      }),
    });

    const pubs = await loadPublications('surveys');
    expect(pubs).toEqual([{ id: 's1', title: 'Encuesta 1', visible: true }]);

    mockRpc.mockResolvedValueOnce({ error: null });
    await changePublication('surveys', 's1', false);
    expect(mockRpc).toHaveBeenCalledWith('nico_set_publication', {
      p_kind: 'surveys',
      p_id: 's1',
      p_visible: false,
    });
  });

  it('falls back to cached published indicators when offline (status 0)', async () => {
    const firstId = indicators[0].id;
    const cacheKey = 'jcv.published.indicators:' + process.env.EXPO_PUBLIC_SUPABASE_URL;
    await AsyncStorage.setItem(cacheKey, JSON.stringify([firstId]));
    mockFrom.mockReturnValue({
      select: () => ({
        eq: async () => ({ data: null, error: { message: 'offline' }, status: 0 }),
      }),
    });

    const items = await loadPublishedIndicators();
    expect(items.map((i) => i.id)).toEqual([firstId]);
  });

  it('loads news/topics/threads and posts topic/reply via RPC', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          order: () => ({
            order: async () => ({
              data: [{ id: 'n1', title: 'Noticia', source: 'JCV', date: '2026-10-01', summary: 'Resumen' }],
              error: null,
            }),
          }),
        }),
      }),
    });
    expect(await loadNews()).toHaveLength(1);

    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          order: async () => ({
            data: [{ id: 't1', title: 'Tema', body: 'Texto', author: 'Ana', createdAt: '2026-10-01' }],
            error: null,
          }),
        }),
      }),
    });
    expect(await loadTopics()).toHaveLength(1);

    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 't1',
                    title: 'Tema',
                    body: 'Texto',
                    author: 'Ana',
                    createdAt: '2026-10-01',
                    replies: [{ id: 'r1', author: 'Luis', text: 'Hola', createdAt: '2026-10-02' }],
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    });
    const thread = await loadThread('t1');
    expect(thread?.replies).toHaveLength(1);

    mockRpc.mockResolvedValue({ data: 'new-topic-id', error: null });
    expect(await postTopic('  Título  ', '  Cuerpo  ')).toBe('new-topic-id');
    expect(mockRpc).toHaveBeenCalledWith('nico_post_topic', { p_title: 'Título', p_body: 'Cuerpo' });

    await postReply('t1', '  Respuesta  ');
    expect(mockRpc).toHaveBeenCalledWith('nico_post_reply', { p_topic: 't1', p_body: 'Respuesta' });

    expect(displayDate('invalid-date')).toBe('invalid-date');
    expect(displayDate('2026-10-01T12:00:00Z')).not.toBe('2026-10-01T12:00:00Z');
  });

  it('loads survey catalog with single/grid/multi questions, completions, and submits via RPC', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          order: () => ({
            order: () => ({
              order: async () => ({
                data: [
                  {
                    id: 's1',
                    title: 'Encuesta',
                    description: 'Desc',
                    questions: [
                      { id: 'q1', prompt: 'P1', options: ['Si', 'No'] },
                      {
                        id: 'q2',
                        prompt: 'P2',
                        options: { type: 'grid', items: [{ id: 'i1', label: 'Item 1' }], scale: ['1', '5'] },
                      },
                      {
                        id: 'q3',
                        prompt: 'P3',
                        options: { type: 'multi', items: [{ id: 'm1', label: 'Opt 1' }] },
                      },
                    ],
                  },
                ],
                error: null,
                status: 200,
              }),
            }),
          }),
        }),
      }),
    });

    const catalog = await loadSurveys();
    expect(catalog[0].questions).toHaveLength(3);
    expect(catalog[0].questions[2].type).toBe('multi');

    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: async () => ({ data: [{ survey_id: 's1' }], error: null }),
      }),
    });
    expect(await loadCompletions('u1')).toEqual(['s1']);

    mockRpc.mockResolvedValueOnce({ error: null });
    await sendSurvey('s1', { q1: 'Si' });
    expect(mockRpc).toHaveBeenCalledWith('nico_submit_survey', { p_survey: 's1', p_answers: { q1: 'Si' } });
  });
});
