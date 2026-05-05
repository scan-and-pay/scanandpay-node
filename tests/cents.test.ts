import { describe, it, expect } from 'vitest';
import { cents, assertCents } from '../src/cents';
import { ValidationError } from '../src/errors';

describe('cents', () => {
  it('accepts a positive integer', () => {
    expect(cents(1990)).toBe(1990);
  });

  it('rejects a float', () => {
    expect(() => cents(19.9)).toThrow(ValidationError);
    expect(() => cents(19.9)).toThrow(/integer number of cents/);
  });

  it('rejects zero', () => {
    expect(() => cents(0)).toThrow(/greater than 0/);
  });

  it('rejects a negative integer', () => {
    expect(() => cents(-1)).toThrow(/greater than 0/);
  });

  it('rejects NaN', () => {
    expect(() => cents(NaN)).toThrow(/finite number/);
  });

  it('rejects Infinity', () => {
    expect(() => cents(Infinity)).toThrow(/finite number/);
  });

  it('rejects amounts above the per-session ceiling', () => {
    expect(() => cents(100_000_001)).toThrow(/per-session limit/);
  });

  it('hints at the rounded value when given a float', () => {
    try {
      cents(1990.5);
      throw new Error('expected throw');
    } catch (err) {
      expect((err as Error).message).toMatch(/did you mean 1991/);
    }
  });
});

describe('assertCents', () => {
  it('does not throw on integers', () => {
    expect(() => assertCents(1)).not.toThrow();
    expect(() => assertCents(100_000_000)).not.toThrow();
  });

  it('throws ValidationError on non-numbers', () => {
    expect(() => assertCents('1990')).toThrow(ValidationError);
  });
});
