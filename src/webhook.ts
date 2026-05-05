import crypto from 'node:crypto';
import { WebhookSignatureError } from './errors';
import { WebhookEvent } from './types';

export class WebhookVerifier {
  private static readonly TIMESTAMP_SKEW_SECONDS = 60;
  private static readonly NONCE_TTL_MS = 24 * 60 * 60 * 1000;
  private readonly seenNonces = new Map<string, number>();

  constructor(private readonly webhookSecret: string) {
    if (!webhookSecret) throw new WebhookSignatureError('webhookSecret is required');
  }

  /**
   * Verifies an inbound webhook signature.
   *
   * @throws {WebhookSignatureError} on signature, timestamp, or replay failure.
   */
  verify(signature: string, rawBody: string): WebhookEvent {
    if (!signature || !rawBody) {
      throw new WebhookSignatureError('Missing signature or body');
    }

    const computed = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    const computedBuf = Buffer.from(computed, 'hex');
    const sigBuf = Buffer.from(signature, 'hex');

    if (computedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(computedBuf, sigBuf)) {
      throw new WebhookSignatureError('Invalid signature');
    }

    let event: WebhookEvent;
    try {
      event = JSON.parse(rawBody) as WebhookEvent;
    } catch {
      throw new WebhookSignatureError('Invalid JSON payload');
    }

    const now = Math.floor(Date.now() / 1000);
    const skew = Math.abs(now - event.timestamp);

    if (skew > WebhookVerifier.TIMESTAMP_SKEW_SECONDS) {
      throw new WebhookSignatureError(`Timestamp skew ${skew}s exceeds limit`);
    }

    this.pruneNonces();
    if (this.seenNonces.has(event.nonce)) {
      throw new WebhookSignatureError('Replayed nonce');
    }
    this.seenNonces.set(event.nonce, Date.now() + WebhookVerifier.NONCE_TTL_MS);

    return event;
  }

  private pruneNonces(): void {
    const now = Date.now();
    for (const [nonce, expiry] of this.seenNonces.entries()) {
      if (now > expiry) {
        this.seenNonces.delete(nonce);
      }
    }
  }
}
