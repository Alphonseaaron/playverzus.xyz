# Playverzus.xyz — Universal Esports Platform

> **Any Game. Any Device. Zero Developer APIs. 100% Free-Tier Infrastructure.**

Playverzus.xyz is a globally accessible, skill-based esports infrastructure that enables competitive 1v1 matchmaking and single-elimination bracket tournaments across **any game** (mobile, PC, console, or physical table games) using proprietary automated visual verification, video stream telemetry ingestion, and a human-in-the-loop (HITL) review audit trail.

---

## 🏗️ Architecture Overview

```
+-------------------------------------------------------------------------+
|                              CLIENT LAYER                               |
|                                                                         |
|  +--------------------------------+   +-------------------------------+  |
|  |     Next.js 14 Web (PWA)       |   |   React Native Expo SDK 51    |  |
|  |   - Canvas Stream Ingest       |   |   - Native Screen Capture     |  |
|  |   - Visual Verification Engine |   |   - Game-Over Photo Mode      |  |
|  |   - Real-time Socket.io Client |   |   - Secure Storage Tokens     |  |
|  +--------------------------------+   +-------------------------------+  |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                           API & GATEWAY LAYER                           |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |            NestJS Monolithic Backend (Render Free Tier)           |  |
|  |  - Type Registry (8 Universal Engines)                             |  |
|  |  - Elo Rating Calculator & Soft-Reset Season Engine                |  |
|  |  - Dual-Ledger Cash & Demo Escrow Ledger (EUR / Practice PTS)      |  |
|  |  - Anti-Cheat Heuristic Validator & Frame Hasher                   |  |
|  |  - Socket.io Realtime Match Gateway                                |  |
|  +-------------------------------------------------------------------+  |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                          PERSISTENCE & STORAGE                          |
|                                                                         |
|  +--------------------------------+   +-------------------------------+  |
|  |   Supabase Postgres (Free)     |   |   Upstash Redis (Free Tier)   |  |
|  |   - 16 Relational Tables       |   |   - Active Room Code Store    |  |
|  |   - 18 SECURITY DEFINER RPCs   |   |   - Sliding Window Rate Limit |  |
|  |   - Row-Level Security (RLS)   |   |   - Ephemeral Match Cache     |  |
|  +--------------------------------+   +-------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## ⚡ Core Principles

1. **Zero-Cost Operation**:
   Every service used operates strictly within permanent free tiers (Supabase, Vercel, Render, Upstash Redis, Cloudflare R2).
2. **Zero Game Developer APIs**:
   Playverzus.xyz does not rely on third-party developer APIs. Matches are verified by capturing video frames or screen snapshots, cropping defined Regions of Interest (ROI), and performing automated visual verification and match integrity validation.
3. **Zero Screenshot Storage**:
   To comply with privacy laws, zero-storage limits, and minimize bandwidth, full gameplay frames are processed ephemerally in volatile memory. Only extracted numeric data, confidence scores, and integrity hashes are permanently stored.
4. **Legally Compliant Skill-Based Model**:
   Predominance of skill eliminates gambling classification. Wagers operate in default `demo` mode using non-fiat POINTS, backed by an ACID-compliant double-entry ledger.

---

## 📁 Repository Structure

```
playerone/
├── apps/
│   ├── api/          # NestJS backend application
│   ├── web/          # Next.js 14 web application & dashboard
│   └── mobile/       # React Native Expo mobile application
├── packages/
│   ├── config/       # Shared ESLint, Tailwind, and TypeScript configurations
│   ├── core/         # Universal type engines, OCR validation, matching, rating
│   ├── db/           # Supabase client wrapper and auto-generated TypeScript schema
│   └── ui/           # Shared Tailwind UI primitives and cn() utility
├── supabase/
│   ├── migrations/   # 0001_init.sql with tables, RPCs, and RLS policies
│   └── seed.sql      # Official archetype seeds, Season 0, and demo sponsors
└── docs/             # Technical specifications, legal compliance, and deployment guides
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: `v20.0.0` or higher (tested on Node `24.x`)
- **pnpm**: `v9.0.0` or higher
- **Supabase CLI** (optional for local DB emulation)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/anderstyree26/verzus.xyz.git
cd verzus.xyz

# Install all workspace dependencies
pnpm install
```

### 3. Environment Variables
Copy `.env.example` to `.env` in the root and in respective apps:
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 4. Build & Run
```bash
# Build all packages
pnpm build

# Run API and Web concurrently in development mode
pnpm dev
```
- Web Application: `http://localhost:3000`
- API Server: `http://localhost:3001`
- Swagger / OpenAPI Docs: `http://localhost:3001/api/docs`
