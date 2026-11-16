# PLAYERONE Design System & UI Consistency Guidelines
*Version 2.0 — AAA Competitive Esports & Web3 Settlement Standard*

This document codifies the mandatory visual identity, layout safe areas, typography scales, interactive component dimensions, and settlement card standards across PLAYERONE (`@playverzus`). Every engineer and UI designer must strictly adhere to these specifications.

---

## 1. Visual Philosophy & Core Principles

1. **AAA Esports Aesthetic:** Dark, sleek, high-contrast interface inspired by FACEIT, HLTV, and modern institutional finance (Crossmint, Stripe).
2. **Zero-Emoji Policy:** Unicode emojis (e.g. 🎮, 🏆, 🔥, 💀) are strictly prohibited in application UI, game cards, match settlement summaries, brag snippets, and notification toasts. All iconography must use official transparent SVG game logos or standardized `lucide-react` icons.
3. **Frosted Glass Elevation:** Elevated interactive layers use deep obsidian surfaces with heavy backdrop blur (`backdrop-blur-2xl`), subtle specular light borders (`border-white/10` or `ring-1 ring-white/5`), and ambient glow drop shadows.
4. **Instant Clarity & Relative Perspective:** Gamers must understand the match state, their stakes, and their earnings within 250 milliseconds. Settlement cards must always be rendered from the active player's individual perspective (displaying only their earnings or losses, never a confusing double-sided accounting ledger).

---

## 2. Color Tokens & Elevation Surfaces

| Level | Token / Class | Hex / Alpha | Purpose |
| :--- | :--- | :--- | :--- |
| **Canvas** | `bg-background` | `#080A10` | The deep base canvas of the application. |
| **Surface 1** | `bg-card` / `bg-[#0e1320]` | `#0E1320` | Base content cards, arena list rows, setting panels. |
| **Surface 2 (Glass)** | `bg-[#0c0f18]/90 backdrop-blur-2xl` | `#0C0F18` (90%) | Match rooms, settlement proof cards, floating control panels. |
| **Surface 3 (Floating)** | `bg-[#131722]/95 backdrop-blur-2xl` | `#131722` (95%) | Modals, notification toast stacks, dropdown popovers. |
| **Primary Brand** | `bg-primary` / `text-primary` | `#F97316` / `#FB923C` | Vibrant esports copper / orange energy for key action triggers. |
| **Success / Payout** | `text-emerald-400` / `bg-emerald-500` | `#34D399` | Winning balances, goal detected badges, instant payout confirmation. |
| **Destructive / Loss**| `text-red-400` / `bg-red-500` | `#F87171` | Loser amount lost chips, forfeit warnings, eliminated badges. |
| **Neural / CV** | `text-purple-400` / `border-purple-500/40` | `#C084FC` | Visual Verification Engine™ indicator badges and live state sweeps. |
| **Border Normal** | `border-border` | `hsl(var(--border))` | Subtle separating hairline rule. |
| **Border Highlight**| `border-white/10` | `rgba(255,255,255,0.10)` | Specular edge on frosted glass surfaces. |

---

## 3. Typography Hierarchy & Text Styles

### 3.1 Font Families
- **Display & Headings:** `font-sans` (`Inter`, `system-ui`) with `font-black uppercase tracking-tight`. Gives the punchy, high-energy tournament broadcast feel.
- **Numbers, Scores, Currencies & Timestamps:** `font-mono` (`JetBrains Mono`, `monospace`). Monospace alignment is strictly mandatory for match scores (`[ 2 - 1 ]`), Elo MMR (`1,420 ELO`), currency payouts (`+$47.50 USDC`), and transaction hashes.
- **Body & Subtitles:** `font-sans` with `text-muted-foreground` and `font-medium` for optimal readability in low-light gaming environments.

