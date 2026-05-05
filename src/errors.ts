/**
 * SDK error hierarchy. All thrown errors extend `ScanAndPayError` so callers
 * can branch with `instanceof` rather than parsing message strings.
 */

export class ScanAndPayError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = this.constructor.name;
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

/** Bad input rejected before any HTTP call. */
export class ValidationError extends ScanAndPayError {}

/** API rejected the X-Scanpay-Key (HTTP 401). Rotate the secret. */
export class AuthenticationError extends ScanAndPayError {}

/** Non-2xx response from the API outside the auth path. */
export class ApiError extends ScanAndPayError {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: unknown = null,
    options?: { cause?: unknown }
  ) {
    super(message, options);
  }
}

/** Transport layer failure (timeout, DNS, TCP reset) after exhausting retries. */
export class NetworkError extends ScanAndPayError {}

/** Idempotency key collision or server-side replay rejection. */
export class IdempotencyError extends ScanAndPayError {}

/** Webhook signature, timestamp, or replay check failed. */
export class WebhookSignatureError extends ScanAndPayError {}
