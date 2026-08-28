# Apple iPhone (iOS) Setup Guide for UPI Payment Display

Because Apple iOS does not allow third-party background apps to read all push notifications, you can use **Apple's built-in "Shortcuts" (Automations) app**. It is 100% free, pre-installed on every iPhone, and forwards bank SMS in real-time.

---

## ⚡ 60-Second Setup via iOS Shortcuts Automation

### Step 1: Open the "Shortcuts" App on your iPhone
1. Open the **Shortcuts** app (pre-installed by Apple on all iPhones).
2. Tap the **Automation** tab at the bottom.
3. Tap **New Automation** (or the `+` button in the top right).

---

### Step 2: Set the Trigger
1. Select **"Message"** from the list of triggers.
2. In **"Sender"**: You can leave it blank OR type your Bank / NSDL sender name.
3. In **"Message Contains"**: Type `credited` (or `received` or `INR`).
4. Select **"Run Immediately"** (so it runs in the background without asking for confirmation).
5. Toggle **"Notify When Run"** to `OFF`.
6. Tap **Next**.

---

### Step 3: Add the HTTP POST Action
1. Tap **"New Blank Automation"** ➔ Tap **"Add Action"**.
2. Search for **"Get Contents of URL"** (under Web actions).
3. In the URL field, enter your Merchant PC's Local IP:
   ```text
   http://192.168.1.100:3001/api/ios-event
   ```
   *(Replace `192.168.1.100` with the IP shown when you click "Pair Phone" on your web screen).*
4. Tap the arrow `>` on the action to expand advanced settings:
   - **Method**: Change from `GET` to **`POST`**.
   - **Request Body**: Select **`JSON`**.
   - Tap **"Add new field"** ➔ Choose **`Text`**:
     - Key: `text`
     - Value: Select the blue variable **"Shortcut Input"** (choose *Message > Content*).
5. Tap **Done** in the top right.

---

## 🚀 How it Works in Real-Time
1. Customer scans your QR on the counter screen and pays `mgocsmjaipur@nsdl`.
2. Your bank (NSDL / SBI / HDFC, etc.) delivers an SMS to your iPhone:
   > *"Rs 500.00 credited to a/c by UPI-Rahul-423987123456"*
3. iOS automatically triggers the Shortcut in the background.
4. It sends the message to `http://<PC_IP>:3001/api/ios-event`.
5. The display immediately announces **"✅ PAYMENT RECEIVED ₹500"** and speaks through the speaker!

---

## 💡 Other Options for iPhone Users
1. **Secondary/Old Android Phone on Counter**: Many merchants place a budget Android device or old phone connected to the shop Wi-Fi on the counter.
2. **Email Alerts Webhook**: If your bank sends credit email notifications, you can forward bank emails automatically.
