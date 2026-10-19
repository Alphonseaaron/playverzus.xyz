-- ============================================================================
-- PLAYVERZUS.XYZ — Seed Data
-- ============================================================================

-- Official Esports Game Engine Profiles ---------------------------------------
insert into public.game_profiles
  (id, display_name, game_type, platform, roi, constraints, end_keywords, regex_pattern, approved, is_official)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'Counter-Strike 2',
    'HEAD_TO_HEAD',
    'PC',
    '{"x":0.4,"y":0.02,"w":0.2,"h":0.08}'::jsonb,
    '{"min":0,"max":30}'::jsonb,
    array['MATCH POINT','VICTORY','DEFEAT','TERRORISTS WIN','COUNTER-TERRORISTS WIN'],
    '(\d{1,2})\s*[-:]\s*(\d{1,2})',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'EA Sports FC 25',
    'HEAD_TO_HEAD',
    'CONSOLE',
    '{"x":0.05,"y":0.05,"w":0.2,"h":0.08}'::jsonb,
    '{"min":0,"max":20}'::jsonb,
    array['FULL TIME','MATCH OVER','FINAL SCORE'],
    '(\d{1,2})\s*[-:]\s*(\d{1,2})',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Rocket League',
    'HEAD_TO_HEAD',
    'PC',
    '{"x":0.42,"y":0.02,"w":0.16,"h":0.08}'::jsonb,
    '{"min":0,"max":25}'::jsonb,
    array['WINNER','GAME OVER','FINAL'],
    '(\d{1,2})\s*[-:]\s*(\d{1,2})',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'Valorant',
    'BINARY_RESULT',
    'PC',
    '{"x":0.35,"y":0.2,"w":0.3,"h":0.15}'::jsonb,
    '{}'::jsonb,
    array['VICTORY','DEFEAT','MATCH COMPLETED'],
    null,
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'Dota 2',
    'BINARY_RESULT',
    'PC',
    '{"x":0.3,"y":0.25,"w":0.4,"h":0.2}'::jsonb,
    '{}'::jsonb,
    array['VICTORY','DEFEAT','RADIANT VICTORY','DIRE VICTORY'],
    null,
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'Call of Duty: Warzone',
    'HEAD_TO_HEAD',
    'PC',
    '{"x":0.05,"y":0.02,"w":0.25,"h":0.08}'::jsonb,
    '{"min":0,"max":100}'::jsonb,
    array['VICTORY','ELIMINATED','WARZONE VICTORY'],
    '(\d{1,2})\s*(?:KILLS|K)?',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    'Fortnite',
    'HEAD_TO_HEAD',
    'PC',
    '{"x":0.75,"y":0.02,"w":0.2,"h":0.08}'::jsonb,
    '{"min":0,"max":99}'::jsonb,
    array['VICTORY ROYALE','MATCH COMPLETED','ELIMINATED'],
    '(\d{1,2})\s*(?:KILLS)?',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000008',
    'Tekken 8',
    'BINARY_RESULT',
    'CONSOLE',
    '{"x":0.3,"y":0.3,"w":0.4,"h":0.2}'::jsonb,
    '{}'::jsonb,
    array['K.O.','PERFECT','GREAT','WINNER','YOU WIN','YOU LOSE'],
    null,
    true,
    true
  ),
  -- Universal Archetypes
  (
    '11111111-1111-1111-1111-111111111111',
    'High Score (Universal)',
    'HIGH_SCORE',
    'MOBILE',
    '{"x":0.65,"y":0.05,"w":0.3,"h":0.08}'::jsonb,
    '{"min":0,"max":100000000,"maxJumpPerSec":5000}'::jsonb,
    array['Game Over','Try Again','High Score'],
    '([0-9][0-9,\.]*)',
    true,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Time Trial (Universal)',
    'LOW_TIME',
    'MOBILE',
    '{"x":0.35,"y":0.05,"w":0.3,"h":0.08}'::jsonb,
    '{"min":0,"max":86400000,"maxJumpPerSec":0}'::jsonb,
    array['Finish','Complete','Results'],
    '(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?',
    true,
    true
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Win/Loss (Universal)',
    'BINARY_RESULT',
    'MOBILE',
    '{"x":0.25,"y":0.35,"w":0.5,"h":0.2}'::jsonb,
    '{}'::jsonb,
    array['VICTORY','DEFEAT','WIN','LOSE'],
    null,
    true,
    true
  )
on conflict (id) do update set
  display_name = excluded.display_name,
  game_type = excluded.game_type,
  platform = excluded.platform,
  roi = excluded.roi,
  constraints = excluded.constraints,
  end_keywords = excluded.end_keywords,
  regex_pattern = excluded.regex_pattern,
  approved = excluded.approved,
  is_official = excluded.is_official;

-- Active Season ---------------------------------------------------------------
insert into public.seasons (name, starts_at, ends_at, is_active)
values (
  'Season 1 — Inaugural Arena Championship',
  now(),
  now() + interval '90 days',
  true
)
on conflict do nothing;

-- Official Brand Sponsors -----------------------------------------------------
insert into public.sponsors (name, website_url, funded_amount)
values
  ('PlayVerzus Foundation', 'https://playverzus.xyz', 100000),
  ('Red Bull Gaming', 'https://redbull.com/esports', 50000),
  ('SteelSeries Esports', 'https://steelseries.com', 25000),
  ('Monster Energy Gaming', 'https://monsterenergy.com/gaming', 25000)
on conflict do nothing;
