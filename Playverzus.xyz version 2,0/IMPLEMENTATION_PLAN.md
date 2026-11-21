# Playverzus.xyz Version 2.0 — Complete Dart/Flutter Architecture & Implementation Plan

> **Folder:** `Playverzus.xyz version 2,0` (All existing v1.0 folders — `apps/web`, `apps/api`, `apps/mobile`, `packages/` — stay **100% untouched and preserved**.)  
> **Dart Package Name:** `playverzus_v2` (Flutter 3.38.5 / Dart 3.10.4)  
> **Targets:** **Web**, Android (APK), iOS, Windows, macOS & Linux — Single Unified Dart/Flutter Codebase  
> **UI Standard:** Apple iOS Human Interface Guidelines (HIG) enforced across all platforms  
> **Brand Rule:** Official Logos Everywhere — **Zero typed brand/game names in logo slots**

---

## 1. Vision & Core Improvements Over v1.0

Playverzus v2.0 rebuilds the entire client natively in **Dart/Flutter** while connecting directly to the existing **Playverzus NestJS API + Supabase backend** (shared users, wallets, Elo ladders, matches, tournaments, and admin console).

### What We Carry Forward (100% Feature Parity with v1.0)
- **Gamer-First Navigation:** Active Game Switcher always visible and switchable in 1 tap from any screen (including active matchrooms via `Exit Match` breadcrumbs & `Switch Game` controls).
- **Full 21-Game Official Roster:** All 21 competitive titles with full-bleed 3:4 official posters, 16:9 banners, and multi-platform filtering (`All (21)`, `PC`, `Console`, `Mobile`).
- **1v1 Duels & Party Matchmaking:** Open challenge queues, custom duel creation (BO1 / BO3 / BO5, Free Practice PTS vs Real Cash), room code sharing, coin toss, inline gamertags.
- **Automated Matchroom & Smart Escrow:** One-time machine registration, automatic alert setup after sign-in, and auto-escrow lock upon tapping **Ready**.
- **Tournaments & Ranked Ladders:** Multi-tier cups, live single-elimination brackets, automated 70/30 prize distribution, global & per-game Elo leaderboards.
- **Proof of Victory Settlement Cards:** Blurred game poster background, official game & Playverzus logos, player profiles & scores, single relative payout (won **or** lost, never both), tournament progression/elimination badges, and external share/copy dock outside the card.
- **Full Economy & Operations:** Cashier, 1,000 Free Practice Coin daily faucet, transaction ledger, player profiles, support desk, community polls, and Staff Operations Admin Console.

### Major v2.0 Upgrades (Solving v1.0 Browser Limitations)
1. **Native Installed-Game Detection & Zero-Confusion Capture (All Devices):**
   - **Android (Direct APK):** Native Kotlin `PackageManager` auto-detects installed mobile games (*EA FC Mobile, PUBG Mobile, MLBB, eFootball Mobile, 8 Ball Pool, Subway Surfers*) and pins them under **"Ready on This Device"**. Uses a native Android Foreground Service (`MediaProjection`) + on-device **Google ML Kit OCR** so verification never gets killed by Chrome tab suspension and runs smoothly on budget Android phones.
   - **iOS:** Native Swift **ReplayKit Broadcast Extension** + Apple Vision OCR + installed game URL-scheme detection.
   - **Windows & macOS Desktop:** Native install scanner (Steam, EA App, Epic, Riot) + **Windows Graphics Capture (WGC) / macOS ScreenCaptureKit** directly locking onto the running game window by process name (**zero screen-share pickers**) + automatic USB/HDMI capture card detection.
   - **Consoles (PS5 / Xbox / Switch):** One-time linked Twitch/YouTube stream auto-sync + HDMI capture card auto-lock.
   - **Invisible "Secret Sauce" UX:** Zero raw CV/OCR `%` debug telemetry shown to players. Only frosted iOS-style event banners for major milestones (**Kickoff**, **Goal / Score**, **Halftime**, **Full Time**).
2. **Dual Payment Gateway with Admin Toggle Switch:**
   - **Kopo Kopo (M-PESA / KES):** Instant STK Push deposits + 100% automated B2C PAY withdrawals (survival-phase local frictionless cash).
   - **Crossmint (Global Card / USDC):** Worldwide fiat-to-USDC onramp & settlements.
   - **Admin Console Switch:** Single toggle in Staff Treasury Console switches active checkout rails cleanly without touching ledger history.
