"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { useGlobalFilter } from "@/context/GlobalFilterContext";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueueItem {
  id: string;
  contact_id: string;
  crm_stage: string;
  community_id: string | null;
  division_id: string | null;
  source: string | null;
  opportunity_source: string | null;
  queue_source: string | null;
  notes: string | null;
  budget_min: number | null;
  budget_max: number | null;
  engagement_score: number | null;
  last_activity_at: string | null;
  created_at: string;
  contacts: { first_name: string; last_name: string; email: string | null; phone: string | null } | null;
  communities: { name: string } | null;
}

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  channel: string | null;
  status: string;
  due_at: string | null;
  snoozed_until: string | null;
  completed_at: string | null;
  ai_suggestion: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  division_id: string | null;
  created_at: string;
  contacts: { first_name: string; last_name: string } | null;
}

interface CommunityRef { id: string; name: string; }

type QueueBucket = "new_inbound" | "re_engaged" | "demoted" | "ai_surfaced" | "customer";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  const fmt = (n: number) => `$${(n / 1000).toFixed(0)}K`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `${fmt(min)}+`;
  return `up to ${fmt(max!)}`;
}

function sourceLabel(src: string | null): string {
  const map: Record<string, string> = {
    called_osc: "📞 Called", texted_osc: "💬 Texted", webform_interest: "🌐 Web Form",
    schedule_appt: "📅 Appt Request", ai_auto_promote: "🤖 AI Surfaced",
    website: "🌐 Website", realtor: "🏠 Realtor", walk_in: "🚶 Walk-in",
    event: "🎪 Event", phone: "📞 Phone", referral: "👤 Referral",
    zillow: "🏠 Zillow", social_media: "📱 Social",
  };
  return map[src ?? ""] ?? src ?? "—";
}

function classifyBucket(item: QueueItem): QueueBucket {
  const qs = item.queue_source;
  if (qs === "demoted") return "demoted";
  if (qs === "ai_surfaced" || item.opportunity_source === "ai_auto_promote") return "ai_surfaced";
  if (qs === "re_engaged") return "re_engaged";
  if (qs === "customer") return "customer";
  // Default: new inbound (web forms, calls, texts, walk-ins, etc.)
  return "new_inbound";
}

const BUCKET_META: { id: QueueBucket; icon: string; label: string; description: string }[] = [
  { id: "new_inbound", icon: "🆕", label: "New Inbound", description: "Brand new web forms, calls" },
  { id: "re_engaged", icon: "📋", label: "Re-engaged", description: "Existing leads showing new activity" },
  { id: "demoted", icon: "↓", label: "Demoted", description: "Prospects pushed back by CSM" },
  { id: "ai_surfaced", icon: "🤖", label: "AI Surfaced", description: "Scoring spikes, behavioral signals" },
  { id: "customer", icon: "👤", label: "Customer", description: "Existing homeowners reaching out" },
];

function channelIcon(ch: string | null): string {
  const map: Record<string, string> = {
    call: "📞", phone: "📞", email: "📧", text: "💬", sms: "💬", chat: "💬",
  };
  return map[ch ?? ""] ?? "📋";
}

function priorityBadge(p: string | null): { color: string; bg: string; label: string } {
  if (p === "high") return { color: "#fca5a5", bg: "#7f1d1d", label: "🔴 High" };
  if (p === "medium") return { color: "#fbbf24", bg: "#422006", label: "🟡 Medium" };
  return { color: "#86efac", bg: "#052e16", label: "🟢 Low" };
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, padding: 48 }}>
      <div style={{ fontSize: 48, opacity: 0.3 }}>◎</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#a1a1aa" }}>OSC Command Center</div>
      <div style={{ fontSize: 13, color: "#71717a", textAlign: "center", maxWidth: 400, lineHeight: 1.6 }}>
        Select a <strong style={{ color: "#80B602" }}>Division</strong> to load your Queue and Action Items.
      </div>
    </div>
  );
}

// ─── Action Modal (Promote/Demote) ───────────────────────────────────────────

type ActionType = "promote" | "demote" | null;

