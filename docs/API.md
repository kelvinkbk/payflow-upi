# REST API & WebSocket Documentation

Base URL: `http://localhost:3001` or `http://<LAN_IP>:3001`

---

## 1. Payment Sessions

### Create New Payment Session
* **Method**: `POST`
* **Path**: `/api/payment-session`
* **Body**:
  ```json
  {
    "amount": 500.00,
    "currency": "INR",
    "note": "Counter 1 Bill",
    "orderRef": "ORD_12345678",
    "timeoutSeconds": 300
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "ses_1787881841430_g57r",
      "amount": 500,
      "currency": "INR",
      "note": "Counter 1 Bill",
      "order_ref": "ORD_12345678",
      "upi_uri": "upi://pay?pa=merchant%40okaxis&pn=SuperStore+Express&am=500.00&cu=INR&tr=ORD_12345678",
      "status": "WAITING_FOR_PAYMENT",
      "expires_at": "2026-08-28T07:35:00.000Z"
    }
  }
  ```

### Get Active Waiting Session
* **Method**: `GET`
* **Path**: `/api/payment-session/current`
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "ses_1787881841430_g57r",
      "amount": 500,
      "status": "WAITING_FOR_PAYMENT",
      "merchantName": "SuperStore Express",
      "merchantUpiId": "merchant@okaxis"
    }
  }
  ```

### Cancel Active Session
* **Method**: `POST`
* **Path**: `/api/payment-session/cancel`

### Reset Display to READY
* **Method**: `POST`
* **Path**: `/api/payment-session/reset`

---

## 2. Verified Payment Events (Android Listener)

### Submit Verified Payment Event
* **Method**: `POST`
* **Path**: `/api/payment-event`
* **Headers**: `X-Device-Token: <ANDROID_DEVICE_TOKEN>`
* **Body**:
  ```json
  {
    "amount": 500.00,
    "currency": "INR",
    "transaction_id": "423987123456",
    "timestamp": "2026-08-28T07:15:00.000Z",
    "source": "notification",
    "payer_name": "Rahul Sharma",
    "app_source": "Google Pay",
    "bank_name": "HDFC Bank"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "status": "PAYMENT_RECEIVED",
    "message": "Payment of ₹500.00 verified successfully!",
    "matchedSessionId": "ses_1787881841430_g57r",
    "transactionId": "423987123456",
    "amount": 500
  }
  ```
* **Mismatch Response (422 Unprocessable)**:
  ```json
  {
    "success": false,
    "status": "MISMATCH_REJECTED",
    "message": "Amount mismatch: Expected ₹500.00, received ₹50.00",
    "matchedSessionId": "ses_1787881841430_g57r",
    "transactionId": "423987123456",
    "amount": 50,
    "expectedAmount": 500
  }
  ```

---

## 3. Demo & Sandbox Testing

### Simulate Payment Event
* **Method**: `POST`
* **Path**: `/api/demo/payment`
* **Body**:
  ```json
  {
    "amount": 500.00,
    "payer_name": "Demo Tester",
    "app_source": "PhonePe"
  }
  ```

---

## 4. Payment Gateway Webhooks

### Receive Gateway Webhook
* **Method**: `POST`
* **Path**: `/api/webhooks/:provider` (e.g. `/api/webhooks/razorpay`, `/api/webhooks/cashfree`)
* **Headers**: `X-Razorpay-Signature: <HMAC_SHA256_HASH>`

---

## 5. Transactions & Ledger

### Get Transactions
* **Method**: `GET`
* **Path**: `/api/transactions?limit=50&offset=0&status=RECEIVED&search=Rahul`

### Export CSV
* **Method**: `GET`
* **Path**: `/api/transactions/export`

---

## 6. Real-Time WebSocket Channel
* **Endpoint**: `ws://<HOST>:3001/ws`
* **Client Handshake Message**:
  ```json
  {
    "type": "CONNECTION_ESTABLISHED",
    "data": { "connectedClients": 1, "serverTime": "2026-08-28T07:15:00.000Z" }
  }
  ```
* **Event Types Broadcasted**:
  - `SESSION_CREATED`: New amount entered and QR generated
  - `PAYMENT_RECEIVED`: Payment verified and confirmed
  - `PAYMENT_AMOUNT_MISMATCH`: Amount mismatch alert
  - `PAYMENT_DUPLICATE_WARNING`: Duplicate transaction ignored
  - `SESSION_CANCELLED`: Cashier cancelled QR
  - `SESSION_EXPIRED`: QR timeout reached
  - `CONFIG_UPDATED`: Merchant name/UPI ID updated
