import { assertAmount } from '../cents';
import { ValidationError } from '../errors';
import { uuidv7 } from '../idempotency';
import { decodeJsonOrThrow, requestWithRetry, RetryOptions } from '../transport';
import { CreateSessionRequest, PaymentSession } from '../types';

const VALID_SOURCES = new Set([
  'api',
  'woocommerce',
  'shopify',
  'pos',
  'magento',
  'wordpress',
  'shop-app',
]);

export class SessionResource {
  constructor(
    private readonly merchantId: string,
    private readonly baseUrl: string,
    private readonly apiSecret: string,
    private readonly defaultRetry?: RetryOptions
  ) {}

  /**
   * Creates a new payment session.
   *
   * `amount` must be a positive float in dollars (e.g. `19.90`). Zero,
   * negative, non-finite, and values above $1,000,000 get a `ValidationError`
   * before any network call.
   *
   * If `idempotencyKey` is omitted, the SDK generates a UUIDv7 so that
   * naive retry loops never create duplicate sessions.
   */
  async create(params: CreateSessionRequest): Promise<PaymentSession> {
    const {
      amount,
      currency = 'AUD',
      platformOrderId,
      merchantName,
      payId,
      reference,
      source = 'api',
      idempotencyKey,
      retry,
    } = params;

    assertAmount(amount);

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

    const key = idempotencyKey ?? uuidv7();

    const res = await requestWithRetry(
      `${this.baseUrl}/createPaymentSession`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Scanpay-Key': this.apiSecret,
          'Idempotency-Key': key,
        },
        body: JSON.stringify({
          merchantId: this.merchantId,
          platformOrderId,
          amount,
          currency,
          payId,
          merchantName,
          source,
          ...(reference !== undefined ? { reference } : {}),
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
        headers: { 'X-Scanpay-Key': this.apiSecret },
      },
      retry ?? this.defaultRetry
    );

    const body = await decodeJsonOrThrow(res);
    return body as unknown as PaymentSession;
  }
}
