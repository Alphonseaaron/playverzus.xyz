# Console Verification via Stream Ingest (STREAM_INGEST.md)

Consoles (PlayStation 4/5, Xbox Series X/S, Nintendo Switch) do not allow third-party client apps to execute on-device OCR. PlayVerzus solves this natively via **Live Stream Ingest**.

---

## 📺 How It Works

Console players broadcast their gameplay directly to **Twitch** or **YouTube Live** using their console's built-in "Share / Broadcast" button (no capture card required). PlayVerzus ingests the public stream feed, extracts video frames at scheduled intervals, and performs OCR verification.

```
+------------------+         Direct Console Broadcast         +------------------+
| PlayStation 5    | ---------------------------------------> | Twitch / YouTube |
| Xbox Series X    |          (Built-in Share Button)         | Live Stream Feed |
+------------------+                                          +------------------+
                                                                        |
                                                                        | HLS / RTMP Fetch
                                                                        v
+------------------+       Crop ROI & OCR Extraction          +------------------+
| Verified Match   | <--------------------------------------- | PlayVerzus      |
| Score Recorded   |                                          | Stream Ingest    |
+------------------+                                          +------------------+
```

---

## ⚙️ Configuration & Setup

### 1. Player Setup (Console)
1. Link Twitch or YouTube account in PlayStation / Xbox system settings.
2. Enter the PlayVerzus Match Room and paste your public channel URL (e.g., `https://twitch.tv/playerone`).
3. Press **Broadcast** on the console controller.
4. PlayVerzus detects the stream status and begins monitoring.

### 2. Stream Ingest Engine (`StreamIngestService.ts`)
The server uses `yt-dlp` or HLS segment parsers to acquire the lowest-latency live video stream:
```typescript
const streamUrl = await StreamIngestService.getHlsUrl(channelUrl);
const frameGrabber = new FrameGrabber(streamUrl);
const frameBuffer = await frameGrabber.captureFrameAt(Date.now());
```

---

## ⏱️ Latency & Delay Compensation

### Stream Delay Window
Twitch standard streams exhibit a 3 to 6-second latency; YouTube exhibits 4 to 10 seconds. PlayVerzus accommodates this through **asynchronous sliding verification windows**:
- Match timer on PlayVerzus counts elapsed game duration.
- After player signals "Game Over", the stream ingest pipeline continues polling for up to 30 seconds to capture the final post-game scoreboard.
- The highest stable OCR read that persists across 3 consecutive frames ($>80\%$ confidence) is locked as the definitive match score.

---

## 🔒 Stream Tampering Defenses

1. **Live Watermark Validation**: PlayVerzus generates a unique 4-digit code in the match lobby. The player can display this code on-screen or verbally say it if audio verification is enabled.
2. **Channel Ownership Check**: The player's Twitch/YouTube account handle must match the verified social handle linked to their PlayVerzus profile.
3. **No Re-stream Loophole**: Perceptual image hashes are checked against a database of past recorded broadcasts to eliminate replay of prerecorded footage.
