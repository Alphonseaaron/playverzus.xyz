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
    '{"x":0.465,"y":0.005,"w":0.070,"h":0.080}'::jsonb,
    '{"min":0,"max":30}'::jsonb,
    array['ROUND WON','ROUND LOST','MATCH POINT','VICTORY','DEFEAT','TERRORISTS WIN','COUNTER-TERRORISTS WIN','MATCH COMPLETED','CLINCHED THE MATCH'],
    '(\d{1,2})\s*[-:\s]\s*(\d{1,2})',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'EA Sports FC 27',
    'HEAD_TO_HEAD',
    'CONSOLE',
    '{"x":0.042,"y":0.042,"w":0.177,"h":0.060}'::jsonb,
    '{"min":0,"max":20}'::jsonb,
    array['FULL TIME','FT','MATCH OVER','FINAL SCORE','OPPONENT HAS LEFT','FORFEITED'],
    '(?:[A-Z0-9]{2,4}\s*)?(\d{1,2})\s*[-:]\s*(\d{1,2})',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000019',
    'EA Sports FC Mobile',
    'HEAD_TO_HEAD',
    'MOBILE',
    '{"x":0.177,"y":0.111,"w":0.083,"h":0.054}'::jsonb,
    '{"min":0,"max":20}'::jsonb,
    array['FULL TIME','FT','MATCH OVER','MATCH HIGHLIGHTS','ADD FRIEND','CONTINUE','FINAL SCORE','EXTRA TIME','PENALTY SHOOTOUT','VICTORY','DEFEAT','FORFEIT'],
    '(?:[A-Z0-9]{2,4}\s*)?(\d{1,2})\s*[-:v\s]\s*(\d{1,2})',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Rocket League',
    'HEAD_TO_HEAD',
    'PC',
    '{"x":0.404,"y":0.000,"w":0.192,"h":0.082}'::jsonb,
    '{"min":0,"max":25}'::jsonb,
    array['WINNER','WINNER BY FORFEIT','ORANGE WINS','BLUE WINS','VICTORY','DEFEAT','OVERTIME','MATCH OVER','GAME OVER','FINAL','FORFEIT','CONCEDED','PLAY AGAIN'],
    '(?:(\d{1,2})\s*[-:\s]\s*(\d{1,2}))|(?:WINNER|VICTORY|ORANGE WINS|BLUE WINS)',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'Valorant',
    'HEAD_TO_HEAD',
    'PC',
    '{"x":0.404,"y":0.011,"w":0.193,"h":0.086}'::jsonb,
    '{"min":0,"max":40}'::jsonb,
    array['VICTORY','DEFEAT','WON','ROUND WON','ROUND LOST','CLUTCH','ACE','FLAWLESS','THRIFTY','TEAM ACE','MATCH POINT','OVERTIME','DRAW','MATCH COMPLETED','ENEMY TEAM ELIMINATED'],
    '(?:(\d{1,2})\s*[-:\s]\s*(\d{1,2}))|(?:VICTORY|DEFEAT|ROUND WON|ROUND LOST|WON|CLUTCH|ACE)',
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
    '{"x":0.893,"y":0.028,"w":0.102,"h":0.056}'::jsonb,
    '{"min":0,"max":150}'::jsonb,
    array['WARZONE VICTORY','VICTORY','CHAMPIONS','ELIMINATED','DEFEAT','PLACE','PLACEMENT','KILLS','SQUAD ELIMINATED'],
    '(?:(\d{1,3})\s*KILLS?)|(?:#?(\d{1,2})\s*(?:ST|ND|RD|TH)?\s*(?:PLACE|PLACEMENT)?)|(?:WARZONE VICTORY|VICTORY|ELIMINATED)',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    'Fortnite',
    'HEAD_TO_HEAD',
    'PC',
    '{"x":0.835,"y":0.285,"w":0.153,"h":0.060}'::jsonb,
    '{"min":0,"max":99}'::jsonb,
    array['VICTORY ROYALE','#1 VICTORY ROYALE','PLACED','YOU PLACED','ELIMINATIONS','ELIMINATED','VIEW MATCH STATS','RETURN TO LOBBY','GAME OVER'],
    '(?:(?:#?1\s*)?VICTORY\s*ROYALE!?)|(?:YOU\s*PLACED\s*#?(\d{1,3}))|(?:(\d{1,2})\s*(?:ELIMINATIONS?|KILLS?))',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000008',
    'Tekken 8',
    'BINARY_RESULT',
    'CONSOLE',
    '{"x":0.280,"y":0.280,"w":0.440,"h":0.360}'::jsonb,
    '{}'::jsonb,
    array['K.O.','DOUBLE K.O.','PERFECT','GREAT','YOU WIN','YOU LOSE','WINNER','VICTORY','DEFEAT','TIME UP','DRAW','MATCH RESULTS','REMATCH'],
    '(?:(K\\.O\\.|DOUBLE K\\.O\\.|PERFECT|GREAT|YOU WIN|YOU LOSE|WINNER|VICTORY|DEFEAT))|(?:(\\d)\\s*[-:\\s]\\s*(\\d))',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000014',
    'PUBG Mobile',
    'HEAD_TO_HEAD',
    'MOBILE',
    '{"x":0.015,"y":0.018,"w":0.230,"h":0.085}'::jsonb,
    '{"min":0,"max":50}'::jsonb,
    array['WINNER WINNER CHICKEN DINNER','CHICKEN DINNER','BETTER LUCK NEXT TIME','MATCH OVER','TOTAL ELIMINATIONS','DEFEATED','CONTINUE'],
    '(?:Eliminations|Elimination|Kills|Remaining)?\s*[:\s]*(\d{1,2})',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000015',
    'PUBG: BATTLEGROUNDS',
    'HEAD_TO_HEAD',
    'PC',
    '{"x":0.810,"y":0.020,"w":0.170,"h":0.090}'::jsonb,
    '{"min":0,"max":50}'::jsonb,
    array['WINNER WINNER CHICKEN DINNER','CHICKEN DINNER','BETTER LUCK NEXT TIME','MATCH RESULTS','RANK #','MATCH FINISHED'],
    '(?:ALIVE[\s\S]*?)?(\d{1,2})\s*(?:KILLS?|kills?|💀)?',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000009',
    'Chess.com',
    'HEAD_TO_HEAD',
    'PC',
    '{"x":0.660,"y":0.580,"w":0.330,"h":0.270}'::jsonb,
    '{"min":0,"max":1}'::jsonb,
    array['WON BY CHECKMATE','CHECKMATE','WON BY RESIGNATION','RESIGNATION','RESIGNED','WON ON TIME','TIME OUT','TIMEOUT','GAME OVER','STALEMATE','DRAW AGREED','GAME DRAWN','DRAW','REMATCH','GAME REVIEW','1-0','0-1','1/2-1/2'],
    '(?:won by|won on)?\s*([a-zA-Z]+)|(?:(\d{1,2})\s*[-:]\s*(\d{1,2}))',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000016',
    'Subway Surfers',
    'HIGH_SCORE',
    'MOBILE',
    '{"x":0.820,"y":0.025,"w":0.160,"h":0.065}'::jsonb,
    '{"min":0,"max":100000000,"maxJumpPerSec":5000}'::jsonb,
    array['GAME OVER','SAVE ME','HIGH SCORE','TOP RUN','REVIVE','TAP TO PLAY'],
    '(?:(?:SCORE|High Score|Top Run)[\s\S]*?)?(\d{3,9})',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000010',
    'Apex Legends',
    'HEAD_TO_HEAD',
    'PC',
    '{"x":0.750,"y":0.068,"w":0.120,"h":0.055}'::jsonb,
    '{"min":0,"max":50,"maxJumpPerSec":5}'::jsonb,
    array['CHAMPION','YOU ARE THE CHAMPION','YOU ARE THE APEX CHAMPIONS','#1 APEX CHAMPIONS','VICTORY','SQUAD ELIMINATED','MATCH SUMMARY','SQUAD PLACED'],
    '(?:(?:KILLS|ASSISTS|DAMAGE)[\s\S]*?)?(\d{1,2})',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    'Marvel Rivals',
    'HEAD_TO_HEAD',
    'PC',
    '{"x":0.340,"y":0.010,"w":0.320,"h":0.135}'::jsonb,
    '{"min":0,"max":100}'::jsonb,
    array['VICTORY','DEFEAT','FINAL SCORE','ROUND COMPLETE','OVERTIME','MVP','SVP','ACE','KO','MATCH COMPLETED','HEROES WIN'],
    '(?:FINAL\s*SCORE\s*(\d{1,2})\s*[:\-]\s*(\d{1,2}))|(?:(\d{1,2})\s*[:\-]\s*(\d{1,2}))|(?:VICTORY|DEFEAT|MVP|ACE)',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000017',
    'eFootball Mobile',
    'HEAD_TO_HEAD',
    'MOBILE',
    '{"x":0.092,"y":0.105,"w":0.058,"h":0.055}'::jsonb,
    '{"min":0,"max":20}'::jsonb,
    array['FULL TIME','FT','MATCH ENDED','FINAL SCORE','HALF TIME','EXTRA TIME','PENALTY SHOOTOUT','VICTORY','DEFEAT','OPPONENT HAS FORFEITED','FORFEIT'],
    '(?:[A-Z0-9]{2,4}\s*)?(\d{1,2})\s*[-:\s]\s*(\d{1,2})',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000018',
    'eFootball (Console & PC)',
    'HEAD_TO_HEAD',
    'CONSOLE',
    '{"x":0.112,"y":0.062,"w":0.056,"h":0.052}'::jsonb,
    '{"min":0,"max":20}'::jsonb,
    array['FULL TIME','FT','MATCH OVER','FINAL SCORE','EXTRA TIME','PENALTY SHOOTOUT','VICTORY','DEFEAT','OPPONENT HAS CONCEDED','FORFEITED'],
    '(?:[A-Z0-9]{2,4}\s*)?(\d{1,2})\s*[-:\s]\s*(\d{1,2})',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000020',
    '8 Ball Pool',
    'HEAD_TO_HEAD',
    'MOBILE',
    '{"x":0.427,"y":0.009,"w":0.146,"h":0.060}'::jsonb,
    '{"min":0,"max":20}'::jsonb,
    array['YOU WIN','WINNER','YOU LOSE','VICTORY','DEFEAT','MATCH OVER','GAME OVER','OPPONENT LEFT','TIME OUT','SCRATCH','8 BALL POTTED','CONCEDED'],
    '(?:[A-Z0-9]{2,4}\\s*)?(\\d{1,2})\\s*[-:\\s]\\s*(\\d{1,2})|(?:WINNER|YOU WIN|VICTORY)',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000021',
    'Mortal Kombat 11',
    'BINARY_RESULT',
    'CONSOLE',
    '{"x":0.095,"y":0.135,"w":0.810,"h":0.295}'::jsonb,
    '{}'::jsonb,
    array['WINS','FLAWLESS VICTORY','FATALITY','BRUTALITY','FRIENDSHIP','MERCY','QUITALITY','FINISH HIM','FINISH HER','VICTORY','DEFEAT','KONTINUE','REMATCH','NEXT OPPONENT'],
    '(?:([A-Z][A-Z\s\-'']+)\s+WINS)|(?:(FLAWLESS VICTORY|FATALITY|BRUTALITY|FRIENDSHIP|QUITALITY|FINISH HIM|FINISH HER|VICTORY|DEFEAT|KONTINUE|REMATCH))',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    'League of Legends',
    'HEAD_TO_HEAD',
    'PC',
    '{"x":0.795,"y":0.000,"w":0.203,"h":0.036}'::jsonb,
    '{"min":0,"max":500}'::jsonb,
    array['VICTORY','DEFEAT','CONTINUE','FIRST BLOOD','YOU HAVE SLAIN AN ENEMY','ENEMY TURRET DESTROYED','ENEMY INHIBITOR DESTROYED','ACE','PENTAKILL','QUADRA KILL','TRIPLE KILL','DOUBLE KILL','SURRENDER','REMAKE'],
    '(?:(\d{1,3})\s*vs\s*(\d{1,3}))|(?:(\d{1,2})\/(\d{1,2})\/(\d{1,2}))|(?:VICTORY|DEFEAT|CONTINUE|FIRST BLOOD|ACE)',
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
