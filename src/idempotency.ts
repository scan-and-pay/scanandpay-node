/**
 * UUIDv7 — time-ordered, 128-bit, RFC 9562.
 *
 * Used as the default value for `Idempotency-Key` when callers don't supply
 * one. Time-ordering means duplicate detection windows on the server can be
 * enforced via a TTL on the natural document id, and Firestore range queries
 * over a window of recent keys remain efficient.
 *
 *   layout (16 bytes):
 *     bytes 0-5  : 48-bit Unix milliseconds, big-endian
 *     byte  6    : version nibble (0x70) | 4 random bits
 *     byte  7    : 8 random bits
 *     byte  8    : variant bits (0b10) | 6 random bits
 *     bytes 9-15 : 56 random bits
 */
import crypto from 'node:crypto';

export function uuidv7(): string {
  const ts = BigInt(Date.now());
  const rand = crypto.randomBytes(10);
  const buf = Buffer.alloc(16);

  buf[0] = Number((ts >> 40n) & 0xffn);
  buf[1] = Number((ts >> 32n) & 0xffn);
  buf[2] = Number((ts >> 24n) & 0xffn);
  buf[3] = Number((ts >> 16n) & 0xffn);
  buf[4] = Number((ts >> 8n) & 0xffn);
  buf[5] = Number(ts & 0xffn);

  rand.copy(buf, 6);

  buf[6] = (buf[6] & 0x0f) | 0x70;
  buf[8] = (buf[8] & 0x3f) | 0x80;

  const hex = buf.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
