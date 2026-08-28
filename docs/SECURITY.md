# Security & Payment Verification Guarantees

## 1. Zero Trust Verification Rules

The system enforces strict security guidelines to prevent spoofing, merchant fraud, or false positives:

### Rule 1: No Client-Side Trust
Payment confirmation is **never** declared based on:
- A customer claiming they scanned the QR.
- A UPI app being opened.
- A browser redirect or URL visit.
- A frontend JavaScript timer or client event.

### Rule 2: Strict Amount Matching
If the display terminal shows **₹500.00**, and an incoming notification or webhook arrives for **₹50.00** (or even ₹499.00), the system:
1. Rejects state transition to `PAYMENT_RECEIVED`.
2. Marks the transaction in the ledger as `MISMATCH_REJECTED`.
3. Displays a warning banner to the merchant with exact amounts.

### Rule 3: Anti-Replay & Duplicate Prevention
Each transaction ID (UTR / Reference Number) is indexed with a `UNIQUE` constraint in SQLite.
If the same notification is re-delivered (e.g. by Android or network retry), the system rejects the duplicate and alerts the merchant.

### Rule 4: Device Authentication
All incoming event endpoints from the Android listener (`/api/payment-event`, `/api/notification-event`, `/api/device/heartbeat`) require a valid `X-Device-Token` header. Unauthorized local network requests are rejected with `401/403`.

### Rule 5: Minimal Privacy Retention
The Android `NotificationListenerService` filters package names before reading text. Personal messages, OTPs, and private notifications are ignored immediately and never logged or transmitted.
