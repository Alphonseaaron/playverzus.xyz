# Universal Game Archetypes Specification (TYPES.md)

PlayVerzus operates on a **type-based**, not game-based, verification architecture. Any game ever made maps to one of **8 universal competition engines**.

---

## 🎮 The 8 Universal Engines

| Type Engine | Primary Metric | Comparator | Typical Games | Score Extraction Method |
| :--- | :--- | :--- | :--- | :--- |
| **`HIGH_SCORE`** | Numeric points | Maximize ($A > B$) | *Subway Surfers, Flappy Bird, Pac-Man, Temple Run* | Single OCR bounding box capturing digits |
| **`LOW_TIME`** | Milliseconds ($ms$) | Minimize ($A < B$) | *Trackmania, Speedruns, Mario Kart Time Trials* | Regex parser for `MM:SS.mmm` or `SS.mmm` |
| **`SURVIVAL`** | Survival duration ($s$) | Maximize ($A > B$) | *Vampire Survivors, Tetris Marathon, Battle Royale* | Stopwatch or in-game elapsed timer parser |
| **`HEAD_TO_HEAD`** | Direct rounds won | Maximize ($A > B$) | *Street Fighter, Tekken, Rocket League 1v1* | Two-digit box comparing rounds/goals |
| **`BINARY_RESULT`** | Binary Flag (1/0) | Exact equality | *Clash Royale, Chess, MTG Arena, Victory/Defeat* | String classification (`VICTORY`, `DEFEAT`, `WIN`, `LOSS`) |
| **`COMPOSITE_STAT`**| Weighted Formula | Weighted Sum | *FPS shooters (Kills, Deaths, Damage, Accuracy)* | Multi-box OCR evaluated via arithmetic expression |
| **`PROGRESSION`** | Milestone reached | Level/Floor/Wave | *Roguelikes, Tower Defense, Archero, Dungeon Floors* | Parsed integer denoting checkpoint/depth |
| **`PHYSICAL`** | Physical event stat | Type-dependent | *Darts, Speedcubing, Table Tennis, Beer Pong* | Mobile phone camera pointed at scoreboard or timer |

---

## 🎯 Region of Interest (ROI) Calibration

Each Game Profile defines normalized coordinate boxes `(x, y, width, height)` where values range from `0.0` to `1.0` relative to the game stream or viewport resolution.

### Coordinate Schema
```json
{
  "name": "score_counter",
  "label": "Score",
  "x": 0.72,
  "y": 0.05,
  "width": 0.22,
  "height": 0.08,
  "expectedType": "NUMBER",
  "regex": "\\d{1,9}"
}
```

### Preprocessing Pipeline
Before OCR runs, the canvas image slice under the ROI undergoes:
1. **Grayscale conversion**: `Y = 0.299R + 0.587G + 0.114B`
2. **Contrast stretching / Binarization**: Otsu dynamic thresholding to isolate digits from busy game backgrounds.
3. **Upscaling**: 2x bilinear interpolation for small font sizes.

---

## 🛡️ Anti-Cheat & Heuristic Validation

Scores submitted to an engine undergo multi-factor validation:
- **Maximum Theoretical Score**: Score cannot exceed `profile.max_theoretical_score`.
- **Velocity Limit ($V_{max}$)**: Maximum points per second $\frac{\Delta S}{\Delta t}$. Jumps exceeding the physical game cap trigger an instant `SUSPICIOUS_VELOCITY` flag.
- **Perceptual Image Hash Match**: Confirms the cropped frame contains the game's actual UI layout rather than an edited static graphic.
- **Confidence Threshold**: Any OCR read with Tesseract confidence $< 0.85$ is automatically held for Human-in-the-Loop (HITL) review.

---

## ➕ Adding a New Game Archetype

To add a 9th engine to the platform:

1. Implement `TypeEngine` in `packages/core/src/types/`:
   ```typescript
   export class CustomEngine implements TypeEngine {
     readonly type = 'CUSTOM_TYPE' as GameType;

     validateScore(score: number, config: EngineConfig): ValidationResult {
       // verification logic
     }

     determineWinner(p1Score: number, p2Score: number): MatchResult {
       // comparator logic
     }
   }
   ```
2. Register the engine in `TypeRegistry`:
   ```typescript
   TypeRegistry.register(new CustomEngine());
   ```
3. Add the enum value to PostgreSQL migration:
   ```sql
   ALTER TYPE game_type_enum ADD VALUE 'CUSTOM_TYPE';
   ```
4. Expose the archetype in the Game Profile creation UI in `apps/web/src/app/games/new/page.tsx`.
