# Android Notification Listener Setup Guide

## 1. Overview
The companion Android app runs in the background on the merchant's Android smartphone (the phone receiving UPI payment push notifications or bank SMS).

When a customer completes a UPI payment via **Google Pay, PhonePe, Paytm, BHIM, Amazon Pay, or Bank SMS**, the listener extracts the exact amount and UTR reference and sends a token-authenticated HTTP request to the merchant's display terminal over the local Wi-Fi network.

---

## 2. Prerequisites
1. Android smartphone running Android 7.0 (API Level 24) or higher.
2. The phone and the merchant terminal PC/tablet must be on the **same local Wi-Fi network**.
3. Android Studio (Hedgehog / Iguana / Jellyfish / Ladybug) to build the APK.

---

## 3. Building & Installing the App

### Option A: Using Android Studio
1. Open Android Studio.
2. Select **Open** and select the `android/` directory inside this repository.
3. Allow Gradle sync to complete.
4. Connect your Android device via USB (with USB Debugging enabled) or use Wireless Debugging.
5. Click **Run 'app'** (`Shift + F10`) to build and install.

### Option B: Using Gradle Command Line
```bash
cd android
./gradlew assembleDebug
# The APK will be generated at: android/app/build/outputs/apk/debug/app-debug.apk
adb install app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. Initial Phone Configuration

### Step 1: Grant Notification Access
1. Open the **UPI Payment Listener** app on your phone.
2. Tap **Grant Notification Access**.
3. In the Android System Settings menu that appears, locate **UPI Payment Listener** and toggle **Allow Notification Access** to `ON`.
4. Return to the app. The status banner will turn green: `🟢 LISTENER ACTIVE & MONITORING UPI APPS`.

### Step 2: Configure Server URL & Token
1. On the Merchant Web Terminal, click **Pair Phone** to view your local IP and security token.
2. In the Android App:
   - **Server URL**: Enter `http://<MERCHANT_PC_IP>:3001` (e.g. `http://192.168.1.100:3001`).
   - **Security Device Token**: Enter the matching token (default: `upi_secure_token_987654321`).
3. Tap **Save Connection Settings**.

### Step 3: Test Local Connectivity
1. On the Merchant Web Display, enter ₹500 on the numpad and click **Generate QR Code**.
2. In the Android App, tap **Send Test ₹500 Payment Event**.
3. Watch the Merchant Display immediately announce:
   **✅ PAYMENT RECEIVED — ₹500.00**!

---

## 5. Battery Optimization Exemption
To ensure uninterrupted background listening when the phone screen is locked:
1. Go to **Settings > Apps > UPI Payment Listener > Battery**.
2. Select **Unrestricted** (or disable Battery Optimization / Auto-Kill).

---

## 6. Privacy & Security Assurance
- The listener monitors **only** configured UPI package IDs (`com.google.android.apps.nbu.paisa.user`, `com.phonepe.app`, `net.one97.paytm`, etc.).
- Personal messages, WhatsApp chats, OTPs, and unrelated notifications are **completely ignored and never transmitted**.
- Notifications are parsed locally on the device; only structured transaction metadata (Amount, UTR, App Name) is forwarded.
