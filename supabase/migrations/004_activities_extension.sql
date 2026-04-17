-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 004: Extend activities table for unified multi-channel tracking
-- Date: 2026-04-17
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE activities ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS channel text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS from_address text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS to_addresses jsonb;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS external_message_id text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES communities(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES divisions(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS rilla_session_id text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS sentiment text;

-- Channels: email, phone, text, zoom_meeting, rilla, webform, chat, web_session, walk_in, mailchimp, heartbeat
-- Direction: inbound, outbound, internal

CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_opportunity ON activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_activities_channel ON activities(channel);
CREATE INDEX IF NOT EXISTS idx_activities_occurred ON activities(occurred_at DESC);
