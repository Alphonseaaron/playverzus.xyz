-- ============================================================================
-- PLAYVERZUS — Security Hardening Migration
-- Migration: 0002_security_hardening
-- Description:
--   1. Moves extensions (pg_trgm, pgcrypto) to 'extensions' schema (resolves lint 0014)
--   2. Converts RLS helper functions to SECURITY INVOKER (resolves lints 0028 & 0029)
--   3. Adjusts profiles RLS write policies to avoid policy recursion
--   4. Revokes EXECUTE on all public functions from PUBLIC, anon, authenticated
--   5. Grants EXECUTE on helper functions to anon/authenticated for RLS evaluation
--   6. Grants EXECUTE on backend RPC functions exclusively to service_role & postgres
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. RELOCATE EXTENSIONS (Lint: 0014_extension_in_public)
-- ---------------------------------------------------------------------------
create schema if not exists extensions;

do $$ begin
  alter extension pg_trgm set schema extensions;
exception when others then null; end $$;

do $$ begin
  alter extension pgcrypto set schema extensions;
exception when others then null; end $$;

grant usage on schema extensions to public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. REVISE RLS HELPER FUNCTIONS TO SECURITY INVOKER
-- (Lints: 0028_anon_security_definer_function_executable,
--         0029_authenticated_security_definer_function_executable)
-- ---------------------------------------------------------------------------

create or replace function public.current_role()
returns role_enum
language sql stable security invoker set search_path = public as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'PLAYER'::role_enum
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security invoker set search_path = public as $$
  select public.current_role() in ('ADMIN','SUPER_ADMIN');
$$;

create or replace function public.is_reviewer()
returns boolean
language sql stable security invoker set search_path = public as $$
  select public.current_role() in ('REVIEWER','ADMIN','SUPER_ADMIN');
$$;

create or replace function public.is_match_participant(p_match_id uuid)
returns boolean
language sql stable security invoker set search_path = public as $$
  select exists(
    select 1 from public.matches m
    where m.id = p_match_id
      and (m.player_a = auth.uid() or m.player_b = auth.uid())
  );
$$;

create or replace function public.is_tournament_participant(p_tournament_id uuid)
returns boolean
language sql stable security invoker set search_path = public as $$
  select exists(
    select 1 from public.tournament_entries e
    where e.tournament_id = p_tournament_id and e.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. SPLIT PROFILES ADMIN POLICY TO ELIMINATE RECURSION RISKS
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_admin_all" on public.profiles;

do $$ begin
  create policy "profiles_admin_insert" on public.profiles for insert
    with check (public.is_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profiles_admin_update" on public.profiles for update
    using (public.is_admin())
    with check (public.is_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profiles_admin_delete" on public.profiles for delete
    using (public.is_admin());
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 4. REVOKE EXECUTE PRIVILEGES FROM PUBLIC, ANON, & AUTHENTICATED
-- ---------------------------------------------------------------------------

-- Revoke across all current functions in schema public
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

-- Ensure future functions created in schema public do not default to public execute
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public revoke execute on functions from authenticated;

-- ---------------------------------------------------------------------------
-- 5. GRANT SERVICE_ROLE & POSTGRES UNRESTRICTED EXECUTE FOR BACKEND OPS
-- ---------------------------------------------------------------------------
grant execute on all functions in schema public to service_role, postgres;
alter default privileges in schema public grant execute on functions to service_role, postgres;

-- Explicit trigger execute for Supabase Auth
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role, postgres;

-- ---------------------------------------------------------------------------
-- 6. GRANT EXECUTE ON SECURITY INVOKER HELPERS FOR RLS EVALUATION
-- ---------------------------------------------------------------------------
grant execute on function public.current_role() to anon, authenticated, service_role, postgres;
grant execute on function public.is_admin() to anon, authenticated, service_role, postgres;
grant execute on function public.is_reviewer() to anon, authenticated, service_role, postgres;
grant execute on function public.is_match_participant(uuid) to anon, authenticated, service_role, postgres;
grant execute on function public.is_tournament_participant(uuid) to anon, authenticated, service_role, postgres;

-- ============================================================================
-- END OF MIGRATION 0002_security_hardening
-- ============================================================================
