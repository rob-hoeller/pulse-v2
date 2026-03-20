-- ============================================================
-- Pv2 Canonical Schema — Phase 0
-- Project: mrpxtbuezqrlxybnhyne (Schell Brothers HBx)
-- Generated: 2026-03-19 by Schellie 🦞
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ============================================================
-- ORGS & USERS
-- Multi-tenant: each Schell division is an org
-- ============================================================

create table if not exists orgs (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text not null unique,           -- e.g. "rehoboth", "richmond"
  division      text,                           -- DE, VA, TN, ID
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists users (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid not null references orgs(id) on delete cascade,
  email         text not null unique,
  full_name     text,
  role          text not null default 'osc',   -- osc | manager | admin
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- COMMUNITIES & LOTS
-- ============================================================

create table if not exists communities (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid not null references orgs(id) on delete cascade,
  name          text not null,
  city          text,
  state         text,
  zip           text,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists lots (
  id            uuid primary key default uuid_generate_v4(),
  community_id  uuid not null references communities(id) on delete cascade,
  lot_number    text not null,
  address       text,
  status        text default 'available',      -- available | reserved | sold | closed
  base_price    numeric(12,2),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- LEADS & PROSPECTS
-- Core Pv2 domain objects
-- ============================================================

create table if not exists leads (
  id                  uuid primary key default uuid_generate_v4(),
  org_id              uuid not null references orgs(id) on delete cascade,
  first_name          text not null,
  last_name           text not null,
  email               text,
  phone               text,
  source              text,                    -- web | referral | event | walk-in | etc
  status              text default 'new',      -- new | active | nurture | dead
  assigned_osc_id     uuid references users(id),
  community_id        uuid references communities(id),
  last_contacted_at   timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create table if not exists prospects (
  id                  uuid primary key default uuid_generate_v4(),
  org_id              uuid not null references orgs(id) on delete cascade,
  lead_id             uuid references leads(id),
  first_name          text not null,
  last_name           text not null,
  email               text,
  phone               text,
  stage               text default 'prospect', -- prospect | hot | contracted | closed | lost
  lot_id              uuid references lots(id),
  community_id        uuid references communities(id),
  assigned_osc_id     uuid references users(id),
  desired_move_in     date,
  budget_min          numeric(12,2),
  budget_max          numeric(12,2),
  last_contacted_at   timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ============================================================
-- ACTIVITIES & ENGAGEMENT
-- Timeline of all interactions
-- ============================================================

create table if not exists activities (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references orgs(id) on delete cascade,
  lead_id         uuid references leads(id),
  prospect_id     uuid references prospects(id),
  user_id         uuid references users(id),   -- who performed the activity
  type            text not null,               -- call | email | text | visit | note | task | ai_summary
  direction       text,                        -- inbound | outbound
  subject         text,
  body            text,
  outcome         text,
  duration_sec    integer,
  occurred_at     timestamptz default now(),
  created_at      timestamptz default now()
);

-- ============================================================
-- TASKS
-- ============================================================

create table if not exists tasks (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references orgs(id) on delete cascade,
  lead_id         uuid references leads(id),
  prospect_id     uuid references prospects(id),
  assigned_to_id  uuid references users(id),
  created_by_id   uuid references users(id),
  title           text not null,
  description     text,
  due_at          timestamptz,
  completed_at    timestamptz,
  status          text default 'open',         -- open | completed | cancelled
  priority        text default 'normal',       -- low | normal | high | urgent
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- AI OUTPUTS
-- Summaries, scores, recommendations from agent layer
-- ============================================================

create table if not exists ai_summaries (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references orgs(id) on delete cascade,
  lead_id         uuid references leads(id),
  prospect_id     uuid references prospects(id),
  model           text,                        -- which model generated this
  summary_type    text not null,               -- lead_summary | buying_signal | next_action | risk_flag
  content         text not null,
  confidence      numeric(4,3),               -- 0.000 - 1.000
  generated_at    timestamptz default now(),
  created_at      timestamptz default now()
);

create table if not exists lead_scores (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references orgs(id) on delete cascade,
  lead_id         uuid references leads(id),
  prospect_id     uuid references prospects(id),
  score           integer not null,            -- 0-100
  score_version   text,                        -- scoring model version
  factors         jsonb,                       -- breakdown of what drove the score
  scored_at       timestamptz default now(),
  created_at      timestamptz default now()
);

-- ============================================================
-- COMPETITIVE INTELLIGENCE
-- Written by Competitive Analysis Agent, read by Shelley
-- ============================================================

create table if not exists competitive_intelligence (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references orgs(id) on delete cascade,
  builder_name    text not null,
  community_name  text,
  city            text,
  state           text,
  price_min       numeric(12,2),
  price_max       numeric(12,2),
  incentives      text,
  key_features    text,
  weaknesses      text,
  source_urls     jsonb,
  confidence      text default 'medium',       -- low | medium | high
  last_updated_at timestamptz default now(),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- AGENT RUN LOGS
-- Audit trail for all agent operations
-- ============================================================

create table if not exists agent_run_logs (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid references orgs(id),
  agent_name      text not null,               -- nemo | shelley | competitive-analysis | etc
  task_type       text,
  status          text default 'running',      -- running | success | failed | cancelled
  input_summary   text,
  output_summary  text,
  tokens_used     integer,
  duration_ms     integer,
  error_message   text,
  started_at      timestamptz default now(),
  completed_at    timestamptz,
  created_at      timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Each org sees only its own data
-- ============================================================

alter table orgs enable row level security;
alter table users enable row level security;
alter table communities enable row level security;
alter table lots enable row level security;
alter table leads enable row level security;
alter table prospects enable row level security;
alter table activities enable row level security;
alter table tasks enable row level security;
alter table ai_summaries enable row level security;
alter table lead_scores enable row level security;
alter table competitive_intelligence enable row level security;
alter table agent_run_logs enable row level security;

-- Service role bypasses RLS (for agents) — anon/authenticated obey it
-- RLS policies to be added per table when auth is wired up

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_leads_org_id on leads(org_id);
create index if not exists idx_leads_assigned_osc on leads(assigned_osc_id);
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_last_contacted on leads(last_contacted_at);

create index if not exists idx_prospects_org_id on prospects(org_id);
create index if not exists idx_prospects_stage on prospects(stage);
create index if not exists idx_prospects_community on prospects(community_id);
create index if not exists idx_prospects_assigned_osc on prospects(assigned_osc_id);

create index if not exists idx_activities_lead_id on activities(lead_id);
create index if not exists idx_activities_prospect_id on activities(prospect_id);
create index if not exists idx_activities_occurred_at on activities(occurred_at desc);

create index if not exists idx_tasks_assigned_to on tasks(assigned_to_id);
create index if not exists idx_tasks_due_at on tasks(due_at);
create index if not exists idx_tasks_status on tasks(status);

create index if not exists idx_competitive_intel_builder on competitive_intelligence(builder_name);
create index if not exists idx_competitive_intel_state on competitive_intelligence(state);

create index if not exists idx_ai_summaries_lead on ai_summaries(lead_id);
create index if not exists idx_ai_summaries_prospect on ai_summaries(prospect_id);
create index if not exists idx_ai_summaries_type on ai_summaries(summary_type);

-- ============================================================
-- SEED: Schell Brothers org
-- ============================================================

insert into orgs (id, name, slug, division)
values (
  '00000000-0000-0000-0000-000000000001',
  'Schell Brothers',
  'schell',
  'DE'
) on conflict (slug) do nothing;

-- ============================================================
-- Done. Pv2 Phase 0 schema deployed.
-- Tables: orgs, users, communities, lots, leads, prospects,
--         activities, tasks, ai_summaries, lead_scores,
--         competitive_intelligence, agent_run_logs
-- ============================================================