3. **True 60–120fps Apple HIG Craftsmanship:**
   - Native Impeller rendering, spring physics, tactile haptics, frosted glass vibrancy, shimmer loaders, and smooth parallax motion across every platform.
4. **Flutter Web Edition + Direct APK & Native App Downloads (`kIsWeb`):**
   - Flutter compiles cleanly to **Web** (`flutter build web`) using the exact same Dart codebase, iOS HIG design system, and responsive 4-tier layout.
   - **Web-Only Download Hub (`/download`) & Smart OS Banner:** Visible exclusively on Web (`kIsWeb`), automatically detecting the visitor's OS:
     - **Android Web Visitors:** Prominent HIG frosted card & direct 1-tap **Download Android APK** (`playverzus-v2-android.apk`) with a clean 3-step install guide (unlocks auto-detected installed games + background live tracking).
     - **Windows / macOS Web Visitors:** Direct installer links for Desktop Companion mode (unlocks auto-scanned Steam/EA/Epic games + zero screen-share prompts).
     - **iOS Visitors:** TestFlight / App Store download link + Safari Add-to-Home-Screen guidance.
   - **Static Hosting Ready:** Built APKs can be dropped directly into `web/downloads/` (or pointed to a CDN/GitHub Release URL via config) so clicking Download starts immediately. Native installed apps (`!kIsWeb`) automatically hide download banners.

---

## 2. Strict Logo-First Brand Policy (No Typed Brand Names)

Every surface displaying Playverzus, payment partners, or official games **must render official image/SVG logo assets**—never plain typed text strings like `"Playverzus.xyz"` or `"Crossmint"`:

| Asset Slot | Source Asset to Bundle in `assets/branding/` | Usage |
| :--- | :--- | :--- |
| **Playverzus Full Logo** | `apps/web/public/images/logo-transparent.png` & `logo-full.png` | Desktop Sidebar header, Splash, Auth screens, Landing header, Proof of Victory footer |
| **Playverzus Emblem Mark** | `apps/web/public/images/logo-mark-transparent.png` | Compact Mobile Nav Bar, Collapsed Tablet Rail, App Launcher Icon (`apple-icon-v4.png`) |
| **Crossmint Logo** | `apps/web/public/crossmint-logo-512.png` & `crossmint-icon-256.png` | Trust Bar, Escrow Lock badge, Cashier USDC rail |
| **Kopo Kopo / M-PESA Logos** | Official transparent PNG/SVG badges in `assets/branding/` | Cashier M-PESA STK Push & Auto-Payout cards |
| **Official Game Logos & Art** | All 21 `*_poster.jpg`, `*_banner.jpg`, and transparent logos (e.g., `fcm_logo_hd_transparent.png`, `clean_fcm_logo_white.png`) | Game Switcher, Arena Cards, Matchroom Header, Proof of Victory Cards |

We will enforce this via a single centralized `BrandLogo` widget (`BrandLogo.full()`, `BrandLogo.mark()`, `BrandLogo.crossmint()`, `BrandLogo.kopokopo()`, `BrandLogo.game(gameId)`).

---

## 3. Apple iOS Human Interface Guidelines (HIG) Universal Design System

All platforms (iOS, Android, Windows, macOS, Web) strictly follow Apple HIG conventions fused with Playverzus' dark obsidian & copper esports identity:

### 3.1 Color & Vibrancy Tokens (Dark-First HIG Elevation)
- **System Base Canvas:** `#080A10` (deep obsidian)
- **Secondary Grouped Surface:** `#121622` (HIG grouped cards & list rows)
- **Tertiary Elevated Surface:** `#1C2130` (active controls, segmented pills)
- **Frosted Glass Material:** `BackdropFilter(sigmaX: 22, sigmaY: 22)` over `#0C101B` at `82%` opacity + `0.5pt` hairline specular border `rgba(255,255,255,0.12)`
- **Primary Tint (Esports Copper):** `#F97316` (hover/pressed `#EA580C`)
- **Semantic System Colors:** iOS-calibrated Emerald `#30D158` (Win / Cash / Verified), Crimson `#FF453A` (Loss / Eliminated / Destructive), Indigo `#BF5AF2` (Demo PTS / Pro Accent)
- **Zero-Emoji Rule:** Strictly `CupertinoIcons` / `LucideIcons` and official logos only.

