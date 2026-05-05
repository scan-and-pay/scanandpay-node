import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ApiError, AuthenticationError, IdempotencyError, NetworkError } from '../src/errors';
import { decodeJsonOrThrow, requestWithRetry } from '../src/transport';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('requestWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('returns the response on first 2xx', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(jsonResponse(200, { ok: true })) as never;
    const res = await requestWithRetry('https://example.com', { method: 'GET' });
    expect(res.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 503 and eventually succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: 'busy' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    globalThis.fetch = fetchMock as never;

    const res = await requestWithRetry('https://example.com', { method: 'GET' }, { baseMs: 1 });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws ApiError after exhausting retries on 5xx', async () => {
    // mockImplementation (not mockResolvedValue) so each retry gets a fresh
    // Response — the body stream is single-use per JS spec.
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(jsonResponse(502, { error: 'gateway' }))
    ) as never;
    await expect(
      requestWithRetry('https://example.com', { method: 'GET' }, { retries: 2, baseMs: 1 })
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('throws NetworkError after exhausting retries on fetch failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNRESET')) as never;
    await expect(
      requestWithRetry('https://example.com', { method: 'GET' }, { retries: 1, baseMs: 1 })
    ).rejects.toBeInstanceOf(NetworkError);
  });

  it('does not retry on 4xx (other than 408/429)', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(400, { error: 'bad' })));
    globalThis.fetch = fetchMock as never;

    const res = await requestWithRetry('https://example.com', { method: 'POST' }, { baseMs: 1 });
    expect(res.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries on 429', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, { error: 'slow down' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    globalThis.fetch = fetchMock as never;

    const res = await requestWithRetry('https://example.com', { method: 'POST' }, { baseMs: 1 });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('decodeJsonOrThrow', () => {
  it('returns the body on 2xx JSON', async () => {
    const body = await decodeJsonOrThrow(jsonResponse(200, { sessionId: 'SP_SESS_xyz' }));
    expect(body).toEqual({ sessionId: 'SP_SESS_xyz' });
  });

  it('throws AuthenticationError on 401', async () => {
    await expect(decodeJsonOrThrow(jsonResponse(401, { error: 'bad key' }))).rejects.toBeInstanceOf(
      AuthenticationError
    );
  });

  it('throws IdempotencyError on 409', async () => {
    await expect(
      decodeJsonOrThrow(jsonResponse(409, { error: 'key in flight' }))
    ).rejects.toBeInstanceOf(IdempotencyError);
  });

  it('throws ApiError on other 4xx', async () => {
    await expect(decodeJsonOrThrow(jsonResponse(422, { error: 'nope' }))).rejects.toBeInstanceOf(
      ApiError
    );
  });
});
