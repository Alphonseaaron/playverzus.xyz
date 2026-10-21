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

// Live production: No mock tournaments. Real tournaments are queried from Supabase/API.
export const SEEDED_TOURNAMENTS: SeededTournament[] = [];
