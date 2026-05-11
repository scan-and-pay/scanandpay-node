import { API_VERSION, SDK_USER_AGENT } from '../constants';
import { ValidationError } from '../errors';
import { uuidv7 } from '../idempotency';
import { decodeJsonOrThrow, requestWithRetry, RetryOptions } from '../transport';
import { CreateSessionRequest, Metadata, PaymentSession } from '../types';

const MAX_AMOUNT_CENTS = 100_000_000; // $1,000,000

const VALID_SOURCES = new Set([
  'api',
  'woocommerce',
  'shopify',
  'pos',
  'magento',
  'wordpress',
  'shop-app',
]);

const METADATA_MAX_KEYS = 50;
const METADATA_MAX_CHARS = 500;

function assertAmountCents(amountCents: number): void {
  if (!Number.isInteger(amountCents)) {
    throw new ValidationError('amountCents must be an integer (cents, e.g. 1990 for $19.90)');
  }
  if (amountCents <= 0) {
    throw new ValidationError('amountCents must be greater than 0');
  }
  if (amountCents > MAX_AMOUNT_CENTS) {
    throw new ValidationError(`amountCents exceeds the per-session limit (${MAX_AMOUNT_CENTS})`);
  }
}

function assertMetadata(metadata: Metadata): void {
  const keys = Object.keys(metadata);
  if (keys.length > METADATA_MAX_KEYS) {
    throw new ValidationError(
      `metadata may not exceed ${METADATA_MAX_KEYS} keys (got ${keys.length})`
    );
  }
  for (const key of keys) {
    const value = metadata[key];
    if (typeof key !== 'string' || key.length === 0) {
      throw new ValidationError('metadata keys must be non-empty strings');
    }
    if (typeof value !== 'string') {
      throw new ValidationError(
        `metadata value for "${key}" must be a string (got ${typeof value})`
      );
    }
    if (key.length > METADATA_MAX_CHARS) {
      throw new ValidationError(
        `metadata key exceeds ${METADATA_MAX_CHARS} chars`
      );
    }
    if (value.length > METADATA_MAX_CHARS) {
      throw new ValidationError(
        `metadata value for "${key}" exceeds ${METADATA_MAX_CHARS} chars`
      );
    }
  }
}

export class SessionResource {
  constructor(
    private readonly merchantId: string,
    private readonly baseUrl: string,
    private readonly apiSecret: string,
    private readonly defaultRetry?: RetryOptions
  ) {}

  async create(params: CreateSessionRequest): Promise<PaymentSession> {
    const {
      amountCents,
      currency = 'AUD',
      platformOrderId,
      merchantName,
      payId,
      reference,
      source = 'api',
      idempotencyKey,
      metadata,
      retry,
    } = params;

    assertAmountCents(amountCents);

    if (currency !== 'AUD') {
      throw new ValidationError('Only AUD is supported');
    }
    if (!platformOrderId) {
      throw new ValidationError('platformOrderId must not be empty');
    }
    if (!merchantName) {
      throw new ValidationError('merchantName must not be empty');
    }
    if (!payId) {
      throw new ValidationError('payId must not be empty');
    }
    if (!VALID_SOURCES.has(source)) {
      throw new ValidationError(`Invalid source: ${source}`);
    }
    if (metadata !== undefined) {
      assertMetadata(metadata);
    }

    const key = idempotencyKey ?? uuidv7();

    const res = await requestWithRetry(
      `${this.baseUrl}/createPaymentSession`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Scanpay-Key': this.apiSecret,
          'Idempotency-Key': key,
          'Scanpay-Version': API_VERSION,
          'X-Scanpay-Sdk': SDK_USER_AGENT,
        },
        body: JSON.stringify({
          merchantId: this.merchantId,
          platformOrderId,
          amountCents,
          currency,
          payId,
          merchantName,
          source,
          ...(reference !== undefined ? { reference } : {}),
          ...(metadata !== undefined ? { metadata } : {}),
          idempotencyKey: key,
        }),
      },
      retry ?? this.defaultRetry
    );

    const body = await decodeJsonOrThrow(res);
    return body as unknown as PaymentSession;
  }

  /**
   * Retrieves a payment session status.
   */
  async retrieve(sessionId: string, retry?: RetryOptions): Promise<PaymentSession> {
    if (!sessionId.startsWith('SP_SESS_')) {
      throw new ValidationError('sessionId must start with SP_SESS_');
    }

    const params = new URLSearchParams({ sessionId });
    const res = await requestWithRetry(
      `${this.baseUrl}/getPaymentStatus?${params}`,
      {
        method: 'GET',
        headers: {
          'X-Scanpay-Key': this.apiSecret,
          'Scanpay-Version': API_VERSION,
          'X-Scanpay-Sdk': SDK_USER_AGENT,
        },
      },
      retry ?? this.defaultRetry
    );

    const body = await decodeJsonOrThrow(res);
    return body as unknown as PaymentSession;
  }
}
