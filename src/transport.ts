/**
 * HTTP transport with retry and structured error mapping.
 *
 * Retries are applied to:
 *   - network errors (DNS, ECONNRESET, fetch throw)
 *   - 5xx responses
 *   - 408, 429
 *
 * 4xx responses (other than 408/429) are surfaced immediately so callers
 * can react to validation failures without burning the retry budget.
 *
 * Backoff: 250ms, 500ms, 1000ms (default 3 retries → 4 attempts max).
 */
import {
  ApiError,
  AuthenticationError,
  IdempotencyError,
  NetworkError,
  ScanAndPayError,
} from './errors';

export interface RetryOptions {
  /** Number of retry attempts after the initial request. Default: 3. */
  retries?: number;
  /** Base backoff in milliseconds. Default: 250. */
  baseMs?: number;
}

const DEFAULT_RETRIES = 3;
const DEFAULT_BASE_MS = 250;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function requestWithRetry(
  url: string,
  init: RequestInit,
  retry: RetryOptions = {}
): Promise<Response> {
  const retries = retry.retries ?? DEFAULT_RETRIES;
  const baseMs = retry.baseMs ?? DEFAULT_BASE_MS;
  let lastError: ScanAndPayError | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await sleep(baseMs * 2 ** (attempt - 1));
    }

    try {
      const res = await fetch(url, init);
      if (RETRYABLE_STATUS.has(res.status)) {
        const body = await safeReadBody(res);
        lastError = new ApiError(
          `HTTP ${res.status} from ${url}`,
          res.status,
          body
        );
        continue;
      }
      return res;
    } catch (err) {
      lastError = new NetworkError(
        `Network error contacting ${url}: ${(err as Error).message}`,
        { cause: err }
      );
    }
  }

  throw lastError ?? new NetworkError(`Request to ${url} failed without a captured cause`);
}

export async function decodeJsonOrThrow(res: Response): Promise<Record<string, unknown>> {
  const body = await safeReadBody(res);

  if (res.status === 401) {
    throw new AuthenticationError(extractMessage(body, 'Invalid API key'));
  }
  if (res.status === 409) {
    throw new IdempotencyError(extractMessage(body, 'Idempotency key conflict'));
  }
  if (res.status < 200 || res.status >= 300) {
    throw new ApiError(extractMessage(body, `HTTP ${res.status}`), res.status, body);
  }
  if (body === null || typeof body !== 'object') {
    throw new ApiError('Non-JSON response from API', res.status, body);
  }
  return body as Record<string, unknown>;
}

async function safeReadBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 512) };
  }
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.message === 'string') return obj.message;
  }
  return fallback;
}
