# SPEC: OSC Queue Workflow — Communication + Routing in One Flow

**Version:** 1.0  
**Date:** 2026-04-20  
**Author:** Schellie (AI Architect)  
**Status:** Ready for Build  

---

## 1. Overview

The OSC Queue is the melting pot of everything an OSC needs to act on. It's not just a routing list — it's an **action center** where the OSC handles communication AND routing in one flow.

**Key change:** Web form queue items expand into a full workflow (respond + assign). Non-webform items have a simpler evaluate + assign flow.

**Comm Hub stays separate** — handles inbound replies (email, text, phone) that come AFTER initial outreach. No web forms in Comm Hub.

---

## 2. Queue Inputs (How Items Enter)

| Input | Source | Badge | Bucket |
|---|---|---|---|
| New Web Form | Brand new person submits form on SchellBrothers.com | `NEW` (green) | 🆕 New |
| Web Form from Existing | Existing lead/prospect submits new form | `LEAD · Cardinal Grove` (purple) | 📋 Existing |
| Promoted/Demoted | CSM demotes prospect, Marketing promotes lead | `PROSPECT B · Black Oak` → Queue | 📋 Existing |
| AI Suggested | Scoring spike, behavioral signals, engagement threshold | `AI · Score: 78` | 🤖 AI |

---

## 3. Queue Item Workflows

### 3.1 Web Form Workflow (New + Existing Web Form)

When the queue item is a web form submission, the expanded card becomes a full communication + routing workflow:

```
┌─────────────────────────────────────────────────────────┐
│ Jean fils Lamour  [LEAD · Cardinal Grove]  📞 💬 📧     │
│ Delaware Beaches · Cardinal Grove · schedule_visit       │
│ Apr 17 3:14 PM                                          │
│                                                          │
│ ┌─ FORM DETAILS ──────────────────────────────────────┐ │
│ │ Type: schedule_visit                                 │ │
│ │ Community: Cardinal Grove                            │ │
│ │ Message: "I'd like to schedule a visit this weekend" │ │
│ │ URL: schellbrothers.com/cardinal-grove/#reserve      │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─ STEP 1: EMAIL RESPONSE ────────────────────────────┐ │
│ │ To: jean@email.com                                   │ │
│ │ Subject: RE: Your visit to Cardinal Grove            │ │
│ │ ┌──────────────────────────────────────────────────┐ │ │
│ │ │ Hi Jean! Thank you for your interest in Cardinal │ │ │
│ │ │ Grove. I'd love to help you schedule a visit.    │ │ │
│ │ │ We have availability this Saturday at 10am and   │ │ │
│ │ │ 2pm. The Hadley model is beautiful — I think     │ │ │
│ │ │ you'll love it. Which time works best?            │ │ │
│ │ │                                                   │ │ │
│ │ │ - Jamie Brooks, Online Sales Consultant          │ │ │
│ │ └──────────────────────────────────────────────────┘ │ │
│ │ [✏ Edit]  [📧 Send Email]  [Skip]                   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─ STEP 2: SMS RESPONSE ─────────────────────────────┐ │
│ │ To: +1302555xxxx                                     │ │
│ │ ┌──────────────────────────────────────────────────┐ │ │
│ │ │ Hi Jean! This is Jamie from Schell Brothers.     │ │ │
│ │ │ Thanks for your interest in Cardinal Grove!      │ │ │
│ │ │ Would Saturday at 10am work for a visit? 😊      │ │ │
│ │ └──────────────────────────────────────────────────┘ │ │
│ │ [✏ Edit]  [💬 Send SMS]  [Skip]                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─ STEP 3: ASSIGN ───────────────────────────────────┐ │
│ │ ✨ Assign → Lead · Cardinal Grove     [⋯ Change]   │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**The OSC flow:**
1. Open queue item → see form details + contact info
2. Review AI-generated email → Edit if needed → Send Email (or Skip)
3. Review AI-generated SMS → Edit if needed → Send SMS (or Skip)
4. Confirm assignment → one click → item leaves queue
5. All done in one expandable card — no separate screens

### 3.2 Promoted/Demoted Workflow

When someone was pushed into queue from another stage:

```
┌─────────────────────────────────────────────────────────┐
│ Patricia Chen  [PROSPECT B · Black Oak]  📞 💬 📧       │
│ Demoted from Prospect B by Sarah Donovan                 │
│ "Not a fit for Black Oak, wants more amenities"          │
│                                                          │
│ ┌─ CONTEXT ──────────────────────────────────────────┐  │
│ │ Previous: Prospect B at Black Oak (45 days)         │  │
│ │ Reason: CSM demoted — not a fit, wants amenities    │  │
│ │ AI Suggestion: Consider Miralon (has pool/clubhouse)│  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ✨ Assign → Lead · Miralon              [⋯ Change]     │
└─────────────────────────────────────────────────────────┘
```

No email/SMS step — just evaluate context and re-route.

### 3.3 AI Suggested Workflow

When AI surfaces a contact based on scoring:

```
┌─────────────────────────────────────────────────────────┐
│ David Murphy  [LEAD · Delaware Beaches]  📞 💬 📧       │
│ 🤖 AI Surfaced — Score increased 20→65 in 3 days       │
│                                                          │
│ ┌─ SIGNALS ──────────────────────────────────────────┐  │
│ │ • Created Heartbeat login (Apr 19)                  │  │
│ │ • Viewed Hadley plan 4x (Apr 18-19)                 │  │
│ │ • Saved Lot 75 + Lot 77 as favorites                │  │
│ │ • Opened 3 Mailchimp emails (100% open rate)        │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ AI: "High buying signals. Recommend proactive outreach.  │
│ Reference Hadley plan + Lots 75/77. Schedule visit."     │
│                                                          │
│ [📞 Call]  [📧 Email]  [💬 Text]                        │
│ ✨ Assign → Prospect C · Cardinal Grove  [⋯ Change]    │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Response Templates (Admin Customizable)

