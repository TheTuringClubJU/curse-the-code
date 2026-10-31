# Curse the Code — Deployment Guide (Render + Vercel)

This guide provides the setup for deploying the **Curse the Code** development environment:
- **Backend API**: Hosted on **Render** (FastAPI, native Python 3.11 runtime, PostgreSQL / Neon)
- **Frontend SPA**: Hosted on **Vercel** (React, Three.js, Vite)

> [!NOTE]
> This deployment uses the test datasets (`content.test.json` and `assets_test`) for active development and team testing. The live event files (`content.live.json`) remain strictly protected and uncommitted.

---

## 1. Architecture & Network Flow

```
[ Browser / Developer / QA ]
           │
           │ HTTPS Requests
           ▼
[ Vercel Frontend CDN (https://<your-project>.vercel.app) ]
    │
    ├── Static Assets & React SPA: Loaded instantly via Global Edge CDN
    │
    └── `/api/*` & `/health`: Proxied transparently via Vercel Rewrites
           │
           ▼
[ Render Web Service (https://<your-project>.onrender.com) ]
    │
    ├── FastAPI REST APIs (`/api/auth`, `/api/lobby`, `/api/admin`, `/api/game`)
    │
    └── PostgreSQL Database (Neon Serverless Cloud DB)
```

### Why Vercel Rewrites?
1. **Zero CORS Issues**: The browser only communicates directly with the Vercel domain.
2. **First-Party Cookies**: `team_session` and `admin_session` cookies are treated as first-party (`SameSite=Lax`), preventing cross-site cookie blocking on modern Safari, Chrome, and Firefox browsers.
3. **Seamless Local & Deployment Parity**: Frontend code calls `/api/...` uniformly without conditional base URLs.

---

## 2. Deploying Backend to Render

Render natively supports Python applications without any container setup.

### Option A: Automatic via Render Blueprint (`render.yaml`) (Recommended)

1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository: `curse-the-code`.
4. Render will detect `render.yaml` automatically:
   - **Name**: `curse-the-code-backend`
   - **Runtime**: Native Python 3.11
   - **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
5. When prompted for environment variables:
   - Provide your Neon database URL for `DATABASE_URL`.
   - Update `CORS_ORIGINS` with your Vercel URL (e.g. `https://<your-project>.vercel.app`).
6. Click **Apply**. Render will install dependencies and start the service.

---

### Option B: Manual Web Service on Render

If you prefer to configure manually:
1. Click **New +** -> **Web Service**.
2. Select your repository.
3. Configure the service settings:
   - **Name**: `curse-the-code-backend`
   - **Region**: Choose closest to database (e.g., Oregon or Frankfurt).
   - **Branch**: Target branch (e.g. `optimization/room1` or `main`).
   - **Root Directory**: `.` (leave empty for root).
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Under **Advanced** -> **Health Check Path**:
   - Set to `/health`.
5. Under **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `PYTHON_VERSION` | `3.11.9` | Native Python runtime version |
   | `DATABASE_URL` | `postgresql://...` | Neon PostgreSQL connection string |
   | `CONTENT_FILE` | `content.test.json` | Dev test puzzles & clues |
   | `ASSETS_DIR` | `assets_test` | Dev asset directory path |
   | `ENVIRONMENT` | `development` | Development mode |
   | `CORS_ORIGINS` | `https://<your-app>.vercel.app,http://localhost:5173` | Allowed origins |
   | `CORS_ORIGIN_REGEX` | `https://.*\.vercel\.app` | Matches preview branches |
   | `COOKIE_SECURE` | `true` | Secure cookies over HTTPS |
   | `COOKIE_SAMESITE` | `lax` | Browser session cookie policy |
6. Click **Create Web Service**. Note your Render URL (e.g., `https://curse-the-code-backend.onrender.com`).

---

## 3. Deploying Frontend to Vercel

### Step 1: Connect Repository to Vercel
1. Log in to [Vercel](https://vercel.com/dashboard).
2. Click **Add New...** -> **Project**.
3. Import your `curse-the-code` GitHub repository.

### Step 2: Configure Project Settings
- **Framework Preset**: `Vite`
- **Root Directory**:
  - Click **Edit** and select `frontend` (Recommended), **OR** leave as `.` (both are pre-configured with `vercel.json`).
- **Build Command**: `npm run build`
- **Output Directory**: `dist` (or `frontend/dist` if root directory is `.`)
- **Install Command**: `npm install`

### Step 3: Configure Backend Destination in `vercel.json`
Update the destination URL in `frontend/vercel.json` (and `vercel.json` at root if deploying from root):
```json
{
  "source": "/api/:match*",
  "destination": "https://curse-the-code-backend.onrender.com/api/:match*"
}
```
Replace `https://curse-the-code-backend.onrender.com` with your actual Render service URL.

### Step 4: Deploy
Click **Deploy**. Vercel will install dependencies, build the Vite application, and deploy it to a global edge URL (e.g. `https://curse-the-code.vercel.app`).

---

## 4. Verification Checklist

1. **Backend Health Check:**
   Visit `https://<your-render-url>.onrender.com/health` in your browser.
   Expected response:
   ```json
   {
     "status": "healthy",
     "pack_label": "curse-the-code-2026",
     "service": "user-login"
   }
   ```

2. **Frontend Loading:**
   Visit `https://<your-vercel-url>.vercel.app`. The dark aesthetic login portal should render immediately.

3. **Rewrites & Auth Flow:**
   Log in with a test team account.
   - Browser network tab will show `POST https://<your-vercel-url>.vercel.app/api/auth/login` returning HTTP 200.
   - Cookie `team_session` is stored as HttpOnly, Secure.
   - Browser transitions to Lobby (`/lobby`), and then to Room 1 (`Lena's Bedroom`).

4. **3D Canvas & Audio:**
   - Room 1 procedural bedroom renders at 60 FPS.
   - Ambient horror audio synthesizes via Web Audio API.

---

## 5. Troubleshooting & Tips

- **Render Free Tier Cold Starts**: Render web services on the free tier spin down after 15 minutes of inactivity. The first request may take ~30-50 seconds to wake up the server.
- **Database SSL Requirement**: Neon requires SSL. Ensure your `DATABASE_URL` includes `?sslmode=require`.
- **CORS Errors**: If you call the backend directly instead of using Vercel rewrites, make sure your exact Vercel frontend domain is listed in `CORS_ORIGINS` on Render.
