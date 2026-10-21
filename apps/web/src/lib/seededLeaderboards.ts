export interface SeededLeaderboardEntry {
  userId: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  username: string;
  countryCode: string;
}

// Live production: No mock champions. Real leaderboard entries are queried from Supabase/API.
export const SEEDED_CHAMPIONS: SeededLeaderboardEntry[] = [];
