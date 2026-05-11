import { ValidationError } from '../errors';
import { API_VERSION, SDK_USER_AGENT } from '../constants';
import { uuidv7 } from '../idempotency';
import { decodeJsonOrThrow, requestWithRetry, RetryOptions } from '../transport';
import { CreateRefundRequest, Refund } from '../types';

export class RefundResource {
  constructor(
    private readonly merchantId: string,
    private readonly baseUrl: string,
    private readonly apiSecret: string,
    private readonly defaultRetry?: RetryOptions
  ) {}

  async create(params: CreateRefundRequest): Promise<Refund> {
    const {
      paymentSessionId,
      amountCents,
      reason,
      idempotencyKey,
      retry,
    } = params;

    if (!paymentSessionId || !paymentSessionId.startsWith('SP_SESS_')) {
      throw new ValidationError('paymentSessionId must start with SP_SESS_');
    }
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new ValidationError('amountCents must be a positive integer');
    }

    const key = idempotencyKey ?? uuidv7();

    const res = await requestWithRetry(
      `${this.baseUrl}/createRefund`,
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
          paymentSessionId,
          amountCents,
          ...(reason ? { reason } : {}),
          idempotencyKey: key,
        }),
      },
      retry ?? this.defaultRetry
    );

    const body = await decodeJsonOrThrow(res);
    return body as unknown as Refund;
  }
}
