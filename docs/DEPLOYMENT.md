# Cloud Deployment Guide: GitHub ➔ Netlify / Vercel ➔ Public Website

Deploy your UPI Payment Display terminal so that it is accessible from any phone, iPad, or computer worldwide with automatic HTTPS.

---

## 🚀 Step 1: Push Project to GitHub

1. Open your terminal in the project root `e:\payment`:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: UPI Real-Time Payment Display Terminal"
   ```
2. Create a new repository on [GitHub.com](https://github.com/new) (e.g. `upi-payment-display`).
3. Link and push your code:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/upi-payment-display.git
   git branch -M main
   git push -u origin main
   ```

---

## ⚡ Step 2: Deploy Frontend on Vercel or Netlify (100% Free)

### Option A: Deploy on Vercel
1. Go to [Vercel.com](https://vercel.com) and click **"Add New..." > "Project"**.
2. Select your GitHub repository `upi-payment-display`.
3. Vercel automatically detects the preset from `vercel.json`:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (or `frontend`)
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`
4. Click **Deploy**.
5. Within 30 seconds, your site is live at:
   👉 **`https://your-project.vercel.app`**

---

### Option B: Deploy on Netlify
1. Go to [Netlify.com](https://netlify.com) and click **"Add new site" > "Import an existing project"**.
2. Select **GitHub** and pick `upi-payment-display`.
3. Netlify automatically reads `netlify.toml`:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
4. Click **Deploy Site**.
5. Your public website is live at:
   👉 **`https://your-site.netlify.app`**

---

## 🌐 Step 3: Deploy Backend on Render / Railway (Free Cloud Server)

Since WebSockets and persistent SQLite are used, host the backend on [Render.com](https://render.com) or [Railway.app](https://railway.app):

1. Go to [Render.com](https://dashboard.render.com) ➔ Click **New > Web Service**.
2. Connect your GitHub repository `upi-payment-display`.
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   - `MERCHANT_NAME` = `MGOCSM Jaipur`
   - `MERCHANT_UPI_ID` = `mgocsmjaipur@nsdl`
5. Click **Create Web Service**.
6. You will receive a public backend URL:
   👉 `https://upi-display-backend.onrender.com`

---

## 🔗 Step 4: Connect Cloud Frontend to Cloud Backend

In your Vercel or Netlify project settings ➔ **Environment Variables**:
* `VITE_API_URL` = `https://upi-display-backend.onrender.com`
* `VITE_WS_URL` = `wss://upi-display-backend.onrender.com/ws`

Redeploy, and your public display terminal is live worldwide!

---

## 📱 For iPhone Users (Global 4G/5G SMS Detection)
In your iPhone **Shortcuts Automation**:
Change the URL from the local IP to your live public Render URL:
```text
https://upi-display-backend.onrender.com/api/ios-event
```
Now, even when you are away from the shop Wi-Fi or on mobile data, any payment SMS received on your iPhone will immediately update your public display screen in real-time!
