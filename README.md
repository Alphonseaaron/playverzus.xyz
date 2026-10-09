# ⚡ PLAYVERZUS.XYZ

> **Universal Esports Platform · Automated Verification · Demo Wallet · 100% Free-Tier Only**

[![CI](https://github.com/anderstyree26/verzus.xyz/actions/workflows/ci.yml/badge.svg)](https://github.com/anderstyree26/verzus.xyz/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)

PlayVerzus.xyz is a modern competitive gaming platform that enables 1v1 match challenges and tournament brackets for **ANY game** (PC, mobile, console, or physical table games) without requiring game publisher APIs. Scores and match outcomes are verified using real-time canvas verification, perceptual image hashing, heuristic anti-cheat algorithms, and an asynchronous human-in-the-loop (HITL) review queue.

---

## ✨ Key Features

- **🎮 Type-Based Competition Engines**: 8 universal archetypes (`HIGH_SCORE`, `LOW_TIME`, `SURVIVAL`, `HEAD_TO_HEAD`, `BINARY_RESULT`, `COMPOSITE_STAT`, `PROGRESSION`, `PHYSICAL`) support any game in existence.
- **👁️ Zero-Storage Client-Side OCR**: Tesseract.js runs directly in browser Web Workers. Scores are parsed every 1.5 seconds from normalized coordinate bounding boxes (ROIs). Only SHA-256 hashes and alphanumeric text are permanently stored.
- **🪙 Double-Entry Demo Wallet**: Operates strictly with non-fiat `POINTS` (PTS) using PostgreSQL `SECURITY DEFINER` stored procedures. Real-money gateways are cleanly abstracted and disabled by default.
- **🏆 Bracket Tournaments**: Single-elimination tournament engine supporting 4 to 128 players with automated match pairing and progression.
- **🛡️ Anti-Cheat & Fair Play**: Maximum theoretical score validation, velocity checking ($\Delta S / \Delta t$), perceptual hash matching, and reviewer dispute arbitration.
- **🌐 100% Free-Tier Architecture**: Zero monthly cloud infrastructure cost across Supabase Free, Vercel Hobby, Render Free, Upstash Redis, and Cloudflare R2.

---

## 🏗️ Monorepo Structure

```
├── apps/
│   ├── api/          # NestJS REST & WebSocket API (Render Free Tier)
│   ├── web/          # Next.js 14 App Router, Tailwind, Lucide (Vercel)
│   └── mobile/       # React Native Expo SDK 51 App (Android & iOS)
├── packages/
│   ├── config/       # Shared TypeScript, ESLint, and Tailwind configurations
│   ├── core/         # Universal type engines, wallet domain logic, Elo & OCR
│   ├── db/           # Supabase client wrapper & typed database schema
│   └── ui/           # Shared Tailwind component primitives & utilities
├── supabase/
│   ├── migrations/   # 0001_init.sql (16 tables, 18 RPCs, complete RLS)
│   └── seed.sql      # Official game profiles & demo seed data
└── docs/             # Complete architectural, deployment, and legal docs
```

---

## 🚀 Quick Setup & Development

### 1. Prerequisites
- **Node.js**: `v20+` or `v24+`
- **pnpm**: `v9+`
- A free [Supabase](https://supabase.com) account

### 2. Install Dependencies
```bash
git clone https://github.com/anderstyree26/verzus.xyz.git
cd verzus.xyz
pnpm install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```
Fill in your Supabase Project URL, Anon Key, and Service Role Key.

### 4. Apply Database Migrations
In the Supabase SQL Editor, run:
1. `supabase/migrations/0001_init.sql`
2. `supabase/seed.sql`

### 5. Build and Start
```bash
# Build all packages
pnpm build

# Start Web and API concurrently
pnpm dev
```
- Web: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:3001](http://localhost:3001)
- API Docs: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

---

## 🧪 Testing

```bash
# Run unit tests
pnpm test

# Run type checks across all workspaces
pnpm typecheck

# Run linter
pnpm lint
```

---

## 📖 Documentation Index

- [Architecture & Overview](file:///docs/README.md)
- [Production Deployment Guide (Free Tier)](file:///docs/DEPLOY.md)
- [Universal Game Types Specification](file:///docs/TYPES.md)
- [Wallet & Ledger Architecture](file:///docs/WALLET.md)
- [Legal Analysis & Skill vs Chance](file:///docs/LEGAL.md)
- [Kenya Market Launch Guide](file:///docs/KENYA.md)
- [Console Verification via Stream Ingest](file:///docs/STREAM_INGEST.md)
- [Mobile Application Guide](file:///docs/MOBILE.md)
- [REST API Reference](file:///docs/API.md)

---

## 📄 License
MIT © 2026 PlayVerzus (playverzus.xyz)
