export interface SeededLeaderboardEntry {
  userId: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  username: string;
  countryCode: string;
}

export const SEEDED_CHAMPIONS: SeededLeaderboardEntry[] = [
  {
    userId: 'user-top-1',
    username: 'ApexSniper',
    rating: 2340,
    gamesPlayed: 142,
    wins: 118,
    losses: 24,
    countryCode: 'DE',
  },
  {
    userId: 'user-top-2',
    username: 'Vortex_FC',
    rating: 2210,
    gamesPlayed: 98,
    wins: 79,
    losses: 19,
    countryCode: 'GB',
  },
  {
    userId: 'user-top-3',
    username: 'ShadowReflex',
    rating: 2150,
    gamesPlayed: 120,
    wins: 92,
    losses: 28,
    countryCode: 'FR',
  },
  {
    userId: 'user-top-4',
    username: 'KaiserStrike',
    rating: 2080,
    gamesPlayed: 85,
    wins: 64,
    losses: 21,
    countryCode: 'ES',
  },
  {
    userId: 'user-top-5',
    username: 'NitroDrift',
    rating: 1990,
    gamesPlayed: 110,
    wins: 80,
    losses: 30,
    countryCode: 'NL',
  },
  {
    userId: 'user-top-6',
    username: 'CyberGhost',
    rating: 1920,
    gamesPlayed: 74,
    wins: 52,
    losses: 22,
    countryCode: 'SE',
  },
  {
    userId: 'user-top-7',
    username: 'BlazeStriker',
    rating: 1870,
    gamesPlayed: 60,
    wins: 43,
    losses: 17,
    countryCode: 'US',
  },
  {
    userId: 'user-top-8',
    username: 'RoninTactics',
    rating: 1810,
    gamesPlayed: 55,
    wins: 38,
    losses: 17,
    countryCode: 'JP',
  },
];
