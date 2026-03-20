# Pv2 Integration Plan
**Filed: 2026-03-19 | Author: Schellie 🦞**

---

## Services to Wire Up

### 1. Zoom Meetings
- **Purpose:** Virtual appointments between CSMs/OSCs and buyers
- **Data captured:** Meeting ID, join URL, recording URL, duration, participants
- **Pv2 use:** Create/update/cancel meetings when appointments are scheduled; store meeting metadata on `activities` table
- **Trigger:** Appointment created with `is_virtual = true`
- **Webhook events:** `meeting.ended` → pull recording + transcript
- **Agent:** Shelley creates meetings; AI Feature Agent ingests transcripts
- **Sandbox policy:** Zoom API endpoint scoped to meeting create/read/delete

### 2. Zoom Phone
- **Purpose:** Inbound/outbound call logging for OSC phone line
- **Data captured:** Call direction, duration, recording URL, caller ID, call datetime
- **Pv2 use:** Auto-log phone calls to `activities` table; feed recordings to Rilla or transcription layer
- **Webhook events:** `phone.callee_answered`, `phone.call_ended`
- **Key Pv1 logic to preserve:** Call forwarding by day/OSC schedule (currently a cron job)
- **Agent:** Nemo processes call logs; Shelley surfaces call history to OSC

### 3. Zoom SMS
- **Purpose:** Two-way SMS via Zoom Phone SMS
- **Data captured:** Message body, direction, timestamp, phone number
- **Pv2 use:** Log SMS to `activities` table; surface in buyer timeline
- **Webhook events:** `phone.sms_received`
- **Note:** Distinct from Twilio SMS — Zoom SMS is for OSC-to-buyer via Zoom Phone number; Twilio is for system notifications

### 4. Outlook Email (Microsoft Graph API)
- **Purpose:** Full email threading between CSMs and buyers
- **Data captured:** Subject, body, from/to, direction (sent/received), message ID, datetime
- **Pv2 use:** Associate emails with leads/prospects in `activities` table; feed to AI summary layer
- **Auth:** OAuth2 client credentials (Azure app registration)
- **Webhook:** Microsoft Graph subscription per CSM inbox (expires every 24h — needs renewal cron)
- **Key Pv1 pain point:** Subscription renewal was a daily cron job. Pv2 should handle this more robustly.
- **Agent:** Integrations agent processes inbox webhooks; Nemo renews subscriptions

### 5. Rilla
- **Purpose:** Meeting/call transcript ingestion for AI intel layer
- **Data captured:** Full transcripts, speaker labels, timestamps, sentiment scores, keywords
- **Pv2 use:** Feed transcripts to AI Feature Agent for:
  - Lead summary generation
  - Buying signal detection
  - Next-best-action recommendations
  - OSC coaching insights (future: Guen agent)
- **This is the key differentiator** — Pv1 had no AI layer. Rilla transcripts are the raw material for it.
- **Storage:** Transcripts stored in Supabase; vector embeddings via pgvector for semantic search
- **Sandbox policy:** Rilla API endpoint (read-only transcript pull)
- **Agent:** AI Feature Agent primary consumer

### 6. SendGrid
- **Purpose:** Outbound transactional (system-triggered) emails only
- **Use cases:**
  - Appointment confirmations to buyers
  - Appointment reminders
  - System notifications (account, alerts)
- **NOT for:** 1:1 nurture emails (that's Outlook/Shelley) or mass marketing (that's Mailchimp)
- **Sandbox policy:** SendGrid API, send-only, scoped to verified sender domains
- **Agent:** Shelley triggers SendGrid for system-level transactional emails only

