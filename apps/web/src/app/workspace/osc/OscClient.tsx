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
  notes: string | null;
  budget_min: number | null;
  budget_max: number | null;
  engagement_score: number | null;
  last_activity_at: string | null;
  created_at: string;
  contacts: { first_name: string; last_name: string; email: string | null; phone: string | null } | null;
  communities: { name: string } | null;
}

interface CommunityRef { id: string; name: string; }

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

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, padding: 48 }}>
      <div style={{ fontSize: 48, opacity: 0.3 }}>◎</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#a1a1aa" }}>OSC Command Center</div>
      <div style={{ fontSize: 13, color: "#71717a", textAlign: "center", maxWidth: 400, lineHeight: 1.6 }}>
        Select a <strong style={{ color: "#80B602" }}>Division</strong> to load your Queue and Communication Hub.
      </div>
    </div>
  );
}

// ─── Action Modal ─────────────────────────────────────────────────────────────

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
          {/* AI Recommendation stub */}
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

// ─── Comm Hub ─────────────────────────────────────────────────────────────────

type CommTab = "urgent" | "needs_response" | "calls" | "texts" | "emails";

function CommHub() {
  const [tab, setTab] = useState<CommTab>("urgent");
  const tabs: { id: CommTab; label: string; count: number }[] = [
    { id: "urgent", label: "Urgent", count: 3 },
    { id: "needs_response", label: "Needs Response", count: 5 },
    { id: "calls", label: "Calls", count: 2 },
    { id: "texts", label: "Texts", count: 4 },
    { id: "emails", label: "Emails", count: 8 },
  ];

  const dummyMessages = [
    { name: "Robert Clark", channel: "📞", preview: "Voicemail: Hi, I'm calling about Cardinal Grove pricing...", time: "12m ago", badge: "urgent" },
    { name: "Sarah Martinez", channel: "💬", preview: "Are there any lots available near the pond?", time: "25m ago", badge: "needs_response" },
    { name: "David Thompson", channel: "📧", preview: "RE: Cardinal Grove Tour — Can we reschedule to Saturday?", time: "1h ago", badge: "needs_response" },
    { name: "Jennifer Wilson", channel: "📞", preview: "Missed call (2 min ago)", time: "2m ago", badge: "urgent" },
    { name: "Michael Brown", channel: "💬", preview: "What's the difference between the Hadley and Stonefield?", time: "45m ago", badge: null },
  ];

  return (
    <div style={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>Communication Hub</span>
      </div>
      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #27272a" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 14px", fontSize: 11, fontWeight: tab === t.id ? 600 : 400,
            color: tab === t.id ? "#fafafa" : "#52525b",
            borderBottom: tab === t.id ? "2px solid #fafafa" : "2px solid transparent",
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {t.label}
            <span style={{
              fontSize: 10, padding: "0 4px", borderRadius: 3,
              backgroundColor: t.id === "urgent" ? "#7f1d1d" : "#27272a",
              color: t.id === "urgent" ? "#fca5a5" : "#71717a",
            }}>{t.count}</span>
          </button>
        ))}
      </div>
      {/* Messages */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {dummyMessages.map((msg, i) => (
          <div key={i} style={{
            padding: "10px 16px", borderBottom: "1px solid #1e1e21", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 12,
          }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#1e1e21")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: "50%", backgroundColor: "#27272a",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600, color: "#a1a1aa", flexShrink: 0,
            }}>
              {msg.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#fafafa" }}>{msg.name}</span>
                <span style={{ fontSize: 10, color: "#52525b" }}>{msg.channel}</span>
                {msg.badge === "urgent" && (
                  <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, backgroundColor: "#7f1d1d", color: "#fca5a5", fontWeight: 600 }}>URGENT</span>
                )}
                {msg.badge === "needs_response" && (
                  <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, backgroundColor: "#422006", color: "#fbbf24", fontWeight: 600 }}>NEEDS RESPONSE</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#71717a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.preview}</div>
            </div>
            <span style={{ fontSize: 10, color: "#52525b", flexShrink: 0 }}>{msg.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OscClient() {
  const { filter, labels } = useGlobalFilter();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [communities, setCommunities] = useState<CommunityRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionItem, setActionItem] = useState<QueueItem | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);

  const fetchQueue = useCallback(async () => {
    if (!filter.divisionId) return;
    setLoading(true);

    // Get communities for this division
    const { data: comms } = await supabase
      .from("communities").select("id, name").eq("division_id", filter.divisionId).order("name");
    setCommunities(comms ?? []);

    // Get queue items (opportunities with crm_stage = 'queue') for this division
    const { data: items } = await supabase
      .from("opportunities")
      .select("id, contact_id, crm_stage, community_id, division_id, source, opportunity_source, notes, budget_min, budget_max, engagement_score, last_activity_at, created_at, contacts(first_name, last_name, email, phone), communities(name)")
      .eq("crm_stage", "queue")
      .eq("division_id", filter.divisionId)
      .order("last_activity_at", { ascending: false });

    // Supabase returns arrays for single-FK joins — flatten to single objects
    const flat = (items ?? []).map((item: any) => ({
      ...item,
      contacts: Array.isArray(item.contacts) ? item.contacts[0] ?? null : item.contacts,
      communities: Array.isArray(item.communities) ? item.communities[0] ?? null : item.communities,
    }));
    setQueueItems(flat);
    setLoading(false);
  }, [filter.divisionId]);

  useEffect(() => {
    if (!filter.divisionId) {
      setQueueItems([]);
      setCommunities([]);
      return;
    }
    fetchQueue();
  }, [filter.divisionId, fetchQueue]);

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
      // Log the transition manually (trigger handles it too, but let's add the reason)
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
    fetchQueue(); // Refresh the queue
  }

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
      {/* Top bar */}
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

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#52525b", padding: 48 }}>Loading queue...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "start" }}>
            {/* LEFT: Queue */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>Queue</span>
                <span style={{
                  fontSize: 10, padding: "1px 6px", borderRadius: 4,
                  backgroundColor: queueItems.length === 0 ? "#052e16" : "#7f1d1d",
                  color: queueItems.length === 0 ? "#4ade80" : "#fca5a5",
                  fontWeight: 600,
                }}>{queueItems.length === 0 ? "✓ Clear" : `${queueItems.length} pending`}</span>
              </div>

              {queueItems.length === 0 ? (
                <div style={{
                  padding: 48, textAlign: "center", backgroundColor: "#052e16", border: "1px solid #166534",
                  borderRadius: 8, color: "#4ade80", fontSize: 14, fontWeight: 500,
                }}>
                  ✓ Queue is clear — all contacts routed
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {queueItems.map(item => (
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

            {/* RIGHT: Comm Hub */}
            <div>
              <CommHub />
            </div>
          </div>
        )}
      </div>

      {/* Action Modal */}
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