### 3.2 Typography & Tabular Numerals
- **Font Hierarchy (Dynamic Type Scaling):**
  - `Large Title`: `34pt` Bold (`-0.4` tracking) — collapsing scroll headers
  - `Title 1 / 2 / 3`: `28pt` / `22pt` / `20pt` Semibold–Bold
  - `Headline`: `17pt` Semibold
  - `Body`: `17pt` Regular (desktop scaled cleanly to `15pt`)
  - `Subheadline`: `15pt` Medium
  - `Footnote / Caption`: `13pt` / `11pt` Medium
- **Tabular Figures (`FontFeature.tabularFigures()`):** Mandatory on all match scores (`2 - 1`), balances (`+KES 2,500` / `+$47.50`), Elo (`1,420`), and countdown timers so digits never jitter.

### 3.3 Safe Areas, Hit Targets & Uniform Geometry
- **Safe Areas:** Strict `SafeArea` + `MediaQuery.viewPadding` handling for iPhone Dynamic Island, notch, home indicator bar, Android gesture nav, and desktop window title bars.
- **Minimum Touch Target:** Every interactive control is at least `44 x 44pt`.
- **Uniform Button Heights:**
  - `Large CTA`: `50pt` height, `14pt` continuous superellipse radius (`ContinuousRectangleBorder`), optional frosted shimmer sweep.
  - `Standard`: `44pt` height, `12pt` continuous radius.
  - `Compact Pill`: `34pt` height, full capsule (`999pt`) inside a `44pt` hit area.
- **Form Controls & Pickers:** Uniform `44pt` text fields, `CupertinoSlidingSegmentedControl` for filters (`All / Free / Cash`, `BO1 / BO3 / BO5`, `Real / Demo`), native draggable bottom sheets with `36 x 5pt` grabber pill, `BouncingScrollPhysics`, and `HapticFeedback` on every primary tap.

---

## 4. Adaptive & Responsive Layout Architecture (4 Breakpoints)

Every screen is built on a shared `AdaptiveScaffold` and `ResponsiveBreakpoints` engine:

| Breakpoint | Devices | Navigation Pattern | Grid & Modal Layout |
| :--- | :--- | :--- | :--- |
| **Compact** (`< 600dp`) | iPhone, Android Phones | Translucent frosted **Cupertino Bottom Tab Bar** (5 tabs: *Home, Duels, Play, Cups, Wallet*) + Top Bar with `BrandLogo.mark()`, Active Game Pill & Avatar. | 1-column lists, 2-column 3:4 game posters, draggable **iOS Bottom Sheets** (`showCupertinoModalPopup` / modal sheet) for Game Switcher & Machine Setup. |
| **Medium** (`600 – 1023dp`) | iPad Portrait, Foldables | Collapsed frosted **Navigation Rail (`80dp`)** with `BrandLogo.mark()` + Active Game Pill in Top Bar. | 2-column Challenge/Tournament grids, 3-column game posters, centered frosted dialogs (`maxWidth: 560dp`). |
| **Expanded** (`1024 – 1439dp`) | iPad Landscape, Laptops | Persistent **`260dp` Apple HIG Sidebar** (`NavigationSplitView`) with `BrandLogo.full()`, Active Arena Card, 6 Featured Arenas + expandable 21-game list. | 3-column grids, split-pane **Matchroom** (competitor roster left, live 4-step readiness & coin toss right). |
| **Ultra-Wide** (`>= 1440dp`) | Desktop & Ultrawide Monitors | Persistent `260dp` Sidebar + **`1360dp` centered main stage** + optional **`300dp` right inspector** (Party Comms, Arena Quests, Live Feed). | 4-column poster grids, wide Tournament Bracket canvas with pinch/pan zoom. |

---

## 5. Dart/Flutter Project Structure

