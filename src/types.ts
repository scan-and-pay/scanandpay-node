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
 * `amountCents` is a positive integer in cents (e.g. `1990` for $19.90).
 * Zero, negative, and values above 100,000,000 (=$1M) are rejected
 * with `ValidationError` before any network call.
 */
export interface CreateSessionRequest {
  amountCents: number;
  platformOrderId: string;
  payId: string;
  merchantName: string;
  reference?: string;
  source?: string;
  currency?: string;
  idempotencyKey?: string;
  metadata?: Metadata;
  retry?: RetryOptions;
}

export interface PaymentSession {
  success: boolean;
  sessionId: string;
  payUrl: string;
  qrUrl: string;
  payId: string;
  /** Integer cents, e.g. 1990 for $19.90. */
  amountCents: number;
  /** @deprecated Use amountCents. Float dollars kept for backwards compat. */
  amount: number;
  currency: string;
  reference: string;
  status: string;
  ui_state: string;
  expiresAt: string;
  merchantName?: string;
  idempotencyKey?: string;
  metadata?: Metadata;
}

export interface CreateRefundRequest {
  paymentSessionId: string;
  amountCents: number;
  reason?: string;
  idempotencyKey?: string;
  retry?: RetryOptions;
}

export interface Refund {
  success: boolean;
  refundId: string;
  status: string;
  amountCents: number;
  originalInitiationId: string;
  paymentSessionId: string;
  idempotencyKey: string;
  idempotent?: boolean;
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
