import { describe, it, expect } from 'vitest';
import { assertAmount } from '../src/cents';
import { ValidationError } from '../src/errors';

describe('assertAmount', () => {
  it('accepts a positive float dollar amount', () => {
    expect(() => assertAmount(19.90)).not.toThrow();
    expect(() => assertAmount(0.01)).not.toThrow();
  });

  it('accepts a positive integer dollar amount', () => {
    expect(() => assertAmount(50)).not.toThrow();
    expect(() => assertAmount(1000)).not.toThrow();
  });

  it('accepts the ceiling exactly', () => {
    expect(() => assertAmount(1_000_000)).not.toThrow();
  });

  it('rejects zero', () => {
    expect(() => assertAmount(0)).toThrow(/greater than 0/);
  });

  it('rejects a negative value', () => {
    expect(() => assertAmount(-1)).toThrow(/greater than 0/);
  });

  it('rejects NaN', () => {
    expect(() => assertAmount(NaN)).toThrow(ValidationError);
  });

  it('rejects Infinity', () => {
    expect(() => assertAmount(Infinity)).toThrow(ValidationError);
  });

  it('rejects amounts above the per-session ceiling', () => {
    expect(() => assertAmount(1_000_000.01)).toThrow(/per-session limit/);
  });

  it('throws ValidationError on non-numbers', () => {
    expect(() => assertAmount('19.90')).toThrow(ValidationError);
  });
});