```text
Playverzus.xyz version 2,0/
├── pubspec.yaml                        # Package: playverzus_v2 (Flutter 3.38.5 / Dart 3.10.4)
├── assets/
│   ├── branding/                       # Playverzus full/mark logos, Crossmint, Kopo Kopo, M-PESA
│   └── games/                          # All 21 official 3:4 posters, 16:9 banners & transparent logos
├── lib/
│   ├── main.dart                       # Bootstrap, Supabase init, Riverpod ProviderScope
│   ├── app.dart                        # MaterialApp.router + Cupertino scroll/theme overrides
│   ├── core/
│   │   ├── config/                     # Env & API base URLs (prod Render + local dev)
│   │   ├── network/                    # Dio HTTP client (JWT auth interceptor) + Socket.IO client
│   │   ├── router/                     # GoRouter declarative routes + AuthGuard redirects
│   │   ├── catalog/                    # Complete 21-game canonical catalog + platform metadata
│   │   └── storage/                    # Machine registration store, active game, gamertags, secure prefs
│   ├── design_system/
│   │   ├── tokens/                     # HIG colors, typography, spacing, radii, durations
│   │   ├── theme/                      # PlayverzusTheme (HIG Dark + Cupertino theme data)
│   │   ├── layout/                     # ResponsiveBreakpoints, AdaptiveScaffold, SafeContainer
│   │   └── widgets/                    # BrandLogo, GlassCard, HigButton, HigTextField,
│   │                                   # HigSegmentedControl, FrostedToastOverlay, ShimmerSkeleton,
│   │                                   # ActiveGameSwitcherPill, GameSelectionSheet, ProofOfVictoryCard
│   ├── platform_channels/              # Native MethodChannel / EventChannel bridges
│   │   ├── installed_games_service.dart# Android PackageManager / Desktop Steam-EA-Epic / iOS schemes
│   │   ├── native_capture_service.dart # Android MediaProjection+MLKit / WGC / ReplayKit / CaptureCard
│   │   └── alert_service.dart          # Native local notifications + haptics + audio cues
│   └── features/
│       ├── onboarding_auth/            # Landing (parallax), Login, Signup, 1-time Machine & Alerts setup
│       ├── dashboard/                  # Play-First Arcade Hero, Quick Stakes, Quests, Gamer Handles (21 games)
│       ├── games/                      # 21-Game Catalog, Multi-platform filters, "On This Device" badges
│       ├── challenges/                 # Open Duels Queue, GameContextBar, Tier/Region filters
│       ├── matchroom/                  # Create Duel, Live Matchroom, Exit/Switch breadcrumbs,
│       │                               # 4-Step Auto-Escrow Stepper, Coin Toss, Proof of Victory Card
│       ├── tournaments/                # Multi-tier Cups, Interactive Single-Elimination Brackets
│       ├── leaderboards/               # Global & Per-Game Elo Standings, Personal Rank Card
│       ├── cashier/                    # Dual Gateway (Kopo Kopo M-PESA <-> Crossmint USDC), Faucet, Ledger
│       ├── profile/                    # Player Dossier, Match History, Linked Handles, Share Link
│       ├── community_support/          # Feature Polls & Support Ticket Desk
│       ├── downloads/                  # Web-only (/download) Direct APK & Desktop App Download Hub
│       └── admin/                      # Staff Operations Console + Kopo Kopo/Crossmint Gateway Switch
├── web/
│   └── downloads/                      # Hosted release APK & desktop installers for Flutter Web
├── android/                            # Kotlin plugins: InstalledGamesPlugin + MediaProjectionForegroundService
├── ios/                                # Swift plugins: ReplayKit Broadcast Extension + URL Scheme probe
├── windows/                            # C++/Win32 plugins: Steam/EA/Epic scanner + Windows Graphics Capture
└── macos/                              # Swift plugins: ScreenCaptureKit + App bundle scanner
```

---

## 6. Phased Implementation Roadmap

### Phase 1 — Project Scaffold, Assets & Apple HIG Design System
1. Initialize Flutter project inside `Playverzus.xyz version 2,0` (`android`, `ios`, `windows`, `macos`, `web`).
2. Copy & optimize all official logos (`logo-transparent.png`, `logo-mark-transparent.png`, `crossmint-logo-512.png`) and all 21 official game posters/banners into `assets/`.
3. Build the complete `design_system/` kit:
   - `BrandLogo` component (enforcing zero typed brand names).
   - HIG colors, typography (tabular numerals), frosted glass containers, `44pt/50pt` uniform buttons with shimmer & haptics, segmented controls, HIG inputs, frosted notification toast overlay, and shimmer skeletons.
   - `AdaptiveScaffold` handling all 4 breakpoints (`Compact`, `Medium`, `Expanded`, `Ultra-Wide`).

