import { describe, it, expect, vi, afterEach } from 'vitest';
import { SessionResource } from '../src/resources/SessionResource';
import { ValidationError } from '../src/errors';

const resource = new SessionResource('merchant_test', 'https://api.example.com', 'sp_api_test');
const validParams = {
  amount: 19.90,
  platformOrderId: 'o1',
  payId: 'm@x.com',
  merchantName: 'X',
};

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('SessionResource.create — validation (no network)', () => {
  it('accepts a float dollar amount', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ sessionId: 'SP_SESS_xyz' }), { status: 200 })
    ) as never;
    await expect(
      resource.create({ ...validParams, amount: 19.90 })
    ).resolves.toBeDefined();
  });

  it('rejects zero amount', async () => {
    await expect(
      resource.create({ ...validParams, amount: 0 })
    ).rejects.toThrow(/greater than 0/);
  });

  it('rejects negative amount', async () => {
    await expect(
      resource.create({ ...validParams, amount: -5 })
    ).rejects.toThrow(/greater than 0/);
  });

  it('rejects amount above $1,000,000', async () => {
    await expect(
      resource.create({ ...validParams, amount: 1_000_000.01 })
    ).rejects.toThrow(/per-session limit/);
  });

  it('rejects non-AUD currency', async () => {
    await expect(
      resource.create({ ...validParams, currency: 'USD' })
    ).rejects.toThrow(/AUD/);
  });

  it('rejects empty platformOrderId', async () => {
    await expect(
      resource.create({ ...validParams, platformOrderId: '' })
    ).rejects.toThrow(/platformOrderId/);
  });

  it('rejects empty merchantName', async () => {
    await expect(
      resource.create({ ...validParams, merchantName: '' })
    ).rejects.toThrow(/merchantName/);
  });

  it('rejects empty payId', async () => {
    await expect(
      resource.create({ ...validParams, payId: '' })
    ).rejects.toThrow(/payId/);
  });

  it('rejects invalid source', async () => {
    await expect(
      resource.create({ ...validParams, source: 'tiktok' })
    ).rejects.toThrow(/Invalid source/);
  });

  it('accepts source: shop-app (first-party merchant)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ sessionId: 'SP_SESS_xyz' }), { status: 200 })
    ) as never;
    await expect(
      resource.create({ ...validParams, source: 'shop-app' })
    ).resolves.toBeDefined();
  });
});

describe('SessionResource.create — idempotency', () => {
  it('auto-generates an Idempotency-Key when none is supplied', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ sessionId: 'SP_SESS_xyz' }), { status: 200 })
    );
    globalThis.fetch = fetchMock as never;

    await resource.create(validParams);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('honours a caller-supplied Idempotency-Key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ sessionId: 'SP_SESS_xyz' }), { status: 200 })
    );
    globalThis.fetch = fetchMock as never;

    await resource.create({ ...validParams, idempotencyKey: 'my-explicit-key' });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBe('my-explicit-key');

    const body = JSON.parse(init.body as string);
    expect(body.idempotencyKey).toBe('my-explicit-key');
  });
});

describe('SessionResource.retrieve', () => {
  it('rejects session ID without SP_SESS_ prefix', async () => {
    await expect(resource.retrieve('not_valid')).rejects.toBeInstanceOf(ValidationError);
  });
});
