-- ============================================================================
-- Migration: 0005_support_and_community_polls.sql
-- Description: Support ticket delegation desk & Community Feature Suggestions/Voting
-- ============================================================================

-- 1. Extend role_enum with SUPPORT role
alter type public.role_enum add value if not exists 'SUPPORT';

-- 2. Support Tickets Table
create table if not exists public.support_tickets (
  id           text primary key, -- e.g. PVZ-XXXXXX
  user_id      uuid references public.profiles(id) on delete set null,
  assigned_to  uuid references public.profiles(id) on delete set null,
  name         text not null,
  email        text not null,
  subject      text not null,
  category     text not null default 'GENERAL', -- GENERAL, MATCH_DISPUTE, DEPOSIT_WITHDRAWAL, BUG_REPORT, KYC, ACCOUNT
  priority     text not null default 'NORMAL',  -- LOW, NORMAL, HIGH, URGENT
  status       text not null default 'OPEN',    -- OPEN, ASSIGNED, IN_PROGRESS, WAITING_USER, RESOLVED, CLOSED
  message      text not null,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_support_tickets_user on public.support_tickets(user_id);
create index if not exists idx_support_tickets_assigned on public.support_tickets(assigned_to);
create index if not exists idx_support_tickets_status on public.support_tickets(status, priority);

-- 3. Support Ticket Messages / Conversation History
create table if not exists public.support_ticket_messages (
  id               uuid primary key default gen_random_uuid(),
  ticket_id        text not null references public.support_tickets(id) on delete cascade,
  sender_id        uuid references public.profiles(id) on delete set null,
  sender_name      text not null,
  sender_role      text not null default 'USER', -- USER, STAFF, ADMIN, SYSTEM
  message          text not null,
  is_internal_note boolean not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists idx_ticket_messages_ticket on public.support_ticket_messages(ticket_id, created_at);

-- 4. Community Polls (Introduced by Support / Admin based on user suggestions)
create table if not exists public.community_polls (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null,
  description           text not null,
  category              text not null default 'FEATURE', -- FEATURE, NEW_GAME, RULES, REWARD, PAYMENT
  status                text not null default 'ACTIVE_VOTING', -- ACTIVE_VOTING, PLANNED, IN_DEVELOPMENT, SHIPPED, CLOSED
  options               jsonb not null default '["Yes - Build this!", "No - Prioritize other features"]'::jsonb,
  suggested_by          uuid references public.profiles(id) on delete set null,
  suggested_by_username text,
  created_by            uuid references public.profiles(id) on delete set null,
  closes_at             timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_community_polls_status on public.community_polls(status, created_at);

-- 5. Community Poll Votes (1 vote per registered user per poll)
create table if not exists public.community_poll_votes (
  id           uuid primary key default gen_random_uuid(),
  poll_id      uuid not null references public.community_polls(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  option_index int not null check (option_index >= 0),
  created_at   timestamptz not null default now(),
  unique(poll_id, user_id)
);

create index if not exists idx_poll_votes_poll on public.community_poll_votes(poll_id, option_index);

-- 6. User Suggestions (Users propose ideas, Support/Admin review & promote to live Poll)
create table if not exists public.user_suggestions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  user_name   text not null,
  title       text not null,
  description text not null,
  category    text not null default 'FEATURE',
  status      text not null default 'PENDING_REVIEW', -- PENDING_REVIEW, PROMOTED_TO_POLL, DECLINED
  poll_id     uuid references public.community_polls(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_user_suggestions_status on public.user_suggestions(status, created_at);

-- 7. Row-Level Security Policies
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.community_polls enable row level security;
alter table public.community_poll_votes enable row level security;
alter table public.user_suggestions enable row level security;

-- Support Tickets Policies
create policy "support_tickets_select" on public.support_tickets
  for select using (
    auth.uid() = user_id or
    public.current_role()::text in ('SUPPORT', 'REVIEWER', 'ADMIN', 'SUPER_ADMIN')
  );

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

create policy "support_tickets_update" on public.support_tickets
  for update using (
    public.current_role()::text in ('SUPPORT', 'REVIEWER', 'ADMIN', 'SUPER_ADMIN')
  );

-- Support Ticket Messages Policies
create policy "ticket_messages_select" on public.support_ticket_messages
  for select using (
    (not is_internal_note and exists (
      select 1 from public.support_tickets st where st.id = ticket_id and (st.user_id = auth.uid())
    )) or
    public.current_role()::text in ('SUPPORT', 'REVIEWER', 'ADMIN', 'SUPER_ADMIN')
  );

create policy "ticket_messages_insert" on public.support_ticket_messages
  for insert with check (
    exists (
      select 1 from public.support_tickets st where st.id = ticket_id and (st.user_id = auth.uid())
    ) or
    public.current_role()::text in ('SUPPORT', 'REVIEWER', 'ADMIN', 'SUPER_ADMIN')
  );

-- Community Polls Policies (Read by anyone, written by staff)
create policy "polls_select_all" on public.community_polls
  for select using (true);

create policy "polls_staff_write" on public.community_polls
  for all using (
    public.current_role()::text in ('SUPPORT', 'REVIEWER', 'ADMIN', 'SUPER_ADMIN')
  );

-- Community Poll Votes Policies (Authenticated registered users can vote once)
create policy "poll_votes_select_all" on public.community_poll_votes
  for select using (true);

create policy "poll_votes_insert" on public.community_poll_votes
  for insert with check (auth.uid() = user_id);

-- User Suggestions Policies
create policy "suggestions_select" on public.user_suggestions
  for select using (
    auth.uid() = user_id or
    public.current_role()::text in ('SUPPORT', 'REVIEWER', 'ADMIN', 'SUPER_ADMIN')
  );

create policy "suggestions_insert" on public.user_suggestions
  for insert with check (auth.uid() = user_id);

create policy "suggestions_staff_update" on public.user_suggestions
  for update using (
    public.current_role()::text in ('SUPPORT', 'REVIEWER', 'ADMIN', 'SUPER_ADMIN')
  );
