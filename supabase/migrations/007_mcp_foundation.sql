-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 007: MCP Foundation — Action Log, Response Templates, System Config
-- Date: 2026-04-21
-- Part of: Agent-First Architecture Directive
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Action Log — every action with full attribution
CREATE TABLE IF NOT EXISTS action_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL,
  action_type     text NOT NULL,
  entity_type     text NOT NULL,    -- 'opportunity', 'contact', 'activity'
  entity_id       text NOT NULL,
  triggered_by    text NOT NULL DEFAULT 'human',  -- 'human' | 'agent'
  agent_name      text,
  user_id         uuid,
  confidence_score numeric(5,2),
  reasoning       text,
  details         jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_action_log_entity ON action_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_action_log_time ON action_log(created_at DESC);

-- 2. Response Templates — customizable per form type + community
CREATE TABLE IF NOT EXISTS response_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL,
  form_type_code  text NOT NULL,
  community_id    uuid,
  division_id     uuid,
  channel         text NOT NULL,  -- 'email' | 'sms'
  subject         text,
  body            text NOT NULL,
  is_default      boolean NOT NULL DEFAULT true,
  created_by_user_id uuid,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_templates_lookup ON response_templates(form_type_code, community_id, channel);

-- 3. System Config — mode switching
CREATE TABLE IF NOT EXISTS system_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key             text UNIQUE NOT NULL,
  value           jsonb NOT NULL,
  updated_at      timestamptz NOT NULL DEFAULT now()
);
INSERT INTO system_config (key, value) VALUES
  ('queue.mode', '"assisted"'),
  ('prospect.mode', '"assisted"'),
  ('communication.mode', '"manual"'),
  ('scoring.mode', '"assisted"')
ON CONFLICT (key) DO NOTHING;

-- 4. Attribution fields on existing tables
ALTER TABLE stage_transitions ADD COLUMN IF NOT EXISTS agent_name text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS triggered_by text DEFAULT 'human';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS agent_name text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS reasoning text;

-- 5. RLS policies
DO $$ BEGIN
  ALTER TABLE action_log ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Allow all" ON action_log FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE response_templates ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Allow all" ON response_templates FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Allow all" ON system_config FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
