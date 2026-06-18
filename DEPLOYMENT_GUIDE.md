# 🚢 Production Deployment Guide: Gym Management System

This guide walks you through deploying the ABC Fitness Studio Management System as a fully functional, production-ready, full-stack website on the cloud using free-tier services.

---

## 📐 Deployment Architecture

```
User Browser  ───►  Vercel CDN (React Static Frontend)
     │
     └───────────►  Render Cloud Service (Express Node API & Sockets)
                         │
                         ├───────► Supabase Cloud Database (PostgreSQL)
                         │
                         └───────► (Optional) Upstash Redis (Websocket sync)
```

---

## 🛠️ Step-by-Step Instructions

### Step 1: Push Your Code to GitHub
Both Vercel and Render deploy directly by pulling your codebase from a GitHub repository.

1. **Initialize Git in the project root**:
   ```bash
   git init
   ```
2. **Create a `.gitignore` file** in the root if it doesn't exist to prevent pushing secrets:
   ```gitignore
   node_modules/
   .env
   .env.local
   .env.development.local
   .env.test.local
   .env.production.local
   dist/
   build/
   .DS_Store
   ```
3. **Commit your code**:
   ```bash
   git add .
   git commit -m "feat: ready for cloud production deployment"
   ```
4. **Create a new repository on GitHub** (e.g. `abc-fitness-studio`) and link your local repo:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/abc-fitness-studio.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 2: Set Up the Database (Supabase)
Ensure your Supabase project is up-to-date and populated:
1. Log in to your [Supabase Dashboard](https://supabase.com).
2. Ensure you have run the schema script in the **SQL Editor** using `backend/supabase_migration.sql`.
3. Keep your **Project URL** and **Service Role API Key** ready.

---

### Step 3: Deploy the Backend (Render)
Render is perfect for hosting your Node.js/Express backend server for free.

1. Log in to [Render](https://render.com).
2. Click **New** -> **Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service settings:
   * **Name**: `abc-gym-backend`
   * **Root Directory**: `backend`
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `node server.js`
   * **Instance Type**: `Free`
5. Click **Advanced** and add the following **Environment Variables**:

| Key | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production mode optimizations |
| `PORT` | `3000` | Port for Express to bind |
| `SUPABASE_URL` | *Your Supabase Project URL* | `https://xxxx.supabase.co` |
| `SUPABASE_KEY` | *Your Supabase Service Role Key* | JWT bypass key for database queries |
| `SUPABASE_SERVICE_ROLE_KEY` | *Your Supabase Service Role Key* | Secret service role key |
| `JWT_SECRET` | *Generate a random string* | Used to sign authorization tokens |
| `JWT_REFRESH_SECRET` | *Generate a random string* | Used to sign refresh tokens |
| `REDIS_ENABLED` | `false` | Set to `true` only if you configure Redis below |
| `CORS_ORIGINS` | `https://your-frontend.vercel.app` | *Will be updated with your Vercel URL in Step 4* |

6. Click **Deploy Web Service**. Once deployed, copy your Render API URL (e.g. `https://abc-gym-backend.onrender.com`).

---

### Step 4: Deploy the Frontend (Vercel)
Vercel is the premier platform for hosting static React apps built with Vite.

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. Configure the Vercel Project settings:
   * **Project Name**: `abc-fitness-studio`
   * **Framework Preset**: `Vite`
   * **Root Directory**: `frontend`
5. Expand **Environment Variables** and add:

| Key | Value |
| :--- | :--- |
| `VITE_API_URL` | `https://abc-gym-backend.onrender.com/api` *(Your Render URL + `/api`)* |
| `VITE_ALLOW_DEV_PUBLIC_ATTENDANCE` | `false` |

6. Click **Deploy**. Vercel will build the React assets and provide you with a live URL (e.g. `https://abc-fitness-studio.vercel.app`).
7. **Crucial**: Go back to Render Web Service settings, update `CORS_ORIGINS` to match your Vercel frontend URL, and trigger a redeploy of the backend.

---

### Step 5: (Optional) Set Up Redis (Upstash)
If you require distributed WebSocket state or session caching:
1. Create a free Redis instance on [Upstash](https://upstash.com).
2. Set the following environment variables in Render:
   * `REDIS_ENABLED` = `true`
   * `REDIS_URL` = *Your Upstash Redis connection string*

---

## 🎉 Verification
Visit your Vercel URL. You should be able to:
1. Log in with your admin credentials.
2. View real-time member check-ins.
3. Manage, activate/deactivate, and delete members on the live database!
