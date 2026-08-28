# System Architecture & Technical Design

## 1. Overview
The Real-Time UPI Payment Received Display System provides an end-to-end, zero-paid-API solution for shopkeepers, retail merchants, and kiosks to generate dynamic NPCI-compliant UPI QR codes, track incoming payment notifications from an Android phone or gateway webhooks, verify amounts in real-time, announce payment audio ("Soundbox"), and show high-visibility confirmation screens.

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Customer Phone │       │  Merchant Phone │       │ Merchant Tablet │
│ (GPay/PhonePe)  │       │ (Android List.) │       │  (POS Screen)   │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         │ 1. Scans Dynamic QR     │                         │
         ├─────────────────────────┼─────────────────────────┘
         │                         │
         │ 2. Authorizes ₹500      │
         ▼                         ▼
   NPCI / Bank Switch  ──────>  Push Notification (₹500 received)
                                   │
                                   │ 3. POST /api/payment-event (Token Auth)
                                   ▼
                      ┌─────────────────────────┐
                      │  Local Node.js Backend  │
                      │  (SQLite + Match Engine)│
                      └────────────┬────────────┘
                                   │
                                   │ 4. WebSocket Broadcast
                                   ▼
                      ┌─────────────────────────┐
                      │ Customer Display Screen │
                      │  "✅ PAYMENT RECEIVED"  │
                      │  "₹500 on Google Pay"   │
                      └─────────────────────────┘
```

---

## 2. Core Components

### A. Dynamic QR Generator (`utils/upi.ts`)
- Implements the NPCI UPI Deep Link Specification:
  `upi://pay?pa={MERCHANT_UPI_ID}&pn={MERCHANT_NAME}&am={AMOUNT}&cu=INR&tr={ORDER_REF}&tn={NOTE}`
- Ensures strict currency formatting, parameter encoding, and checksum limits.

### B. Payment Matcher & Anti-Duplicate Engine (`services/paymentMatcher.service.ts`)
1. **Uniqueness Verification**: Checks SQLite database for identical `transaction_id` (UTR). If found, rejects with `DUPLICATE_REJECTED`.
2. **Session Matching**: Matches against the active session in `WAITING_FOR_PAYMENT` state.
3. **Amount Comparison**: Compares received amount against session target amount. If mismatch occurs (e.g. ₹50 received for ₹500 session), rejects with `MISMATCH_REJECTED` and triggers an operator warning.
4. **State Transition**: Transitions session from `WAITING_FOR_PAYMENT` to `PAYMENT_RECEIVED`.
5. **Instant Broadcast**: Emits real-time event via WebSocket to all connected displays.

### C. Android Notification Listener Companion (`android/`)
- Uses Android's `NotificationListenerService` API.
- Intercepts push notifications from Google Pay, PhonePe, Paytm, BHIM, Amazon Pay, and Bank SMS.
- Filters out promotional ads, cashback alerts, and recharge reminders.
- Forwards parsed payload over Wi-Fi LAN to `POST /api/payment-event` with `X-Device-Token`.

### D. Payment Gateway Webhook Abstraction (`providers/gatewayPaymentProvider.ts`)
- Clean `PaymentProvider` interface supporting enterprise gateway webhooks (Razorpay, Cashfree, PayU, and custom Bank UPI switches).
- HMAC-SHA256 signature verification protects against forged webhooks.

### E. Frontend POS Display & Soundbox (`frontend/`)
- React + TypeScript + Vite responsive dark glassmorphic terminal.
- Web Audio API synthesizer for two-tone alert chimes.
- Web Speech API speech synthesis for Hindi/Indian English voice announcements (*"Payment of ₹500 received on Google Pay"*).
- Auto-reset countdown timer with progress bar.
