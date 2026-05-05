import type { Cents } from './cents';
import type { RetryOptions } from './transport';

/**
 * Payment session creation request.
 *
 * `amount` is integer cents. The SDK rejects floats and non-positive values
 * at runtime — see {@link cents} for an opt-in branded type that surfaces
 * money mistakes at compile time.
 */
export interface CreateSessionRequest {
  amount: number | Cents;
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
  /** Per-request retry override. */
  retry?: RetryOptions;
}

export interface PaymentSession {
  success: boolean;
  sessionId: string;
  payUrl: string;
  qrUrl: string;
  payId: string;
  /** Integer cents. */
  amount: number;
  currency: string;
  reference: string;
  status: string;
  ui_state: string;
  expiresAt: string;
  merchantName?: string;
  /** Echoed back from the request — useful for log correlation. */
  idempotencyKey?: string;
}

export interface WebhookEvent {
  order_id: string;
  payment_session_id: string;
  status: 'confirmed' | 'failed' | 'expired';
  /** Integer cents. */
  amount: number;
  currency: string;
  tx_id: string;
  timestamp: number;
  nonce: string;
}