function ActionModal({
  item, action, communities, onClose, onExecute,
}: {
  item: QueueItem;
  action: ActionType;
  communities: CommunityRef[];
  onClose: () => void;
  onExecute: (oppId: string, newStage: string, communityId: string | null, reason: string) => void;
}) {
  const [targetStage, setTargetStage] = useState(action === "promote" ? "prospect_c" : "lead");
  const [targetCommunity, setTargetCommunity] = useState(item.community_id ?? "");
  const [reason, setReason] = useState("");

  const promoteOptions = [
    { value: "prospect_c", label: "Prospect C — 30-90 day horizon" },
    { value: "prospect_b", label: "Prospect B — Intent within 30 days" },
    { value: "prospect_a", label: "Prospect A — Contract this week" },
  ];
  const demoteOptions = [
    { value: "lead", label: "Lead — Keep nurturing in community" },
    { value: "marketing", label: "Marketing — Division-level only" },
  ];
  const options = action === "promote" ? promoteOptions : demoteOptions;
  const name = `${item.contacts?.first_name ?? "—"} ${item.contacts?.last_name ?? ""}`;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 50, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: 480, backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 12,
        zIndex: 51, overflow: "hidden",
      }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #27272a" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#fafafa" }}>
            {action === "promote" ? "Promote" : "Demote"}: {name}
          </div>
          <div style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>
            Currently in Queue{item.communities?.name ? ` — ${item.communities.name}` : ""}
          </div>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Target stage */}
          <div>
            <label style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
              Move to
            </label>
            <select value={targetStage} onChange={e => setTargetStage(e.target.value)} style={{
              width: "100%", padding: "8px 12px", backgroundColor: "#09090b", border: "1px solid #27272a",
              borderRadius: 6, color: "#fafafa", fontSize: 13, outline: "none",
            }}>
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Community (for promote) */}
          {action === "promote" && (
            <div>
              <label style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                Community
              </label>
              <select value={targetCommunity} onChange={e => setTargetCommunity(e.target.value)} style={{
                width: "100%", padding: "8px 12px", backgroundColor: "#09090b", border: "1px solid #27272a",
                borderRadius: 6, color: "#fafafa", fontSize: 13, outline: "none",
              }}>
                <option value="">Select community...</option>
                {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Reason */}
          <div>
            <label style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
              Reason
            </label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
              placeholder={action === "promote" ? "e.g., Toured model, very interested in Hadley plan" : "e.g., Not ready to build for 12+ months"}
              style={{
                width: "100%", padding: "8px 12px", backgroundColor: "#09090b", border: "1px solid #27272a",
                borderRadius: 6, color: "#a1a1aa", fontSize: 12, outline: "none", resize: "none",
              }} />
          </div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #27272a", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{
            padding: "8px 16px", borderRadius: 6, border: "1px solid #27272a",
            backgroundColor: "#09090b", color: "#a1a1aa", fontSize: 12, cursor: "pointer",
          }}>Cancel</button>
          <button
            onClick={() => onExecute(item.id, targetStage, action === "promote" ? targetCommunity : item.community_id, reason)}
            disabled={action === "promote" && !targetCommunity}
            style={{
              padding: "8px 16px", borderRadius: 6, border: "none",
              backgroundColor: action === "promote" ? "#166534" : "#991b1b",
              color: "#fafafa", fontSize: 12, fontWeight: 600, cursor: "pointer",
              opacity: (action === "promote" && !targetCommunity) ? 0.4 : 1,
            }}>
            {action === "promote" ? "↑ Promote" : "↓ Demote"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Snooze Picker ────────────────────────────────────────────────────────────

function SnoozePicker({ onSnooze, onClose }: { onSnooze: (until: string) => void; onClose: () => void }) {
  const options = [
    { label: "1 hour", ms: 3600000 },
    { label: "4 hours", ms: 14400000 },
    { label: "Tomorrow 9am", ms: 0 },
    { label: "Next Monday 9am", ms: 0 },
  ];

  function computeTime(opt: { label: string; ms: number }): string {
    if (opt.ms > 0) return new Date(Date.now() + opt.ms).toISOString();
    const now = new Date();
    if (opt.label.startsWith("Tomorrow")) {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d.toISOString();
    }
    // Next Monday
    const d = new Date(now);
    const dayOfWeek = d.getDay();
    const daysUntilMon = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    d.setDate(d.getDate() + daysUntilMon);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
      <div style={{
        position: "absolute", right: 0, top: "100%", marginTop: 4, zIndex: 51,
        backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8,
        padding: 4, minWidth: 160, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}>
        {options.map(opt => (
          <button key={opt.label} onClick={() => onSnooze(computeTime(opt))} style={{
            display: "block", width: "100%", padding: "8px 12px", textAlign: "left",
            background: "none", border: "none", color: "#a1a1aa", fontSize: 12,
            cursor: "pointer", borderRadius: 4,
          }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#27272a")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            ⏰ {opt.label}
          </button>
        ))}
      </div>
    </>
  );
}

// ─── Queue Card ───────────────────────────────────────────────────────────────

function QueueCard({
  item, onPromote, onDemote,
}: {
  item: QueueItem;
  onPromote: () => void;
  onDemote: () => void;
}) {
  const name = `${item.contacts?.first_name ?? "—"} ${item.contacts?.last_name ?? ""}`;
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8,
      overflow: "hidden", transition: "border-color 0.15s",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#3f3f46")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}
    >
      {/* Main row */}
      <div onClick={() => setExpanded(!expanded)} style={{
        padding: "12px 16px", cursor: "pointer",
        display: "grid", gridTemplateColumns: "1fr auto auto auto auto auto",
        alignItems: "center", gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#fafafa" }}>{name}</div>
          <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>
            {item.communities?.name ?? "No community"} · {sourceLabel(item.opportunity_source ?? item.source)}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#71717a" }}>{item.contacts?.phone ?? "—"}</div>
        <div style={{ fontSize: 11, color: "#71717a" }}>{formatBudget(item.budget_min, item.budget_max)}</div>
        <div style={{ fontSize: 11, color: "#52525b" }}>{relativeTime(item.last_activity_at)}</div>
        <button onClick={e => { e.stopPropagation(); onPromote(); }} style={{
          padding: "4px 10px", borderRadius: 4, border: "1px solid #166534",
          backgroundColor: "#052e16", color: "#4ade80", fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>↑ Promote</button>
        <button onClick={e => { e.stopPropagation(); onDemote(); }} style={{
          padding: "4px 10px", borderRadius: 4, border: "1px solid #991b1b",
          backgroundColor: "#1c1917", color: "#f87171", fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>↓ Demote</button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: "0 16px 12px", borderTop: "1px solid #27272a", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Email</span>
              <div style={{ fontSize: 12, color: "#a1a1aa" }}>{item.contacts?.email ?? "—"}</div>
            </div>
            <div>
              <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Source</span>
              <div style={{ fontSize: 12, color: "#a1a1aa" }}>{sourceLabel(item.source)}</div>
            </div>
            <div>
              <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Created</span>
              <div style={{ fontSize: 12, color: "#a1a1aa" }}>{new Date(item.created_at).toLocaleDateString()}</div>
            </div>
          </div>
          {item.notes && (
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Notes</span>
              <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.5 }}>{item.notes}</div>
            </div>
          )}
          {/* AI Recommendation */}
          <div style={{
            marginTop: 8, padding: "10px 14px", backgroundColor: "#052e16", border: "1px solid #166534",
            borderRadius: 6,
          }}>
            <div style={{ fontSize: 10, color: "#4ade80", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
              🤖 AI Recommendation
            </div>
            <div style={{ fontSize: 12, color: "#86efac", lineHeight: 1.5 }}>
              {item.opportunity_source === "webform_interest"
                ? `Responded via web form. Suggest calling within 5 minutes — speed-to-lead is critical. Reference their community interest in ${item.communities?.name ?? "the community"}.`
                : item.opportunity_source === "called_osc"
                ? "Inbound caller — high intent. Schedule a model home visit within the next 48 hours."
                : item.opportunity_source === "texted_osc"
                ? "Texted the sales line. Reply within 2 minutes with a warm greeting and availability for a call."
                : `Review this contact's activity and engagement. ${item.budget_min ? `Budget range ${formatBudget(item.budget_min, item.budget_max)} fits available inventory.` : "Budget not yet captured — ask during first contact."}`
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task, onComplete, onSnooze,
}: {
  task: TaskItem;
  onComplete: () => void;
  onSnooze: (until: string) => void;
}) {
  const [showSnooze, setShowSnooze] = useState(false);
  const pb = priorityBadge(task.priority);
  const contactName = task.contacts
    ? `${task.contacts.first_name} ${task.contacts.last_name}`
    : null;

  return (
    <div style={{
      backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8,
      padding: "12px 14px", transition: "border-color 0.15s", position: "relative",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#3f3f46")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}
    >
      {/* Header: title + priority */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#fafafa", flex: 1 }}>
          {channelIcon(task.channel)} {task.title}
        </span>
        <span style={{
          fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 600,
          backgroundColor: pb.bg, color: pb.color,
        }}>{pb.label}</span>
      </div>

      {/* Contact + due */}
      {contactName && (
        <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 4 }}>
          {contactName}
        </div>
      )}

      {/* AI suggestion */}
      {task.ai_suggestion && (
        <div style={{
          fontSize: 11, color: "#86efac", backgroundColor: "#052e16", border: "1px solid #166534",
          borderRadius: 4, padding: "6px 10px", marginBottom: 8, lineHeight: 1.5,
        }}>
          🤖 {task.ai_suggestion}
        </div>
      )}

      {task.description && !task.ai_suggestion && (
        <div style={{ fontSize: 11, color: "#71717a", marginBottom: 8, lineHeight: 1.4 }}>
          {task.description}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", position: "relative" }}>
        {task.channel === "call" || task.channel === "phone" ? (
          <ActionBtn label="📞 Call" />
        ) : null}
        {task.channel === "email" ? (
          <ActionBtn label="📧 Email" />
        ) : null}
        {task.channel === "text" || task.channel === "sms" ? (
          <ActionBtn label="💬 Text" />
        ) : null}
        {!task.channel && (
          <>
            <ActionBtn label="📞 Call" />
            <ActionBtn label="📧 Email" />
            <ActionBtn label="💬 Text" />
          </>
        )}
        <button onClick={onComplete} style={{
          padding: "4px 10px", borderRadius: 4, border: "1px solid #166534",
          backgroundColor: "#052e16", color: "#4ade80", fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>✓ Complete</button>
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowSnooze(!showSnooze)} style={{
            padding: "4px 10px", borderRadius: 4, border: "1px solid #27272a",
            backgroundColor: "#09090b", color: "#a1a1aa", fontSize: 11, cursor: "pointer",
          }}>⏰ Snooze</button>
          {showSnooze && (
            <SnoozePicker
              onSnooze={(until) => { setShowSnooze(false); onSnooze(until); }}
              onClose={() => setShowSnooze(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ label }: { label: string }) {
  return (
    <button style={{
      padding: "4px 10px", borderRadius: 4, border: "1px solid #27272a",
      backgroundColor: "#09090b", color: "#a1a1aa", fontSize: 11, cursor: "pointer",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#3f3f46")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}
    >{label}</button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OscClient() {
  const { filter, labels } = useGlobalFilter();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [communities, setCommunities] = useState<CommunityRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionItem, setActionItem] = useState<QueueItem | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [activeBucket, setActiveBucket] = useState<QueueBucket>("new_inbound");

  // ── Fetch queue + tasks ──
  const fetchData = useCallback(async () => {
    if (!filter.divisionId) return;
    setLoading(true);

    // Communities for this division
    const { data: comms } = await supabase
      .from("communities").select("id, name").eq("division_id", filter.divisionId).order("name");
    setCommunities(comms ?? []);

    // Queue items
    const { data: items } = await supabase
      .from("opportunities")
      .select("id, contact_id, crm_stage, community_id, division_id, source, opportunity_source, queue_source, notes, budget_min, budget_max, engagement_score, last_activity_at, created_at, contacts(first_name, last_name, email, phone), communities(name)")
      .eq("crm_stage", "queue")
      .eq("division_id", filter.divisionId)
      .order("last_activity_at", { ascending: false });

    const flat = (items ?? []).map((item: Record<string, unknown>) => ({
      ...item,
      contacts: Array.isArray(item.contacts) ? (item.contacts as Record<string, unknown>[])[0] ?? null : item.contacts,
      communities: Array.isArray(item.communities) ? (item.communities as Record<string, unknown>[])[0] ?? null : item.communities,
    })) as QueueItem[];
    setQueueItems(flat);

    // Tasks
    const now = new Date().toISOString();
    const { data: taskData } = await supabase
      .from("tasks")
      .select("id, title, description, priority, channel, status, due_at, snoozed_until, completed_at, ai_suggestion, contact_id, opportunity_id, division_id, created_at, contacts(first_name, last_name)")
      .eq("division_id", filter.divisionId)
      .eq("status", "pending")
      .or(`snoozed_until.is.null,snoozed_until.lte.${now}`)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });

    const flatTasks = (taskData ?? []).map((t: Record<string, unknown>) => ({
      ...t,
      contacts: Array.isArray(t.contacts) ? (t.contacts as Record<string, unknown>[])[0] ?? null : t.contacts,
    })) as TaskItem[];
    setTasks(flatTasks);

    setLoading(false);
  }, [filter.divisionId]);

  useEffect(() => {
    if (!filter.divisionId) {
      setQueueItems([]);
      setTasks([]);
      setCommunities([]);
      return;
    }
    fetchData();
  }, [filter.divisionId, fetchData]);

  // ── Bucketed queue ──
  const bucketCounts: Record<QueueBucket, number> = {
    new_inbound: 0, re_engaged: 0, demoted: 0, ai_surfaced: 0, customer: 0,
  };
  const bucketedItems: Record<QueueBucket, QueueItem[]> = {
    new_inbound: [], re_engaged: [], demoted: [], ai_surfaced: [], customer: [],
  };
  for (const item of queueItems) {
    const bucket = classifyBucket(item);
    bucketCounts[bucket]++;
    bucketedItems[bucket].push(item);
  }
  const currentBucketItems = bucketedItems[activeBucket];

  // ── Execute promotion/demotion ──
  async function handleAction(oppId: string, newStage: string, communityId: string | null, reason: string) {
    const update: Record<string, unknown> = { crm_stage: newStage };
    if (communityId) update.community_id = communityId;
    if (newStage === "marketing") update.community_id = null;

    const { error } = await supabase
      .from("opportunities")
      .update(update)
      .eq("id", oppId);

    if (error) {
      console.error("Stage transition failed:", error);
      alert(`Error: ${error.message}`);
    } else {
      const item = queueItems.find(q => q.id === oppId);
      if (item) {
        await supabase.from("stage_transitions").insert({
          org_id: "00000000-0000-0000-0000-000000000001",
          opportunity_id: oppId,
          contact_id: item.contact_id,
          from_stage: "queue",
          to_stage: newStage,
          triggered_by: "manual",
          reason: reason || null,
        });
      }
    }

    setActionItem(null);
    setActionType(null);
    fetchData();
  }

  // ── Complete task ──
  async function handleCompleteTask(taskId: string) {
    const { error } = await supabase
      .from("tasks")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", taskId);

    if (error) {
      console.error("Task completion failed:", error);
      alert(`Error: ${error.message}`);
    }
    fetchData();
  }

  // ── Snooze task ──
  async function handleSnoozeTask(taskId: string, until: string) {
    const { error } = await supabase
      .from("tasks")
      .update({ snoozed_until: until })
      .eq("id", taskId);

    if (error) {
      console.error("Task snooze failed:", error);
      alert(`Error: ${error.message}`);
    }
    fetchData();
  }

  // ── No division selected ──
  if (!filter.divisionId) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", backgroundColor: "#09090b", color: "#fafafa" }}>
        <div style={{ padding: "10px 24px", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>OSC Command Center</span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, backgroundColor: "#18181b", border: "1px solid #27272a", color: "#71717a" }}>Online Sales Consultant</span>
        </div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", backgroundColor: "#09090b", color: "#fafafa" }}>
      {/* ── Top Bar ── */}
      <div style={{
        padding: "10px 24px", borderBottom: "1px solid #27272a",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>OSC Command Center</span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, backgroundColor: "#18181b", border: "1px solid #27272a", color: "#71717a" }}>
            {labels.division ?? "Division"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "#52525b" }}>Queue:</span>
            <span style={{
              fontSize: 16, fontWeight: 700,
              color: queueItems.length === 0 ? "#4ade80" : queueItems.length > 10 ? "#f87171" : "#fbbf24",
            }}>{queueItems.length}</span>
          </div>
          <span style={{ fontSize: 11, color: "#52525b" }}>
            Goal: <strong style={{ color: queueItems.length === 0 ? "#4ade80" : "#fafafa" }}>0</strong>
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#52525b", padding: 48 }}>Loading...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "start" }}>
            {/* ── LEFT: Sub-bucketed Queue ── */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>Queue</span>
                <span style={{
                  fontSize: 10, padding: "1px 6px", borderRadius: 4,
                  backgroundColor: queueItems.length === 0 ? "#052e16" : "#7f1d1d",
                  color: queueItems.length === 0 ? "#4ade80" : "#fca5a5",
                  fontWeight: 600,
                }}>{queueItems.length === 0 ? "✓ Clear" : `${queueItems.length} pending`}</span>
              </div>

              {/* Bucket tabs */}
              <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #27272a", marginBottom: 12 }}>
                {BUCKET_META.map(b => {
                  const isActive = activeBucket === b.id;
                  const count = bucketCounts[b.id];
                  return (
                    <button key={b.id} onClick={() => setActiveBucket(b.id)} style={{
                      padding: "8px 12px", fontSize: 11, fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#fafafa" : "#52525b",
                      borderBottom: isActive ? "2px solid #fafafa" : "2px solid transparent",
                      background: "none", border: "none", borderBottomStyle: "solid",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                      whiteSpace: "nowrap",
                    }}>
                      <span>{b.icon}</span>
                      <span>{b.label}</span>
                      <span style={{
                        fontSize: 10, padding: "0 5px", borderRadius: 3, fontWeight: 600,
                        backgroundColor: count > 0 ? "#7f1d1d" : "#27272a",
                        color: count > 0 ? "#fca5a5" : "#71717a",
                      }}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Queue items for active bucket */}
              {currentBucketItems.length === 0 ? (
                <div style={{
                  padding: 32, textAlign: "center", backgroundColor: "#18181b", border: "1px solid #27272a",
                  borderRadius: 8, color: "#52525b", fontSize: 12,
                }}>
                  No items in {BUCKET_META.find(b => b.id === activeBucket)?.label ?? "this bucket"}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {currentBucketItems.map(item => (
                    <QueueCard
                      key={item.id}
                      item={item}
                      onPromote={() => { setActionItem(item); setActionType("promote"); }}
                      onDemote={() => { setActionItem(item); setActionType("demote"); }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── RIGHT: Action Items (Tasks) ── */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>Action Items</span>
                <span style={{
                  fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 600,
                  backgroundColor: tasks.length > 0 ? "#422006" : "#052e16",
                  color: tasks.length > 0 ? "#fbbf24" : "#4ade80",
                }}>{tasks.length} pending</span>
              </div>

              {tasks.length === 0 ? (
                <div style={{
                  padding: 32, textAlign: "center", backgroundColor: "#052e16", border: "1px solid #166534",
                  borderRadius: 8, color: "#4ade80", fontSize: 12, fontWeight: 500,
                }}>
                  ✓ All tasks complete
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={() => handleCompleteTask(task.id)}
                      onSnooze={(until) => handleSnoozeTask(task.id, until)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Action Modal ── */}
      {actionItem && actionType && (
        <ActionModal
          item={actionItem}
          action={actionType}
          communities={communities}
          onClose={() => { setActionItem(null); setActionType(null); }}
          onExecute={handleAction}
        />
      )}
    </div>
  );
}
