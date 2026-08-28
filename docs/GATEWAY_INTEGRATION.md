# Enterprise Payment Gateway Integration Guide

This guide explains how to connect commercial payment gateways (Razorpay, Cashfree, PayU, or direct Bank UPI switches) to the display terminal for bank-level confirmation.

---

## 1. Provider Abstraction Architecture

The backend defines a unified `PaymentProvider` interface in `backend/src/providers/paymentProvider.interface.ts`:

```typescript
export interface PaymentProvider {
  readonly name: string;
  processPayment(event: IncomingPaymentEvent): Promise<PaymentProcessResult>;
  healthCheck(): Promise<{ ok: boolean; message: string }>;
}
```

Implementations include:
- `NotificationPaymentProvider`: Processes local Android push notifications.
- `GatewayPaymentProvider`: Verifies webhook HMAC signatures and parses gateway webhooks.
- `DemoPaymentProvider`: Handles sandbox testing.

---

## 2. Setting Up Gateway Webhooks

### Razorpay Integration
1. In your Razorpay Dashboard, go to **Settings > Webhooks > Add New Webhook**.
2. **Webhook URL**: `https://<YOUR_PUBLIC_DOMAIN>/api/webhooks/razorpay` (or your Ngrok tunnel for local testing).
3. **Secret**: Enter the secret key configured in your `.env` as `GATEWAY_WEBHOOK_SECRET`.
4. **Active Events**: Check `payment.captured`.
5. When a customer scans the dynamic UPI QR linked to your Razorpay VPA, Razorpay delivers an HMAC-signed payload:
   - Header: `X-Razorpay-Signature: <hex_digest>`
   - Event: `payment.captured`
6. `GatewayPaymentProvider.verifySignature()` validates the HMAC-SHA256 signature and matches the amount against the active display session.

### Cashfree Integration
1. In Cashfree Dashboard, go to **Developers > Webhooks**.
2. **Endpoint**: `https://<YOUR_PUBLIC_DOMAIN>/api/webhooks/cashfree`
3. **Events**: Select `PAYMENT_SUCCESS`.

### Custom Bank UPI Switch
Send a POST request to `/api/webhooks/custom`:
```json
{
  "amount": 500.00,
  "currency": "INR",
  "transaction_id": "423987123456",
  "payer_name": "Rahul Sharma",
  "payer_vpa": "rahul@okaxis",
  "order_ref": "ORD_12345678",
  "timestamp": "2026-08-28T07:15:00.000Z"
}
```

---

## 3. Webhook Signature Verification Algorithm
```typescript
import crypto from 'crypto';

function verifyWebhook(rawBody: string | Buffer, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expected = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
```
