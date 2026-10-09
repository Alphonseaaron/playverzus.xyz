# Mobile Application Guide (MOBILE.md)

The PlayVerzus Mobile App (`apps/mobile`) is built on **React Native** and **Expo SDK 51** with **Expo Router v3**, providing cross-platform mobile access for iOS and Android players.

---

## 📱 Mobile Verification Architecture

Mobile devices handle verification in two modes:

### 1. In-App Camera Scoreboard Capture (`/match/capture`)
- Ideal for physical games (darts, chess, table tennis) or console players who do not stream.
- The player photographs the TV screen or physical scoreboard.
- The app pre-processes the captured image (grayscale, thresholding, crop ROI) and passes it to the server OCR endpoint (`/ocr/read`) or computes the perceptual hash.

### 2. Native Screen Capture (Android vs iOS Capabilities)
- **Android**: Supports MediaProjection API for in-game floating overlays or scheduled frame grabs.
- **iOS**: Apple sandboxing strictly restricts background screen recording while external apps (e.g., games) are active. PlayVerzus uses **ReplayKit** broadcast extension or manual game-over screenshot upload to satisfy iOS security requirements without jailbreak.

---

## 🛠️ Local Development & Running

```bash
# Navigate to mobile project
cd apps/mobile

# Start Expo development server
pnpm dev

# Run on connected Android device / emulator
pnpm android

# Run on iOS simulator (macOS only)
pnpm ios
```

---

## 📦 Building Standalone APKs (Free Tier)

Using Expo Application Services (EAS) free tier:

1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to Expo account:
   ```bash
   eas login
   ```
3. Configure build profile in `eas.json`:
   ```json
   {
     "cli": {
       "version": ">= 9.0.0"
     },
     "build": {
       "preview": {
         "distribution": "internal",
         "android": {
           "buildType": "apk"
         }
       },
       "production": {}
     }
   }
   ```
4. Trigger the build:
   ```bash
   eas build --platform android --profile preview
   ```
5. Download the standalone `.apk` directly from the Expo build dashboard and sideload it onto any Android smartphone.
