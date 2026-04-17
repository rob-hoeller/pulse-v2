"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommunityViewProps {
  community: Record<string, any>;
  plans: any[];
  lots: any[];
  modelHome: any | null;
  specHomes: any[];
  divisions: { id: string; name: string; slug: string }[];
}

interface MonthGoal {
  month: string;
  sales: number;
  goal: number;
}

interface StubMessage {
  id: string;
  name: string;
  initials: string;
  channel: "call" | "text" | "email";
  badges: ("urgent" | "needs-response")[];
  preview: string;
  aiSuggestion?: string;
  time: string;
}

// ─── Stubbed Data ─────────────────────────────────────────────────────────────

const MONTH_GOALS: MonthGoal[] = [
  { month: "JAN", sales: 3, goal: 4 },
  { month: "FEB", sales: 5, goal: 4 },
  { month: "MAR", sales: 4, goal: 4 },
  { month: "APR", sales: 2, goal: 4 },
  { month: "MAY", sales: 0, goal: 4 },
  { month: "JUN", sales: 0, goal: 5 },
  { month: "JUL", sales: 0, goal: 5 },
  { month: "AUG", sales: 0, goal: 5 },
  { month: "SEP", sales: 0, goal: 4 },
  { month: "OCT", sales: 0, goal: 4 },
  { month: "NOV", sales: 0, goal: 3 },
  { month: "DEC", sales: 0, goal: 3 },
];

const STUB_MESSAGES: StubMessage[] = [
  {
    id: "m1",
    name: "Sarah Mitchell",
    initials: "SM",
    channel: "call",
    badges: ["urgent"],
    preview: "Called about lot 42 pricing — wants to schedule a walkthrough this weekend.",
    aiSuggestion: "Confirm availability for Saturday 10am and send lot premium sheet.",
    time: "12m ago",
  },
  {
    id: "m2",
    name: "James Rivera",
    initials: "JR",
    channel: "email",
    badges: ["needs-response"],
    preview: "Re: HOA fees and community amenities — requesting updated brochure.",
    aiSuggestion: "Send latest community brochure PDF and HOA breakdown.",
    time: "1h ago",
  },
  {
    id: "m3",
    name: "Karen & Tom Wells",
    initials: "KW",
    channel: "text",
    badges: ["urgent", "needs-response"],
    preview: "Can we move our appointment to next Tuesday? Also have questions about the Ashton plan.",
    time: "2h ago",
  },
  {
    id: "m4",
    name: "David Chen",
    initials: "DC",
    channel: "call",
    badges: [],
    preview: "Follow-up call completed — confirmed interest in QD home on lot 18.",
    time: "3h ago",
  },
  {
    id: "m5",
    name: "Lisa Patel",
    initials: "LP",
    channel: "email",
    badges: ["needs-response"],
    preview: "Asking about 55+ eligibility requirements and available floor plans.",
    aiSuggestion: "Share eligibility guide and link to virtual tours for Captiva and Sanibel plans.",
    time: "5h ago",
  },
];

type CommTab = "urgent" | "needs-response" | "call" | "text" | "email";

