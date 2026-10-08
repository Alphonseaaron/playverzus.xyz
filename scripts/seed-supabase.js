require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const OFFICIAL_GAMES = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    display_name: 'Counter-Strike 2',
    game_type: 'HEAD_TO_HEAD',
    platform: 'PC',
    roi: { x: 0.4, y: 0.02, w: 0.2, h: 0.08 },
    constraints: { min: 0, max: 30 },
    end_keywords: ['MATCH POINT', 'VICTORY', 'DEFEAT', 'TERRORISTS WIN', 'COUNTER-TERRORISTS WIN'],
    regex_pattern: '(\\d{1,2})\\s*[-:]\\s*(\\d{1,2})',
    approved: true,
    is_official: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    display_name: 'EA Sports FC 25',
    game_type: 'HEAD_TO_HEAD',
    platform: 'CONSOLE',
    roi: { x: 0.05, y: 0.05, w: 0.2, h: 0.08 },
    constraints: { min: 0, max: 20 },
    end_keywords: ['FULL TIME', 'MATCH OVER', 'FINAL SCORE'],
    regex_pattern: '(\\d{1,2})\\s*[-:]\\s*(\\d{1,2})',
    approved: true,
    is_official: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    display_name: 'Rocket League',
    game_type: 'HEAD_TO_HEAD',
    platform: 'PC',
    roi: { x: 0.42, y: 0.02, w: 0.16, h: 0.08 },
    constraints: { min: 0, max: 25 },
    end_keywords: ['WINNER', 'GAME OVER', 'FINAL'],
    regex_pattern: '(\\d{1,2})\\s*[-:]\\s*(\\d{1,2})',
    approved: true,
    is_official: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    display_name: 'Valorant',
    game_type: 'BINARY_RESULT',
    platform: 'PC',
    roi: { x: 0.35, y: 0.2, w: 0.3, h: 0.15 },
    constraints: {},
    end_keywords: ['VICTORY', 'DEFEAT', 'MATCH COMPLETED'],
    regex_pattern: null,
    approved: true,
    is_official: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    display_name: 'Dota 2',
    game_type: 'BINARY_RESULT',
    platform: 'PC',
    roi: { x: 0.3, y: 0.25, w: 0.4, h: 0.2 },
    constraints: {},
    end_keywords: ['VICTORY', 'DEFEAT', 'RADIANT VICTORY', 'DIRE VICTORY'],
    regex_pattern: null,
    approved: true,
    is_official: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    display_name: 'Call of Duty: Warzone',
    game_type: 'HEAD_TO_HEAD',
    platform: 'PC',
    roi: { x: 0.05, y: 0.02, w: 0.25, h: 0.08 },
    constraints: { min: 0, max: 100 },
    end_keywords: ['VICTORY', 'ELIMINATED', 'WARZONE VICTORY'],
    regex_pattern: '(\\d{1,2})\\s*(?:KILLS|K)?',
    approved: true,
    is_official: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000007',
    display_name: 'Fortnite',
    game_type: 'HEAD_TO_HEAD',
    platform: 'PC',
    roi: { x: 0.75, y: 0.02, w: 0.2, h: 0.08 },
    constraints: { min: 0, max: 99 },
    end_keywords: ['VICTORY ROYALE', 'MATCH COMPLETED', 'ELIMINATED'],
    regex_pattern: '(\\d{1,2})\\s*(?:KILLS)?',
    approved: true,
    is_official: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000008',
    display_name: 'Tekken 8',
    game_type: 'BINARY_RESULT',
    platform: 'CONSOLE',
    roi: { x: 0.3, y: 0.3, w: 0.4, h: 0.2 },
    constraints: {},
    end_keywords: ['K.O.', 'PERFECT', 'GREAT', 'WINNER', 'YOU WIN', 'YOU LOSE'],
    regex_pattern: null,
    approved: true,
    is_official: true,
  },
];

const SPONSORS = [
  {
    name: 'PlayVerzus Foundation',
    website_url: 'https://playverzus.xyz',
    funded_amount: 100000,
  },
  {
    name: 'Red Bull Gaming',
    website_url: 'https://redbull.com/esports',
    funded_amount: 50000,
  },
  {
    name: 'SteelSeries Esports',
    website_url: 'https://steelseries.com',
    funded_amount: 25000,
  },
  {
    name: 'Monster Energy Gaming',
    website_url: 'https://monsterenergy.com/gaming',
    funded_amount: 25000,
  },
];

async function seed() {
  console.log('Seeding official esports titles to Supabase...');
  for (const game of OFFICIAL_GAMES) {
    const { data, error } = await supabase.from('game_profiles').upsert(game, { onConflict: 'id' }).select('id, display_name');
    if (error) {
      console.error(`Failed to upsert ${game.display_name}:`, error.message);
    } else {
      console.log(`✓ Seeded ${game.display_name} (${data[0].id})`);
    }
  }

  console.log('\nSeeding sponsors to Supabase...');
  for (const sp of SPONSORS) {
    const { error } = await supabase.from('sponsors').upsert(sp, { onConflict: 'name' });
    if (error) {
      // If no unique constraint on name, just insert if doesn't exist
      const { data: existing } = await supabase.from('sponsors').select('id').eq('name', sp.name).maybeSingle();
      if (!existing) {
        await supabase.from('sponsors').insert(sp);
      }
    }
    console.log(`✓ Seeded sponsor: ${sp.name} (€${sp.funded_amount.toLocaleString()})`);
  }

  console.log('\nSeeding active season to Supabase...');
  const { data: seasons } = await supabase.from('seasons').select('id').eq('is_active', true);
  if (!seasons || seasons.length === 0) {
    await supabase.from('seasons').insert({
      name: 'Season 1 — Inaugural Arena Championship',
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
    });
    console.log('✓ Seeded Season 1');
  } else {
    console.log('✓ Season already active in Supabase');
  }

  console.log('\n🎉 Supabase update complete!');
}

seed().catch(console.error);
