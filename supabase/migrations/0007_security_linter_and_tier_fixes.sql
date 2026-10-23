-- ============================================================================
-- Migration: 0007_security_linter_and_tier_fixes.sql
-- Description:
--   1. Expands tournaments.tier constraint to support Tier 4 ($200) and Tier 5 ($500)
--   2. Hardens security for RPC functions (spawn_next_sit_and_go, is_staff)
--   3. Eliminates permissive RLS policy on public.support_tickets
--   4. Resolves Supabase Database Linter rules 0024, 0028, and 0029
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. EXPAND TOURNAMENT TIER CONSTRAINT (Tiers 1, 2, 3, 4, 5)
-- ---------------------------------------------------------------------------
alter table public.tournaments drop constraint if exists tournaments_tier_check;
alter table public.tournaments add constraint tournaments_tier_check 
  check (tier is null or tier in (1, 2, 3, 4, 5));

-- ---------------------------------------------------------------------------
-- 2. HARDEN RPC: spawn_next_sit_and_go (Resolves Lint 0028 & 0029)
-- Backend automated tournament cloner should only be callable by service_role / postgres
-- ---------------------------------------------------------------------------
revoke execute on function public.spawn_next_sit_and_go(uuid) from public, anon, authenticated;
grant execute on function public.spawn_next_sit_and_go(uuid) to service_role, postgres;

-- ---------------------------------------------------------------------------
-- 3. RE-DECLARE is_staff() AS SECURITY INVOKER (Resolves Lint 0028 & 0029)
-- Helper functions used in client RLS checks must be SECURITY INVOKER
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
security invoker
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role::text in (
        'SUPPORT',
        'REVIEWER',
        'TOURNAMENT_ADMIN',
        'FINANCE_AUDITOR',
        'COMMUNITY_MANAGER',
        'ADMIN',
        'SUPER_ADMIN'
      )
  );
$$;

revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated, service_role, postgres;

-- ---------------------------------------------------------------------------
-- 4. HARDEN RLS: support_tickets_insert (Resolves Lint 0024)
-- Replace WITH CHECK (true) with verified input validation and user integrity
-- ---------------------------------------------------------------------------
drop policy if exists "support_tickets_insert" on public.support_tickets;

create policy "support_tickets_insert" on public.support_tickets
  for insert with check (
    length(trim(coalesce(email, ''))) >= 3
    and length(trim(coalesce(subject, ''))) >= 1
    and length(trim(coalesce(message, ''))) >= 1
    and (
      (auth.uid() is not null and (user_id = auth.uid() or user_id is null))
      or
      (auth.uid() is null and user_id is null)
    )
  );
