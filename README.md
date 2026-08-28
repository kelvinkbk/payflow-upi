# Indian UPI Real-Time Payment Received Display System 🇮🇳

An enterprise-grade, real-time UPI payment display and verification system designed for shop counters, retail terminals, tablets, and kiosks.

![UPI Payment Display Terminal](https://img.shields.io/badge/UPI-NPCI_DeepLink_Compliant-10b981)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![React](https://img.shields.io/badge/React-19.0-61dafb)
![NodeJS](https://img.shields.io/badge/Node.js-22%2F26-339933)
![SQLite](https://img.shields.io/badge/SQLite-WAL_Mode-003B57)
![Kotlin](https://img.shields.io/badge/Kotlin-Android_Listener-7F52FF)

---

## 🌟 Key Features

1. **Dynamic NPCI UPI QR Generation**: Generates compliant `upi://pay?pa=...&pn=...&am=...&cu=INR` QR codes instantly without third-party paid APIs.
2. **Zero-Trust Verification Engine**:
   - Compares incoming amounts against the active session (e.g. rejects ₹50 payment on ₹500 session).
   - Prevents duplicate UTR replays.
   - Enforces session timeouts.
3. **Instant Display Transition**:
   - **SCAN & PAY** ➔ **✅ PAYMENT RECEIVED ₹500** with high-clarity green checkmark celebration & confetti.
4. **Hardware Soundbox Voice Announcements**:
   - High-clarity Web Speech & Web Audio synthesized alert chimes (*"Payment of ₹500 received on Google Pay"* / *"UPI par ₹500 prapt hue"*).
5. **Android Notification Companion App**:
   - Kotlin app using `NotificationListenerService` to capture payment alerts from **Google Pay, PhonePe, Paytm, BHIM, Amazon Pay, and Bank SMS**.
6. **Commercial Gateway Webhook Ready**:
   - Plug-and-play abstraction supporting Razorpay, Cashfree, PayU, and custom Bank UPI switches with HMAC-SHA256 signature verification.
7. **Complete Transaction Ledger**:
   - Search by UTR, filter by status, view daily revenue statistics, and export transaction logs to CSV.
8. **Demo & Sandbox Testing Mode**:
   - Built-in interactive simulator to test exact payments, amount mismatches, duplicate UTRs, and timeout states.

---

## 📁 Project Structure

```text
upi-payment-display/
├── backend/                  # Node.js + TypeScript + Express + SQLite + WebSocket
│   ├── src/
│   │   ├── config/           # Environment and server configs
│   │   ├── controllers/      # REST API route controllers
│   │   ├── database/         # SQLite database initialization and schema
│   │   ├── middleware/       # Auth and error handling middleware
│   │   ├── providers/        # PaymentProvider abstraction (Notification, Gateway, Demo)
│   │   ├── routes/           # Express router endpoints
│   │   ├── services/         # Payment matching engine, session service, parser
│   │   ├── tests/            # Automated unit test suite (Node test runner)
│   │   ├── utils/            # NPCI UPI URI generator and validation
│   │   └── server.ts         # Main server entrypoint
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                 # React + TypeScript + Vite + Glassmorphic POS UI
│   ├── src/
│   │   ├── components/       # CustomerDisplay, MerchantNumpad, Ledger, Modals
│   │   ├── hooks/            # useWebSocket, useSoundbox
│   │   ├── services/         # Typed API client
│   │   ├── styles/           # High-contrast dark POS CSS styling
│   │   ├── types/            # TypeScript data interfaces
│   │   ├── App.tsx           # Main POS terminal application
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── android/                  # Kotlin Companion App (NotificationListenerService)
│   ├── app/
│   │   ├── src/main/java/com/upi/paymentlistener/
│   │   │   ├── network/      # OkHttp API client & models
│   │   │   ├── parser/       # Regex parser for GPay, PhonePe, Paytm, BHIM
│   │   │   ├── service/      # UpiNotificationListenerService & HeartbeatService
│   │   │   ├── ui/           # MainActivity & RecyclerView LogAdapter
│   │   │   └── util/         # PreferenceManager
│   │   └── src/main/res/     # Layouts, colors, and styles
│   └── build.gradle.kts
│
├── database/                 # SQLite database storage directory (WAL mode)
├── docs/                     # Technical architecture, API, setup & security docs
├── docker-compose.yml        # Multi-container Docker deployment
├── .env.example              # Sample environment configuration
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v20+ or v22+ or v26+
- **npm**: v10+
- **Android Studio** (optional, for building the Android listener APK)

---

### 2. Start the Backend Server

```bash
cd backend
npm install
npm run build
npm start
```
* Backend starts at `http://localhost:3001`
* WebSocket server available at `ws://localhost:3001/ws`

To run in development mode with hot-reloading:
```bash
npm run dev
```

To run the automated unit test suite:
```bash
node --test dist/tests/upi.test.js dist/tests/matcher.test.js dist/tests/parser.test.js
```

---

### 3. Start the Frontend Terminal

```bash
cd frontend
npm install
npm run dev
```
* Frontend starts at `http://localhost:5173`
* Open `http://localhost:5173` in your browser on the shop tablet / monitor / PC.

---

### 4. Running via Docker Compose

```bash
docker-compose up --build
```
* Access the web terminal at `http://localhost:5173`
* Backend API is exposed at `http://localhost:3001`

---

## 📱 Setting Up the Android Notification Listener

1. Open the `android/` directory in **Android Studio**.
2. Build and install the APK on the shop Android smartphone that receives UPI payment notifications.
3. Open the app and tap **Grant Notification Access** ➔ Enable the listener in Android system settings.
4. In the app's settings, enter your Merchant PC's Local IP (e.g. `http://192.168.1.100:3001`) and Device Token.
5. Tap **Send Test ₹500 Payment Event** to verify real-time connectivity with your display terminal!

---

## 🧪 Testing the Payment Flow

```text
1. Enter ₹500 on the Merchant Numpad
      ↓
2. Tap "Generate QR Code" ➔ High-res UPI QR is displayed with active pulse
      ↓
3. Click "Demo Simulator" in the top bar
      ↓
4. Choose "Pay Exact Amount (₹500)"
      ↓
5. Verification Engine validates amount (₹500 == ₹500) and checks duplicate UTR
      ↓
6. Merchant Screen bursts with celebration:
   "✅ PAYMENT RECEIVED — ₹500.00"
   "Transaction ID: 423987123456"
      ↓
7. Soundbox speaks: "Payment of 500 Rupees received on Google Pay"
      ↓
8. Auto-reset countdown bar smoothly returns to Ready screen for the next customer!
```

---

## 🔒 Security Principles

- **No Client-Side Assumptions**: Scanning a QR or opening a UPI link is never considered payment proof.
- **Strict Amount Match**: Any payment notification that differs from the active amount (e.g., ₹50 instead of ₹500) is rejected and flagged as a mismatch.
- **Anti-Replay**: Duplicate UTRs/Transaction IDs are automatically rejected.
- **Authenticated Device Access**: Android listener communication is secured with `X-Device-Token`.
- **HMAC Signatures**: Payment gateway webhooks require valid cryptographic signature verification.

---

## 📄 Documentation

- [System Architecture](docs/ARCHITECTURE.md)
- [REST API & WebSocket Reference](docs/API.md)
- [Android Setup Guide](docs/ANDROID_SETUP.md)
- [Gateway & Webhook Integration](docs/GATEWAY_INTEGRATION.md)
- [Security Model](docs/SECURITY.md)

---

## 📜 License
MIT License. Built for Indian merchants and open-source fintech development.