### Phase 2 — Core Engine, Auth, 21-Game Catalog & Universal Game Switcher
1. Wire `supabase_flutter`, `dio` API client, `socket_io_client`, and Riverpod state providers.
2. Port all **21 official games** (`catalog/official_games.dart`) with multi-platform filtering and `"Ready on This Device"` persistence.
3. Build the universal `ActiveGameSwitcherPill` + `GameSelectionSheet` (3:4 vertical posters, instant search, platform badges) mounted globally across Mobile Top Bar, Tablet Rail, Desktop Sidebar, Challenges, and Matchroom.
4. Build Landing (with parallax & official logos), Login, Signup, and One-Time Machine & Alert Registration flow.

### Phase 3 — Core Gameplay Loop (Dashboard, Challenges, Create Duel & Live Matchroom)
1. **Dashboard:** Play-First Arcade Hero, dynamic Quick Arenas bar, Stake selector pills, Career/Ledger/Handles (all 21 games) tabs, Arena Quests, and PartyBar.
2. **Challenges & Create Match:** Open duels board with `GameContextBar`, filters (`Active Game Only / All Games`, `All / Free / Cash`, Region), and BO1/BO3/BO5 match creator.
3. **Live Matchroom:**
   - Top `← Exit Match to Arenas` breadcrumb & `⇄ Switch Game` buttons.
   - 4-step Readiness Stepper with **automatic escrow lock on Ready** and Coin Toss.
   - Invisible background capture status pill + frosted event toast notifications (**Kickoff**, **Goal**, **Halftime**, **Full Time**).
   - **Proof of Victory Settlement Card** (blurred game poster, official logos, player profiles + scores, relative single payout, tournament progression badges, external share dock).

### Phase 4 — Tournaments, Leaderboards, Cashier (Dual Gateway) & Admin Console
1. **Tournaments:** Tier filter pills, automated prize pool cards, interactive zoomable Single-Elimination Bracket viewer.
2. **Leaderboards:** Per-game Elo ladder + Personal Rank Card.
3. **Cashier & Dual Gateway:** Practice Faucet, Ledger History, **Kopo Kopo (M-PESA STK Push + Automated PAY Withdrawals)** AND **Crossmint (Global Card / USDC)** controlled by live gateway setting.
4. **Profile, Support, Polls & Admin Console:** Career dossier, support tickets, feature polls, and Staff Operations Console with the **Kopo Kopo ↔ Crossmint Gateway Switch**.

### Phase 5 — Native All-Device Plugins (Game Detection & Seamless Capture)
1. **Android (Kotlin):** `PackageManager` installed-game scanner (with `<queries>` in `AndroidManifest.xml`) + `MediaProjection` Foreground Service + on-device Google ML Kit OCR + battery optimization helper.
2. **Windows / macOS:** Installed game scanner (Steam/EA/Epic/Riot) + native WGC / ScreenCaptureKit game-window auto-lock + USB/HDMI capture card detector.
3. **iOS & Console:** ReplayKit broadcast picker integration + one-time Twitch/YouTube console stream auto-sync.

### Phase 6 — Cross-Platform Verification & Release Artifacts
1. Run `flutter analyze`, unit/widget tests across all 4 responsive breakpoints (`390x844` iPhone, `768x1024` iPad, `1280x800` Laptop, `1920x1080` Desktop).
2. Verify live builds: Android `.apk` (`flutter build apk --release`), Windows desktop (`flutter build windows`), and Web (`flutter build web`).
3. Interactive QA walkthrough confirming every button, logo, safe area, transition, and responsiveness rule.

---

## 7. Confirmation Before Implementation

Before I generate the Flutter project and start Phase 1, please confirm:
1. **Location:** Keep `Playverzus.xyz version 2,0` inside `c:\Users\HomePC\Downloads\Playerone\Playverzus.xyz version 2,0`? (Already created with this plan.)
2. **Backend:** Connect v2.0 directly to your existing Playverzus API (`https://playverzus-api.onrender.com/api` / local `localhost:4000/api`) and Supabase project?
3. **Payment Default:** Start the Cashier with **Crossmint** active by default and the **Kopo Kopo** rail + Admin Switch built and ready to flip as soon as you supply the Kopo Kopo API keys from LaserTickets?
