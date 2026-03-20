-- =============================================================================
-- Pv2 Schema v2 — Pulse CRM for HBx Platform (Schell Brothers)
-- PostgreSQL / Supabase
-- Generated: 2026-03-20
-- Architect: Schellie (AI) + Lance Manlove (Director of Innovation)
--
-- Design principles:
--   1. Single-tenant rows via org_id on every table (multi-tenant safe)
--   2. RLS enforced on every table via org membership
--   3. Unified activity model (replaces Pv1's 16+ separate activity tables)
--   4. Contact lifecycle: marketing_contact → lead → prospect → home_owner
--   5. pgvector for transcript semantic search
--   6. All integration metadata stored in dedicated tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";       -- gen_random_uuid()
create extension if not exists "vector";          -- pgvector for embeddings
create extension if not exists "pg_trgm";         -- trigram fuzzy search on names/emails

-- ---------------------------------------------------------------------------
-- UTILITY: updated_at auto-trigger function
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

-- Contact lifecycle stage (the journey from unknown → owner)
create type contact_lifecycle as enum (
  'marketing_only',   -- pre-lead, marketing list only
  'lead',             -- showing interest
  'prospect',         -- under contract / actively buying
  'home_owner',       -- purchased
  'inactive',         -- no longer active
  'lost'              -- lost to competitor or dropped out
);

-- Activity channel — unified across all communication types
create type activity_channel as enum (
  'appointment',      -- in-person or Zoom meeting
  'follow_up',        -- scheduled follow-up task
  'phone_call',       -- inbound or outbound call
  'zoom_call',        -- Zoom Phone call (with optional recording)
  'email',            -- Outlook / SendGrid email
  'sms',              -- Twilio or Zoom SMS
  'note',             -- internal note
  'traffic',          -- walk-in traffic (community visit)
  'form_submission',  -- web form submission
  'chat',             -- future: in-app chat
  'other'
);

-- Direction of activity relative to CSM
create type activity_direction as enum (
  'inbound',
  'outbound',
  'internal'   -- notes, internal tasks
);

-- SMS provider
create type sms_provider as enum (
  'twilio',
  'zoom_sms'
);

-- Email send provider
create type email_provider as enum (
  'sendgrid',
  'outlook',
  'graph_api'
);

-- Transcript source platform
create type transcript_source as enum (
  'rilla',
  'zoom_recording',
  'zoom_phone',
  'manual_upload'
);

-- Webhook event source
create type webhook_source as enum (
  'zoom_meetings',
  'zoom_phone',
  'microsoft_graph',
  'mailchimp',
  'rilla',
  'sendgrid',
  'twilio'
);

-- Webhook processing status
create type webhook_status as enum (
  'received',
  'processing',
  'processed',
  'failed',
  'ignored'
);

-- CSM role within the org
create type csm_role as enum (
  'osc',        -- Online Sales Counselor
  'csm',        -- Community Sales Manager
  'manager',    -- Sales Manager
  'divmgr',     -- Division Manager
  'admin'       -- System admin
);

-- Notification delivery status
create type notification_status as enum (
  'pending',
  'delivered',
  'read',
  'dismissed'
);

-- Email draft status
create type email_draft_status as enum (
  'draft',      -- AI generated, not reviewed
  'reviewed',   -- CSM reviewed, not yet sent
  'approved',   -- approved for send
  'sent',       -- sent via provider
  'discarded'   -- discarded by CSM
);

-- Buying signal strength
create type signal_strength as enum (
  'weak',
  'moderate',
  'strong',
  'explicit'    -- customer said "I want to buy" explicitly
);

-- Mailchimp sync status
create type mailchimp_sync_status as enum (
  'pending',
  'syncing',
  'synced',
  'failed',
  'unsubscribed'
);

-- Integration type
create type integration_type as enum (
  'zoom_meetings',
  'zoom_phone',
  'microsoft_graph',
  'sendgrid',
  'twilio',
  'mailchimp',
  'rilla'
);

-- =============================================================================
-- LAYER 0: ORGANIZATIONS (multi-tenant root)
-- =============================================================================

create table if not exists orgs (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,                          -- e.g. "Schell Brothers"
  slug            text not null unique,                   -- e.g. "schell"
  domain          text,                                   -- primary email domain for auto-provisioning
  logo_url        text,
  settings        jsonb not null default '{}',            -- org-level config blob
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table orgs is 'Top-level multi-tenant organization root. All data scoped by org_id.';
comment on column orgs.slug is 'URL-safe identifier used in API routes and subdomains.';
comment on column orgs.settings is 'Flexible org-level settings: branding, feature flags, defaults.';

create trigger orgs_updated_at before update on orgs
  for each row execute function set_updated_at();

-- =============================================================================
-- LAYER 1: GEOGRAPHIC HIERARCHY
-- =============================================================================

create table if not exists divisions (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  name            text not null,                          -- e.g. "Delaware", "Virginia"
  code            text,                                   -- e.g. "DE", "VA", "TN", "ID"
  state           char(2),                                -- US state abbreviation
  timezone        text not null default 'America/New_York',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(org_id, code)
);
comment on table divisions is 'Geographic region grouping (above communities). Maps to Pv1 Division.';
comment on column divisions.code is 'Short identifier, e.g. DE, VA, TN, ID.';
comment on column divisions.timezone is 'IANA timezone for scheduling and business hours.';

create trigger divisions_updated_at before update on divisions
  for each row execute function set_updated_at();

-- =============================================================================
-- LAYER 2: USERS (CSMs, managers, admins)
-- =============================================================================

create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  division_id     uuid references divisions(id) on delete set null,
  -- Identity
  email           text not null,
  first_name      text not null,
  last_name       text not null,
  phone           text,
  avatar_url      text,
  -- Role
  role            csm_role not null default 'csm',
  is_active       boolean not null default true,
  -- Integration identifiers
  zoom_user_id    text,                                   -- Zoom user ID for Zoom Meetings/Phone
  outlook_email   text,                                   -- Outlook/Graph email (may differ from login)
  rilla_user_id   text,                                   -- Rilla platform user ID
  -- Auth (Supabase auth.users linkage)
  auth_user_id    uuid unique,                            -- references auth.users(id)
  -- Timestamps
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(org_id, email)
);
comment on table users is 'CSMs, managers, and admins. Maps to Pv1 Csm + User. One row per person.';
comment on column users.zoom_user_id is 'Zoom platform user ID. Used to correlate Zoom Phone calls and meetings.';
comment on column users.outlook_email is 'Microsoft 365 mailbox address. May differ from login email.';
comment on column users.rilla_user_id is 'Rilla rep ID for correlating transcript sessions.';
comment on column users.auth_user_id is 'Supabase auth.users.id link for JWT-based access.';

create trigger users_updated_at before update on users
  for each row execute function set_updated_at();

-- =============================================================================
-- LAYER 3: LOOKUP / REFERENCE TABLES
-- =============================================================================

create table if not exists rankings (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  label           text not null,                          -- e.g. "A", "B", "C", "Hot", "Warm"
  description     text,
  sort_order      int not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  unique(org_id, label)
);
comment on table rankings is 'Lead quality rankings (lookup). Maps to Pv1 Ranking table.';

create table if not exists lead_statuses (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  label           text not null,                          -- e.g. "Active", "Inactive", "Lost", "Won"
  lifecycle       contact_lifecycle not null default 'lead',
  is_terminal     boolean not null default false,         -- true = no further action expected
  sort_order      int not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  unique(org_id, label)
);
comment on table lead_statuses is 'Status labels for leads and prospects. Maps to Pv1 Status table.';
comment on column lead_statuses.is_terminal is 'True for Won/Lost/Closed — signals no further pipeline work.';

create table if not exists pipeline_stages (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  label           text not null,                          -- e.g. "New Lead", "Nurture", "Hot", "Under Contract"
  lifecycle       contact_lifecycle not null default 'lead',
  sort_order      int not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  unique(org_id, label)
);
comment on table pipeline_stages is 'Pipeline stage labels. Maps to Pv1 Stage table.';
comment on column pipeline_stages.lifecycle is 'Which lifecycle phase this stage belongs to.';

-- =============================================================================
-- LAYER 4: COMMUNITIES + LOTS
-- =============================================================================

create table if not exists communities (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  division_id     uuid references divisions(id) on delete set null,
  -- Identity
  name            text not null,
  slug            text,                                   -- URL-safe name
  -- Address
  address         text,
  city            text,
  state           char(2),
  zip             text,
  county          text,
  -- Business
  phone           text,
  website_url     text,
  -- Business hours (stored as jsonb for flexibility)
  business_hours  jsonb,                                  -- e.g. {"mon": "9-5", "sun": "closed"}
  -- Pricing
  price_from      numeric(12,2),
  price_to        numeric(12,2),
  -- Geo
  latitude        numeric(10,7),
  longitude       numeric(10,7),
  -- Status
  is_active       boolean not null default true,
  grand_opening_date date,
  close_out_date  date,
  -- Pv1 migration key
  pv1_community_id int,                                   -- original MySQL ID for migration
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table communities is 'Housing communities / subdivisions. Maps to Pv1 Community.';
comment on column communities.business_hours is 'JSON map of day → hours string. Flexible for varied schedules.';
comment on column communities.pv1_community_id is 'Original Pv1 MySQL community ID — used during migration only.';

create trigger communities_updated_at before update on communities
  for each row execute function set_updated_at();

create table if not exists floor_plans (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  community_id    uuid not null references communities(id) on delete cascade,
  name            text not null,                          -- e.g. "The Belhaven", "The Magnolia"
  description     text,
  -- Dimensions
  sq_ft_min       int,
  sq_ft_max       int,
  bedrooms_min    int,
  bedrooms_max    int,
  bathrooms_min   numeric(3,1),
  bathrooms_max   numeric(3,1),
  stories         int,
  -- Pricing
  base_price      numeric(12,2),
  -- Media
  brochure_url    text,
  renderings_urls jsonb,                                  -- array of image URLs
  -- Status
  is_active       boolean not null default true,
  -- Pv1 migration
  pv1_floor_plan_id int,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table floor_plans is 'Home floor plans available within a community. Maps to Pv1 Floor_Plan.';
comment on column floor_plans.renderings_urls is 'JSON array of rendering/image URLs for this plan.';

create trigger floor_plans_updated_at before update on floor_plans
  for each row execute function set_updated_at();

create table if not exists home_sites (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  community_id    uuid not null references communities(id) on delete cascade,
  floor_plan_id   uuid references floor_plans(id) on delete set null,
  -- Identity
  lot_number      text not null,                          -- e.g. "42", "A-7"
  section         text,                                   -- subdivision section
  block           text,
  -- Address
  address         text,
  -- Geo
  latitude        numeric(10,7),
  longitude       numeric(10,7),
  -- Physical
  lot_sq_ft       int,
  -- Pricing
  base_price      numeric(12,2),
  premium         numeric(12,2),                          -- lot premium above floor plan base
  -- Status
  status          text not null default 'available',      -- available, reserved, under_contract, closed
  is_available    boolean not null default true,
  -- Pv1 migration (replaces old `lots` table)
  pv1_lot_id      int,                                    -- original Pv1 Home_Site/lot ID
  pv1_lot_uuid    uuid,                                   -- Phase 0 lots.id if already migrated
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(community_id, lot_number)
);
comment on table home_sites is 'Individual lots/home sites within a community. Replaces Phase 0 `lots` table. Maps to Pv1 Home_Site.';
comment on column home_sites.premium is 'Additional cost above floor plan base price for this specific lot.';
comment on column home_sites.pv1_lot_uuid is 'Phase 0 lots.id reference — used to remap FKs during migration.';

create trigger home_sites_updated_at before update on home_sites
  for each row execute function set_updated_at();

-- =============================================================================
-- LAYER 5: REALTORS + AGENCIES
-- =============================================================================

create table if not exists agencies (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  name            text not null,
  website         text,
  phone           text,
  address         text,
  city            text,
  state           char(2),
  zip             text,
  is_preferred    boolean not null default false,         -- preferred referral partner
  is_active       boolean not null default true,
  pv1_agency_id   int,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table agencies is 'Real estate agencies. Maps to Pv1 Agency. Parent of realtors.';

create trigger agencies_updated_at before update on agencies
  for each row execute function set_updated_at();

create table if not exists realtors (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  agency_id       uuid references agencies(id) on delete set null,
  -- Identity
  first_name      text not null,
  last_name       text not null,
  email           text,
  phone           text,
  license_number  text,
  -- Preferences
  preferred_communities jsonb,                            -- array of community_ids they work in
  is_active       boolean not null default true,
  -- Pv1 migration
  pv1_realtor_id  int,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table realtors is 'Individual real estate agents who refer buyers. Maps to Pv1 Realtor.';
comment on column realtors.preferred_communities is 'JSON array of community UUIDs this realtor actively works.';

create trigger realtors_updated_at before update on realtors
  for each row execute function set_updated_at();

-- =============================================================================
-- LAYER 6: CONTACT LIFECYCLE
-- =============================================================================

-- ---------------------------------------------------------------------------
-- marketing_contacts: pre-lead, marketing-only contacts
-- ---------------------------------------------------------------------------
create table if not exists marketing_contacts (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  -- Identity
  first_name      text,
  last_name       text,
  email           text,
  phone           text,
  -- Address
  address         text,
  city            text,
  state           char(2),
  zip             text,
  -- Source
  source          text,                                   -- utm_source, form name, etc.
  source_detail   jsonb,                                  -- full UTM params, form fields
  -- Marketing
  mailchimp_member_id text,                               -- Mailchimp contact ID
  mailchimp_list_id   text,                               -- Mailchimp audience/list ID
  is_subscribed   boolean not null default true,
  unsubscribed_at timestamptz,
  -- Lifecycle
  converted_to_lead_id uuid,                              -- FK set when they become a lead
  converted_at    timestamptz,
  -- Pv1 migration
  pv1_marketing_only_id int,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table marketing_contacts is 'Pre-lead marketing-only contacts. Maps to Pv1 Marketing_Only. Converts to leads.';
comment on column marketing_contacts.source_detail is 'Full source metadata: UTM params, form answers, referral info.';
comment on column marketing_contacts.converted_to_lead_id is 'Set when contact is promoted to a lead record.';

create trigger marketing_contacts_updated_at before update on marketing_contacts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- contacts: unified customer base entity (was Pv1 Customer)
-- ---------------------------------------------------------------------------
create table if not exists contacts (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  -- Pv1 source IDs
  marketing_contact_id uuid references marketing_contacts(id) on delete set null,
  realtor_id      uuid references realtors(id) on delete set null,
  -- Identity
  first_name      text not null,
  last_name       text not null,
  email           text,
  email_secondary text,
  phone           text,
  phone_secondary text,
  -- Address
  address         text,
  city            text,
  state           char(2),
  zip             text,
  -- Demographics (optional, used for scoring)
  birth_year      int,
  occupation      text,
  -- Source / attribution
  source          text,                                   -- "website", "realtor", "walk-in", "event"
  source_detail   jsonb,                                  -- UTM, form, referral detail
  -- Lifecycle
  lifecycle       contact_lifecycle not null default 'lead',
  -- External IDs
  mailchimp_member_id text,
  -- Do-not-contact flags
  do_not_call     boolean not null default false,
  do_not_email    boolean not null default false,
  do_not_text     boolean not null default false,
  -- Pv1 migration
  pv1_customer_id int,                                    -- Pv1 Customer.id
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table contacts is 'Unified customer base entity. Maps to Pv1 Customer. All leads/prospects/owners reference this.';
comment on column contacts.lifecycle is 'Current stage in the contact lifecycle — denormalized for fast filtering.';
comment on column contacts.do_not_call is 'TCPA compliance flag — never call if true.';
comment on column contacts.pv1_customer_id is 'Pv1 MySQL Customer.id for migration mapping.';

create trigger contacts_updated_at before update on contacts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- leads: initial interest stage
-- ---------------------------------------------------------------------------
create table if not exists leads (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  contact_id      uuid not null references contacts(id) on delete cascade,
  -- Assignment
  csm_id          uuid references users(id) on delete set null,       -- assigned CSM
  community_id    uuid references communities(id) on delete set null,
  division_id     uuid references divisions(id) on delete set null,
  -- Realtor referral
  realtor_id      uuid references realtors(id) on delete set null,
  -- Lookup FKs (replaces Pv1 integer FKs to ranking/status/stage)
  ranking_id      uuid references rankings(id) on delete set null,
  status_id       uuid references lead_statuses(id) on delete set null,
  stage_id        uuid references pipeline_stages(id) on delete set null,
  -- Source
  source          text,                                   -- "website", "realtor", "walk-in", "event"
  source_detail   jsonb,
  -- Marketing origin
  marketing_contact_id uuid references marketing_contacts(id) on delete set null,
  -- Notes
  notes           text,
  -- Activity timestamps (denormalized for fast queries — updated by triggers/application)
  last_activity_at     timestamptz,                       -- any activity
  last_activity_in_at  timestamptz,                       -- last inbound activity
  last_activity_out_at timestamptz,                       -- last outbound activity
  last_phone_call_at   timestamptz,
  last_email_at        timestamptz,
  last_text_at         timestamptz,
  last_appointment_at  timestamptz,
  -- Lifecycle
  is_active       boolean not null default true,
  converted_to_prospect_at timestamptz,                   -- set when lead upgrades
  lost_at         timestamptz,
  lost_reason     text,
  -- Pv1 migration
  pv1_lead_id     int,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table leads is 'Lead stage — initial buyer interest. Maps to Pv1 Lead. Child of contacts.';
comment on column leads.division_id is 'Denormalized from community for fast division-level reporting.';
comment on column leads.last_activity_in_at is 'Most recent inbound activity (customer initiated). Used for follow-up cadence.';
comment on column leads.last_activity_out_at is 'Most recent outbound activity (CSM initiated). Used for outreach cadence.';
comment on column leads.marketing_contact_id is 'Originating marketing_contacts row — preserves attribution chain.';

create trigger leads_updated_at before update on leads
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- prospects: under contract / actively buying
-- ---------------------------------------------------------------------------
create table if not exists prospects (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  lead_id         uuid references leads(id) on delete set null,        -- original lead record
  contact_id      uuid not null references contacts(id) on delete cascade,
  -- Assignment
  csm_id          uuid references users(id) on delete set null,
  community_id    uuid references communities(id) on delete set null,
  division_id     uuid references divisions(id) on delete set null,
  -- Realtor
  realtor_id      uuid references realtors(id) on delete set null,
  -- Home selection
  home_site_id    uuid references home_sites(id) on delete set null,
  floor_plan_id   uuid references floor_plans(id) on delete set null,
  -- Lookup FKs
  ranking_id      uuid references rankings(id) on delete set null,
  status_id       uuid references lead_statuses(id) on delete set null,
  stage_id        uuid references pipeline_stages(id) on delete set null,
  -- Contract details
  contract_date       date,
  estimated_move_in   date,
  -- Budget
  budget_min      numeric(12,2),
  budget_max      numeric(12,2),
  -- Activity timestamps
  last_activity_at     timestamptz,
  last_activity_in_at  timestamptz,
  last_activity_out_at timestamptz,
  last_phone_call_at   timestamptz,
  last_email_at        timestamptz,
  last_text_at         timestamptz,
  last_appointment_at  timestamptz,
  -- Notes
  notes           text,
  -- Pv1 migration
  pv1_prospect_id int,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table prospects is 'Prospect stage — buyer under contract or actively selecting. Maps to Pv1 Prospect.';
comment on column prospects.lead_id is 'Original lead record this prospect was promoted from. May be null for direct imports.';
comment on column prospects.contract_date is 'Date the purchase contract was signed.';
comment on column prospects.estimated_move_in is 'Estimated settlement / move-in date.';

create trigger prospects_updated_at before update on prospects
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- home_owners: completed purchase
-- ---------------------------------------------------------------------------
create table if not exists home_owners (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  prospect_id     uuid references prospects(id) on delete set null,
  lead_id         uuid references leads(id) on delete set null,
  contact_id      uuid not null references contacts(id) on delete cascade,
  -- Home
  home_site_id    uuid references home_sites(id) on delete set null,
  floor_plan_id   uuid references floor_plans(id) on delete set null,
  community_id    uuid references communities(id) on delete set null,
  division_id     uuid references divisions(id) on delete set null,
  -- CSM
  csm_id          uuid references users(id) on delete set null,
  -- Realtor
  realtor_id      uuid references realtors(id) on delete set null,
  -- Transaction
  purchase_price  numeric(12,2),
  settlement_date date,
  move_in_date    date,
  -- Pv1 migration
  pv1_home_owner_id int,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table home_owners is 'Home Owner stage — completed purchase. Maps to Pv1 Home_Owner.';
comment on column home_owners.settlement_date is 'Closing / settlement date when title transferred.';

create trigger home_owners_updated_at before update on home_owners
  for each row execute function set_updated_at();

-- =============================================================================
-- LAYER 7: UNIFIED ACTIVITY MODEL
-- =============================================================================

create table if not exists activities (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  -- Who did / received the activity
  user_id         uuid references users(id) on delete set null,        -- CSM who performed it
  contact_id      uuid references contacts(id) on delete set null,     -- contact involved
  -- Polymorphic entity reference (which stage the contact was in at time of activity)
  lead_id         uuid references leads(id) on delete set null,
  prospect_id     uuid references prospects(id) on delete set null,
  home_owner_id   uuid references home_owners(id) on delete set null,
  realtor_id      uuid references realtors(id) on delete set null,     -- realtor activities
  -- Activity classification
  channel         activity_channel not null,
  direction       activity_direction not null default 'outbound',
  -- Content
  subject         text,                                                 -- email subject, call topic, etc.
  body            text,                                                 -- notes, email body, SMS text
  summary         text,                                                 -- AI-generated or manual summary
  outcome         text,                                                 -- result of activity
  -- Scheduling
  scheduled_at    timestamptz,                                          -- for appointments / follow-ups
  completed_at    timestamptz,                                          -- when it actually happened
  duration_seconds int,                                                 -- for calls and meetings
  -- Zoom integration
  zoom_meeting_id     text,                                             -- Zoom meeting_id
  zoom_link           text,                                             -- join_url from Zoom API
  zoom_recording_url  text,                                             -- cloud recording URL
  -- Rilla integration
  rilla_session_id    text,                                             -- Rilla session/meeting ID
  -- External message IDs (dedup and webhook correlation)
  external_message_id text,                                             -- Outlook message_id, Zoom SMS ID
  -- Email-specific
  from_address    text,
  to_addresses    jsonb,                                                -- array of email addresses
  email_provider  email_provider,
  -- SMS-specific
  sms_provider    sms_provider,
  -- Status
  is_completed    boolean not null default false,
  is_cancelled    boolean not null default false,
  -- Pv1 migration (tracks original source table + id)
  pv1_source_table  text,                                               -- e.g. "lead_appointment"
  pv1_source_id     int,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table activities is 'Unified activity log. Replaces Pv1''s 16+ separate activity tables (Lead/Prospect/Homeowner/Realtor × Appointment/FollowUp/PhoneCall/Note/Traffic/Email).';
comment on column activities.channel is 'Communication channel: appointment, phone_call, zoom_call, email, sms, note, traffic, etc.';
comment on column activities.direction is 'inbound = customer contacted us; outbound = we contacted customer; internal = notes/tasks.';
comment on column activities.zoom_meeting_id is 'Zoom meeting ID from Zoom Meetings API.';
comment on column activities.rilla_session_id is 'Rilla session ID — links to transcripts table.';
comment on column activities.external_message_id is 'Dedup key: Outlook message_id, Zoom SMS message ID, etc.';
comment on column activities.pv1_source_table is 'Migration tracking: which Pv1 table this row came from.';

create trigger activities_updated_at before update on activities
  for each row execute function set_updated_at();

-- =============================================================================
-- LAYER 8: TASKS
-- =============================================================================

create table if not exists tasks (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  -- Assignment
  assigned_to     uuid references users(id) on delete set null,
  created_by      uuid references users(id) on delete set null,
  -- Related entity
  contact_id      uuid references contacts(id) on delete set null,
  lead_id         uuid references leads(id) on delete set null,
  prospect_id     uuid references prospects(id) on delete set null,
  activity_id     uuid references activities(id) on delete set null,   -- spawned by an activity
  -- Content
  title           text not null,
  description     text,
  -- Scheduling
  due_at          timestamptz,
  completed_at    timestamptz,
  -- Priority / status
  priority        text not null default 'normal',                       -- low, normal, high, urgent
  is_completed    boolean not null default false,
  is_cancelled    boolean not null default false,
  -- Source
  source          text,                                                 -- "ai_suggested", "manual", "follow_up"
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table tasks is 'Action items and follow-up tasks for CSMs. Extends Phase 0 tasks table.';
comment on column tasks.source is '"ai_suggested" = created by AI agent; "follow_up" = from activity follow-up scheduling.';

create trigger tasks_updated_at before update on tasks
  for each row execute function set_updated_at();

-- =============================================================================
-- LAYER 9: COMMUNICATIONS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- sms_log: all outbound SMS (Twilio system SMS + Zoom SMS conversations)
-- ---------------------------------------------------------------------------
create table if not exists sms_log (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  -- Links
  activity_id     uuid references activities(id) on delete set null,
  contact_id      uuid references contacts(id) on delete set null,
  user_id         uuid references users(id) on delete set null,
  -- Message
  provider        sms_provider not null,
  direction       activity_direction not null default 'outbound',
  from_number     text not null,
  to_number       text not null,
  body            text not null,
  -- Provider metadata
  provider_message_id   text,                                           -- Twilio SID or Zoom SMS ID
  provider_status       text,                                           -- delivered, failed, queued
  provider_error        text,
  provider_metadata     jsonb,                                          -- raw provider response
  -- Timestamps
  sent_at         timestamptz,
  delivered_at    timestamptz,
  created_at      timestamptz not null default now()
);
comment on table sms_log is 'All SMS messages: Twilio system alerts + Zoom SMS conversations. Maps to Pv1 nowhere — net new.';
comment on column sms_log.provider_message_id is 'Twilio MessageSid or Zoom SMS message ID for dedup and status tracking.';

-- ---------------------------------------------------------------------------
-- email_drafts: AI-generated email drafts pending CSM review
-- ---------------------------------------------------------------------------
create table if not exists email_drafts (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  -- Addressees
  to_user_id      uuid references users(id) on delete set null,        -- CSM who will send
  contact_id      uuid references contacts(id) on delete set null,
  lead_id         uuid references leads(id) on delete set null,
  prospect_id     uuid references prospects(id) on delete set null,
  -- Content
  subject         text not null,
  body_html       text,
  body_text       text,
  -- AI provenance
  generated_by    text,                                                 -- model name, e.g. "claude-3-7-sonnet"
  generation_prompt text,                                               -- prompt used to generate this draft
  context_summary text,                                                 -- summary of context used (transcript, etc.)
  -- Status
  status          email_draft_status not null default 'draft',
  reviewed_by     uuid references users(id) on delete set null,
  reviewed_at     timestamptz,
  sent_at         timestamptz,
  sent_via        email_provider,
  provider_message_id text,                                             -- SendGrid message ID or Outlook message_id
  -- Linked activity (created when sent)
  activity_id     uuid references activities(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table email_drafts is 'AI-generated email drafts awaiting CSM review before sending. Net new Pv2 table.';
comment on column email_drafts.generation_prompt is 'Full prompt used — retained for audit and improvement.';
comment on column email_drafts.context_summary is 'Human-readable summary of the AI context (transcript excerpts, lead history).';

create trigger email_drafts_updated_at before update on email_drafts
  for each row execute function set_updated_at();

-- =============================================================================
-- LAYER 10: AI + TRANSCRIPTS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- transcripts: Rilla + Zoom recording transcripts
-- ---------------------------------------------------------------------------
create table if not exists transcripts (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  -- Source
  source          transcript_source not null,
  external_id     text,                                                 -- Rilla session ID or Zoom recording ID
  -- Links
  activity_id     uuid references activities(id) on delete set null,
  contact_id      uuid references contacts(id) on delete set null,
  lead_id         uuid references leads(id) on delete set null,
  prospect_id     uuid references prospects(id) on delete set null,
  user_id         uuid references users(id) on delete set null,        -- primary CSM in the conversation
  -- Content
  raw_transcript  text,                                                 -- full plain-text transcript
  transcript_json jsonb,                                                -- structured: [{speaker, start_ms, end_ms, text}]
  language        text not null default 'en',
  duration_seconds int,
  -- AI processing
  summary         text,                                                 -- AI-generated summary of the conversation
  embedding       vector(1536),                                         -- text-embedding-3-small or equivalent
  embedding_model text,                                                 -- model name used for embedding
  embedding_at    timestamptz,                                          -- when embedding was generated
  processed_at    timestamptz,                                          -- when AI extraction ran
  -- Metadata
  recorded_at     timestamptz,                                          -- when the session occurred
  participants    jsonb,                                                 -- [{name, role, speaker_label}]
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table transcripts is 'Full transcripts from Rilla and Zoom recordings. Includes pgvector embedding for semantic search. Net new Pv2 table.';
comment on column transcripts.raw_transcript is 'Plain text concatenation of all turns — used for LLM context.';
comment on column transcripts.transcript_json is 'Structured array: [{speaker, start_ms, end_ms, text}] for diarized display.';
comment on column transcripts.embedding is 'Vector embedding (pgvector) of the transcript text for semantic similarity search.';
comment on column transcripts.participants is 'JSON array of participants: name, role (csm/customer/realtor), speaker label from diarization.';

create trigger transcripts_updated_at before update on transcripts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- buying_signals: extracted signals from transcripts
-- ---------------------------------------------------------------------------
create table if not exists buying_signals (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  transcript_id   uuid not null references transcripts(id) on delete cascade,
  -- Links
  contact_id      uuid references contacts(id) on delete set null,
  lead_id         uuid references leads(id) on delete set null,
  prospect_id     uuid references prospects(id) on delete set null,
  -- Signal
  signal_type     text not null,                                        -- "price_question", "timeline_urgency", "competitor_mention", "explicit_intent"
  strength        signal_strength not null default 'moderate',
  quote           text,                                                 -- verbatim quote from transcript
  context         text,                                                 -- surrounding context for the quote
  speaker_role    text,                                                 -- "customer", "csm", "realtor"
  timestamp_ms    int,                                                  -- position in transcript (milliseconds)
  -- AI provenance
  extracted_by    text,                                                 -- model name
  confidence      numeric(4,3),                                         -- 0.000 to 1.000
  -- Review
  is_reviewed     boolean not null default false,
  reviewed_by     uuid references users(id) on delete set null,
  is_valid        boolean,                                              -- null = unreviewed
  created_at      timestamptz not null default now()
);
comment on table buying_signals is 'Buying signals extracted from transcripts by AI. Used to update lead scores. Net new Pv2.';
comment on column buying_signals.signal_type is 'Categorized signal type: price_question, timeline_urgency, competitor_mention, explicit_intent, objection, etc.';
comment on column buying_signals.quote is 'Verbatim excerpt from the transcript that triggered this signal.';
comment on column buying_signals.confidence is 'AI confidence score 0-1. Below 0.5 should be flagged for review.';

-- ---------------------------------------------------------------------------
-- ai_summaries: AI-generated summaries for leads/prospects (from Phase 0)
-- ---------------------------------------------------------------------------
create table if not exists ai_summaries (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  -- Polymorphic entity
  entity_type     text not null,                                        -- "lead", "prospect", "contact", "community"
  entity_id       uuid not null,
  -- Content
  summary_type    text not null,                                        -- "profile", "timeline", "next_action", "weekly_digest"
  content         text not null,
  model           text,                                                 -- LLM model name
  prompt_version  text,                                                 -- prompt template version
  -- Expiry
  expires_at      timestamptz,                                          -- summaries can be stale; regenerate after expiry
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table ai_summaries is 'AI-generated summaries for any entity. Phase 0 table retained and extended.';
comment on column ai_summaries.entity_type is 'Which entity type: "lead", "prospect", "contact", "community", "transcript".';
comment on column ai_summaries.summary_type is '"profile" = who is this person; "next_action" = what should CSM do next; "weekly_digest" = weekly rollup.';
comment on column ai_summaries.expires_at is 'Summaries expire and must be regenerated. Null = permanent.';

create trigger ai_summaries_updated_at before update on ai_summaries
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- lead_scores: AI-computed lead quality scores (from Phase 0)
-- ---------------------------------------------------------------------------
create table if not exists lead_scores (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  lead_id         uuid references leads(id) on delete cascade,
  prospect_id     uuid references prospects(id) on delete cascade,
  -- Scores
  score           numeric(5,2) not null,                                -- 0-100
  score_breakdown jsonb,                                                -- {engagement: 30, recency: 25, ...}
  signals_used    jsonb,                                                -- array of buying_signal IDs used
  model           text,
  -- Snapshot
  scored_at       timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
comment on table lead_scores is 'AI-computed lead/prospect quality scores. Phase 0 table retained.';
comment on column lead_scores.score_breakdown is 'Component scores contributing to overall score.';
comment on column lead_scores.signals_used is 'Array of buying_signal UUIDs that fed into this score.';

-- ---------------------------------------------------------------------------
-- competitive_intelligence: market/competitor data (from Phase 0)
-- ---------------------------------------------------------------------------
create table if not exists competitive_intelligence (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  community_id    uuid references communities(id) on delete set null,
  -- Source
  source_type     text not null,                                        -- "transcript", "web", "manual", "csm_note"
  transcript_id   uuid references transcripts(id) on delete set null,  -- if extracted from transcript
  -- Intel
  competitor_name text,
  intel_type      text not null,                                        -- "pricing", "incentive", "product", "timing"
  content         text not null,
  raw_quote       text,                                                 -- verbatim if from transcript
  -- Validity
  observed_at     date,
  expires_at      date,
  is_verified     boolean not null default false,
  created_by      uuid references users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table competitive_intelligence is 'Competitive intel from transcripts, web research, and CSM notes. Phase 0 table extended.';
comment on column competitive_intelligence.transcript_id is 'If this intel was extracted from a transcript, link here.';

create trigger competitive_intelligence_updated_at before update on competitive_intelligence
  for each row execute function set_updated_at();

-- =============================================================================
-- LAYER 11: INTEGRATIONS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- integration_credentials: per-org integration config (encrypted references)
-- ---------------------------------------------------------------------------
create table if not exists integration_credentials (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  integration     integration_type not null,
  -- Credentials are stored as references to Vault / environment — never plaintext
  -- Store the secret name/path in your secrets manager; values come from env/vault
  config          jsonb not null default '{}',                          -- non-secret config (scopes, webhook URLs, etc.)
  secret_ref      text,                                                 -- Vault path or secret name (never the actual secret)
  -- Status
  is_active       boolean not null default true,
  last_validated_at timestamptz,
  validation_error  text,
  -- Scoping
  scoped_to_user_id uuid references users(id) on delete set null,      -- null = org-wide; set for per-user Outlook auth
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(org_id, integration, coalesce(scoped_to_user_id, '00000000-0000-0000-0000-000000000000'::uuid))
);
comment on table integration_credentials is 'Per-org (and per-user for Outlook) integration configuration. Secrets stored as Vault references only.';
comment on column integration_credentials.secret_ref is 'Path/name in secrets manager (Vault, AWS SSM, Supabase secrets). Never store the actual secret here.';
comment on column integration_credentials.scoped_to_user_id is 'Null = shared org credential. Set = per-user OAuth token (Microsoft Graph per user).';

create trigger integration_credentials_updated_at before update on integration_credentials
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- webhook_events: raw inbound webhook log
-- ---------------------------------------------------------------------------
create table if not exists webhook_events (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references orgs(id) on delete set null,         -- may be null if org not yet identified
  -- Source
  source          webhook_source not null,
  event_type      text not null,                                        -- e.g. "meeting.ended", "message.received"
  external_event_id text,                                               -- provider's event ID for dedup
  -- Payload
  headers         jsonb,                                                -- raw HTTP headers
  payload         jsonb not null,                                       -- raw webhook body
  -- Processing
  status          webhook_status not null default 'received',
  processed_at    timestamptz,
  error           text,
  retry_count     int not null default 0,
  -- Links (set after processing)
  activity_id     uuid references activities(id) on delete set null,
  transcript_id   uuid references transcripts(id) on delete set null,
  received_at     timestamptz not null default now()
);
comment on table webhook_events is 'Raw inbound webhook log from all providers. Enables idempotent processing and replay. Net new Pv2.';
comment on column webhook_events.external_event_id is 'Provider event ID — used for dedup. Check before processing.';
comment on column webhook_events.status is 'Processing state machine: received → processing → processed | failed | ignored.';
comment on column webhook_events.retry_count is 'Number of processing retries. Alert if > 3.';

-- ---------------------------------------------------------------------------
-- email_subscriptions: Microsoft Graph webhook subscription tracking
-- ---------------------------------------------------------------------------
create table if not exists email_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade, -- whose mailbox
  -- Graph subscription
  subscription_id       text not null unique,                           -- Microsoft Graph subscription ID
  client_state          text,                                           -- HMAC secret for notification validation
  notification_url      text not null,                                  -- our webhook endpoint URL
  resource              text not null,                                  -- Graph resource (e.g. "me/messages")
  change_types          jsonb not null,                                 -- ["created", "updated"]
  expiration_datetime   timestamptz not null,                           -- Graph subscriptions expire; must renew
  -- Status
  is_active       boolean not null default true,
  last_renewed_at timestamptz,
  last_received_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table email_subscriptions is 'Microsoft Graph webhook subscriptions per user mailbox. Maps to Pv1 EmailSubscription.';
comment on column email_subscriptions.client_state is 'HMAC secret sent with notifications for validation. Store securely.';
comment on column email_subscriptions.expiration_datetime is 'Graph subscriptions max 3 days (Outlook). Must be renewed proactively.';

create trigger email_subscriptions_updated_at before update on email_subscriptions
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- mailchimp_sync_log: audience sync tracking
-- ---------------------------------------------------------------------------
create table if not exists mailchimp_sync_log (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  -- What was synced
  contact_id      uuid references contacts(id) on delete set null,
  marketing_contact_id uuid references marketing_contacts(id) on delete set null,
  -- Mailchimp identifiers
  list_id         text not null,                                        -- Mailchimp audience/list ID
  member_id       text,                                                 -- Mailchimp member ID (md5 of email)
  -- Sync details
  status          mailchimp_sync_status not null default 'pending',
  direction       text not null default 'push',                         -- "push" (us→Mailchimp) or "pull"
  action          text,                                                 -- "subscribe", "unsubscribe", "update", "archive"
  tags_applied    jsonb,                                                -- Mailchimp tags set on this sync
  error           text,
  synced_at       timestamptz,
  created_at      timestamptz not null default now()
);
comment on table mailchimp_sync_log is 'Audit log of all Mailchimp audience sync operations. Net new Pv2.';
comment on column mailchimp_sync_log.member_id is 'MD5 hash of lowercase email — Mailchimp''s member identifier.';
comment on column mailchimp_sync_log.tags_applied is 'JSON array of Mailchimp tags applied during this sync (community, lifecycle stage, etc.).';

-- =============================================================================
-- LAYER 12: FORMS + NOTIFICATIONS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- form_submissions: web form submissions
-- ---------------------------------------------------------------------------
create table if not exists form_submissions (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  -- Links (set after processing)
  contact_id      uuid references contacts(id) on delete set null,
  marketing_contact_id uuid references marketing_contacts(id) on delete set null,
  lead_id         uuid references leads(id) on delete set null,
  community_id    uuid references communities(id) on delete set null,
  -- Form identity
  form_name       text not null,                                        -- "contact_us", "schedule_visit", "request_info"
  form_url        text,
  -- Attribution
  ip_address      text,
  user_agent      text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_content     text,
  utm_term        text,
  referrer_url    text,
  -- Status
  is_processed    boolean not null default false,
  processed_at    timestamptz,
  -- Pv1 migration
  pv1_form_submission_id int,
  submitted_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
comment on table form_submissions is 'Web form submissions. Maps to Pv1 Form_Submission. Details in form_submission_details.';
comment on column form_submissions.is_processed is 'True once a contact/lead record has been created from this submission.';

create table if not exists form_submission_details (
  id              uuid primary key default gen_random_uuid(),
  form_submission_id uuid not null references form_submissions(id) on delete cascade,
  field_name      text not null,
  field_value     text,
  sort_order      int not null default 0
);
comment on table form_submission_details is 'Individual field values from a form submission. Maps to Pv1 Form_Submission_Detail.';

-- ---------------------------------------------------------------------------
-- notification_templates: template system for notifications
-- ---------------------------------------------------------------------------
create table if not exists notification_templates (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  key             text not null,                                        -- machine key, e.g. "lead_assigned", "task_due"
  label           text not null,
  -- Template content (supports {token} replacement)
  title_template  text not null,                                        -- e.g. "New lead: {contact_name}"
  body_template   text not null,                                        -- e.g. "{contact_name} submitted a form for {community_name}"
  available_tokens jsonb,                                               -- ["contact_name", "community_name", ...]
  -- Channels
  send_in_app     boolean not null default true,
  send_email      boolean not null default false,
  send_sms        boolean not null default false,
  is_active       boolean not null default true,
  -- Pv1 migration
  pv1_notification_description_id int,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(org_id, key)
);
comment on table notification_templates is 'Notification message templates with {token} substitution. Maps to Pv1 Notification_Description.';
comment on column notification_templates.key is 'Machine-readable key used to trigger this template from code.';
comment on column notification_templates.available_tokens is 'JSON array of valid {token} names for this template.';

create trigger notification_templates_updated_at before update on notification_templates
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- notifications: user-facing in-app notifications
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade, -- recipient
  template_id     uuid references notification_templates(id) on delete set null,
  -- Content (rendered from template or ad-hoc)
  title           text not null,
  body            text,
  -- Link
  action_url      text,                                                 -- deep link URL
  -- Related entity
  entity_type     text,                                                 -- "lead", "prospect", "task"
  entity_id       uuid,
  -- Status
  status          notification_status not null default 'pending',
  delivered_at    timestamptz,
  read_at         timestamptz,
  dismissed_at    timestamptz,
  -- Pv1 migration
  pv1_notification_id int,
  created_at      timestamptz not null default now()
);
comment on table notifications is 'In-app notifications for CSMs. Maps to Pv1 Csm_Notification.';
comment on column notifications.action_url is 'Deep link to the relevant entity in the UI.';

-- =============================================================================
-- LAYER 13: AUDIT + VERSIONING
-- =============================================================================

create table if not exists version_history (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references orgs(id) on delete set null,
  -- What changed
  entity_type     text not null,                                        -- table name
  entity_id       uuid not null,
  -- Change details
  operation       text not null,                                        -- INSERT, UPDATE, DELETE
  changed_by      uuid references users(id) on delete set null,
  changed_fields  jsonb,                                                -- {field: {old, new}}
  old_values      jsonb,
  new_values      jsonb,
  -- Context
  ip_address      text,
  user_agent      text,
  changed_at      timestamptz not null default now()
);
comment on table version_history is 'Audit log of all entity changes. Maps to Pv1 Version_History and Activity_Report.';
comment on column version_history.changed_fields is 'JSON map of changed field names to {old, new} values.';

create index version_history_entity_idx on version_history(entity_type, entity_id);
create index version_history_changed_at_idx on version_history(changed_at desc);

-- ---------------------------------------------------------------------------
-- agent_run_logs: AI agent execution audit trail (from Phase 0)
-- ---------------------------------------------------------------------------
create table if not exists agent_run_logs (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references orgs(id) on delete set null,
  -- Agent identity
  agent_name      text not null,                                        -- "lead_scorer", "email_drafter", "signal_extractor"
  agent_version   text,
  -- Input/Output
  trigger_type    text,                                                 -- "webhook", "cron", "manual", "event"
  trigger_payload jsonb,
  -- Related entity
  entity_type     text,
  entity_id       uuid,
  -- Execution
  status          text not null default 'running',                      -- running, success, failed, cancelled
  input_tokens    int,
  output_tokens   int,
  model           text,
  -- Result
  output_summary  text,
  output_payload  jsonb,
  error           text,
  -- Timing
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  duration_ms     int
);
comment on table agent_run_logs is 'Audit trail for all AI agent runs. Phase 0 table retained and extended.';
comment on column agent_run_logs.agent_name is 'Logical agent name: "lead_scorer", "email_drafter", "transcript_processor", etc.';
comment on column agent_run_logs.input_tokens is 'LLM token counts for cost tracking.';

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Pattern: all tables use org_id isolation.
-- Users can only see rows where org_id matches their JWT claim.
-- Supabase: set claims via auth.jwt() -> app_metadata -> org_id

-- Helper: extract org_id from JWT
create or replace function auth_org_id() returns uuid language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid,
    null
  );
$$;

-- Helper: check if current user is org member
create or replace function is_org_member(check_org_id uuid) returns boolean language sql stable as $$
  select check_org_id = auth_org_id();
$$;

-- Enable RLS on all tables
alter table orgs enable row level security;
alter table divisions enable row level security;
alter table users enable row level security;
alter table rankings enable row level security;
alter table lead_statuses enable row level security;
alter table pipeline_stages enable row level security;
alter table communities enable row level security;
alter table floor_plans enable row level security;
alter table home_sites enable row level security;
alter table agencies enable row level security;
alter table realtors enable row level security;
alter table marketing_contacts enable row level security;
alter table contacts enable row level security;
alter table leads enable row level security;
alter table prospects enable row level security;
alter table home_owners enable row level security;
alter table activities enable row level security;
alter table tasks enable row level security;
alter table sms_log enable row level security;
alter table email_drafts enable row level security;
alter table transcripts enable row level security;
alter table buying_signals enable row level security;
alter table ai_summaries enable row level security;
alter table lead_scores enable row level security;
alter table competitive_intelligence enable row level security;
alter table integration_credentials enable row level security;
alter table webhook_events enable row level security;
alter table email_subscriptions enable row level security;
alter table mailchimp_sync_log enable row level security;
alter table form_submissions enable row level security;
alter table form_submission_details enable row level security;
alter table notification_templates enable row level security;
alter table notifications enable row level security;
alter table version_history enable row level security;
alter table agent_run_logs enable row level security;

-- RLS Policies (org isolation pattern)
-- orgs: users see only their own org
create policy "orgs: members see own org"
  on orgs for select using (id = auth_org_id());

-- Generic org-scoped SELECT policy (repeat for each table)
create policy "divisions: org members"
  on divisions for all using (is_org_member(org_id));

create policy "users: org members"
  on users for all using (is_org_member(org_id));

create policy "rankings: org members"
  on rankings for all using (is_org_member(org_id));

create policy "lead_statuses: org members"
  on lead_statuses for all using (is_org_member(org_id));

create policy "pipeline_stages: org members"
  on pipeline_stages for all using (is_org_member(org_id));

create policy "communities: org members"
  on communities for all using (is_org_member(org_id));

create policy "floor_plans: org members"
  on floor_plans for all using (is_org_member(org_id));

create policy "home_sites: org members"
  on home_sites for all using (is_org_member(org_id));

create policy "agencies: org members"
  on agencies for all using (is_org_member(org_id));

create policy "realtors: org members"
  on realtors for all using (is_org_member(org_id));

create policy "marketing_contacts: org members"
  on marketing_contacts for all using (is_org_member(org_id));

create policy "contacts: org members"
  on contacts for all using (is_org_member(org_id));

create policy "leads: org members"
  on leads for all using (is_org_member(org_id));

create policy "prospects: org members"
  on prospects for all using (is_org_member(org_id));

create policy "home_owners: org members"
  on home_owners for all using (is_org_member(org_id));

create policy "activities: org members"
  on activities for all using (is_org_member(org_id));

create policy "tasks: org members"
  on tasks for all using (is_org_member(org_id));

create policy "sms_log: org members"
  on sms_log for all using (is_org_member(org_id));

create policy "email_drafts: org members"
  on email_drafts for all using (is_org_member(org_id));

create policy "transcripts: org members"
  on transcripts for all using (is_org_member(org_id));

create policy "buying_signals: org members"
  on buying_signals for all using (is_org_member(org_id));

create policy "ai_summaries: org members"
  on ai_summaries for all using (is_org_member(org_id));

create policy "lead_scores: org members"
  on lead_scores for all using (is_org_member(org_id));

create policy "competitive_intelligence: org members"
  on competitive_intelligence for all using (is_org_member(org_id));

create policy "integration_credentials: org members"
  on integration_credentials for all using (is_org_member(org_id));

create policy "webhook_events: org members"
  on webhook_events for all using (org_id is null or is_org_member(org_id));

create policy "email_subscriptions: org members"
  on email_subscriptions for all using (is_org_member(org_id));

create policy "mailchimp_sync_log: org members"
  on mailchimp_sync_log for all using (is_org_member(org_id));

create policy "form_submissions: org members"
  on form_submissions for all using (is_org_member(org_id));

create policy "form_submission_details: org members"
  on form_submission_details for all
  using (
    form_submission_id in (
      select id from form_submissions where is_org_member(org_id)
    )
  );

create policy "notification_templates: org members"
  on notification_templates for all using (is_org_member(org_id));

create policy "notifications: own notifications"
  on notifications for all
  using (
    is_org_member(org_id)
    -- Users only see their own notifications (CSMs can't read each other's)
    and (
      user_id = (select id from users where auth_user_id = auth.uid() limit 1)
      or exists (
        select 1 from users u where u.auth_user_id = auth.uid() and u.role in ('manager', 'divmgr', 'admin')
      )
    )
  );

create policy "version_history: org members"
  on version_history for all using (org_id is null or is_org_member(org_id));

create policy "agent_run_logs: org members"
  on agent_run_logs for all using (org_id is null or is_org_member(org_id));

-- =============================================================================
-- INDEXES
-- =============================================================================

-- orgs
create index orgs_slug_idx on orgs(slug);

-- divisions
create index divisions_org_id_idx on divisions(org_id);

-- users
create index users_org_id_idx on users(org_id);
create index users_division_id_idx on users(division_id);
create index users_auth_user_id_idx on users(auth_user_id);
create index users_zoom_user_id_idx on users(zoom_user_id) where zoom_user_id is not null;
create index users_outlook_email_idx on users(outlook_email) where outlook_email is not null;

-- communities
create index communities_org_id_idx on communities(org_id);
create index communities_division_id_idx on communities(division_id);
create index communities_is_active_idx on communities(org_id, is_active);

-- floor_plans
create index floor_plans_org_id_idx on floor_plans(org_id);
create index floor_plans_community_id_idx on floor_plans(community_id);

-- home_sites
create index home_sites_org_id_idx on home_sites(org_id);
create index home_sites_community_id_idx on home_sites(community_id);
create index home_sites_floor_plan_id_idx on home_sites(floor_plan_id);
create index home_sites_status_idx on home_sites(community_id, status);
create index home_sites_pv1_lot_uuid_idx on home_sites(pv1_lot_uuid) where pv1_lot_uuid is not null;

-- agencies + realtors
create index agencies_org_id_idx on agencies(org_id);
create index realtors_org_id_idx on realtors(org_id);
create index realtors_agency_id_idx on realtors(agency_id);
create index realtors_email_idx on realtors(org_id, email) where email is not null;

-- marketing_contacts
create index marketing_contacts_org_id_idx on marketing_contacts(org_id);
create index marketing_contacts_email_idx on marketing_contacts(org_id, email) where email is not null;
create index marketing_contacts_converted_idx on marketing_contacts(converted_to_lead_id) where converted_to_lead_id is not null;

-- contacts
create index contacts_org_id_idx on contacts(org_id);
create index contacts_email_idx on contacts(org_id, email) where email is not null;
create index contacts_phone_idx on contacts(org_id, phone) where phone is not null;
create index contacts_lifecycle_idx on contacts(org_id, lifecycle);
create index contacts_realtor_id_idx on contacts(realtor_id);
create index contacts_pv1_customer_id_idx on contacts(pv1_customer_id) where pv1_customer_id is not null;
-- trigram index for name search
create index contacts_name_trgm_idx on contacts using gin ((first_name || ' ' || last_name) gin_trgm_ops);

-- leads
create index leads_org_id_idx on leads(org_id);
create index leads_contact_id_idx on leads(contact_id);
create index leads_csm_id_idx on leads(csm_id);
create index leads_community_id_idx on leads(community_id);
create index leads_division_id_idx on leads(division_id);
create index leads_realtor_id_idx on leads(realtor_id);
create index leads_ranking_id_idx on leads(ranking_id);
create index leads_status_id_idx on leads(status_id);
create index leads_stage_id_idx on leads(stage_id);
create index leads_is_active_idx on leads(org_id, is_active);
create index leads_last_activity_at_idx on leads(org_id, last_activity_at desc nulls last);
create index leads_pv1_lead_id_idx on leads(pv1_lead_id) where pv1_lead_id is not null;

-- prospects
create index prospects_org_id_idx on prospects(org_id);
create index prospects_contact_id_idx on prospects(contact_id);
create index prospects_lead_id_idx on prospects(lead_id);
create index prospects_csm_id_idx on prospects(csm_id);
create index prospects_community_id_idx on prospects(community_id);
create index prospects_home_site_id_idx on prospects(home_site_id);
create index prospects_floor_plan_id_idx on prospects(floor_plan_id);
create index prospects_realtor_id_idx on prospects(realtor_id);
create index prospects_contract_date_idx on prospects(org_id, contract_date desc);

-- home_owners
create index home_owners_org_id_idx on home_owners(org_id);
create index home_owners_contact_id_idx on home_owners(contact_id);
create index home_owners_community_id_idx on home_owners(community_id);
create index home_owners_settlement_date_idx on home_owners(org_id, settlement_date desc);

-- activities
create index activities_org_id_idx on activities(org_id);
create index activities_contact_id_idx on activities(contact_id);
create index activities_lead_id_idx on activities(lead_id);
create index activities_prospect_id_idx on activities(prospect_id);
create index activities_user_id_idx on activities(user_id);
create index activities_channel_idx on activities(org_id, channel);
create index activities_completed_at_idx on activities(org_id, completed_at desc nulls last);
create index activities_scheduled_at_idx on activities(org_id, scheduled_at) where scheduled_at is not null;
create index activities_external_message_id_idx on activities(external_message_id) where external_message_id is not null;
create index activities_zoom_meeting_id_idx on activities(zoom_meeting_id) where zoom_meeting_id is not null;
create index activities_rilla_session_id_idx on activities(rilla_session_id) where rilla_session_id is not null;

-- tasks
create index tasks_org_id_idx on tasks(org_id);
create index tasks_assigned_to_idx on tasks(assigned_to);
create index tasks_lead_id_idx on tasks(lead_id);
create index tasks_prospect_id_idx on tasks(prospect_id);
create index tasks_due_at_idx on tasks(assigned_to, due_at) where is_completed = false;

-- sms_log
create index sms_log_org_id_idx on sms_log(org_id);
create index sms_log_contact_id_idx on sms_log(contact_id);
create index sms_log_provider_message_id_idx on sms_log(provider_message_id) where provider_message_id is not null;

-- email_drafts
create index email_drafts_org_id_idx on email_drafts(org_id);
create index email_drafts_lead_id_idx on email_drafts(lead_id);
create index email_drafts_status_idx on email_drafts(org_id, status);
create index email_drafts_to_user_id_idx on email_drafts(to_user_id);

-- transcripts
create index transcripts_org_id_idx on transcripts(org_id);
create index transcripts_activity_id_idx on transcripts(activity_id);
create index transcripts_lead_id_idx on transcripts(lead_id);
create index transcripts_external_id_idx on transcripts(external_id) where external_id is not null;
-- pgvector HNSW index for semantic search
create index transcripts_embedding_idx on transcripts using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- buying_signals
create index buying_signals_transcript_id_idx on buying_signals(transcript_id);
create index buying_signals_lead_id_idx on buying_signals(lead_id);
create index buying_signals_signal_type_idx on buying_signals(org_id, signal_type);
create index buying_signals_strength_idx on buying_signals(org_id, strength);

-- ai_summaries
create index ai_summaries_entity_idx on ai_summaries(entity_type, entity_id);
create index ai_summaries_org_id_idx on ai_summaries(org_id);

-- lead_scores
create index lead_scores_lead_id_idx on lead_scores(lead_id);
create index lead_scores_prospect_id_idx on lead_scores(prospect_id);
create index lead_scores_scored_at_idx on lead_scores(lead_id, scored_at desc);

-- competitive_intelligence
create index comp_intel_org_id_idx on competitive_intelligence(org_id);
create index comp_intel_community_id_idx on competitive_intelligence(community_id);
create index comp_intel_transcript_id_idx on competitive_intelligence(transcript_id);

-- integration_credentials
create index integration_creds_org_id_idx on integration_credentials(org_id);

-- webhook_events
create index webhook_events_source_idx on webhook_events(source, status);
create index webhook_events_received_at_idx on webhook_events(received_at desc);
create index webhook_events_external_id_idx on webhook_events(source, external_event_id) where external_event_id is not null;

-- email_subscriptions
create index email_subscriptions_user_id_idx on email_subscriptions(user_id);
create index email_subscriptions_expiration_idx on email_subscriptions(expiration_datetime) where is_active = true;

-- mailchimp_sync_log
create index mailchimp_sync_log_contact_id_idx on mailchimp_sync_log(contact_id);
create index mailchimp_sync_log_status_idx on mailchimp_sync_log(org_id, status);

-- form_submissions
create index form_submissions_org_id_idx on form_submissions(org_id);
create index form_submissions_contact_id_idx on form_submissions(contact_id);
create index form_submissions_is_processed_idx on form_submissions(org_id, is_processed);

-- notifications
create index notifications_user_id_idx on notifications(user_id, status);
create index notifications_entity_idx on notifications(entity_type, entity_id);

-- agent_run_logs
create index agent_run_logs_org_id_idx on agent_run_logs(org_id);
create index agent_run_logs_agent_name_idx on agent_run_logs(agent_name, started_at desc);
create index agent_run_logs_entity_idx on agent_run_logs(entity_type, entity_id);

-- =============================================================================
-- SEED: Default lookup data (example — customize per org at runtime)
-- =============================================================================
-- NOTE: These are commented out. Seed data is org-specific and should be
-- inserted via migration scripts after org provisioning.
--
-- insert into rankings (org_id, label, sort_order) values
--   ('<org_id>', 'A', 1), ('<org_id>', 'B', 2), ('<org_id>', 'C', 3), ('<org_id>', 'D', 4);
--
-- insert into lead_statuses (org_id, label, lifecycle, sort_order) values
--   ('<org_id>', 'Active', 'lead', 1),
--   ('<org_id>', 'Inactive', 'lead', 2),
--   ('<org_id>', 'Lost', 'lead', 3),
--   ('<org_id>', 'Won', 'prospect', 4);
--
-- insert into pipeline_stages (org_id, label, lifecycle, sort_order) values
--   ('<org_id>', 'New Lead', 'lead', 1),
--   ('<org_id>', 'Nurture', 'lead', 2),
--   ('<org_id>', 'Hot', 'lead', 3),
--   ('<org_id>', 'Under Contract', 'prospect', 4),
--   ('<org_id>', 'Closed', 'home_owner', 5);

-- =============================================================================
-- END OF pv2-schema-v2.sql
-- =============================================================================
