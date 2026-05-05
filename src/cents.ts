/**
 * Money is always handled as integer cents end-to-end.
 *
 * The SDK accepts `amount: number` for ergonomics, but at session-creation time
 * any value that is not a positive integer is rejected with `ValidationError`.
 *
 * The `Cents` branded type and the `cents()` helper are exported as opt-in
 * type safety for callers who want to surface money mistakes at compile time:
 *
 *   const total: Cents = cents(1990);          // OK
 *   const bad:   Cents = cents(19.90);         // throws ValidationError
 *   client.sessions.create({ amount: total }); // OK
 */
import { ValidationError } from './errors';

export type Cents = number & { readonly __brand: unique symbol };

export function cents(value: number): Cents {
  assertCents(value);
  return value as Cents;
}

export function assertCents(value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError('amount must be a finite number of cents');
  }
  if (!Number.isInteger(value)) {
    throw new ValidationError(
      `amount must be an integer number of cents (got ${value} — did you mean ${Math.round(value)}?)`
    );
  }
  if (value <= 0) {
    throw new ValidationError('amount must be greater than 0');
  }
  if (value > 100_000_000) {
    throw new ValidationError('amount exceeds the per-session limit ($1,000,000.00)');
  }
}
