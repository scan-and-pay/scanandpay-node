import { describe, it, expect } from 'vitest';
import { uuidv7 } from '../src/idempotency';

describe('uuidv7', () => {
  it('matches the canonical UUID format', () => {
    expect(uuidv7()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('encodes version 7', () => {
    const id = uuidv7();
    expect(id[14]).toBe('7');
  });

  it('encodes the variant bits as 10', () => {
    const id = uuidv7();
    expect('89ab'.includes(id[19])).toBe(true);
  });

  it('is monotonically non-decreasing across rapid generation', () => {
    const a = uuidv7();
    const b = uuidv7();
    const tsA = a.slice(0, 8) + a.slice(9, 13);
    const tsB = b.slice(0, 8) + b.slice(9, 13);
    expect(tsA <= tsB).toBe(true);
  });

  it('returns 36-character strings (32 hex + 4 dashes)', () => {
    expect(uuidv7().length).toBe(36);
  });

  it('is collision-free over a small batch', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) ids.add(uuidv7());
    expect(ids.size).toBe(1000);
  });
});
