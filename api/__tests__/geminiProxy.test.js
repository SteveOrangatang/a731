import { describe, it, expect } from 'vitest';
import { readJsonBody, handleGeminiRequest } from '../_geminiProxy.js';

/**
 * Stand-in for a Node request stream. Vercel hands the handler a pre-parsed
 * `req.body`; the Vite dev middleware gets a raw stream, so readJsonBody has
 * to cope with both.
 */
function streamReq(raw, { chunkSize = raw.length } = {}) {
  const buf = Buffer.from(raw, 'utf8');
  return {
    async *[Symbol.asyncIterator]() {
      for (let i = 0; i < buf.length; i += chunkSize) {
        yield buf.subarray(i, i + chunkSize);
      }
    },
  };
}

describe('readJsonBody', () => {
  it('parses a JSON stream body', async () => {
    const body = await readJsonBody(streamReq('{"model":"gemini-2.5-flash"}'));
    expect(body).toEqual({ model: 'gemini-2.5-flash' });
  });

  it('reassembles a body split across chunks', async () => {
    const payload = JSON.stringify({
      model: 'gemini-2.5-pro',
      contents: [{ role: 'user', parts: [{ text: 'hello' }] }],
    });
    expect(await readJsonBody(streamReq(payload, { chunkSize: 7 }))).toEqual(
      JSON.parse(payload),
    );
  });

  it('decodes multi-byte utf-8 that straddles a chunk boundary', async () => {
    // The em dash in the scenario prompts is 3 bytes; splitting mid-character
    // would corrupt it if chunks were decoded one at a time.
    const payload = JSON.stringify({ text: 'Scenario — Promotion Dangle' });
    const body = await readJsonBody(streamReq(payload, { chunkSize: 1 }));
    expect(body.text).toBe('Scenario — Promotion Dangle');
  });

  it('returns an already-parsed body untouched (the Vercel path)', async () => {
    const parsed = { model: 'gemini-2.5-flash', contents: [] };
    expect(await readJsonBody({ body: parsed })).toBe(parsed);
  });

  it('returns an empty object for an empty stream', async () => {
    expect(await readJsonBody(streamReq(''))).toEqual({});
  });

  it('throws a labelled error on malformed JSON', async () => {
    await expect(readJsonBody(streamReq('{not json'))).rejects.toThrow(
      /Invalid JSON body/,
    );
  });
});

describe('handleGeminiRequest', () => {
  it('rejects non-POST methods', async () => {
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const res = await handleGeminiRequest({ method, body: { contents: [] } });
      expect(res.status).toBe(405);
      expect(res.body.error).toMatch(/not allowed/i);
    }
  });

  it('rejects a body with no contents before touching key resolution', async () => {
    const res = await handleGeminiRequest({ method: 'POST', body: { model: 'x' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/contents/);
  });

  it('rejects a missing body', async () => {
    const res = await handleGeminiRequest({ method: 'POST' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/contents/);
  });
});
