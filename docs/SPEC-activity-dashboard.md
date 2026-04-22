# SPEC: Activity Dashboard — Corp & Division Stats

## Purpose
Real-time operational pulse for leadership. Every communication channel, every division, updated live.

---

## Dashboard Levels

### Corp View (DSM+ / Lance)
Aggregates ALL divisions. Top-level KPIs.

### Division View
Filtered to one division. Drill-down by community.

### Individual View (future)
Per OSC/CSM performance metrics.

---

## Daily Activity Stats

### Communication Volume (today / this week / this month / custom)

| Metric | Description | Source |
|---|---|---|
| 📞 Calls In | Inbound external phone calls | activities.type = call_inbound |
| 📞 Calls Out | Outbound external phone calls | activities.type = call_outbound |
| 📞 Call Minutes | Total talk time | SUM(activities.duration_seconds)/60 |
| 💬 SMS In | Inbound text messages | activities.type = sms_inbound |
| 💬 SMS Out | Outbound text messages | activities.type = sms_outbound |
| 📧 Email In | Inbound emails | activities.type = email_inbound |
| 📧 Email Out | Outbound emails (auto + personal) | activities.type = email_outbound |
| 🎥 Meetings | Zoom meetings with prospects | activities.channel = meeting |
| 📝 Web Forms | New form submissions | activities.channel = webform |
| 🆕 New Leads | Contacts entering lead_div or lead_com | stage_transitions today |
| 📋 Queue Items | Items in Queue today | opportunities.crm_stage = queue + queued_at today |
| 🎯 New Prospects | Promoted to prospect today | stage_transitions to prospect_* today |
| 🏠 New Homeowners | Contracts signed today | stage_transitions to homeowner today |
| ⏱️ Avg Response Time | Time from webform → first outbound contact | activities timestamps |
| 👻 Ghost Risk | Opportunities with no activity in 7+ days | last_activity_at |

---

## Layout — Corp View

```
┌─────────────────────────────────────────────────────────────┐
│  📊 DAILY PULSE — Tue Apr 21, 2026          [Today ▼] [🔄] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ 📞 257  │ │ 💬 84   │ │ 📧 52   │ │ 📝 23   │          │
│  │ Calls   │ │ Texts   │ │ Emails  │ │ Forms   │          │
│  │ 142 in  │ │ 38 in   │ │ 12 in   │ │ 23 new  │          │
│  │ 115 out │ │ 46 out  │ │ 40 out  │ │         │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ 🎥 7    │ │ 🆕 18   │ │ 🎯 4    │ │ ⏱️ 12m  │          │
│  │Meetings │ │New Leads │ │Prospects│ │Avg Resp │          │
│  │ 3.2 hrs │ │ +3 vs yd│ │ +1 vs yd│ │ -2m yd  │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  BY DIVISION                                                │
│                                                             │
│  Division        Calls  Texts  Email  Forms  Leads  Prosp  │
│  ─────────────── ────── ────── ────── ────── ────── ────── │
│  Delaware Beaches  122    41     28     12      8      2   │
│  Richmond           58    18     11      5      4      1   │
│  Nashville           52    16      8      4      4      1   │
│  Boise               25     9      5      2      2      0   │
│  ─────────────── ────── ────── ────── ────── ────── ────── │
│  TOTAL             257    84     52     23     18      4   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  TREND (7-day sparkline per metric)                         │
│  📞 ▁▃▅▇▅▃▇  📧 ▂▃▅▃▅▇▅  📝 ▃▅▇▅▃▅▇                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  🚨 ALERTS                                                  │
│  • 12 opportunities with no activity in 7+ days            │
│  • Avg response time Nashville: 28min (target: 15min)      │
│  • Peninsula: 1 of 2 lots remaining                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Layout — Division Drill-Down

Click "Delaware Beaches" → see:

```
┌─────────────────────────────────────────────────────────────┐
│  📊 DELAWARE BEACHES — Tue Apr 21, 2026     [Today ▼] [🔄] │
├─────────────────────────────────────────────────────────────┤
│  Same stat cards as Corp but filtered to DE                 │
│                                                             │
│  BY COMMUNITY                                               │
│  Community          Calls  Texts  Email  Forms  Leads       │
│  ─────────────────  ────── ────── ────── ────── ──────      │
│  Peninsula Lakes       18     8      6      3      2        │
│  Cardinal Grove        14     5      4      2      1        │
│  Black Oak             12     4      3      2      1        │
│  Brentwood              8     3      2      1      1        │
│  ...                                                        │
│                                                             │
│  BY TEAM MEMBER                                             │
│  Name              Calls  Texts  Email  Avg Resp  Pipeline  │
│  ────────────────  ────── ────── ────── ──────── ─────────  │
│  Grace Hoinowski     28     12      8     8min     34 opps  │
│  Brooke Caulfield    22      9      6    12min     28 opps  │
│  Tarah Scarborough   18      7      5    15min     22 opps  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  🔥 HOT OPPORTUNITIES                                       │
│  • Ashley Yagan — Peninsula Lakes — 25min call w/ Grace     │
│  • Kim Genovese — 9min call w/ Tess — budget confirmed      │
│  • Kathleen Rodgers — 14min call — scheduling visit         │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Sources

All queries against existing tables — no new tables needed:

- `activities` — calls, SMS, emails, webforms, meetings (channel + type + occurred_at)
- `opportunities` — stages, assignments, community_id, division_id
- `stage_transitions` — stage changes with timestamps
- `contacts` — contact details
- `users` — team members (role, division assignment)
- `communities` — community → division mapping
- `transcripts` — call summaries for hot opportunities

---

## Time Controls

- **Today** (default) — midnight to now in selected timezone
- **Yesterday** 
- **This Week** (Mon-Sun)
- **This Month**
- **Custom Range**
- **Compare**: vs yesterday / vs last week / vs last month

Timezone: display in division timezone for division views, user's local timezone for corp view.

---

## Real-Time

- Supabase Realtime subscription on activities + stage_transitions
- Auto-refresh stat cards when new data arrives
- No polling — push-based updates

---

## Implementation Priority

1. Corp daily stats (top cards) — query activities by date + channel/type
2. Division breakdown table — GROUP BY division_id
3. Community breakdown — GROUP BY community_id  
4. Team member breakdown — GROUP BY user attribution
5. Trend sparklines — 7-day history
6. Alerts section — derived from activity gaps + inventory
7. Hot opportunities — recent high-engagement transcripts

---

## Status: SPEC READY
Build priority: after Zoom sync pipeline is stable
