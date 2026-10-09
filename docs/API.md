# PlayVerzus.xyz REST API Reference (API.md)

Base URL (Local): `http://localhost:3001`  
Base URL (Production): `https://verzusxyz-api.onrender.com`  
Authentication: Bearer Token (`Authorization: Bearer <supabase_jwt>`)

---

## 🟢 1. System Health

### `GET /health`
Returns system status, database connection, and Redis liveness.

**Response `200 OK`**:
```json
{
  "status": "ok",
  "timestamp": "2026-09-22T01:00:00.000Z",
  "database": "connected",
  "redis": "connected",
  "walletMode": "demo"
}
```

---

## 👤 2. Profiles & Social

### `GET /profiles/me`
Retrieves authenticated player profile, rating, and reputation.

### `PATCH /profiles/me`
Update profile avatar, bio, or stream URLs.
```json
{
  "avatarUrl": "https://example.com/avatar.png",
  "bio": "Competitive trackmania speedrunner"
}
```

### `GET /social/friends`
Returns player's accepted friends and pending friend requests.

### `POST /social/friends/request`
Send a friend request.
```json
{
  "targetUserId": "c4b8e21a-7b3f-4e5c-9d6e-8a1f2b3c4d5e"
}
```

---

## 🪙 3. Wallet & Ledger

### `GET /wallet/balance`
Fetch current user balance and locked escrow holds.

**Response `200 OK`**:
```json
{
  "balance": 1450,
  "currency": "POINTS",
  "escrowLocked": 100
}
```

### `POST /wallet/topup`
Refill demo points from faucet (+500 PTS). Rate limited to 1 per 15 minutes.

### `GET /wallet/ledger`
Query double-entry transaction history.

**Response `200 OK`**:
```json
[
  {
    "id": "e5f6a7b8-...",
    "amount": 190,
    "entry_type": "CREDIT",
    "description": "Match winnings for match #a1b2c3d4",
    "created_at": "2026-09-22T00:45:00Z"
  }
]
```

---

## ⚔️ 4. Matches & Matchmaking

### `POST /matches/create`
Create a 1v1 match challenge or room.
```json
{
  "gameProfileId": "11111111-1111-1111-1111-111111111111",
  "wagerAmount": 100,
  "isPrivate": false
}
```

### `POST /matches/room/:code/join`
Join a match by 6-character room code.

### `POST /matches/:id/ready`
Signal readiness to start match countdown.

### `POST /matches/:id/score`
Submit verified client OCR score.
```json
{
  "score": 45290,
  "rawText": "SCORE: 45290",
  "confidence": 0.96,
  "imageHash": "a9b8c7d6e5f4..."
}
```

---

## 🏆 5. Tournaments

### `GET /tournaments`
List active and upcoming tournaments. Query parameters: `?gameType=HIGH_SCORE&status=REGISTRATION_OPEN`.

### `POST /tournaments/:id/register`
Join a tournament. Automatically deducts entry fee from wallet.

### `GET /tournaments/:id/bracket`
Retrieve tournament bracket tree with all rounds and match pairings.

---

## 🎯 6. Game Profiles

### `GET /game-profiles`
Returns list of verified game templates and coordinate ROIs.

### `POST /game-profiles`
Create a user-submitted game profile with calibration coordinates. Requires approval if submitted by standard players.

---

## 👁️ 7. OCR & Review Queue

### `POST /ocr/read`
Server-side fallback OCR processing using Optiic / Tesseract.
```json
{
  "imageBase64": "data:image/png;base64,iVBORw0KGgo...",
  "roi": { "x": 0.7, "y": 0.1, "width": 0.2, "height": 0.08 }
}
```

### `GET /review/queue` (Requires `REVIEWER` or `ADMIN` role)
Fetches matches flagged for low OCR confidence ($<0.85$) or score disputes.

### `POST /review/:disputeId/resolve`
Submit reviewer verdict resolving match outcome.

---

## 📊 8. Leaderboards & Ratings

### `GET /leaderboard?gameType=HIGH_SCORE&limit=50`
Global leaderboard ranked by Elo rating.

### `GET /ratings/user/:userId`
Fetch a player's Elo rating history across all 8 universal game types.
