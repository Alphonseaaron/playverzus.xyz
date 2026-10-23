-- ============================================================================
-- Migration: 0006_staff_roles_and_clearances.sql
-- Description: Expand role_enum with specialized staff clearances:
--              TOURNAMENT_ADMIN, FINANCE_AUDITOR, COMMUNITY_MANAGER
-- ============================================================================

-- 1. Extend role_enum
alter type public.role_enum add value if not exists 'TOURNAMENT_ADMIN';
alter type public.role_enum add value if not exists 'FINANCE_AUDITOR';
alter type public.role_enum add value if not exists 'COMMUNITY_MANAGER';

-- 2. Ensure RLS policies on profiles, tournaments, and support tickets recognize all staff roles
-- Helper function to check if current user is any operational staff member
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in (
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
