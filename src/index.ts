import { ValidationError } from './errors';
import { RefundResource } from './resources/RefundResource';
import { SessionResource } from './resources/SessionResource';
import { RetryOptions } from './transport';
import { CreateRefundRequest, CreateSessionRequest, PaymentSession, Refund } from './types';
import { WebhookVerifier } from './webhook';

export interface ScanAndPayOptions {
  baseUrl?: string;
  retry?: RetryOptions;
}

export class ScanAndPay {
  public static readonly DEFAULT_BASE_URL = 'https://api.scanandpay.com.au';
  public readonly sessions: SessionResource;
  public readonly refunds: RefundResource;
  private _webhooks?: WebhookVerifier;
  private readonly baseUrl: string;

  constructor(
    private readonly merchantId: string,
    private readonly apiSecret: string,
    private readonly webhookSecret?: string,
    options: ScanAndPayOptions = {}
  ) {
    if (!merchantId) throw new ValidationError('merchantId is required');
    if (!apiSecret) throw new ValidationError('apiSecret is required');

    this.baseUrl = options.baseUrl ?? ScanAndPay.DEFAULT_BASE_URL;
    this.sessions = new SessionResource(this.merchantId, this.baseUrl, this.apiSecret, options.retry);
    this.refunds = new RefundResource(this.merchantId, this.baseUrl, this.apiSecret, options.retry);
  }

  get webhooks(): WebhookVerifier {
    if (!this.webhookSecret) {
      throw new ValidationError('webhookSecret is required to use the webhooks resource');
    }
    if (!this._webhooks) {
      this._webhooks = new WebhookVerifier(this.webhookSecret);
    }
    return this._webhooks;
  }

  async createSession(params: CreateSessionRequest): Promise<PaymentSession> {
    return this.sessions.create(params);
  }

  async getStatus(sessionId: string): Promise<PaymentSession> {
    return this.sessions.retrieve(sessionId);
  }

  async createRefund(params: CreateRefundRequest): Promise<Refund> {
    return this.refunds.create(params);
  }

  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/ping`, { method: 'GET' });
      const data = (await response.json()) as { success: boolean };
      return data.success === true;
    } catch {
      return false;
    }
  }
}

export * from './errors';
export * from './idempotency';
export * from './types';
export { API_VERSION, SDK_VERSION, SDK_USER_AGENT } from './constants';
export { WebhookVerifier } from './webhook';
export type { RetryOptions } from './transport';
