import type { RetryOptions } from './transport';

/**
 * Free-form key/value bag attached to a session and echoed back in the
 * webhook event. Limits: max 50 keys, key + value each ≤ 500 characters.
 * Use for correlation IDs, customer references, A/B-test buckets, etc.
 */
export type Metadata = Record<string, string>;

/**
 * Payment session creation request.
 *
 * `amount` is a positive float in dollars (e.g. `19.90` for $19.90).
 * Zero, negative, non-finite, and values above $1,000,000 are rejected
 * with `ValidationError` before any network call.
 */
export interface CreateSessionRequest {
  amount: number;
  platformOrderId: string;
  payId: string;
  merchantName: string;
  reference?: string;
  source?: string;
  currency?: string;
  /**
   * Caller-supplied idempotency key. Replaying the same key within 24 hours
   * returns the existing session unchanged. Defaults to a UUIDv7 generated
   * by the SDK.
   */
  idempotencyKey?: string;
  /**
   * Free-form key/value bag echoed back in the webhook payload.
   * Max 50 keys, max 500 chars per key + value. Validated client-side
   * before any network call.
   */
  metadata?: Metadata;
  /** Per-request retry override. */
  retry?: RetryOptions;
}

export interface PaymentSession {
  success: boolean;
  sessionId: string;
  payUrl: string;
  qrUrl: string;
  payId: string;
  /** Float dollars, e.g. 19.90. */
  amount: number;
  currency: string;
  reference: string;
  status: string;
  ui_state: string;
  expiresAt: string;
  merchantName?: string;
  /** Echoed back from the request — useful for log correlation. */
  idempotencyKey?: string;
  /** Echoed back unchanged from `createSession`. */
  metadata?: Metadata;
}

export interface WebhookEvent {
  order_id: string;
  payment_session_id: string;
  status: 'confirmed' | 'failed' | 'expired';
  /** Float dollars, e.g. 19.90. */
  amount: number;
  currency: string;
  tx_id: string;
  timestamp: number;
  nonce: string;
  /** Echoed back unchanged from `createSession`. */
  metadata?: Metadata;
}
