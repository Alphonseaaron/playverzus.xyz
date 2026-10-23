-- ============================================================================
-- Migration: 0004_usdc_and_auto_tournaments.sql
-- Description: Standardize platform currency to USDC & enable 5-Player Sit & Go Blitz Pools
-- ============================================================================

-- 1. Extend Tournaments table with automated Sit & Go pool metadata
alter table if exists public.tournaments
  add column if not exists is_auto_sit_and_go boolean not null default false,
  add column if not exists tier smallint check (tier is null or tier in (1, 2, 3)),
  add column if not exists currency text not null default 'USDC';

-- 2. Fast query indexing for continuous active tournament queues
create index if not exists idx_tournaments_auto_pool 
  on public.tournaments(is_auto_sit_and_go, tier, status)
  where is_auto_sit_and_go = true;

create index if not exists idx_tournaments_game_tier
  on public.tournaments(profile_id, tier, status);

-- 3. Standardize default wallet currency to USDC across existing records
update public.wallets
  set currency = 'USDC'
  where currency = 'EUR';

-- 4. Automated 5-Player Tournament Cloning RPC
-- Automatically spawns the next continuous tournament instance once 5 players have joined.
create or replace function public.spawn_next_sit_and_go(
  p_previous_tournament_id uuid
) returns public.tournaments
language plpgsql security definer set search_path = public as $$
declare
  v_prev public.tournaments;
  v_next public.tournaments;
  v_existing_open_id uuid;
begin
  select * into v_prev from public.tournaments where id = p_previous_tournament_id;
  if not found then
    raise exception 'Previous tournament not found' using errcode = 'P0002';
  end if;

  -- Ensure this is indeed an automated Sit & Go pool
  if not v_prev.is_auto_sit_and_go then
    return null;
  end if;

  -- Idempotency check: don't spawn duplicate open tournament if one already exists for this game and tier
  select id into v_existing_open_id
  from public.tournaments
  where profile_id = v_prev.profile_id
    and tier = v_prev.tier
    and is_auto_sit_and_go = true
    and status in ('REGISTRATION', 'CHECKIN')
  limit 1;

  if v_existing_open_id is not null then
    select * into v_next from public.tournaments where id = v_existing_open_id;
    return v_next;
  end if;

  -- Create fresh next generation tournament in REGISTRATION status
  insert into public.tournaments (
    name,
    description,
    profile_id,
    format,
    size,
    entry_fee,
    prize_pool,
    prize_distribution,
    status,
    is_auto_sit_and_go,
    tier,
    currency,
    created_by
  ) values (
    v_prev.name,
    v_prev.description,
    v_prev.profile_id,
    v_prev.format,
    5, -- Strict 5-player instant fill cap
    v_prev.entry_fee,
    v_prev.prize_pool,
    v_prev.prize_distribution,
    'REGISTRATION',
    true,
    v_prev.tier,
    'USDC',
    v_prev.created_by
  ) returning * into v_next;

  insert into public.audit_log (actor_id, action, entity_type, entity_id)
  values (v_prev.created_by, 'tournament.auto_clone', 'tournament', v_next.id);

  return v_next;
end;
$$;
