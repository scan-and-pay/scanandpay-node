# @scanandpay/node

Official Node.js SDK for [Scan & Pay](https://docs.scanandpay.com.au) —
generate PayTo PayID QR codes and payment links from any Node.js backend
(Express, NestJS, Next.js, etc.), then react to our signed webhook when a
payment is confirmed. Includes React components for the frontend.

Your backend mints a session, we run the payment surface, our webhook
confirms back to you.

## How the pieces fit

```
Your backend     ──  createSession()   ─▶  Scan & Pay API     (mint QR + pay URL)
Customer phone   ──  scans QR          ─▶  pay.scanandpay.com.au   (we collect payment)
Scan & Pay       ──  signed webhook    ─▶  Your backend       (payment confirmation)
```

You never handle funds, banking credentials, or PayID resolution — the SDK
generates the link, the customer pays on our hosted surface, and you receive
a verified webhook telling you the order is paid.

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

## Metadata

Attach a free-form key/value bag to any session. We echo it back unchanged
in the webhook payload + `getStatus` response, so you can correlate the
payment with your own order/customer/cart records.

```ts
await client.createSession({
  amount: 19.90,
  platformOrderId: 'order_456',
  payId: 'merchant@example.com.au',
  merchantName: 'Acme Coffee',
  metadata: {
    customer_id: 'cus_42',
    cart_id: 'cart_99',
  },
});
```

Limits: max **50 keys**, max **500 chars** per key + value (validated
client-side before any network call). Don't put secrets here — metadata
isn't encrypted at rest in any special way.

## API versioning

The SDK pins itself to a date-stamped API contract via the `Scanpay-Version`
header (e.g. `2026-05-07`). When we evolve the wire format, your
already-installed SDK keeps running against the contract it was built for.
Upgrade at your own pace.

```ts
import { API_VERSION, SDK_VERSION } from '@scanandpay/node';

console.log(API_VERSION); // 2026-05-07
console.log(SDK_VERSION); // 0.3.0
```

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
[business.scanandpay.com.au](https://business.scanandpay.com.au), open
**Settings → Integrations**, and copy:

- `Merchant ID`
- `API Secret`
- `Webhook Secret`

Store them in environment variables — never commit them to source control.

## Production integration checklist

Use the SDK from your backend only. Your frontend can display the returned
payment URL or QR widget, but it must never receive the API Secret or Webhook
Secret.

1. **Create your local order first.** Store the cart, customer, amount,
   currency, and a durable `platformOrderId` in your own database with a
   pending payment status.
2. **Create one Scan & Pay session for that order.** Call
   `client.createSession()` from your backend using the same
   `platformOrderId`. Pass an idempotency key based on your order id if the
   request may be retried by a job queue, serverless function, or browser
   refresh.
3. **Render the payment step as pending.** Show the returned payment session
   to the customer with `CheckoutWidget`, your own QR renderer, or a redirect
   to the returned pay URL. Do not send the customer to a success page yet.
4. **Expose a small status endpoint.** If you use `CheckoutWidget`, point
   `pollUrl` at your own backend endpoint. That endpoint should call
   `client.getStatus(sessionId)` and return only the public status fields your
   UI needs.
5. **Verify the webhook on raw request bytes.** Use
   `client.webhooks.verify(signature, rawBody)` before trusting any webhook
   payload. A parsed or re-serialized body will fail signature verification.
6. **React to our payment confirmation webhook.** Treat
   `event.status === 'confirmed'` as the signal to mark your order paid in
   your own database. The Place Order click and QR render only mean payment
   has started — money has not moved until the webhook arrives.
7. **Keep test and live credentials separate.** Use environment variables or
   your secret manager, and never commit merchant credentials into source
   control, frontend bundles, mobile apps, logs, screenshots, or support
   tickets.

Safe to share publicly: package install commands, SDK method names,
request/response fields, webhook verification rules, idempotency guidance,
test-mode behaviour, and error handling. Keep your database schema, internal
routes, cloud project names, merchant secrets, and admin tooling private.

## Integration pitfalls

Things that bite first-time integrators (we've hit each one ourselves):

1. **Create the order BEFORE minting the session.** The session binds
   to your `platformOrderId` and the webhook references the same id
   when the payment is confirmed. Persist the order in your DB
   (status `pending`) first, then call `client.createSession({...})`.
2. **Don't finalise the order on Place Order.** A common pattern in
   checkout code is a hardcoded list — "if this gateway type is
   stripe / paypal / etc. defer; otherwise finalise immediately". If
   that list is missing `scanandpay`, the checkout flashes a success
   screen and the `<CheckoutWidget>` never renders. Always treat
   Scan & Pay as a deferred / async-confirmation gateway, just like
   Stripe Checkout or PayPal — the customer needs to see the QR and
   complete the scan-and-pay in their banking app before the order
   can be considered paid.
3. **Webhook is the source of truth.** Mark the order paid only when
   the verified webhook arrives with `event.status === 'confirmed'`.
   The Place Order click on your site does NOT mean money has moved.

## Documentation

- **API reference:** https://docs.scanandpay.com.au/api/payments
- **Webhook payload + signing:** https://docs.scanandpay.com.au/api/webhooks
- **OpenAPI spec:** https://docs.scanandpay.com.au/api-spec.yaml

## Licence

Apache-2.0.
