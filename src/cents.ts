import { ValidationError } from './errors';

/** @internal */
export function assertAmount(value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError('amount must be a finite number (dollars, e.g. 19.90)');
  }
  if (value <= 0) {
    throw new ValidationError('amount must be greater than 0');
  }
  if (value > 1_000_000) {
    throw new ValidationError('amount exceeds the per-session limit ($1,000,000.00)');
  }
}