### 7. Mailchimp
- **Purpose:** Mass marketing emails only — community announcements, market updates, event invites, newsletters
- **NOT for:** 1:1 nurture emails (that's Outlook/Shelley). Mailchimp doesn't know the buyer. Shelley does.
- **Use cases:**
  - Community grand openings / lot releases
  - Market newsletters to broad prospect/lead lists
  - Event invitations
- **Audience management:** 3 lists (homeowners, prospect/lead, realtors) — same as Pv1
- **Webhooks:** Unsubscribe events → update subscription status in Supabase
- **Agent:** Background Tasks Agent handles audience sync; Nemo processes unsubscribe webhooks

### 8. Twilio
- **Purpose:** Outbound SMS notifications to buyers
- **Use cases:**
  - Appointment reminders ("Your appointment is tomorrow at 10am")
  - Follow-up nudges ("Just checking in — any questions?")
  - Confirmation messages
- **vs. Zoom SMS:** Twilio = system-initiated automated messages. Zoom SMS = OSC manual/conversational.
- **Sandbox policy:** Twilio API, send-only, specific phone number SIDs
- **Agent:** Shelley triggers Twilio for buyer SMS; Background task agent for scheduled reminders

---

## Email Channel Strategy

```
Three distinct email channels — each with a different purpose and intelligence level:

Mailchimp        → Mass marketing broadcasts (list-based, marketing-driven)
                   "Community grand opening this Saturday!"

SendGrid         → System transactional (event-triggered, templated)
                   "Your appointment is confirmed for tomorrow at 10am."

Outlook (Shelley)→ 1:1 AI-generated personalized nurture (from OSC's actual inbox)
                   "Hey Sarah, I know you mentioned the kitchen layout was important
                    to you — I wanted to share something about the Monterey plan..."

Pv1 treated these as roughly the same thing. Pv2 treats them as three distinct
channels with distinct intelligence levels and distinct ownership.
```

## Integration Architecture

```
External Services
├── Zoom Meetings API ──────────────────► activities (type: meeting)
├── Zoom Phone API ─────────────────────► activities (type: call)
├── Zoom SMS API ───────────────────────► activities (type: sms_zoom)
├── Outlook (Microsoft Graph) ──────────► activities (type: email) ← Shelley 1:1 nurture
├── Rilla API ──────────────────────────► transcripts table → AI Feature Agent
├── Mailchimp ──────────────────────────► mass_email_log table (audience sync)
├── SendGrid API ───────────────────────► activities (type: email_transactional)
└── Twilio API ─────────────────────────► activities (type: sms_system)

All write through sandboxed agents → Supabase
All read by AI Feature Agent → summaries, scores, recommendations
```

---

## Schema Additions Needed

### `transcripts` table
```sql
create table transcripts (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references orgs(id),
  lead_id         uuid references leads(id),
  prospect_id     uuid references prospects(id),
  activity_id     uuid references activities(id),  -- links to the meeting/call activity
  source          text not null,                   -- rilla | zoom | zoom_phone
  external_id     text,                            -- Rilla/Zoom recording ID
  duration_sec    integer,
  speaker_count   integer,
  full_text       text,                            -- raw transcript
  summary         text,                            -- AI-generated summary
  embedding       vector(1536),                    -- pgvector embedding for semantic search
  sentiment       text,                            -- positive | neutral | negative | mixed
  buying_signals  jsonb,                           -- extracted signals
  created_at      timestamptz default now()
);
```

### `email_subscriptions` table (Outlook webhook management)
```sql
create table email_subscriptions (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references orgs(id),
  user_id         uuid references users(id),
  subscription_id text not null,                   -- Microsoft Graph subscription ID
  resource        text,                            -- mailbox resource path
  expires_at      timestamptz not null,
  last_renewed_at timestamptz,
  active          boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
```

---

## Sandbox Policies Needed

| Sandbox | Service | Access Level |
|---|---|---|
| Nemo | Zoom API | Meeting CRUD + Phone logs read |
| Nemo | Microsoft Graph | Subscription management + email read |
| Nemo | Rilla API | Transcript read |
| Shelley | Zoom API | Meeting create only |
| Shelley | SendGrid | Send only |
| Shelley | Twilio | Send only |
| AI Feature Agent | Supabase (transcripts) | Read/write |
| Background Tasks Agent | Zoom Phone | Call log read |
| Background Tasks Agent | Microsoft Graph | Subscription renewal |

---

## Credentials Needed (To collect)

- [ ] Zoom Account ID + Client ID + Client Secret (OAuth2)
- [ ] Azure App Registration: Tenant ID + Client ID + Client Secret
- [ ] Rilla API key
- [ ] SendGrid API key
- [ ] Twilio Account SID + Auth Token + Phone number SID(s)

---

## Priority Order

1. **Outlook Email** — highest value, core to OSC workflow, Pv1 had this
2. **Zoom Meetings** — required for virtual appointment flow
3. **Twilio SMS** — appointment reminders, quick win
4. **SendGrid** — email notifications, quick win
5. **Zoom Phone** — call logging, important but more complex
6. **Zoom SMS** — two-way SMS, depends on Zoom Phone setup
7. **Rilla** — AI intel layer, Phase 3+ (needs transcripts volume to be valuable)
