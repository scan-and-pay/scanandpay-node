import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { WebhookVerifier } from '../src/webhook';
import { WebhookSignatureError } from '../src/errors';

const SECRET = 'test_webhook_secret_with_enough_entropy';

function sign(body: string): string {
  return crypto.createHmac('sha256', SECRET).update(body).digest('hex');
}

function canonicalBody(nonce = 'unique_nonce_1'): string {
  return JSON.stringify({
    order_id: 'order_456',
    payment_session_id: 'SP_SESS_abc123',
    status: 'confirmed',
    amount: 1990,
    currency: 'AUD',
    tx_id: 'bank_ref_789',
    timestamp: Math.floor(Date.now() / 1000),
    nonce,
  });
}

describe('WebhookVerifier', () => {
  it('rejects empty webhookSecret', () => {
    expect(() => new WebhookVerifier('')).toThrow(WebhookSignatureError);
  });

  it('accepts valid signature', () => {
    const verifier = new WebhookVerifier(SECRET);
    const body = canonicalBody();
    const event = verifier.verify(sign(body), body);

    expect(event.order_id).toBe('order_456');
    expect(event.status).toBe('confirmed');
    expect(event.amount).toBe(1990);
  });

  it('rejects tampered body', () => {
    const verifier = new WebhookVerifier(SECRET);
    const body = canonicalBody();
    const sig = sign(body);
    const tampered = body.replace('order_456', 'order_999');

    expect(() => verifier.verify(sig, tampered)).toThrow(WebhookSignatureError);
  });

  it('rejects wrong secret', () => {
    const verifier = new WebhookVerifier(SECRET);
    const body = canonicalBody();
    const wrongSig = crypto.createHmac('sha256', 'wrong').update(body).digest('hex');

    expect(() => verifier.verify(wrongSig, body)).toThrow(WebhookSignatureError);
  });

  it('rejects missing signature', () => {
    const verifier = new WebhookVerifier(SECRET);
    expect(() => verifier.verify('', canonicalBody())).toThrow(/Missing signature or body/);
  });

  it('rejects missing body', () => {
    const verifier = new WebhookVerifier(SECRET);
    expect(() => verifier.verify('abc', '')).toThrow(/Missing signature or body/);
  });

  it('rejects stale timestamp', () => {
    const verifier = new WebhookVerifier(SECRET);
    const body = JSON.stringify({
      order_id: 'o', payment_session_id: 's', status: 'confirmed',
      amount: 1, currency: 'AUD', tx_id: 't',
      timestamp: Math.floor(Date.now() / 1000) - 120,
      nonce: 'stale',
    });
    expect(() => verifier.verify(sign(body), body)).toThrow(/Timestamp skew/);
  });

  it('rejects replayed nonce', () => {
    const verifier = new WebhookVerifier(SECRET);
    const body = canonicalBody('replay_nonce');
    const sig = sign(body);

    verifier.verify(sig, body);
    expect(() => verifier.verify(sig, body)).toThrow(/Replayed nonce/);
  });

  it('accepts different nonces', () => {
    const verifier = new WebhookVerifier(SECRET);
    const body1 = canonicalBody('nonce_a');
    const body2 = canonicalBody('nonce_b');

    verifier.verify(sign(body1), body1);
    const event = verifier.verify(sign(body2), body2);
    expect(event.nonce).toBe('nonce_b');
  });
});
