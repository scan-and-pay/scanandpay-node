# Changelog

All notable changes to `@scanandpay/node` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this package adheres to [SemVer](https://semver.org/spec/v2.0.0.html)
once it reaches `1.0.0`. Pre-1.0 minor versions may include breaking changes.

## [0.2.1] — 2026-05-05

### Fixed

- **`amount` is now float dollars, not integer cents.** The v0.2.0 assumption
  that the API uses cents was wrong — the Scan & Pay API accepts and returns
  `amount` as a float dollar value (e.g. `19.90` for $19.90). The `assertCents`
  validator and the `Cents` / `cents()` helpers have been removed. Pass the
  dollar amount directly: `amount: 19.90`.
- `PaymentSession.amount` and `WebhookEvent.amount` are now documented as
  float dollars.
- Per-session ceiling corrected from 100,000,000 cents to $1,000,000.

### Migration from v0.2.0

```diff
- await client.createSession({ amount: 1990, ... })
+ await client.createSession({ amount: 19.90, ... })

- import { cents } from '@scanandpay/node';
- amount: cents(1990)
+ amount: 19.90
```

If you were using `$session->amount / 100` for display, remove the division —
the value is already in dollars.

## [0.2.0] — 2026-05-04

### Breaking

- **`amount` is now strictly integer cents.** Float values (e.g. `19.90`)
  are rejected with `ValidationError` *before* any network call. Migrate
  by multiplying by 100 and rounding: `Math.round(19.90 * 100) === 1990`.
- **All thrown errors now extend `ScanAndPayError`** instead of bare
  `Error`. Callers branching on `instanceof Error` keep working; callers
  parsing `.message` strings should switch to `instanceof ValidationError`,
  `instanceof AuthenticationError`, etc.
- **`ScanAndPay` constructor signature** — the optional `baseUrl` positional
  argument moved into an options object: `new ScanAndPay(id, secret, whSecret, { baseUrl })`.
  The webhookSecret position is unchanged.

### Added

- `cents()` helper + `Cents` branded type for opt-in compile-time money safety.
- `Idempotency-Key` header sent on every `createSession` call. UUIDv7 by
  default; pass `idempotencyKey` to override.
- Automatic transport retry on transient failures (5xx, 408, 429, network)
  with exponential backoff: 250ms / 500ms / 1000ms over 3 retries by default.
  Override per call via `retry: { retries, baseMs }`.
- Custom error classes: `ScanAndPayError` (base), `ValidationError`,
  `AuthenticationError`, `ApiError` (with `statusCode` + `responseBody`),
  `NetworkError`, `IdempotencyError`, `WebhookSignatureError`.
- `source: 'shop-app'` accepted as a first-party platform identifier.
- `LICENSE` (Apache-2.0) at the package root.
- 22 → 60 tests covering cents, idempotency, retry, errors.

### Changed

- `WebhookVerifier` now throws typed `WebhookSignatureError` instead of
  generic `Error`.
- Every API response is decoded through a single helper that maps HTTP
  status codes to typed errors (401 → `AuthenticationError`, 409 →
  `IdempotencyError`, other non-2xx → `ApiError`).

### Migration notes

```diff
- await client.createSession({ amount: 19.90, ... })
+ await client.createSession({ amount: 1990, ... })

- new ScanAndPay(id, secret, wh, 'https://api.example.dev')
+ new ScanAndPay(id, secret, wh, { baseUrl: 'https://api.example.dev' })

- } catch (err) { if (err.message === 'Invalid signature') { ... } }
+ } catch (err) { if (err instanceof WebhookSignatureError) { ... } }
```

## [0.1.0] — 2026-05-04

Initial release. Client init, `sessions.create`, `sessions.retrieve`,
`webhooks.verify`, React `<CheckoutWidget>` and `usePaymentStatus`.