### 3.2 Standard Scale
| Role | Classes | Usage Example |
| :--- | :--- | :--- |
| **Hero Title** | `text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight` | Main landing headline |
| **Section Title** | `text-2xl sm:text-3xl font-black uppercase tracking-tight` | "Select Your Arena", "Proof of Victory" |
| **Card Header** | `text-base sm:text-lg font-bold uppercase tracking-tight` | Tournament title, Game profile card |
| **Monospace Giant**| `text-3xl sm:text-5xl font-mono font-black tracking-tight` | Match outcome (`+$47.50` or `-$25.00`) |
| **Standard Body** | `text-xs sm:text-sm font-normal text-muted-foreground` | Rules, FAQs, challenge descriptions |
| **Metadata Tag** | `text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider` | "STEP 1 OF 4", "LIVE 1V1 DUEL" |

---

## 4. Button Standards & Uniform Dimensions

To eliminate inconsistent button heights, all buttons across the application must strictly use one of the standard heights defined below:

```
+-----------------------------------------------------------------+
| Small (h-8): h-8 px-3 rounded-lg text-[11px] font-bold uppercase|
+-----------------------------------------------------------------+
| Default (h-10): h-10 px-4 rounded-xl text-xs font-bold uppercase|
+-----------------------------------------------------------------+
| Large (h-12): h-12 px-6 rounded-xl text-sm font-black uppercase |
+-----------------------------------------------------------------+
```

### 4.1 Size Matrix
- **Small (`size="sm"`):** `h-8 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider`.
  *Usage:* Table action rows, compact tab filters, inline dispute triggers, header quick actions.
- **Medium / Default (`size="default"`):** `h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider`.
  *Usage:* Standard interactive controls, modal actions, form submission buttons, dialog confirms.
- **Large (`size="lg"`):** `h-12 px-6 sm:px-8 rounded-xl text-sm font-black uppercase tracking-wider`.
  *Usage:* Hero landing CTAs ("START COMPETING FREE"), match kickoff triggers, share bragging rights button.
- **Icon (`size="icon"`):** `h-9 w-9` or `h-10 w-10 rounded-xl` centered with single 16px/18px icon.

### 4.2 Interactive Micro-Interactions
- **Active State:** All buttons must apply `active:scale-[0.98] transition-all` for tactile physical feedback.
- **Primary Shimmer:** High-priority conversion triggers (Hero CTAs, Match Ready) must include the frosted shimmer light sweep:
  ```tsx
  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
  ```

---

## 5. Form Controls: Textfields, Inputs & Dropdowns

Form elements must match the `h-10` uniform height standard to align seamlessly side-by-side with buttons:

### 5.1 Text Input & Textarea
- **Single-line Inputs (`Input`):**
  - Height: strictly `h-10`.
  - Border radius: `rounded-xl`.
  - Background: `bg-[#0e1320]/80` or `bg-secondary/60`.
  - Border: `border border-border/80`.
  - Focus Ring: `focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary`.
  - Padding: `px-3.5 py-2`.
  - Text style: `text-xs text-foreground placeholder:text-muted-foreground`.
- **Multiline Textareas (`Textarea`):**
  - Border radius: `rounded-xl`.
  - Background: `bg-[#0e1320]/80 border border-border/80`.
  - Focus Ring: `focus-visible:ring-1 focus-visible:ring-primary`.
  - Padding: `p-3.5 text-xs`.

### 5.2 Select & Dropdown Menus
- **Trigger Element:** `h-10 rounded-xl border border-border bg-[#0e1320]/80 px-3 text-xs font-medium flex items-center justify-between`.
- **Menu Container:** `bg-[#131722]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-2xl`.
- **Option Items:** `h-9 px-2.5 rounded-lg text-xs font-semibold text-foreground hover:bg-white/5 flex items-center gap-2 transition-colors cursor-pointer`.

---

## 6. Safe Areas & Layout Grid Rules

