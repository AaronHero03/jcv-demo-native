/// <reference types="jest" />
import { AskError, askAssistant, MAX_QUESTION_LENGTH, parseAskResponse } from '../services/askClient';
import { isAllowedUrl } from '../services/supabaseRest';

describe('askClient & supabaseRest security', () => {
  const origFetch = global.fetch;

  afterEach(() => {
    global.fetch = origFetch;
    jest.restoreAllMocks();
  });

  it('validates and sanitizes AskResponse (T6 plain text & source ID whitelist)', () => {
    const parsed = parseAskResponse({
      answer: '  El 91.4% está satisfecho\u0000\u0007.  ',
      sources: ['Q_6', 'BAD SOURCE!!', 'DOC-JCV', 'Q_6'],
    });
    expect(parsed.answer).toBe('El 91.4% está satisfecho.');
    expect(parsed.sources).toEqual(['Q_6', 'DOC-JCV']);

    expect(() => parseAskResponse(null)).toThrow(AskError);
    expect(() => parseAskResponse({ answer: '', sources: [] })).toThrow(AskError);
  });

  it('rejects empty and >500-char questions before calling network (MASVS-CODE-4)', async () => {
    await expect(askAssistant('   ')).rejects.toMatchObject({ code: 'empty' });
    await expect(askAssistant('a'.repeat(MAX_QUESTION_LENGTH + 1))).rejects.toMatchObject({
      code: 'too_long',
    });
  });

  it('maps HTTP 401, 413, 429, 503 and 200 responses accurately', async () => {
    for (const [status, code] of [
      [401, 'unauthorized'],
      [413, 'too_long'],
      [429, 'rate_limited'],
      [503, 'unavailable'],
    ] as const) {
      global.fetch = jest.fn(async () => ({
        ok: false,
        status,
      })) as unknown as typeof fetch;

      await expect(askAssistant('¿Qué tan felices son?')).rejects.toMatchObject({ code, status });
    }

    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ answer: 'El 88.9% es feliz.', sources: ['Q_8'] }),
    })) as unknown as typeof fetch;

    const ok = await askAssistant('¿Qué tan felices son?');
    expect(ok).toEqual({ answer: 'El 88.9% es feliz.', sources: ['Q_8'] });
  });

  it('enforces HTTPS URLs (MASVS-NETWORK-1)', () => {
    expect(isAllowedUrl('https://qapbuyxcscminorcqlyw.supabase.co', false)).toBe(true);
    expect(isAllowedUrl('http://insecure.example.com', false)).toBe(false);
  });
});
