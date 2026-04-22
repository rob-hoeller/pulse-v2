# SPEC: Data Integrity — Zoom → CRM Pipeline

## Purpose
Prevent data leakage, misattribution, and slop in the Zoom → Activities → Profiles pipeline. Every data mutation must be auditable, attributable, and correct.

---

## Matching Rules

### Rule 1: Phone/Email → Household Unit (aggregate matching)
- A household is ONE unit. All phone numbers and emails across the contact 
  AND all contact_members resolve to the SAME contact_id + opportunity.
- Matching index must include ALL of these for each contact:
  - `contacts.phone` (primary)
  - `contacts.phone_secondary`
  - `contacts.email` (primary)
  - `contacts.email_secondary`
  - `contact_members[].phone` (each member)
  - `contact_members[].email` (each member)
- Example: Mom's cell, Dad's cell, home landline, Mom's email, Dad's work email
  = 5 identifiers, 1 contact, 1 opportunity
- Normalize phones to 10 digits before matching
- If exactly 1 contact matches ANY identifier → auto-link (confidence: 1.0)
- If 2+ DIFFERENT contacts match → DO NOT auto-link
  - Store activity with contact_id = NULL
  - Flag in action_log: `match_method: "ambiguous"`, `reasoning: "2+ contacts share +1XXXXXXXXXX"`
  - OSC manually assigns in CommHub
- CRITICAL: Never create duplicate contacts for the same household
  - Use contact-matcher.ts dedup logic before creating new contacts

### Rule 2: Contact → Opportunity (cautious linking)
- If contact has exactly 1 ACTIVE opportunity → auto-link (confidence: 1.0)
- If contact has 2+ active opportunities → link to CONTACT only, NOT opportunity
  - Store activity with contact_id set, opportunity_id = NULL
  - Flag for OSC to assign to correct opportunity
- If contact has 0 opportunities → link to contact only
  - May trigger "new lead from phone" alert

### Rule 3: External Calls Only
- Filter: `connect_type = "external"` 
- SKIP: internal, zoom_service, voicemail_check
- Exception: calls to/from main office numbers that route to external callers

### Rule 4: Sales Department Filter
- Departments that feed CRM CommHub: `Sales`, `Online Sales`, `null/empty`
- Departments that DO NOT feed CommHub: `Construction`, `Warranty`, `Design`, `Land Dev`, `Finance`, `HR`
- Non-sales calls stored in activities but channel = "phone_internal", NOT "phone"

### Rule 5: Deduplication
- Zoom creates 2 records per call (caller side + callee side)
- Deduplicate on `call_id` field (NOT `id` or `call_path_id`)
- Keep the record with more data (employee side has name/email/dept)

---

## AI Extraction Rules

### Rule 6: Draft-First Extraction
- AI extracts structured data from transcripts
- ALL extracted fields start as `status: "draft"` 
- Auto-commit threshold: confidence >= 0.85 AND field is non-destructive (additive)
- Fields requiring human review regardless of confidence:
  - budget_min / budget_max (money decisions)
  - communities_interested (routing decisions)
  - deal_breakers (could eliminate options)
- Low-confidence fields (<0.7) → flagged, not written

### Rule 7: Source Attribution
- Every extracted field tracks its source:
  - `source_transcript_id`: which transcript it came from
  - `source_timestamp`: when in the conversation
  - `extraction_model`: "qwen3-coder" / "claude" / etc.
  - `extraction_confidence`: 0.0 - 1.0

---

## Access Control Rules

### Rule 8: Division-Scoped Access
- Activities visible only to:
  - Assigned OSC
  - Assigned CSM
  - Division DSM
  - System admin
- Recordings follow same rules
- Cross-division access: DSM+ only

---

## Audit Trail

### Every Pipeline Step Logged to `action_log`

| Step | triggered_by | agent_name | What's Logged |
|---|---|---|---|
| Call synced | system:zoom_sync | zoom_call_sync | call_id, matched_contact, match_confidence |
| Contact linked | system:zoom_sync | contact_matcher | contact_id, match_method, phone_matched |
| Opportunity linked | system:zoom_sync | opp_linker | opportunity_id, link_method, alternatives_count |
| Transcript created | system:transcriber | whisper_v1 | activity_id, audio_duration, word_count |
| AI extraction | system:ai_extract | qwen3_extractor | transcript_id, fields_extracted[], confidence_scores{} |
| Profile updated | system:ai_extract | profile_updater | profile_id, fields_changed{}, old_values{}, new_values{} |
| Manual override | user:{user_id} | human | what was changed and why |

### Required Fields on Every action_log Entry
```json
{
  "triggered_by": "system:zoom_sync",
  "agent_name": "zoom_call_sync",
  "confidence_score": 1.0,
  "reasoning": "matched phone +16318071237 to contact Kathleen Rodgers (exact 10-digit match, 1 contact found)",
  "metadata": {
    "match_method": "phone_exact",
    "alternatives": 0,
    "source_call_id": "20260421-24cdd2be..."
  }
}
```

---

## Pipeline Flow

```
Zoom API
  ↓
[Filter: external + sales only]
  ↓
[Deduplicate on call_id]
  ↓
[Phone → Contact match (1:1 only)]
  ↓ audit: match result + confidence
[Contact → Opportunity match (cautious)]
  ↓ audit: link result + alternatives
activities table
  ↓
[If recorded: download audio]
  ↓
[Whisper transcription]
  ↓ audit: transcript created
transcripts table
  ↓
[AI extraction (DGX Spark)]
  ↓ audit: fields extracted + confidence
[Draft review: auto-commit high-confidence, flag low]
  ↓ audit: profile changes + old/new values
opportunity_profiles table
```

---

## Validation Queries (run daily)

```sql
-- Activities with no audit trail
SELECT * FROM activities 
WHERE channel = 'phone' 
AND id NOT IN (SELECT DISTINCT (metadata->>'activity_id')::uuid FROM action_log WHERE agent_name = 'zoom_call_sync');

-- Transcripts with no extraction
SELECT * FROM transcripts WHERE processed_at IS NULL AND created_at < NOW() - INTERVAL '1 hour';

-- Ambiguous matches needing review
SELECT * FROM action_log WHERE reasoning LIKE '%ambiguous%' AND created_at > NOW() - INTERVAL '24 hours';

-- Profile changes with low confidence
SELECT * FROM action_log WHERE agent_name = 'profile_updater' AND confidence_score < 0.7;
```

---

## Status: DRAFT
Approved by: pending
Effective: upon implementation
