import { describe, it, expect } from 'vitest';
import { ScanAndPay } from '../src/index';
import { ValidationError } from '../src/errors';

describe('ScanAndPay', () => {
  it('rejects empty merchantId', () => {
    expect(() => new ScanAndPay('', 'sp_api_test')).toThrow(ValidationError);
  });

  it('rejects empty apiSecret', () => {
    expect(() => new ScanAndPay('merchant_test', '')).toThrow(ValidationError);
  });

  it('exposes sessions resource', () => {
    const client = new ScanAndPay('merchant_test', 'sp_api_test');
    expect(client.sessions).toBeDefined();
  });

  it('throws when accessing webhooks without secret', () => {
    const client = new ScanAndPay('merchant_test', 'sp_api_test');
    expect(() => client.webhooks).toThrow(ValidationError);
    expect(() => client.webhooks).toThrow(/webhookSecret/);
  });

  it('exposes webhooks when secret provided', () => {
    const client = new ScanAndPay('merchant_test', 'sp_api_test', 'wh_secret');
    expect(client.webhooks).toBeDefined();
  });

  it('accepts a custom baseUrl via options', () => {
    const client = new ScanAndPay('m', 's', undefined, { baseUrl: 'https://api.example.dev' });
    expect(client).toBeDefined();
  });
});
