# Playverzus.xyz Version 2.0 — System Architecture & Engineering Blueprint

> **Engineering Standard:** Plan. Design. Structure. Scale. (Clean, Scalable, Maintainable)

---

## 1. Six-Layer Rack Architecture

### Layer 1: Frontend (`lib/`)
- **Design System (`lib/design_system/`):**
  - `tokens/hig_tokens.dart`: Canonical color, typography, and spacing tokens (Electric Purple `#8B5CF6`, Amethyst `#A855F7`, Deep Obsidian `#0B0C10`, Carbon `#111319`, Hairline `#202430`).
  - `layout/adaptive_scaffold.dart` & `responsive.dart`: 4-tier responsive layout (`Compact`, `Medium`, `Expanded`, `UltraWide`) with role-isolated navigation (`Guest`, `Player`, `Game Developer`, `Staff/Admin`) and universal Top-Bar `‹ Back` navigation.
  - `widgets/`: Zero-lag opaque components (`HigSegmentedControl`, `CountryFlag`, `EloLevelBadge` Level 1–10, `BrandLogo`, `ActiveGameSwitcherPill`, `ProofOfVictoryCard`).
- **Feature Modules (`lib/features/`):**
  - `onboarding_auth/`: FACEIT-layout public Landing Page (`LandingScreen`) and Role-Aware Auth (`AuthScreen`).
  - `dashboard/`, `challenges/`, `matchroom/`, `tournaments/`, `leaderboards/`, `cashier/`, `games/`, `profile/`, `friends/`, `settings/`, `community_support/`, `downloads/`, `legal/`.
  - `developer/`: Game Developer Studio (`DeveloperPortalScreen`, `DeveloperGameEditorScreen`, `DeveloperStatsTesterScreen`).
  - `admin/`: 10-Desk Role-Scoped Operations Console (`AdminConsoleScreen`, `AdminSupportPanel`, `AdminPollsPanel`, `AdminGameProfilesPanel`, `AdminSeasonsPanel`, `AdminSponsorsPanel`).

### Layer 2: Backend & Edge Gateway (`serve_v2.mjs` & `developer_api_engine.mjs`)
- **Static & Asset Delivery (`serve_v2.mjs`):** Brotli (`br`) and Gzip (`gzip`) compression with in-memory asset cache, `ETag` / `304 Not Modified`, and in-memory LRU cache (`250` ISO codes) for `/flags/:iso.png`.
- **Live Mobile Money Gateway (`serve_v2.mjs`):** Server-side OAuth2 handshake, STK Push (`/api/mpesa/stk-push`), status polling (`/api/mpesa/check-status`), and B2C payout (`/api/mpesa/payout`) using server-only `.env` credentials.
- **Platform-Aware Developer Stats Engine (`developer_api_engine.mjs`):** Server-side API key vault (`.playverzus_dev_store.json`, gitignored), SSRF guard, dot-path JSON stat extractor, and live platform stats proxy (`/api/developer/*`).
- **Core NestJS Upstream (`apps/api`):** Auth, Profiles, Match State Machine, Wallets, Tournaments, Leaderboards, Ratings, Polls, Support, Review Queue, and SOC Security Telemetry.

### Layer 3: Database & State Persistence
- **PostgreSQL / Supabase (`@playverzus/db`):** Authoritative tables for `profiles`, `wallets` (Practice Points `PTS`), `transactions` & `locks` (Real Cash Escrow `USDC`/`KES`), `matches`, `tournaments`, `ratings`, `review_tasks`, and `support_tickets`.
- **Upstash Redis (`apps/api/src/redis`):** Distributed settlement locks (`withLock`) preventing double-payout race conditions, plus 30-day cached cash ledgers (`cash:<userId>`).
- **Client User-Isolated Storage (`lib/core/storage/app_state.dart`):** Per-user keys (`playverzus_v2_active_game_<userId>`, `playverzus_v2_machine_<userId>`, `playverzus_v2_handles_<userId>`) completely wiped on `signOut()`.

### Layer 4: APIs (`lib/core/network/api_client.dart`)
- **Centralized HTTP Client:** User-isolated short-TTL GET caching (`/games` 60s, `/leaderboard` & `/polls` 12s, `/tournaments` & `/ratings` 8s), in-flight GET deduplication, automatic cache invalidation on `POST`/`PATCH`/`DELETE` or token change, and 401 session revocation hook.
- **Third-Party Game Developer Connectors:** Tailored presets for **PC** (`Steamworks Web API`, `Epic EOS`, `Custom REST`), **Console** (`Publisher Cross-Play REST`, `Xbox Live XSTS`, `PlayStation Partner API`), **Mobile** (`Azure PlayFab`, `Unity Gaming Services`, `Google Play Games`, `Custom Mobile REST`), and **Web** (`Custom JSON REST`).

### Layer 5: Services & Native Bridge (`lib/core/engine/` & `lib/platform_channels/`)
- **Device Recognition & Companion Auto-Launch (`device_bridge.dart`):** Hardware fingerprint binding, native OS installed-game scanning, and synchronized matchroom auto-launch when both sides lock Ready.
- **Bulletproof Anti-Fraud & Dual-Consensus Engine (`lib/core/security/anti_fraud_engine.dart`):**
  1. `FrameHasher`: 64-bit Perceptual Difference Hash (`dHash`) + SHA-256 frame digest + Hamming distance (`<= 4` bits).
  2. `TelemetrySigner`: RFC 2104 `HMAC-SHA256` packet signing + monotonic sequence anti-replay + 15s clock-skew check.
  3. `AntiCheatAnalyzer`: Impossible score velocity physics + frozen-frame overlay injection detection + score boundary validation.
  4. `DualConsensusOracle`: Cross-stream Host vs Challenger evaluation (`DUAL_DIRECT`, `DUAL_INVERTED`, `SINGLE_STREAM_A/B`, `CONFLICT_REVIEW`).
  5. `VotingOcrEngine`: Temporal persistence confidence multiplier (`+10%` per consecutive stable frame up to `1.3x`).

### Layer 6: Monitoring & Security Operations (`lib/features/admin/`)
- **SOC Dashboard (`/admin/security`):** Real-time threat level (`NORMAL` / `ELEVATED` / `HIGH`), Global Settlement Circuit Breaker toggle, Emergency Match Freeze & Void controls, active Redis distributed lock inspector, and 7-category security telemetry feed (`ANTI_CHEAT`, `OCR_TAMPER`, `GSI_AUTH`, `SETTLEMENT_LOCK`, `RATE_LIMIT`, `ADMIN_ACTION`, `SYSTEM`).
- **Treasury & Solvency Monitor (`/admin/treasury`):** Live Gross Cash vs Player Liabilities, Segregated Income Books, Reserve Ratio %, and safe withdrawable earnings calculator.

---

## 2. Testing & Deployment

```powershell
# 1. Static Analysis (Must report 0 issues)
flutter analyze

# 2. Automated Unit, RBAC, Anti-Fraud & 4-Breakpoint Responsive Widget Suite
flutter test

# 3. Production Web Release Build
flutter build web --release

# 4. Start Production Edge Server (Port 8080)
node serve_v2.mjs
```
