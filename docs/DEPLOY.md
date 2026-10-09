# Production Deployment Guide (100% Free-Tier)

This guide documents the complete procedure to deploy PlayVerzus across free-tier cloud platforms without incurring credit card charges.

---

## 🛠️ Free-Tier Service Topology

| Provider | Service | Free-Tier Allowance | Usage in PlayVerzus |
| :--- | :--- | :--- | :--- |
| **Supabase** | Managed PostgreSQL & Auth | 500MB DB, 50k MAUs, Row Level Security | Match data, ledgers, profiles, auth |
| **Render** | Web Service (Docker / Node) | 750 free instance hours / month | NestJS API (`apps/api`) |
| **Vercel** | Serverless Edge Hosting | 100GB bandwidth, unlimited previews | Next.js Frontend (`apps/web`) |
| **Upstash** | Serverless Redis | 10,000 commands / day | Room codes, rate limits, active locks |
| **Cloudflare**| Cloudflare R2 / CDN | 10GB storage, zero egress fees | Ephemeral dispute snapshots (if enabled) |

---

## Step 1: Supabase Database & Auth Setup

1. Create a free account at [supabase.com](https://supabase.com).
2. Create a new project (e.g. `playverzus-prod`).
3. Open the **SQL Editor** in the Supabase Dashboard:
   - Run `supabase/migrations/0001_init.sql` to generate all 16 tables, 18 `SECURITY DEFINER` stored procedures, and row-level security policies.
   - Run `supabase/seed.sql` to populate official game profiles, Season 0, and demo sponsors.
4. Open **Project Settings > API**:
   - Copy `Project URL` (maps to `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`).
   - Copy `anon public` key (maps to `SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
   - Copy `service_role` key (maps to `SUPABASE_SERVICE_ROLE_KEY` on server only; never expose to web/mobile).
5. Open **Authentication > Providers**:
   - Enable Email / Password.
   - (Optional) Toggle "Confirm email" OFF for frictionless onboarding in demo mode.

---

## Step 2: Upstash Redis Setup

1. Create a free account at [upstash.com](https://upstash.com).
2. Create a Redis database with primary region closest to your Render API server.
3. Under the **Details** tab, copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or direct `rediss://...` connection URL for `REDIS_URL`).

---

## Step 3: Deploy Backend API to Render

1. Create a free account at [render.com](https://render.com).
2. Click **New + > Web Service** and connect your GitHub repository.
3. Configure the service settings:
   - **Name**: `verzusxyz-api`
   - **Environment**: `Node`
   - **Root Directory**: leave blank or specify `apps/api`
   - **Build Command**:
     ```bash
     corepack enable && pnpm install --frozen-lockfile && pnpm --filter @playverzus/api build
     ```
   - **Start Command**:
     ```bash
     node apps/api/dist/main.js
     ```
   - **Instance Type**: `Free`
4. Configure Environment Variables in the Render dashboard:
   - `NODE_ENV`: `production`
   - `PORT`: `3001`
   - `SUPABASE_URL`: `https://<your-project>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: `<your-service-role-key>`
   - `REDIS_URL`: `<your-upstash-redis-url>`
   - `WALLET_MODE`: `demo`
   - `CORS_ORIGIN`: `https://<your-vercel-domain>.vercel.app`
5. Click **Create Web Service**. Note the assigned URL: `https://verzusxyz-api.onrender.com`.

---

## Step 4: Deploy Frontend to Vercel

1. Create a free account at [vercel.com](https://vercel.com).
2. Import your GitHub repository.
3. Configure project settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `apps/web`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`
4. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://<your-project>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `<your-anon-key>`
   - `NEXT_PUBLIC_API_URL`: `https://verzusxyz-api.onrender.com`
   - `NEXT_PUBLIC_WALLET_MODE`: `demo`
5. Click **Deploy**. Vercel will build and assign your production domain.

---

## Step 5: Mobile App (Expo EAS Free Tier)

1. Navigate to `apps/mobile/`.
2. Configure `.env`:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   EXPO_PUBLIC_API_URL=https://verzusxyz-api.onrender.com
   ```
3. Run local simulator or device:
   ```bash
   pnpm --filter @playverzus/mobile dev
   ```
4. To build standalone Android APK using EAS Free Tier:
   ```bash
   npx eas-cli build --platform android --profile preview
   ```

---

## ✅ Zero-Cost Verification Checklist

Before opening registration to users, verify the following:

- [ ] **Database Connection Pool**: Ensure `apps/api` uses Supabase direct or pooled connection under the 60 connection limit.
- [ ] **Zero Storage Rule**: Confirm OCR frames are discarded in browser memory; only extracted text, confidence, and SHA-256 hashes are transmitted.
- [ ] **Render Sleep Handling**: Render free web services spin down after 15 minutes of inactivity. The client handles 30s cold starts with automatic retry loops in `useCapturePipeline.ts` and `apiClient`.
- [ ] **Wallet Mode Isolation**: Verify `WALLET_MODE=demo` is active across all environments. Confirm real-money endpoints throw `501 NotImplementedError`.
- [ ] **Rate Limiter Health**: Upstash Redis sliding window interceptor drops brute force attempts (>60 req/min per IP).
