import { describe, it, expect } from 'vitest';
import {
  ApiError,
  AuthenticationError,
  IdempotencyError,
  NetworkError,
  ScanAndPayError,
  ValidationError,
  WebhookSignatureError,
} from '../src/errors';

describe('error hierarchy', () => {
  it('ValidationError is a ScanAndPayError', () => {
    const err = new ValidationError('bad');
    expect(err).toBeInstanceOf(ScanAndPayError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ValidationError');
  });

  it('AuthenticationError is a ScanAndPayError', () => {
    expect(new AuthenticationError('nope')).toBeInstanceOf(ScanAndPayError);
  });

  it('NetworkError is a ScanAndPayError', () => {
    expect(new NetworkError('down')).toBeInstanceOf(ScanAndPayError);
  });

  it('IdempotencyError is a ScanAndPayError', () => {
    expect(new IdempotencyError('dup')).toBeInstanceOf(ScanAndPayError);
  });

  it('WebhookSignatureError is a ScanAndPayError', () => {
    expect(new WebhookSignatureError('bad sig')).toBeInstanceOf(ScanAndPayError);
  });

  it('ApiError exposes statusCode and responseBody', () => {
    const err = new ApiError('boom', 500, { error: 'oops' });
    expect(err.statusCode).toBe(500);
    expect(err.responseBody).toEqual({ error: 'oops' });
    expect(err).toBeInstanceOf(ScanAndPayError);
  });

  it('preserves a cause when provided', () => {
    const root = new Error('root');
    const err = new NetworkError('wrap', { cause: root });
    expect((err as NetworkError & { cause?: unknown }).cause).toBe(root);
  });
});