### 4.1 Template Structure

Each template is configured per:
- **Form Type** (subscribe_region, schedule_visit, prelaunch_community, rsvp, etc.)
- **Community** (Cardinal Grove, Miralon, etc. — or "All")
- **Response Channel** (email or SMS)

### 4.2 Template Table

**Table: `response_templates`** (new)

| Field | Type | Description |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK | |
| form_type_code | text | subscribe_region, schedule_visit, etc. |
| community_id | uuid FK nullable | Specific community, or null for "all" |
| division_id | uuid FK nullable | Division scope |
| channel | text | 'email' or 'sms' |
| subject | text | Email subject line (for email only) |
| body | text | Template body with merge variables |
| is_default | boolean | System default (vs user customized) |
| created_by_user_id | uuid FK nullable | Which OSC/CSM customized this |
| is_active | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 4.3 Merge Variables

Templates support merge variables that get replaced at render time:

| Variable | Replacement |
|---|---|
| `{{first_name}}` | Contact's first name |
| `{{last_name}}` | Contact's last name |
| `{{community_name}}` | Community name |
| `{{division_name}}` | Division name |
| `{{osc_name}}` | OSC's full name |
| `{{osc_phone}}` | OSC's phone number |
| `{{osc_email}}` | OSC's email |
| `{{form_message}}` | The text from the web form's "interested_in" field |
| `{{plans_from_price}}` | Lowest plan price in community |
| `{{available_lots}}` | Number of available lots |

### 4.4 Default Templates

**subscribe_region + email:**
```
Subject: Welcome to {{division_name}} — Schell Brothers

Hi {{first_name}}!

Thank you for your interest in Schell Brothers' {{division_name}} communities. 
We have some incredible options and I'd love to help you explore what's available.

Would you like to schedule a call or visit to learn more about our communities 
and current incentives?

Looking forward to connecting!

{{osc_name}}
Online Sales Consultant | Schell Brothers
{{osc_phone}} | {{osc_email}}
```

**subscribe_region + sms:**
```
Hi {{first_name}}! This is {{osc_name}} from Schell Brothers. Thanks for 
your interest in our {{division_name}} communities! Would you like to 
chat about what we have available? 😊
```

**schedule_visit + email:**
```
Subject: Your Visit to {{community_name}} — Let's Set It Up!

Hi {{first_name}}!

Thank you for wanting to visit {{community_name}}! We'd love to show you around.

{{community_name}} has {{available_lots}} homesites available with plans starting 
from {{plans_from_price}}. I think you're going to love it.

What day and time works best for you? We're available:
- Weekdays: 10am - 5pm
- Saturdays: 10am - 5pm  
- Sundays: 12pm - 5pm

Looking forward to meeting you!

{{osc_name}}
{{osc_phone}} | {{osc_email}}
```

