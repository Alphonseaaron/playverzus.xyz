export interface SeededTournament {
  id: string;
  name: string;
  format: string;
  size: number;
  entry_fee: number;
  prize_pool: number;
  status: string;
  game_profiles?: { display_name: string; id?: string };
  region?: string;
  country_code?: string;
  enrolled_count?: number;
}

export const SEEDED_TOURNAMENTS: SeededTournament[] = [
  {
    id: 'tourn-fc25-championship',
    name: 'FC 25 European Masters Cup',
    format: 'SINGLE_ELIM',
    size: 32,
    entry_fee: 10,
    prize_pool: 288,
    status: 'REGISTRATION',
    game_profiles: { display_name: 'EA Sports FC 25', id: 'eafc' },
    region: 'Europe',
    country_code: 'DE',
    enrolled_count: 24,
  },
  {
    id: 'tourn-cs2-aim-open',
    name: 'CS2 1v1 Aim Champions Invitational',
    format: 'DOUBLE_ELIM',
    size: 16,
    entry_fee: 5,
    prize_pool: 72,
    status: 'ACTIVE',
    game_profiles: { display_name: 'Counter-Strike 2', id: 'cs2' },
    region: 'Europe',
    country_code: 'GB',
    enrolled_count: 16,
  },
  {
    id: 'tourn-rl-arena-clash',
    name: 'Rocket League Aerial Masters',
    format: 'SINGLE_ELIM',
    size: 16,
    entry_fee: 0,
    prize_pool: 50,
    status: 'REGISTRATION',
    game_profiles: { display_name: 'Rocket League', id: 'rl' },
    region: 'North America',
    country_code: 'US',
    enrolled_count: 11,
  },
  {
    id: 'tourn-val-tactical-open',
    name: 'Valorant Clutch Duels Season 1',
    format: 'SINGLE_ELIM',
    size: 32,
    entry_fee: 15,
    prize_pool: 432,
    status: 'REGISTRATION',
    game_profiles: { display_name: 'Valorant', id: 'val' },
    region: 'Europe',
    country_code: 'FR',
    enrolled_count: 29,
  },
  {
    id: 'tourn-cod-gunfight-cup',
    name: 'Call of Duty Gunfight Showdown',
    format: 'SINGLE_ELIM',
    size: 16,
    entry_fee: 20,
    prize_pool: 288,
    status: 'REGISTRATION',
    game_profiles: { display_name: 'Call of Duty: Warzone', id: 'cod' },
    region: 'North America',
    country_code: 'US',
    enrolled_count: 14,
  },
  {
    id: 'tourn-subway-speedrun',
    name: 'Subway Surfers High-Score Sprint',
    format: 'SINGLE_ELIM',
    size: 64,
    entry_fee: 0,
    prize_pool: 100,
    status: 'REGISTRATION',
    game_profiles: { display_name: 'Subway Surfers', id: 'subway' },
    region: 'Worldwide',
    country_code: 'JP',
    enrolled_count: 48,
  },
];
