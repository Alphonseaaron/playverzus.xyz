-- ============================================================================
-- Migration: 0006_staff_roles_and_clearances.sql
-- Description: Expand role_enum with specialized staff clearances:
--              TOURNAMENT_ADMIN, FINANCE_AUDITOR, COMMUNITY_MANAGER
-- ============================================================================

-- 1. Extend role_enum with new operational staff roles
alter type public.role_enum add value if not exists 'TOURNAMENT_ADMIN';
alter type public.role_enum add value if not exists 'FINANCE_AUDITOR';
alter type public.role_enum add value if not exists 'COMMUNITY_MANAGER';

-- 2. Helper function to check if current user is any operational staff member.
-- IMPORTANT: We cast role::text to avoid PostgreSQL error 55P04 (unsafe use of newly added enum values in the same transaction block).
create or replace function public.is_staff()
returns boolean
language sql
security definer
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

grant execute on function public.is_staff() to anon, authenticated, service_role, postgres;
