-- ============================================================================
-- PLAYVERZUS — KYC Profile Enrichment & Automated Onboarding Sync
-- Migration: 0003_kyc_and_income_books
-- Description:
--   1. Adds full_name, date_of_birth, address to public.profiles
--   2. Updates handle_new_user() to automatically populate KYC details from auth metadata
--   3. Secures execute privileges to prevent unauthorized RPC invocation
-- ============================================================================

-- 1. Add KYC and identity columns to public.profiles
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists address text;

-- 2. Update handle_new_user() trigger to automatically map KYC details from sign-up
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

  insert into public.profiles (
    id,
    username,
    display_name,
    full_name,
    date_of_birth,
    address,
    region,
    phone
  )
  values (
    new.id,
    v_username,
    coalesce(new.raw_user_meta_data->>'display_name', v_username),
    new.raw_user_meta_data->>'full_name',
    case
      when new.raw_user_meta_data->>'date_of_birth' is not null and new.raw_user_meta_data->>'date_of_birth' != ''
      then (new.raw_user_meta_data->>'date_of_birth')::date
      else null
    end,
    new.raw_user_meta_data->>'address',
    v_region,
    coalesce(new.raw_user_meta_data->>'phone', new.phone)
  )
  on conflict (id) do update
  set region = coalesce(public.profiles.region, excluded.region),
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      date_of_birth = coalesce(public.profiles.date_of_birth, excluded.date_of_birth),
      address = coalesce(public.profiles.address, excluded.address),
      phone = coalesce(public.profiles.phone, excluded.phone);

  insert into public.wallets (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- 3. Lock down permissions
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role, postgres;
