-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 005: Extend tasks + opportunities for CRM action workflow
-- Date: 2026-04-17
-- ═══════════════════════════════════════════════════════════════════════════════

-- Tasks: CRM action fields
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS activity_id uuid;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'action';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS channel text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS queue_bucket text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_suggestion text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_context jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES communities(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES divisions(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS action_taken text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS snoozed_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_tasks_contact ON tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_tasks_opportunity ON tasks(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_bucket ON tasks(queue_bucket) WHERE status != 'completed';

-- Opportunities: queue tracking
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS queue_source text;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS queued_at timestamptz;

-- queue_bucket values: 'new_inbound', 'existing_lead_reengaged', 'demoted_prospect', 'ai_surfaced', 'existing_customer'
-- task_type values: 'action', 'follow_up', 'review', 'ai_suggestion'
-- channel values: 'webform', 'email', 'phone', 'text', 'ai_auto', 'chat', 'walk_in'
-- action_taken values: 'called', 'emailed', 'texted', 'promoted', 'demoted', 'snoozed', 'dismissed'