const CHANNEL_ICONS: Record<string, string> = {
  call: "📞",
  text: "💬",
  email: "✉️",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return `${formatPrice(min)} – ${formatPrice(max)}`;
  if (min != null) return `${formatPrice(min)}+`;
  return `up to ${formatPrice(max)}`;
}

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

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label, value, subtitle, active, onClick,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "16px 20px",
        backgroundColor: active ? "#18181b" : "#09090b",
        border: `1px solid ${active ? "#3f3f46" : "#27272a"}`,
        borderRadius: 8,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0,
      }}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.borderColor = "#52525b";
          e.currentTarget.style.backgroundColor = "#18181b";
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          e.currentTarget.style.borderColor = active ? "#3f3f46" : "#27272a";
          e.currentTarget.style.backgroundColor = active ? "#18181b" : "#09090b";
        }
      }}
    >
      <span style={{ fontSize: 11, color: "#71717a", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      <span style={{ fontSize: 24, fontWeight: 600, color: "#fafafa", lineHeight: 1.2 }}>
        {value}
      </span>
      {subtitle && (
        <span style={{ fontSize: 11, color: "#52525b" }}>{subtitle}</span>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>{title}</span>
        {count !== undefined && (
          <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, backgroundColor: "#18181b", border: "1px solid #27272a", color: "#71717a" }}>{count}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Data Table ───────────────────────────────────────────────────────────────

function MiniTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid #27272a", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{
                padding: "8px 14px", textAlign: "left", fontSize: 11, color: "#71717a",
                fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em",
                backgroundColor: "#09090b", borderBottom: "1px solid #27272a",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#3f3f46" }}>No data</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#18181b")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: "8px 14px", fontSize: 12, color: j === 0 ? "#fafafa" : "#a1a1aa",
                  fontWeight: j === 0 ? 500 : 400, borderBottom: "1px solid #18181b",
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Drill-down panels ────────────────────────────────────────────────────────

type DrillPanel = null | "plans" | "lots" | "leads" | "prospects" | "customers" | "appointments" | "qd";

// ─── Sales Goal Strip ─────────────────────────────────────────────────────────

function SalesGoalStrip() {
  const ytdSales = MONTH_GOALS.reduce((s, m) => s + m.sales, 0);
  const ytdGoal = MONTH_GOALS.reduce((s, m) => s + m.goal, 0);

  return (
    <div style={{ padding: "16px 24px" }}>
      <div style={{
        display: "flex",
        alignItems: "stretch",
        gap: 0,
        border: "1px solid #27272a",
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "#09090b",
      }}>
        {/* YTD Summary */}
        <div style={{
          padding: "12px 20px",
          borderRight: "1px solid #27272a",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minWidth: 120,
          gap: 2,
        }}>
          <span style={{ fontSize: 11, color: "#71717a", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>YTD</span>
          <span style={{ fontSize: 18, fontWeight: 600, color: "#fafafa" }}>Sales: {ytdSales}</span>
          <span style={{ fontSize: 11, color: "#52525b" }}>Goal: {ytdSales} / {ytdGoal}</span>
        </div>
        {/* Monthly columns */}
        {MONTH_GOALS.map((m) => {
          const met = m.sales >= m.goal && m.goal > 0;
          return (
            <div key={m.month} style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 4px",
              borderRight: "1px solid #18181b",
              borderBottom: `2px solid ${met ? "#22c55e" : "#27272a"}`,
              minWidth: 0,
            }}>
              <span style={{ fontSize: 10, color: "#52525b", fontWeight: 500, letterSpacing: "0.05em" }}>{m.month}</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: m.sales > 0 ? "#fafafa" : "#3f3f46", marginTop: 2 }}>{m.sales}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Communication Hub ────────────────────────────────────────────────────────

function CommunicationHub() {
  const [activeTab, setActiveTab] = useState<CommTab>("urgent");

  const filteredMessages = STUB_MESSAGES.filter((msg) => {
    switch (activeTab) {
      case "urgent": return msg.badges.includes("urgent");
      case "needs-response": return msg.badges.includes("needs-response");
      case "call": return msg.channel === "call";
      case "text": return msg.channel === "text";
      case "email": return msg.channel === "email";
      default: return true;
    }
  });

  const tabs: { key: CommTab; label: string }[] = [
    { key: "urgent", label: "Urgent" },
    { key: "needs-response", label: "Needs Response" },
    { key: "call", label: "Call" },
    { key: "text", label: "Text" },
    { key: "email", label: "Email" },
  ];

  return (
    <div style={{ flex: "0 0 60%", minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#fafafa", marginBottom: 12 }}>Communication Hub</div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "6px 14px",
              fontSize: 11,
              fontWeight: 500,
              borderRadius: 6,
              border: `1px solid ${activeTab === t.key ? "#3f3f46" : "#27272a"}`,
              backgroundColor: activeTab === t.key ? "#27272a" : "transparent",
              color: activeTab === t.key ? "#fafafa" : "#71717a",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Message list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filteredMessages.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#3f3f46", border: "1px solid #27272a", borderRadius: 8 }}>
            No messages in this category
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <div
              key={msg.id}
              style={{
                padding: "12px 16px",
                backgroundColor: "#18181b",
                borderRadius: 8,
                border: "1px solid #27272a",
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#3f3f46")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#27272a")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  backgroundColor: "#27272a", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 600, color: "#a1a1aa", flexShrink: 0,
                }}>
                  {msg.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#fafafa" }}>{msg.name}</span>
                    {msg.badges.includes("urgent") && (
                      <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, backgroundColor: "#450a0a", color: "#fca5a5", fontWeight: 500 }}>Urgent</span>
                    )}
                    {msg.badges.includes("needs-response") && (
                      <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, backgroundColor: "#172554", color: "#93c5fd", fontWeight: 500 }}>Needs Response</span>
                    )}
                    <span style={{ fontSize: 11, marginLeft: "auto", flexShrink: 0 }}>{CHANNEL_ICONS[msg.channel] ?? ""}</span>
                  </div>
                </div>
                <span style={{ fontSize: 10, color: "#52525b", flexShrink: 0 }}>{msg.time}</span>
              </div>
              <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.5 }}>{msg.preview}</div>
              {msg.aiSuggestion && (
                <div style={{
                  marginTop: 8, padding: "8px 12px", borderRadius: 6,
                  backgroundColor: "#052e16", border: "1px solid #14532d",
                  fontSize: 11, color: "#86efac", lineHeight: 1.4,
                }}>
                  <span style={{ fontWeight: 600, marginRight: 4 }}>AI:</span>{msg.aiSuggestion}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── AI Scoring Panel ─────────────────────────────────────────────────────────

function AIScoringPanel({ prospects }: { prospects: any[] }) {
  const high = prospects.filter((p: any) => p.stage === "prospect_a");
  const medium = prospects.filter((p: any) => p.stage === "prospect_b");
  const low = prospects.filter((p: any) => p.stage === "prospect_c");
  const total = prospects.length || 1;

  const tiers = [
    { label: "High Priority", count: high.length, color: "#ef4444", bg: "#450a0a", items: high },
    { label: "Medium", count: medium.length, color: "#eab308", bg: "#422006", items: medium },
    { label: "Low", count: low.length, color: "#22c55e", bg: "#052e16", items: low },
  ];

  return (
    <div style={{ flex: "0 0 40%", minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#fafafa", marginBottom: 12 }}>AI Prospect Scoring</div>
      <div style={{
        padding: 16, backgroundColor: "#18181b", borderRadius: 8, border: "1px solid #27272a",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {/* Tier bars */}
        {tiers.map((tier) => (
          <div key={tier.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#a1a1aa", fontWeight: 500 }}>{tier.label}</span>
              <span style={{ fontSize: 11, color: "#71717a" }}>{tier.count}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, backgroundColor: "#27272a", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.round((tier.count / total) * 100)}%`,
                backgroundColor: tier.color,
                borderRadius: 3,
                transition: "width 0.3s",
              }} />
            </div>
          </div>
        ))}

        {/* Divider */}
        <div style={{ borderTop: "1px solid #27272a", margin: "4px 0" }} />

        {/* Prospect list */}
        {high.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 10, color: "#71717a", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>High Priority Prospects</span>
            {high.map((p: any, i: number) => (
              <div key={p.id ?? i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 10px", borderRadius: 6, backgroundColor: "#09090b", border: "1px solid #27272a",
              }}>
                <span style={{ fontSize: 12, color: "#fafafa", fontWeight: 500 }}>{p.first_name} {p.last_name}</span>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, backgroundColor: "#450a0a", color: "#fca5a5", fontWeight: 500 }}>A</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "#3f3f46" }}>No high priority prospects</div>
        )}

        {medium.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 10, color: "#71717a", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Medium Priority</span>
            {medium.slice(0, 3).map((p: any, i: number) => (
              <div key={p.id ?? i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 10px", borderRadius: 6, backgroundColor: "#09090b", border: "1px solid #27272a",
              }}>
                <span style={{ fontSize: 12, color: "#fafafa", fontWeight: 500 }}>{p.first_name} {p.last_name}</span>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, backgroundColor: "#422006", color: "#fde047", fontWeight: 500 }}>B</span>
              </div>
            ))}
            {medium.length > 3 && (
              <span style={{ fontSize: 11, color: "#52525b", textAlign: "center" }}>+{medium.length - 3} more</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

function CommunityView({ community, plans, lots, modelHome, specHomes, divisions }: CommunityViewProps) {
  const [drill, setDrill] = useState<DrillPanel>(null);
  const [prospects, setProspects] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const availableLots = lots.filter((l: any) => l.is_available);
  const underConstruction = lots.filter((l: any) => l.construction_status === "under-construction" || l.lot_status === "under-construction");
  const qdLots = lots.filter((l: any) => l.lot_status === "quick-delivery");
  const division = divisions.find(d => d.id === community.division_id);

  // Fetch CRM data for this community
  useEffect(() => {
    if (!community?.id) return;
    const cid = community.id;

    Promise.all([
      supabase.from("prospects").select("*").eq("community_id", cid),
      supabase.from("leads").select("*").eq("community_id", cid).neq("stage", "opportunity"),
      supabase.from("home_owners").select("*, contacts(first_name, last_name, email, phone)").eq("community_id", cid),
    ]).then(([pRes, lRes, hRes]) => {
      setProspects(pRes.data ?? []);
      setLeads(lRes.data ?? []);
      setCustomers(hRes.data ?? []);
    });
  }, [community?.id]);

  function toggleDrill(panel: DrillPanel) {
    setDrill(prev => prev === panel ? null : panel);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #27272a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          {division && (
            <span style={{ fontSize: 12, color: "#52525b" }}>{division.name} /</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#fafafa", margin: 0 }}>{community.name}</h1>
          <span style={{ fontSize: 12, color: "#52525b" }}>
            {[community.city, community.state].filter(Boolean).join(", ")}
          </span>
        </div>
        {community.price_from && (
          <span style={{ fontSize: 12, color: "#71717a", marginTop: 4, display: "block" }}>
            From {formatPrice(community.price_from)}
            {community.hoa_fee ? ` · HOA ${formatPrice(community.hoa_fee)}/${community.hoa_period ?? "mo"}` : ""}
          </span>
        )}
      </div>

      {/* Sales Goal Strip */}
      <SalesGoalStrip />

      {/* Metric grid */}
      <div style={{ padding: "16px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <MetricCard label="Plans" value={plans.length} onClick={() => toggleDrill("plans")} active={drill === "plans"} />
          <MetricCard label="Available Lots" value={availableLots.length} subtitle={`${lots.length} total`} onClick={() => toggleDrill("lots")} active={drill === "lots"} />
          <MetricCard label="Under Construction" value={underConstruction.length} />
          <MetricCard label="QD / Spec Homes" value={specHomes.length + qdLots.length} onClick={(specHomes.length + qdLots.length) > 0 ? () => toggleDrill("qd") : undefined} active={drill === "qd"} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 12 }}>
          <MetricCard label="Leads" value={leads.length} onClick={() => toggleDrill("leads")} active={drill === "leads"} />
          <MetricCard label="Prospects" value={prospects.length}
            subtitle={prospects.length > 0 ? `A: ${prospects.filter((p: any) => p.stage === "prospect_a").length} · B: ${prospects.filter((p: any) => p.stage === "prospect_b").length} · C: ${prospects.filter((p: any) => p.stage === "prospect_c").length}` : undefined}
            onClick={() => toggleDrill("prospects")} active={drill === "prospects"} />
          <MetricCard label="Customers" value={customers.length} onClick={() => toggleDrill("customers")} active={drill === "customers"} />
          <MetricCard label="Appointments" value="—" subtitle="Coming soon" />
        </div>
      </div>

      {/* Communication Hub + AI Scoring */}
      <div style={{ padding: "0 24px 24px", display: "flex", gap: 16 }}>
        <CommunicationHub />
        <AIScoringPanel prospects={prospects} />
      </div>

      {/* Drill-down panel */}
      {drill && (
        <div style={{ padding: "0 24px 24px" }}>
          {drill === "plans" && (
            <Section title="Floor Plans" count={plans.length}>
              <MiniTable
                headers={["Plan", "Price", "Beds", "Baths", "Sq Ft"]}
                rows={plans.map((p: any) => [
                  p.marketing_name ?? p.plan_name ?? "—",
                  formatPrice(p.net_price ?? p.base_price),
                  p.beds ?? "—",
                  p.baths ?? "—",
                  p.sqft ? p.sqft.toLocaleString() : "—",
                ])}
              />
            </Section>
          )}

          {drill === "lots" && (
            <Section title="Lots" count={lots.length}>
              <MiniTable
                headers={["Lot #", "Status", "Available", "Premium", "Address"]}
                rows={lots.map((l: any) => [
                  l.lot_number ?? "—",
                  l.lot_status ?? "—",
                  l.is_available ? "✓" : "—",
                  l.lot_premium ? formatPrice(l.lot_premium) : "—",
                  l.address ?? "—",
                ])}
              />
            </Section>
          )}

          {drill === "leads" && (
            <Section title="Leads" count={leads.length}>
              <MiniTable
                headers={["Name", "Stage", "Source", "Last Activity", "Created"]}
                rows={leads.map((l: any) => [
                  `${l.first_name} ${l.last_name}`,
                  l.stage ?? "—",
                  l.source ?? "—",
                  relativeTime(l.last_activity_at),
                  new Date(l.created_at).toLocaleDateString(),
                ])}
              />
            </Section>
          )}

          {drill === "prospects" && (
            <Section title="Prospects" count={prospects.length}>
              <MiniTable
                headers={["Name", "Stage", "Budget", "Phone", "Last Contact", "Created"]}
                rows={prospects.map((p: any) => [
                  `${p.first_name} ${p.last_name}`,
                  ({ prospect_a: "A", prospect_b: "B", prospect_c: "C" } as Record<string, string>)[p.stage] ?? p.stage,
                  formatBudget(p.budget_min, p.budget_max),
                  p.phone ?? "—",
                  relativeTime(p.last_contacted_at),
                  new Date(p.created_at).toLocaleDateString(),
                ])}
              />
            </Section>
          )}

          {drill === "customers" && (
            <Section title="Customers" count={customers.length}>
              <MiniTable
                headers={["Name", "Purchase Price", "Settlement", "Move-In", "Stage"]}
                rows={customers.map((c: any) => [
                  `${c.contacts?.first_name ?? "—"} ${c.contacts?.last_name ?? ""}`,
                  formatPrice(c.purchase_price),
                  c.settlement_date ? new Date(c.settlement_date).toLocaleDateString() : "—",
                  c.move_in_date ? new Date(c.move_in_date).toLocaleDateString() : "—",
                  c.post_sale_stage ?? "—",
                ])}
              />
            </Section>
          )}

          {drill === "qd" && (
            <Section title="Quick Delivery / Spec Homes" count={specHomes.length + qdLots.length}>
              <MiniTable
                headers={["Plan", "Address", "Price", "Beds", "Baths", "Sq Ft"]}
                rows={specHomes.map((s: any) => [
                  s.plan_name ?? "—",
                  s.address ?? "—",
                  formatPrice(s.list_price),
                  s.beds ?? "—",
                  s.baths ?? "—",
                  s.sqft ? s.sqft.toLocaleString() : "—",
                ])}
              />
            </Section>
          )}
        </div>
      )}

      {/* Community details */}
      <div style={{ padding: "0 24px 24px" }}>
        {/* Model Home */}
        {modelHome && (
          <Section title="Model Home">
            <div style={{ padding: 16, border: "1px solid #27272a", borderRadius: 8, backgroundColor: "#09090b" }}>
              <div style={{ fontSize: 13, color: "#fafafa", fontWeight: 500 }}>{modelHome.name ?? modelHome.model_marketing_name ?? "Model Home"}</div>
              {modelHome.address && <div style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>{modelHome.address}, {modelHome.city}, {modelHome.state}</div>}
              {modelHome.open_hours && <div style={{ fontSize: 12, color: "#52525b", marginTop: 4 }}>Hours: {modelHome.open_hours}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {modelHome.virtual_tour_url && (
                  <a href={modelHome.virtual_tour_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#a1a1aa", textDecoration: "underline" }}>Virtual Tour ↗</a>
                )}
                {modelHome.page_url && (
                  <a href={modelHome.page_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#a1a1aa", textDecoration: "underline" }}>Details ↗</a>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* Community Info */}
        <Section title="Community Info">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: 16, border: "1px solid #27272a", borderRadius: 8, backgroundColor: "#09090b" }}>
              <div style={{ fontSize: 11, color: "#71717a", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Schools</div>
              {[
                ["District", community.school_district],
                ["Elementary", community.school_elementary],
                ["Middle", community.school_middle],
                ["High", community.school_high],
              ].map(([label, val]) => val && (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span style={{ fontSize: 12, color: "#52525b" }}>{label}</span>
                  <span style={{ fontSize: 12, color: "#a1a1aa" }}>{val as string}</span>
                </div>
              ))}
              {!community.school_district && <span style={{ fontSize: 12, color: "#3f3f46" }}>No school data</span>}
            </div>
            <div style={{ padding: 16, border: "1px solid #27272a", borderRadius: 8, backgroundColor: "#09090b" }}>
              <div style={{ fontSize: 11, color: "#71717a", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Details</div>
              {[
                ["Total Homesites", community.total_homesites],
                ["Status", community.status],
                ["Has Model", community.has_model ? "Yes" : "No"],
                ["55+", community.is_55_plus ? "Yes" : "No"],
              ].map(([label, val]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span style={{ fontSize: 12, color: "#52525b" }}>{label}</span>
                  <span style={{ fontSize: 12, color: "#a1a1aa" }}>{String(val ?? "—")}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Amenities */}
        {community.amenities && (
          <Section title="Amenities">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {community.amenities.split(",").map((a: string) => a.trim()).filter(Boolean).map((a: string) => (
                <span key={a} style={{
                  fontSize: 11, padding: "4px 10px", borderRadius: 4,
                  backgroundColor: "#18181b", border: "1px solid #27272a", color: "#a1a1aa",
                }}>{a}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Links */}
        <Section title="Links">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {community.page_url && (
              <a href={`https://schellbrothers.com${community.page_url}`} target="_blank" rel="noreferrer" style={{
                fontSize: 12, padding: "6px 14px", borderRadius: 6, backgroundColor: "#18181b",
                border: "1px solid #27272a", color: "#a1a1aa", textDecoration: "none",
              }}>SchellBrothers.com ↗</a>
            )}
            {community.brochure_url && (
              <a href={community.brochure_url} target="_blank" rel="noreferrer" style={{
                fontSize: 12, padding: "6px 14px", borderRadius: 6, backgroundColor: "#18181b",
                border: "1px solid #27272a", color: "#a1a1aa", textDecoration: "none",
              }}>Brochure ↗</a>
            )}
            {community.lot_map_url && (
              <a href={community.lot_map_url} target="_blank" rel="noreferrer" style={{
                fontSize: 12, padding: "6px 14px", borderRadius: 6, backgroundColor: "#18181b",
                border: "1px solid #27272a", color: "#a1a1aa", textDecoration: "none",
              }}>Site Map ↗</a>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

export default CommunityView;