**schedule_visit + sms:**
```
Hi {{first_name}}! This is {{osc_name}} from Schell Brothers. Thanks for 
wanting to visit {{community_name}}! 🏡 When would you like to come by? 
We're open daily — just let me know what works!
```

### 4.5 Per-User Customization

Each OSC/CSM can customize templates:
1. Go to Settings → Response Templates
2. See all default templates
3. Click "Customize" on any template → creates a personal copy
4. Edit the copy → saved as their version
5. When rendering, system checks: user-specific first, then community-specific, then division default, then system default

Resolution order:
```
1. user_id + form_type + community_id  (most specific)
2. user_id + form_type + null community (user's general for this form type)
3. null user + form_type + community_id (community default)
4. null user + form_type + null community (system default)
```

---

## 5. Queue Card States

### 5.1 Collapsed (default)
Shows: name, badges, community, form type, timestamp, action icons, assign button
Same as current layout.

### 5.2 Expanded (click to open)
For web form items: shows form details + email step + SMS step + assign
For promoted/demoted: shows context + AI suggestion + assign
For AI surfaced: shows signals + recommendation + contact actions + assign

### 5.3 Completed
After all steps done (send + assign), card slides out with toast confirmation.

---

## 6. Communication Recording

When the OSC sends an email or SMS from the queue workflow:

### Email Sent:
```
INSERT INTO activities (
  contact_id, opportunity_id, channel, direction, type,
  subject, body, occurred_at, community_id, division_id
) VALUES (
  contact_id, opp_id, 'email', 'outbound', 'email',
  subject, body, now(), community_id, division_id
);
```

### SMS Sent:
```
INSERT INTO activities (
  contact_id, opportunity_id, channel, direction, type,
  subject, body, occurred_at, community_id, division_id
) VALUES (
  contact_id, opp_id, 'text', 'outbound', 'text',
  'SMS response to web form', sms_body, now(), community_id, division_id
);
```

### Queue Item Assigned:
```
UPDATE opportunities SET crm_stage = new_stage, community_id = new_community
INSERT INTO stage_transitions (from_stage: 'queue', to_stage: new_stage, ...)
```

All three actions happen in one flow — the queue item doesn't leave until assignment is confirmed.

---

## 7. Filtering Web Forms OUT of Comm Hub

Currently all inbound activities show in Comm Hub. Change:
- **Comm Hub filter:** `channel != 'webform'` — exclude web form submissions
- **Comm Hub shows:** email replies, phone calls, texts, Rilla recordings, walk-ins — anything that's NOT a web form
- **Queue shows:** web forms + promoted/demoted + AI surfaced

This creates a clean separation: web forms are handled in Queue workflow, everything else in Comm Hub.

---

## 8. Admin Settings Page

### 8.1 Response Templates Manager
Location: Settings → Response Templates (or a new admin page)

Features:
- List all templates grouped by form type
- View/edit system defaults
- Create personal customizations
- Preview with merge variables filled in
- Test send (send to yourself)

### 8.2 Form Type Configuration  
Each form type can be configured with:
- Default email template
- Default SMS template
- Whether email/SMS are auto-sent or require manual send
- Default assignment lane suggestion

---

## 9. Implementation Phases

### Phase 1: Queue Workflow Cards (this sprint)
1. Redesign queue card expanded state with form details + email + SMS + assign steps
2. Filter web forms out of Comm Hub
3. Record email/SMS sends as outbound activities
4. Differentiate card layout by queue source (webform vs promoted vs AI)

### Phase 2: Response Templates (next sprint)
1. Create `response_templates` table
2. Seed default templates for all form types
3. Template rendering with merge variables
4. AI enhancement of templates based on contact profile

### Phase 3: Per-User Customization
1. Settings page for template management
2. Per-user template overrides
3. Template preview + test send
4. Usage analytics (which templates get best response rates)

---

## 10. Mobile Considerations

The expanded queue card workflow must work on mobile:
- Form details in a compact card
- Email step: full-width textarea with Send button (44px height)
- SMS step: full-width textarea with Send button
- Assign step: full-width button
- Each step collapsible (accordion style) to save space
- Or: steps as a vertical flow that scrolls

---

*Document prepared by Schellie — April 20, 2026*  
*For review: Lance Manlove*
