-- ============================================================================
-- ANTIGRAVITY — Initial Schema
-- Migration: 0001_init
-- Description: Full schema, RPC functions, RLS policies for the platform.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
do $$ begin
  create type game_type_enum as enum (
    'HIGH_SCORE','LOW_TIME','SURVIVAL','HEAD_TO_HEAD',
    'BINARY_RESULT','COMPOSITE_STAT','PROGRESSION','PHYSICAL'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type platform_enum as enum ('MOBILE','PC','CONSOLE','WEB','PHYSICAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_format_enum as enum ('BO1','BO3','BO5');
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_status_enum as enum (
    'DRAFT','OPEN','ACCEPTED','LIVE','CAPTURING',
    'VERIFYING','VERIFIED','DISPUTED','REVIEW','SETTLED','CANCELLED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type tournament_format_enum as enum (
    'SINGLE_ELIM','DOUBLE_ELIM','ROUND_ROBIN','SWISS'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type tournament_status_enum as enum (
    'REGISTRATION','CHECKIN','LIVE','COMPLETED','CANCELLED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type role_enum as enum ('PLAYER','REVIEWER','ADMIN','SUPER_ADMIN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type kyc_status_enum as enum ('NONE','PENDING','VERIFIED','REJECTED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type friendship_status_enum as enum ('PENDING','ACCEPTED','BLOCKED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dispute_status_enum as enum ('OPEN','REVIEW','RESOLVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_status_enum as enum (
    'PENDING','APPROVED','REJECTED','CORRECTED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type score_source_enum as enum (
    'CLIENT_OCR','SERVER_OCR','STREAM_INGEST','MANUAL'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type lock_status_enum as enum ('LOCKED','RELEASED','REFUNDED');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  username          text unique not null,
  display_name      text,
  avatar_url        text,
  region            text,
  phone             text unique,
  trust_score       int  not null default 100 check (trust_score between 0 and 1000),
  role              role_enum not null default 'PLAYER',
  kyc_status        kyc_status_enum not null default 'NONE',
  kyc_provider_ref  text,
  geoblock_region   text,
  is_banned         boolean not null default false,
  ban_reason        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_profiles_username on public.profiles using gin (username gin_trgm_ops);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_region on public.profiles(region);

-- ---------------------------------------------------------------------------
-- FRIENDSHIPS
-- ---------------------------------------------------------------------------
create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  addressee_id  uuid not null references public.profiles(id) on delete cascade,
  status        friendship_status_enum not null default 'PENDING',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create index if not exists idx_friendships_requester on public.friendships(requester_id, status);
create index if not exists idx_friendships_addressee on public.friendships(addressee_id, status);

-- ---------------------------------------------------------------------------
-- GAME PROFILES
-- ---------------------------------------------------------------------------
create table if not exists public.game_profiles (
  id            uuid primary key default gen_random_uuid(),
  display_name  text not null,
  game_type     game_type_enum not null,
  platform      platform_enum not null,
  roi           jsonb not null,   -- {x,y,w,h} 0..1 relative
  constraints   jsonb not null default '{}'::jsonb,
  end_keywords  text[] not null default '{}',
  regex_pattern text,
  submitted_by  uuid references public.profiles(id) on delete set null,
  approved      boolean not null default false,
  approved_by   uuid references public.profiles(id) on delete set null,
  is_official   boolean not null default false,
  play_count    int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_game_profiles_approved on public.game_profiles(approved, game_type);
create index if not exists idx_game_profiles_type on public.game_profiles(game_type);

-- ---------------------------------------------------------------------------
-- SPONSORS
-- ---------------------------------------------------------------------------
create table if not exists public.sponsors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  logo_url      text,
  contact_email text,
  website_url   text,
  funded_amount bigint not null default 0,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- TOURNAMENTS
-- ---------------------------------------------------------------------------
create table if not exists public.tournaments (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  description        text,
  profile_id         uuid not null references public.game_profiles(id) on delete restrict,
  format             tournament_format_enum not null,
  size               int not null check (size between 2 and 256),
  entry_fee          bigint not null default 0 check (entry_fee >= 0),
  prize_pool         bigint not null default 0 check (prize_pool >= 0),
  prize_distribution jsonb not null default '{"1":0.5,"2":0.3,"3":0.2}'::jsonb,
  status             tournament_status_enum not null default 'REGISTRATION',
  starts_at          timestamptz,
  checkin_opens_at   timestamptz,
  checkin_closes_at  timestamptz,
  no_show_minutes    int not null default 10,
  sponsored_by       uuid references public.sponsors(id) on delete set null,
  created_by         uuid not null references public.profiles(id) on delete restrict,
  created_at         timestamptz not null default now()
);

create index if not exists idx_tournaments_status on public.tournaments(status, starts_at);
create index if not exists idx_tournaments_profile on public.tournaments(profile_id);

-- ---------------------------------------------------------------------------
-- MATCHES (references tournaments + game_profiles)
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.game_profiles(id) on delete restrict,
  format            match_format_enum not null default 'BO1',
  status            match_status_enum not null default 'DRAFT',
  player_a          uuid references public.profiles(id) on delete set null,
  player_b          uuid references public.profiles(id) on delete set null,
  winner            uuid references public.profiles(id) on delete set null,
  score_a           jsonb,
  score_b           jsonb,
  confidence        float,
  verified_by       text,
  tournament_id     uuid references public.tournaments(id) on delete cascade,
  room_code         text unique,
  entry_fee         bigint not null default 0 check (entry_fee >= 0),
  prize_pool        bigint not null default 0 check (prize_pool >= 0),
  sponsored_by      uuid references public.sponsors(id) on delete set null,
  no_show_deadline  timestamptz,
  bracket_round     int,
  bracket_position  int,
  bracket_parent_id uuid references public.matches(id) on delete set null,
  next_match_id     uuid references public.matches(id) on delete set null,
  is_losers_bracket boolean not null default false,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  started_at        timestamptz,
  settled_at        timestamptz,
  check (player_a is null or player_b is null or player_a <> player_b)
);

create index if not exists idx_matches_status on public.matches(status);
create index if not exists idx_matches_players_a on public.matches(player_a);
create index if not exists idx_matches_players_b on public.matches(player_b);
create index if not exists idx_matches_tournament on public.matches(tournament_id);
create index if not exists idx_matches_room on public.matches(room_code);
create index if not exists idx_matches_deadline on public.matches(no_show_deadline)
  where status in ('LIVE','ACCEPTED','CAPTURING','VERIFYING');

-- ---------------------------------------------------------------------------
-- TOURNAMENT ENTRIES
-- ---------------------------------------------------------------------------
create table if not exists public.tournament_entries (
  id               uuid primary key default gen_random_uuid(),
  tournament_id    uuid not null references public.tournaments(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  seed             int,
  checked_in       boolean not null default false,
  eliminated       boolean not null default false,
  final_placement  int,
  prize_awarded    bigint not null default 0,
  joined_at        timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create index if not exists idx_tournament_entries_t on public.tournament_entries(tournament_id);
create index if not exists idx_tournament_entries_u on public.tournament_entries(user_id);

-- ---------------------------------------------------------------------------
-- SCORE FRAMES
-- ---------------------------------------------------------------------------
create table if not exists public.score_frames (
  id             uuid primary key default gen_random_uuid(),
  match_id       uuid not null references public.matches(id) on delete cascade,
  player_id      uuid not null references public.profiles(id) on delete cascade,
  raw_text       text not null,
  parsed         jsonb,
  confidence     float not null check (confidence between 0 and 1),
  is_verified    boolean not null default false,
  is_final       boolean not null default false,
  image_hash     text,
  source         score_source_enum not null default 'CLIENT_OCR',
  created_at     timestamptz not null default now()
);

create index if not exists idx_score_frames_match
  on public.score_frames(match_id, player_id, is_final);

-- ---------------------------------------------------------------------------
-- WALLETS
-- ---------------------------------------------------------------------------
create table if not exists public.wallets (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  balance          bigint not null default 10000 check (balance >= 0),
  locked           bigint not null default 0 check (locked >= 0),
  lifetime_earned  bigint not null default 0 check (lifetime_earned >= 0),
  currency         text not null default 'POINTS',
  updated_at       timestamptz not null default now()
);

create table if not exists public.transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  amount           bigint not null,
  balance_after    bigint not null,
  reason           text not null,
  metadata         jsonb not null default '{}'::jsonb,
  idempotency_key  text unique,
  created_at       timestamptz not null default now()
);

create index if not exists idx_tx_user on public.transactions(user_id, created_at desc);

create table if not exists public.locks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  match_id       uuid references public.matches(id) on delete cascade,
  tournament_id  uuid references public.tournaments(id) on delete cascade,
  amount         bigint not null check (amount > 0),
  status         lock_status_enum not null default 'LOCKED',
  created_at     timestamptz not null default now(),
  check (match_id is not null or tournament_id is not null)
);

create index if not exists idx_locks_match on public.locks(match_id, status);
create index if not exists idx_locks_tournament on public.locks(tournament_id, status);

-- ---------------------------------------------------------------------------
-- DISPUTES
-- ---------------------------------------------------------------------------
create table if not exists public.disputes (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null unique references public.matches(id) on delete cascade,
  raised_by    uuid not null references public.profiles(id) on delete cascade,
  reason       text not null,
  evidence     text,
  status       dispute_status_enum not null default 'OPEN',
  resolution   text,
  resolved_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

-- ---------------------------------------------------------------------------
-- REVIEW TASKS
-- ---------------------------------------------------------------------------
create table if not exists public.review_tasks (
  id                uuid primary key default gen_random_uuid(),
  score_frame_id    uuid references public.score_frames(id) on delete cascade,
  match_id          uuid not null references public.matches(id) on delete cascade,
  assigned_to       uuid references public.profiles(id) on delete set null,
  status            review_status_enum not null default 'PENDING',
  reviewer_note     text,
  corrected_value   text,
  priority          int not null default 0,
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz
);

create index if not exists idx_review_tasks_status
  on public.review_tasks(status, priority desc, created_at);

-- ---------------------------------------------------------------------------
-- TRAINING DATASET
-- ---------------------------------------------------------------------------
create table if not exists public.training_dataset (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references public.game_profiles(id) on delete set null,
  image_hash    text,
  ground_truth  text not null,
  predicted     text,
  confidence    float,
  source        text,
  is_used       boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists idx_training_used on public.training_dataset(is_used, profile_id);

-- ---------------------------------------------------------------------------
-- RATINGS (ELO per user per game type)
-- ---------------------------------------------------------------------------
create table if not exists public.ratings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  game_type     game_type_enum not null,
  rating        int not null default 1200,
  games_played  int not null default 0,
  wins          int not null default 0,
  losses        int not null default 0,
  updated_at    timestamptz not null default now(),
  unique (user_id, game_type)
);

create index if not exists idx_ratings_leaderboard
  on public.ratings(game_type, rating desc);

-- ---------------------------------------------------------------------------
-- SEASONS
-- ---------------------------------------------------------------------------
create table if not exists public.seasons (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- AUDIT LOG
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.profiles(id) on delete set null,
  action       text not null,
  entity_type  text,
  entity_id    uuid,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_audit_actor on public.audit_log(actor_id, created_at desc);
create index if not exists idx_audit_entity on public.audit_log(entity_type, entity_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

create or replace function public.current_role()
returns role_enum
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'PLAYER'::role_enum
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role() in ('ADMIN','SUPER_ADMIN');
$$;

create or replace function public.is_reviewer()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role() in ('REVIEWER','ADMIN','SUPER_ADMIN');
$$;

create or replace function public.is_match_participant(p_match_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.matches m
    where m.id = p_match_id
      and (m.player_a = auth.uid() or m.player_b = auth.uid())
  );
$$;

create or replace function public.is_tournament_participant(p_tournament_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.tournament_entries e
    where e.tournament_id = p_tournament_id and e.user_id = auth.uid()
  );
$$;

-- Auto-create a profile when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_username text;
  v_region text;
begin
  v_username := coalesce(
    new.raw_user_meta_data->>'username',
    'player_' || substr(replace(new.id::text, '-', ''), 1, 10)
  );
  v_region := coalesce(
    new.raw_user_meta_data->>'country_code',
    new.raw_user_meta_data->>'region'
  );

  insert into public.profiles (id, username, display_name, region, phone)
  values (
    new.id,
    v_username,
    coalesce(new.raw_user_meta_data->>'display_name', v_username),
    v_region,
    new.phone
  )
  on conflict (id) do update
  set region = coalesce(public.profiles.region, excluded.region);

  insert into public.wallets (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- WALLET RPC FUNCTIONS
-- ============================================================================

create or replace function public.wallet_credit(
  p_user_id uuid,
  p_amount bigint,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb,
  p_idem text default null
) returns public.transactions
language plpgsql security definer set search_path = public as $$
declare
  v_new_balance bigint;
  v_tx public.transactions;
  v_existing public.transactions;
begin
  if p_amount <= 0 then
    raise exception 'Credit amount must be positive' using errcode = '22023';
  end if;

  if p_idem is not null then
    select * into v_existing from public.transactions where idempotency_key = p_idem;
    if found then return v_existing; end if;
  end if;

  insert into public.wallets (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  update public.wallets
  set balance = balance + p_amount,
      lifetime_earned = lifetime_earned + p_amount,
      updated_at = now()
  where user_id = p_user_id
  returning balance into v_new_balance;

  insert into public.transactions (user_id, amount, balance_after, reason, metadata, idempotency_key)
  values (p_user_id, p_amount, v_new_balance, p_reason, p_metadata, p_idem)
  returning * into v_tx;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (p_user_id, 'wallet.credit', 'transaction', v_tx.id,
          jsonb_build_object('amount', p_amount, 'reason', p_reason));

  return v_tx;
end;
$$;

create or replace function public.wallet_debit(
  p_user_id uuid,
  p_amount bigint,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb,
  p_idem text default null
) returns public.transactions
language plpgsql security definer set search_path = public as $$
declare
  v_new_balance bigint;
  v_tx public.transactions;
  v_existing public.transactions;
begin
  if p_amount <= 0 then
    raise exception 'Debit amount must be positive' using errcode = '22023';
  end if;

  if p_idem is not null then
    select * into v_existing from public.transactions where idempotency_key = p_idem;
    if found then return v_existing; end if;
  end if;

  update public.wallets
  set balance = balance - p_amount,
      updated_at = now()
  where user_id = p_user_id and balance >= p_amount
  returning balance into v_new_balance;

  if not found then
    raise exception 'Insufficient funds' using errcode = 'P0001';
  end if;

  insert into public.transactions (user_id, amount, balance_after, reason, metadata, idempotency_key)
  values (p_user_id, -p_amount, v_new_balance, p_reason, p_metadata, p_idem)
  returning * into v_tx;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (p_user_id, 'wallet.debit', 'transaction', v_tx.id,
          jsonb_build_object('amount', p_amount, 'reason', p_reason));

  return v_tx;
end;
$$;

create or replace function public.wallet_lock(
  p_user_id uuid,
  p_amount bigint,
  p_match_id uuid default null,
  p_tournament_id uuid default null
) returns public.locks
language plpgsql security definer set search_path = public as $$
declare
  v_lock public.locks;
begin
  if p_amount <= 0 then
    raise exception 'Lock amount must be positive' using errcode = '22023';
  end if;
  if p_match_id is null and p_tournament_id is null then
    raise exception 'Lock must reference a match or tournament' using errcode = '22023';
  end if;

  insert into public.wallets (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  update public.wallets
  set balance = balance - p_amount,
      locked = locked + p_amount,
      updated_at = now()
  where user_id = p_user_id and balance >= p_amount;

  if not found then
    raise exception 'Insufficient funds to lock' using errcode = 'P0001';
  end if;

  insert into public.locks (user_id, amount, match_id, tournament_id)
  values (p_user_id, p_amount, p_match_id, p_tournament_id)
  returning * into v_lock;

  return v_lock;
end;
$$;

create or replace function public.wallet_settle(
  p_match_id uuid,
  p_winner_id uuid,
  p_amount bigint default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_total bigint := 0;
begin
  for r in
    select * from public.locks
    where match_id = p_match_id and status = 'LOCKED'
  loop
    update public.wallets
    set locked = locked - r.amount, updated_at = now()
    where user_id = r.user_id;

    update public.locks set status = 'RELEASED' where id = r.id;
    v_total := v_total + r.amount;
  end loop;

  if v_total > 0 then
    perform public.wallet_credit(
      p_winner_id,
      coalesce(p_amount, v_total),
      'prize',
      jsonb_build_object('match_id', p_match_id),
      'match:' || p_match_id::text || ':prize'
    );
  end if;
end;
$$;

create or replace function public.wallet_refund(p_match_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  for r in select * from public.locks where match_id = p_match_id and status = 'LOCKED' loop
    update public.wallets
    set balance = balance + r.amount,
        locked = locked - r.amount,
        updated_at = now()
    where user_id = r.user_id;

    update public.locks set status = 'REFUNDED' where id = r.id;

    insert into public.transactions (user_id, amount, balance_after, reason, metadata, idempotency_key)
    select r.user_id, r.amount,
           (select balance from public.wallets where user_id = r.user_id),
           'refund',
           jsonb_build_object('match_id', p_match_id),
           'refund:match:' || p_match_id::text || ':' || r.user_id::text;
  end loop;
end;
$$;

create or replace function public.wallet_refund_tournament(p_tournament_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  for r in select * from public.locks
    where tournament_id = p_tournament_id and status = 'LOCKED'
  loop
    update public.wallets
    set balance = balance + r.amount,
        locked = locked - r.amount,
        updated_at = now()
    where user_id = r.user_id;

    update public.locks set status = 'REFUNDED' where id = r.id;

    insert into public.transactions (user_id, amount, balance_after, reason, metadata, idempotency_key)
    select r.user_id, r.amount,
           (select balance from public.wallets where user_id = r.user_id),
           'refund',
           jsonb_build_object('tournament_id', p_tournament_id),
           'refund:tournament:' || p_tournament_id::text || ':' || r.user_id::text;
  end loop;
end;
$$;

-- ============================================================================
-- MATCH RPC FUNCTIONS
-- ============================================================================

create or replace function public.create_match(
  p_creator uuid,
  p_profile_id uuid,
  p_player_a uuid,
  p_player_b uuid,
  p_format match_format_enum default 'BO1',
  p_room_code text default null,
  p_entry_fee bigint default 0
) returns public.matches
language plpgsql security definer set search_path = public as $$
declare
  v_match public.matches;
  v_entry_fee bigint := greatest(0, coalesce(p_entry_fee, 0));
begin
  insert into public.matches (
    profile_id, player_a, player_b, format, room_code, entry_fee, prize_pool, created_by, status
  ) values (
    p_profile_id, p_player_a, p_player_b, p_format, p_room_code, v_entry_fee, v_entry_fee * 2, p_creator,
    'OPEN'::match_status_enum
  ) returning * into v_match;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (p_creator, 'match.create', 'match', v_match.id, '{}'::jsonb);

  return v_match;
end;
$$;

create or replace function public.accept_match(
  p_match_id uuid, p_user_id uuid
) returns public.matches
language plpgsql security definer set search_path = public as $$
declare
  v_match public.matches;
begin
  update public.matches
  set status = 'ACCEPTED',
      player_b = coalesce(player_b, p_user_id),
      started_at = now(),
      no_show_deadline = now() + interval '10 minutes'
  where id = p_match_id
    and status = 'OPEN'
    and (player_b is null or player_b = p_user_id)
  returning * into v_match;

  if not found then
    raise exception 'Match cannot be accepted' using errcode = 'P0001';
  end if;

  if v_match.entry_fee > 0 then
    perform public.wallet_lock(v_match.player_a, v_match.entry_fee, v_match.id, null);
    perform public.wallet_lock(v_match.player_b, v_match.entry_fee, v_match.id, null);
  end if;

  return v_match;
end;
$$;

create or replace function public.start_match(p_match_id uuid)
returns public.matches
language plpgsql security definer set search_path = public as $$
declare v_match public.matches;
begin
  update public.matches
  set status = 'LIVE', started_at = now()
  where id = p_match_id and status = 'ACCEPTED'
  returning * into v_match;

  if not found then
    raise exception 'Match cannot be started' using errcode = 'P0001';
  end if;

  return v_match;
end;
$$;

create or replace function public.submit_score(
  p_match_id uuid,
  p_player_id uuid,
  p_raw_text text,
  p_confidence float,
  p_is_final boolean,
  p_image_hash text default null,
  p_source score_source_enum default 'CLIENT_OCR',
  p_parsed jsonb default null
) returns public.score_frames
language plpgsql security definer set search_path = public as $$
declare v_frame public.score_frames;
begin
  if not exists(
    select 1 from public.matches
    where id = p_match_id
      and (player_a = p_player_id or player_b = p_player_id)
      and status in ('LIVE','CAPTURING','VERIFYING')
  ) then
    raise exception 'Cannot submit score for this match' using errcode = 'P0001';
  end if;

  insert into public.score_frames
    (match_id, player_id, raw_text, parsed, confidence, is_final, image_hash, source)
  values
    (p_match_id, p_player_id, p_raw_text, p_parsed, p_confidence, p_is_final, p_image_hash, p_source)
  returning * into v_frame;

  return v_frame;
end;
$$;

-- ============================================================================
-- TOURNAMENT RPC FUNCTIONS
-- ============================================================================

create or replace function public.create_tournament(
  p_creator uuid,
  p_name text,
  p_profile_id uuid,
  p_format tournament_format_enum,
  p_size int,
  p_entry_fee bigint default 0,
  p_prize_pool bigint default 0,
  p_starts_at timestamptz default null,
  p_prize_distribution jsonb default '{"1":0.5,"2":0.3,"3":0.2}'::jsonb
) returns public.tournaments
language plpgsql security definer set search_path = public as $$
declare v_t public.tournaments;
begin
  insert into public.tournaments (
    name, profile_id, format, size, entry_fee, prize_pool,
    prize_distribution, starts_at, created_by,
    checkin_opens_at, checkin_closes_at
  ) values (
    p_name, p_profile_id, p_format, p_size, p_entry_fee, p_prize_pool,
    p_prize_distribution, p_starts_at, p_creator,
    p_starts_at - interval '30 minutes',
    p_starts_at
  ) returning * into v_t;

  insert into public.audit_log (actor_id, action, entity_type, entity_id)
  values (p_creator, 'tournament.create', 'tournament', v_t.id);

  return v_t;
end;
$$;

create or replace function public.join_tournament(
  p_tournament_id uuid, p_user_id uuid
) returns public.tournament_entries
language plpgsql security definer set search_path = public as $$
declare
  v_t public.tournaments;
  v_entry public.tournament_entries;
  v_count int;
begin
  select * into v_t from public.tournaments where id = p_tournament_id;
  if not found then raise exception 'Tournament not found' using errcode = 'P0002'; end if;
  if v_t.status not in ('REGISTRATION') then
    raise exception 'Tournament not open for registration' using errcode = 'P0001';
  end if;

  select count(*) into v_count from public.tournament_entries where tournament_id = p_tournament_id;
  if v_count >= v_t.size then
    raise exception 'Tournament is full' using errcode = 'P0001';
  end if;

  if v_t.entry_fee > 0 then
    perform public.wallet_lock(p_user_id, v_t.entry_fee, null, p_tournament_id);
  end if;

  insert into public.tournament_entries (tournament_id, user_id)
  values (p_tournament_id, p_user_id)
  returning * into v_entry;

  return v_entry;
end;
$$;

create or replace function public.checkin_tournament(
  p_tournament_id uuid, p_user_id uuid
) returns public.tournament_entries
language plpgsql security definer set search_path = public as $$
declare v_entry public.tournament_entries;
begin
  update public.tournament_entries
  set checked_in = true
  where tournament_id = p_tournament_id and user_id = p_user_id
  returning * into v_entry;

  if not found then
    raise exception 'Not registered for this tournament' using errcode = 'P0001';
  end if;

  return v_entry;
end;
$$;

-- ============================================================================
-- RATINGS RPC
-- ============================================================================

create or replace function public.update_rating(
  p_user_id uuid, p_game_type game_type_enum, p_won boolean
) returns public.ratings
language plpgsql security definer set search_path = public as $$
declare v_rating public.ratings;
begin
  insert into public.ratings (user_id, game_type)
  values (p_user_id, p_game_type)
  on conflict (user_id, game_type) do nothing;

  update public.ratings
  set rating = greatest(100, rating + case when p_won then 25 else -20 end),
      games_played = games_played + 1,
      wins = wins + case when p_won then 1 else 0 end,
      losses = losses + case when p_won then 0 else 1 end,
      updated_at = now()
  where user_id = p_user_id and game_type = p_game_type
  returning * into v_rating;

  return v_rating;
end;
$$;

-- ============================================================================
-- REVIEW & SEASONS RPC
-- ============================================================================

create or replace function public.enqueue_review_task(
  p_score_frame_id uuid,
  p_match_id uuid,
  p_priority int default 0
) returns public.review_tasks
language plpgsql security definer set search_path = public as $$
declare v_task public.review_tasks;
begin
  insert into public.review_tasks (score_frame_id, match_id, priority)
  values (p_score_frame_id, p_match_id, p_priority)
  returning * into v_task;

  return v_task;
end;
$$;

create or replace function public.resolve_review_task(
  p_task_id uuid,
  p_reviewer uuid,
  p_status review_status_enum,
  p_corrected text default null,
  p_note text default null
) returns public.review_tasks
language plpgsql security definer set search_path = public as $$
declare
  v_task public.review_tasks;
  v_frame public.score_frames;
begin
  update public.review_tasks
  set status = p_status,
      assigned_to = p_reviewer,
      corrected_value = p_corrected,
      reviewer_note = p_note,
      resolved_at = now()
  where id = p_task_id
  returning * into v_task;

  if not found then
    raise exception 'Review task not found' using errcode = 'P0002';
  end if;

  if v_task.score_frame_id is not null then
    select * into v_frame from public.score_frames where id = v_task.score_frame_id;
    if found then
      insert into public.training_dataset (
        profile_id, image_hash, ground_truth, predicted, confidence, source
      )
      select m.profile_id, v_frame.image_hash, coalesce(p_corrected, v_frame.raw_text),
             v_frame.raw_text, v_frame.confidence, 'HUMAN_CORRECTION'
      from public.matches m where m.id = v_task.match_id;
    end if;
  end if;

  return v_task;
end;
$$;

create or replace function public.create_season(
  p_name text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
) returns public.seasons
language plpgsql security definer set search_path = public as $$
declare v_season public.seasons;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  insert into public.seasons (name, starts_at, ends_at, is_active)
  values (p_name, p_starts_at, p_ends_at, true)
  returning * into v_season;

  return v_season;
end;
$$;

create or replace function public.reset_season_ratings(p_season_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  update public.ratings
  set rating = 1200, games_played = 0, wins = 0, losses = 0, updated_at = now();

  update public.seasons set is_active = false where id = p_season_id;
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles              enable row level security;
alter table public.friendships           enable row level security;
alter table public.game_profiles         enable row level security;
alter table public.sponsors              enable row level security;
alter table public.tournaments           enable row level security;
alter table public.tournament_entries    enable row level security;
alter table public.matches               enable row level security;
alter table public.score_frames          enable row level security;
alter table public.wallets               enable row level security;
alter table public.transactions          enable row level security;
alter table public.locks                 enable row level security;
alter table public.disputes              enable row level security;
alter table public.review_tasks          enable row level security;
alter table public.training_dataset      enable row level security;
alter table public.ratings               enable row level security;
alter table public.seasons               enable row level security;
alter table public.audit_log             enable row level security;

-- PROFILES
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_self" on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
create policy "profiles_admin_all" on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- FRIENDSHIPS
create policy "friendships_select_own" on public.friendships for select
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "friendships_insert_own" on public.friendships for insert
  with check (requester_id = auth.uid());
create policy "friendships_update_own" on public.friendships for update
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- GAME PROFILES
create policy "game_profiles_select_approved" on public.game_profiles for select
  using (approved = true or submitted_by = auth.uid() or public.is_admin());
create policy "game_profiles_insert_self" on public.game_profiles for insert
  with check (submitted_by = auth.uid());
create policy "game_profiles_admin_update" on public.game_profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- SPONSORS
create policy "sponsors_select_all" on public.sponsors for select using (true);
create policy "sponsors_admin_write" on public.sponsors for all
  using (public.is_admin()) with check (public.is_admin());

-- TOURNAMENTS
create policy "tournaments_select_all" on public.tournaments for select using (true);
create policy "tournaments_admin_write" on public.tournaments for all
  using (public.is_admin()) with check (public.is_admin());
create policy "tournaments_creator_update" on public.tournaments for update
  using (created_by = auth.uid());

-- TOURNAMENT ENTRIES
create policy "entries_select_all" on public.tournament_entries for select using (true);
create policy "entries_insert_self" on public.tournament_entries for insert
  with check (user_id = auth.uid());
create policy "entries_admin_all" on public.tournament_entries for all
  using (public.is_admin()) with check (public.is_admin());

-- MATCHES
create policy "matches_select_relevant" on public.matches for select
  using (
    player_a = auth.uid() or player_b = auth.uid()
    or (tournament_id is not null and public.is_tournament_participant(tournament_id))
    or created_by = auth.uid()
    or status = 'OPEN'
    or public.is_admin()
  );
create policy "matches_insert_self" on public.matches for insert
  with check (created_by = auth.uid());
create policy "matches_admin_all" on public.matches for all
  using (public.is_admin()) with check (public.is_admin());

-- SCORE FRAMES
create policy "frames_select_relevant" on public.score_frames for select
  using (
    player_id = auth.uid()
    or public.is_match_participant(match_id)
    or public.is_reviewer()
    or public.is_admin()
  );
create policy "frames_insert_self" on public.score_frames for insert
  with check (player_id = auth.uid());

-- WALLETS
create policy "wallets_select_self" on public.wallets for select
  using (user_id = auth.uid() or public.is_admin());
create policy "wallets_admin_write" on public.wallets for all
  using (public.is_admin()) with check (public.is_admin());

-- TRANSACTIONS
create policy "tx_select_self" on public.transactions for select
  using (user_id = auth.uid() or public.is_admin());

-- LOCKS
create policy "locks_select_self" on public.locks for select
  using (user_id = auth.uid() or public.is_admin());

-- DISPUTES
create policy "disputes_select_relevant" on public.disputes for select
  using (
    raised_by = auth.uid()
    or public.is_match_participant(match_id)
    or public.is_reviewer()
    or public.is_admin()
  );
create policy "disputes_insert_self" on public.disputes for insert
  with check (raised_by = auth.uid());

-- REVIEW TASKS
create policy "review_select_assigned_or_admin" on public.review_tasks for select
  using (assigned_to = auth.uid() or public.is_reviewer() or public.is_admin());
create policy "review_update_reviewer" on public.review_tasks for update
  using (public.is_reviewer()) with check (public.is_reviewer());

-- TRAINING DATASET
create policy "training_select_reviewer" on public.training_dataset for select
  using (public.is_reviewer() or public.is_admin());
create policy "training_insert_reviewer" on public.training_dataset for insert
  with check (public.is_reviewer() or public.is_admin());

-- RATINGS
create policy "ratings_select_all" on public.ratings for select using (true);
create policy "ratings_admin_write" on public.ratings for all
  using (public.is_admin()) with check (public.is_admin());

-- SEASONS
create policy "seasons_select_all" on public.seasons for select using (true);
create policy "seasons_admin_write" on public.seasons for all
  using (public.is_admin()) with check (public.is_admin());

-- AUDIT LOG
create policy "audit_select_admin" on public.audit_log for select
  using (public.is_admin());

-- ============================================================================
-- REALTIME
-- ============================================================================

alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.score_frames;
alter publication supabase_realtime add table public.tournaments;
alter publication supabase_realtime add table public.tournament_entries;
alter publication supabase_realtime add table public.disputes;
alter publication supabase_realtime add table public.review_tasks;

-- ============================================================================
-- END
-- ============================================================================