1. **Desktop Max Width Container:**
   - Every page view must wrap content inside `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
   - Never allow full-width edge-to-edge stretching of text or cards on ultrawide monitors.
2. **Fixed Navigation Offset:**
   - Top fixed broadcast bar and navbar require `pt-20 sm:pt-24` on the root view container to prevent content occlusion.
3. **Mobile Bottom Safe Padding:**
   - Mobile screens require `pb-safe` (minimum `pb-20` or `pb-24`) to guarantee bottom CTA buttons and dock actions are never covered by phone OS home indicator bars.
4. **Card Padding:**
   - Primary content cards must provide minimum `p-4 sm:p-6` internal breathing room.

---

## 7. Results Settlement Card (Proof of Victory) Standard

The settlement proof card is the core social proof asset shared by players on Twitter, Discord, and Telegram. It must strictly comply with the following 6 requirements:

```
+-----------------------------------------------------------------+
|  [Blurred Game Ambient Poster / Banner Background Layer]        |
|                                                                 |
|  [Official Transparent Logo]        [STATUS CHIP]  [DATE STAMP] |
|                                                                 |
|  [WINNER AVATAR + SCORE]       VS     [LOSER AVATAR + SCORE]    |
|                                                                 |
|             [RELATIVE EARNINGS / LOSS DISPLAY]                  |
|             Winner sees: +$47.50 USDC (Green)                   |
|             Loser sees:  -$25.00 USDC (Red)                     |
|                                                                 |
|             [SINGLE RELATIVE STATUS PILL]                       |
+-----------------------------------------------------------------+
   |
   +---> DOCKED OUTSIDE CARD:
         [Copy Brag Snippet Button]   [Share Match Proof Button]
```

1. **Ambient Blurred Background:** The card background MUST feature the game's official poster or banner with heavy blur and dark gradient overlay (`object-cover filter blur-2xl scale-125 opacity-25 brightness-75`).
2. **Official Game Logo:** Always display the official transparent PNG logo (e.g. `/fcm_logo_hd_transparent.png`); do not render plain text titles on the proof card.
3. **No Raw CV Debug Clutter:** The `% neural cv` debug box is completely removed. Replace with a clean, institutional `SETTLED` badge and smart contract settlement timestamp.
4. **Relative Perspective (Crucial):**
   - **Winner Perspective:** Displays `+25 MMR ↗`, giant green `+$47.50`, and single chip `AMOUNT WON: +$47.50 USDC`.
   - **Loser Perspective:** Displays `MATCH CONCLUDED ↘`, red `-$25.00`, and single chip `AMOUNT LOST: -$25.00 USDC`.
   - **Never show both won and lost amounts on the same card.**
   - **Tournament Non-Finals:** Do not show premature prize amounts; show `PROGRESSING` (Winner) or `ELIMINATED` (Loser).
5. **Action Buttons Outside Card:** The "Copy Brag Snippet" and "Share Match Proof" buttons must live in an external frosted glass action dock below the card container, leaving the certificate itself uncluttered for clean screenshotting.

---

## 8. Live Match Event Notification Toast Standard

1. **Frosted Glass Enclosure:**
   - Toast container: `bg-[#0c0f18]/90 backdrop-blur-2xl border ring-1 ring-white/5 shadow-2xl rounded-2xl p-4`.
2. **Dynamic Contextual Glows:**
   - **Goal Detected:** `bg-emerald-500/10 border-emerald-500/40 text-emerald-400` with pulsing neon indicator.
   - **Kick Off:** `bg-cyan-500/10 border-cyan-500/40 text-cyan-400`.
   - **Halftime:** `bg-amber-500/10 border-amber-500/40 text-amber-400`.
   - **Full Time / Concluded:** `bg-primary/10 border-primary/40 text-primary`.
3. **Score Bug Monospace Chip:**
   - Real-time score is displayed in a dedicated monospace pill: `Live Score: [ 2 - 1 ]`.
4. **No Raw Neural/CV Bounding Boxes:** Never display raw CV coordinates, detector confidence percentages, or ugly red square outlines in player-facing match broadcasts.

---

## 9. Game Poster Asset Aspect Ratios

- **Standard Grid Posters:** 3:4 aspect ratio (`896 x 1200` resolution minimum).
- **Full-bleed Artwork:** Key characters and logos must occupy the full frame with zero letterboxing (black borders at top/bottom are strictly prohibited).
- **Official Roster Assets:**
  - `fc27_poster.jpg`: Full-bleed EA Sports FC 27 keyart (`896x1200`).
  - `eafcm_poster.jpg`: Full-bleed EA Sports FC Mobile keyart (`896x1200`).
  - `fcm_logo_hd_transparent.png`: High-resolution transparent official emblem.

---

*Adherence to these guidelines guarantees consistent AAA quality, high player trust, and institutional legitimacy across all platforms.*
