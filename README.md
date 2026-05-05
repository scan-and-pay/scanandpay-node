# @scanandpay/node

Official Node.js SDK for [Scan & Pay](https://docs.scanandpay.com.au) — accept
PayTo PayID payments via QR code from any Node.js environment (Express, NestJS,
Next.js, etc.). Includes React components for the frontend.

## Install

```bash
npm install @scanandpay/node
# or
yarn add @scanandpay/node
```

## Quickstart (Node.js)

```typescript
import { ScanAndPay } from '@scanandpay/node';

const client = new ScanAndPay(
  process.env.SCANANDPAY_MERCHANT_ID!,
  process.env.SCANANDPAY_API_SECRET!,
  process.env.SCANANDPAY_WEBHOOK_SECRET, // optional
);

// 1. Create a session at checkout. Amount is float dollars.
const session = await client.createSession({
  amount: 19.90,                             // $19.90
  platformOrderId: 'order_456',
  payId: 'merchant@example.com.au',
  merchantName: 'Acme Coffee',
});

// 2. Verify and consume webhooks (Express raw-body example).
import { WebhookSignatureError } from '@scanandpay/node';

app.post('/webhooks/scanandpay', async (req, res) => {
  try {
    const signature = req.headers['x-scanpay-signature'] as string;
    const event = client.webhooks.verify(signature, req.body);

    if (event.status === 'confirmed') {
      // Mark order paid using event.order_id, event.tx_id, ...
    }

    res.json({ received: true });
  } catch (err) {
    if (err instanceof WebhookSignatureError) {
      return res.status(401).send('Webhook verification failed');
    }
    throw err;
  }
});
```

## Amount format

`amount` is always **float dollars** (e.g. `19.90` for $19.90). This matches
the Scan & Pay API directly — no multiplication needed.

```ts
amount: 19.90    // ✓ $19.90
amount: 0.50     // ✓ $0.50
amount: 1000     // ✓ $1,000.00
amount: -1       // ✗ ValidationError — must be greater than 0
amount: 0        // ✗ ValidationError — must be greater than 0
```

The SDK validates that `amount` is a positive finite number not exceeding
$1,000,000 and throws `ValidationError` before any network call.

## Idempotency

Every `createSession` call sends an `Idempotency-Key` header. The SDK
generates a UUIDv7 by default; pass your own to make retries safe across
process restarts.

```ts
await client.createSession({
  amount: 19.90,
  platformOrderId: 'order_456',
  payId: 'merchant@example.com.au',
  merchantName: 'Acme Coffee',
  idempotencyKey: 'order_456:attempt_1',     // optional
});
```

## Retries

Transient failures (5xx, 408, 429, network errors) are retried 3× with
exponential backoff (250ms / 500ms / 1000ms). Tune per request:

```ts
await client.createSession({
  amount: 19.90,
  platformOrderId: 'order_456',
  payId: 'merchant@example.com.au',
  merchantName: 'Acme Coffee',
  retry: { retries: 5, baseMs: 100 },
});
```

## Quickstart (React)

```tsx
import { CheckoutWidget } from '@scanandpay/node/react';

function CheckoutPage({ session }) {
  return (
    <CheckoutWidget
      session={session}
      pollUrl="/api/scanandpay/status"
      onSuccess={(sessionId) => { window.location.href = '/thank-you'; }}
      theme="light"
    />
  );
}
```

## Errors

All thrown errors extend `ScanAndPayError`:

| Class | When |
|---|---|
| `ValidationError` | Bad input rejected before any HTTP call |
| `AuthenticationError` | API rejected `X-Scanpay-Key` (rotate the secret) |
| `ApiError` | Non-2xx response — has `statusCode` + `responseBody` |
| `NetworkError` | Transport failure after exhausting retries |
| `IdempotencyError` | Server-side idempotency key conflict |
| `WebhookSignatureError` | Webhook signature, timestamp, or replay check failed |

## Credentials

Sign in to the merchant dashboard at
[merchant.scanandpay.com.au](https://merchant.scanandpay.com.au), open
**Settings → Integrations**, and copy:

- `Merchant ID`
- `API Secret`
- `Webhook Secret`

Store them in environment variables — never commit them to source control.

## Documentation

- **API reference:** https://docs.scanandpay.com.au/api/payments
- **Webhook payload + signing:** https://docs.scanandpay.com.au/api/webhooks
- **OpenAPI spec:** https://docs.scanandpay.com.au/api-spec.yaml

## Licence

Apache-2.0.
