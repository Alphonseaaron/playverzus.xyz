# Legal Analysis & Jurisdictional Framework (LEGAL.md)

This document outlines the legal classification of PlayVerzus as a **skill-based competitive platform** distinct from games of chance or gambling.

---

## ⚖️ The Skill vs. Chance Doctrine

Under international jurisprudence (including common law precedents in the US, UK, and Commonwealth jurisdictions), gambling requires the conjunction of three elements:
1. **Prize** (monetary or valuable consideration awarded to the winner).
2. **Consideration** (entry fee or stake paid to participate).
3. **Chance** (the outcome is determined primarily or predominantly by luck or randomness).

### The Predominance Test
PlayVerzus operates strictly on games governed by the **Predominance Test**:
- The outcome of competitions (e.g. highest score, lowest time, fighting game rounds) is governed predominantly by physical dexterity, reaction speed, strategic decision-making, and game mastery.
- Random number generation (RNG) elements in eligible games must not outweigh player skill over a standard competition duration.
- Games governed predominantly by chance (roulette, slots, dice, bingo, card lotteries) are strictly prohibited from registration in the Game Profile directory.

---

## 🇰🇪 Kenyan Legal & Regulatory Framework

### 1. Betting Control and Licensing Board (BCLB)
- **Governing Law**: Betting, Lotteries and Gaming Act (Cap 131, Laws of Kenya).
- **Statutory Scope**: Regulates betting (wagering on uncertain future events like sports matches) and lotteries/gaming (games of chance).
- **Esports Exemption Rationale**: Genuine contests of skill where participants compete directly against one another for prizes do not meet the statutory definition of gaming under Cap 131, provided no house odds are offered and entry fees fund direct prize pools or platform administration fees.
- **Demo Mode**: Because PlayVerzus operates in `WALLET_MODE=demo` (POINTS have no cash value and cannot be converted to KES), no gaming license is required during initial rollout.

### 2. Kenya Data Protection Act (2019) & GDPR Compliance
- **Principle of Minimization**: Verzus enforces an authoritative **Zero Video Storage Policy**. Match frames and visual feeds submitted for verification are analyzed transiently in volatile device/server memory. Only verified numeric match results and mathematical integrity signatures are permanently persisted.
- **Consent**: Explicit terms of service agree to automated visual telemetry analysis of designated game HUD regions during active match sessions.

### 3. Consumer Protection Act (2012)
- Transparent match rules and deterministic scoring engines ensure clear, unmanipulated outcomes.
- Mandatory audit logs and dispute resolution procedures via Human-in-the-Loop review satisfy fairness standards.

---

## 🌍 Global Compliance Matrix

| Jurisdiction | Skill Gaming Status | Paid Entry Permitted? | Required Safeguards |
| :--- | :--- | :--- | :--- |
| **United States** | Legal in 40+ states | Yes (State-dependent) | Geo-blocking prohibited states (AZ, AR, CT, DE, LA, MT, SC, SD, TN, VT). Must use Predominance Test. |
| **Kenya** | Legal (Contest of Skill) | Yes (Under review) | Demo mode default. Age gating (18+), zero-storage privacy compliance. |
| **United Kingdom**| Legal (Prize Competitions)| Yes | Exempt from Gambling Act 2005 if skill prevents a significant proportion of entrants from winning. |
| **Nigeria** | Legal | Yes | National Lottery Regulatory Commission (NLRC) guidance excludes direct esports skill contests. |
| **European Union**| Member State dependent | Varies | Compliance with GDPR data minimization, age verification, consumer rights directives. |
| **India** | Legal in most states | Varies | Excluded in Assam, Telangana, Odisha, Andhra Pradesh, Tamil Nadu. |

---

## 🛡️ Anti-Cheat & Fair Play Compliance

To maintain legitimacy as a pure skill platform, Verzus implements:
- Rate limit thresholds on score increments and temporal sanity checks.
- Proprietary visual validation preventing pre-recorded video or edited screen insertions.
- Hardware/device fingerprinting and network subnet collision guards to prevent multi-accounting.
- Automated forfeiture of entry fees and permanent banishment for users caught tampering with game visual feeds or match telemetry.
