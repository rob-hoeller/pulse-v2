-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 008: Zoom Intelligence Layer — Transcripts, Opportunity Profiles, Campaigns
-- Date: 2026-04-21
-- Part of: Zoom Integration + Intelligence Layer
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Transcripts — unified transcript storage across all sources
CREATE TABLE IF NOT EXISTS public.transcripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  activity_id UUID REFERENCES public.activities(id),
  opportunity_id UUID REFERENCES public.opportunities(id),
  contact_id UUID REFERENCES public.contacts(id),
  source TEXT NOT NULL, -- zoom_phone, zoom_meeting, rilla, manual
  raw_text TEXT,
  speaker_segments JSONB DEFAULT '[]', -- [{speaker, text, start_ms, end_ms}]
  ai_summary TEXT,
  key_topics TEXT[] DEFAULT '{}',
  action_items TEXT[] DEFAULT '{}',
  sentiment TEXT, -- positive, neutral, negative
  objections TEXT[] DEFAULT '{}',
  buying_signals TEXT[] DEFAULT '{}',
  competitor_mentions TEXT[] DEFAULT '{}',
  duration_seconds INTEGER,
  recording_url TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transcripts_opportunity ON public.transcripts(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_contact ON public.transcripts(contact_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_activity ON public.transcripts(activity_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_source ON public.transcripts(source);

-- 2. Opportunity Profiles — 360° buyer intelligence
CREATE TABLE IF NOT EXISTS public.opportunity_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  opportunity_id UUID UNIQUE NOT NULL REFERENCES public.opportunities(id),
  contact_id UUID REFERENCES public.contacts(id),

  -- Household
  household_members JSONB DEFAULT '[]', -- [{name, relationship, age}]

  -- Journey
  first_touch_at TIMESTAMPTZ,
  last_touch_at TIMESTAMPTZ,
  days_in_funnel INTEGER DEFAULT 0,
  stage_history JSONB DEFAULT '[]', -- [{stage, at, by}]

  -- Engagement Counts
  total_touchpoints INTEGER DEFAULT 0,
  calls_inbound INTEGER DEFAULT 0,
  calls_outbound INTEGER DEFAULT 0,
  sms_inbound INTEGER DEFAULT 0,
  sms_outbound INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  meetings_count INTEGER DEFAULT 0,
  meetings_total_minutes INTEGER DEFAULT 0,
  site_visits INTEGER DEFAULT 0,

  -- Communication Summaries
  last_call_summary TEXT,
  last_meeting_summary TEXT,
  last_sms_summary TEXT,
  last_email_summary TEXT,
  key_topics TEXT[] DEFAULT '{}',
  objections_raised TEXT[] DEFAULT '{}',
  questions_asked TEXT[] DEFAULT '{}',

  -- Preferences & Intent
  communities_interested JSONB DEFAULT '[]', -- [{community_id, name, rank}]
  floor_plans_viewed JSONB DEFAULT '[]',
  budget_stated_min INTEGER,
  budget_stated_max INTEGER,
  budget_inferred TEXT,
  move_in_timeline TEXT,
  must_haves TEXT[] DEFAULT '{}',
  deal_breakers TEXT[] DEFAULT '{}',
  financing_status TEXT,
  current_living_situation TEXT,

  -- Scores
  engagement_score INTEGER DEFAULT 0,
  intent_score INTEGER DEFAULT 0,
  readiness_score INTEGER DEFAULT 0,
  sentiment TEXT DEFAULT 'neutral',
  avg_response_time_hours NUMERIC,
  ghost_risk_days INTEGER DEFAULT 0,

  -- AI Context
  ai_summary TEXT,
  ai_next_best_action TEXT,
  ai_campaign_recommendations JSONB DEFAULT '[]',
  ai_talking_points TEXT[] DEFAULT '{}',
  last_ai_refresh_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_opp_profiles_opportunity ON public.opportunity_profiles(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opp_profiles_contact ON public.opportunity_profiles(contact_id);

-- 3. Campaigns — drip, nurture, re-engagement
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  opportunity_id UUID REFERENCES public.opportunities(id),
  contact_id UUID REFERENCES public.contacts(id),
  campaign_type TEXT NOT NULL, -- drip, re_engagement, nurture, event_invite, custom
  name TEXT,
  status TEXT DEFAULT 'draft', -- draft, active, paused, completed, cancelled
  created_by_type TEXT DEFAULT 'human', -- human, ai_agent
  created_by_id UUID,
  trigger_reason TEXT,
  steps JSONB DEFAULT '[]', -- [{channel, delay_days, template_id, content, status, sent_at}]
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_opportunity ON public.campaigns(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);

-- 4. Extend activities table for Zoom-specific data
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS transcript_id UUID REFERENCES public.transcripts(id);
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS zoom_call_id TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS zoom_meeting_id TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS from_number TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS to_number TEXT;
-- metadata already exists from migration 004, skip

-- 5. RLS policies (permissive, same pattern as existing tables)
DO $$
BEGIN
  ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transcripts' AND policyname = 'Allow all') THEN
    CREATE POLICY "Allow all" ON public.transcripts FOR ALL USING (true) WITH CHECK (true);
  END IF;

  ALTER TABLE public.opportunity_profiles ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'opportunity_profiles' AND policyname = 'Allow all') THEN
    CREATE POLICY "Allow all" ON public.opportunity_profiles FOR ALL USING (true) WITH CHECK (true);
  END IF;

  ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaigns' AND policyname = 'Allow all') THEN
    CREATE POLICY "Allow all" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
