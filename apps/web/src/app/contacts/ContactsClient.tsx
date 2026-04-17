"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import PageShell from "@/components/PageShell";
import TableSubHeader, { exportToCSV, type StatConfig } from "@/components/TableSubHeader";
import SlideOver, { Section, Row } from "@/components/SlideOver";
import Badge from "@/components/Badge";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import DataTable, { type Column } from "@/components/DataTable";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Community {
  id: string;
  name: string;
  slug: string | null;
  division_slug: string;
  division_name: string;
}

interface Division {
  id: string;
  slug: string;
  name: string;
}

interface ContactMember {
  id: string;
  role: string | null;
  first_name: string | null;
  last_name: string | null;
  is_primary: boolean | null;
  relationship: string | null;
}

interface Opportunity {
  id: string;
  crm_stage: string | null;
  community_id: string | null;
  communities: { name: string } | null;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  lifecycle_stage: string | null;
  created_at: string;
  members: ContactMember[];
  member_count: number;
  opportunities: Opportunity[];
  opportunity_count: number;
  stages: string[];
  communities: string[];
}

type ContactRow = Contact & Record<string, unknown> & {
  _name: string;
  _stages: string;
  _communities: string;
};

interface StageTransition {
  id: string;
  contact_id: string;
  from_stage: string | null;
  to_stage: string | null;
  triggered_by: string | null;
  reason: string | null;
  created_at: string;
}

interface Activity {
  id: string;
  contact_id: string;
  channel: string | null;
  direction: string | null;
  subject: string | null;
  community_name: string | null;
  sentiment: string | null;
  duration_seconds: number | null;
  occurred_at: string;
}

interface Props {
  contacts: Contact[];
  communities: Community[];
  divisions: Division[];
}

// ─── Supabase client ──────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStageLabel(stage: string): string {
  const map: Record<string, string> = {
    marketing: "Marketing", lead: "Lead", opportunity: "Opportunity",
    new: "New", contacted: "Contacted", touring: "Touring",
    prospect: "Prospect", customer: "Customer", homeowner: "Homeowner",
    "under-contract": "Under Contract", "closed-won": "Closed Won", "closed-lost": "Closed Lost",
  };
  return map[stage] ?? stage;
}

const CHANNEL_ICONS: Record<string, string> = {
  email: "📧", phone: "📞", text: "💬", zoom_meeting: "🎥", rilla: "🎙",
  webform: "🌐", chat: "💭", web_session: "🖥", walk_in: "🚶", mailchimp: "📬",
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function getLifecycleLabel(stage: string | null): string {
  if (!stage) return "—";
  const map: Record<string, string> = {
    lead: "Lead", lead_com: "Lead (Community)", lead_div: "Lead (Division)",
    prospect: "Prospect", customer: "Customer", homeowner: "Homeowner",
    opportunity: "Opportunity",
  };
  return map[stage] ?? stage;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS: StatConfig<ContactRow>[] = [
  { label: "Total", getValue: (r) => r.length },
  { label: "Active Leads", getValue: (r) => r.filter(x => x.lifecycle_stage === "lead" || x.lifecycle_stage === "lead_com" || x.lifecycle_stage === "lead_div").length },
  { label: "Prospects", getValue: (r) => r.filter(x => x.lifecycle_stage === "prospect").length },
  { label: "Homeowners", getValue: (r) => r.filter(x => x.lifecycle_stage === "homeowner").length },
];

// ─── Component ────────────────────────────────────────────────────────────────

function ContactsInner({ contacts, communities, divisions }: Props) {
  const { filter } = useGlobalFilter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [transitions, setTransitions] = useState<StageTransition[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingTransitions, setLoadingTransitions] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const fetchContactDetail = useCallback(async (contactId: string) => {
    setLoadingTransitions(true);
    setLoadingActivities(true);
    const [tRes, aRes] = await Promise.all([
      supabase
        .from("stage_transitions")
        .select("id, contact_id, from_stage, to_stage, triggered_by, reason, created_at")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("activities")
        .select("id, contact_id, channel, direction, subject, community_name, sentiment, duration_seconds, occurred_at")
        .eq("contact_id", contactId)
        .order("occurred_at", { ascending: false })
        .limit(50),
    ]);
    setTransitions(tRes.data ?? []);
    setActivities(aRes.data ?? []);
    setLoadingTransitions(false);
    setLoadingActivities(false);
  }, []);

  useEffect(() => {
    if (selected?.id) {
      fetchContactDetail(selected.id);
    } else {
      setTransitions([]);
      setActivities([]);
    }
  }, [selected?.id, fetchContactDetail]);

  useEffect(() => { setPage(0); }, [search, filter.divisionId, filter.communityId]);

  // Filter
  const filtered = contacts.filter(c => {
    if (filter.communityId) {
      const hasComm = c.opportunities.some(o => o.community_id === filter.communityId);
      if (!hasComm) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!`${c.first_name} ${c.last_name}`.toLowerCase().includes(q) &&
          !(c.email ?? "").toLowerCase().includes(q) &&
          !(c.phone ?? "").includes(q)) return false;
    }
    return true;
  });

  // Enrich rows
  const tableRows: ContactRow[] = filtered.map(c => ({
    ...c,
    _name: `${c.first_name} ${c.last_name}`,
    _stages: c.stages.map(getStageLabel).join(", ") || "—",
    _communities: c.communities.join(", ") || "—",
  }));

  const allRows = contacts.map(c => ({
    ...c,
    _name: `${c.first_name} ${c.last_name}`,
    _stages: c.stages.map(getStageLabel).join(", ") || "—",
    _communities: c.communities.join(", ") || "—",
  }));

  const tableColumns: Column<ContactRow>[] = [
    {
      key: "_name", label: "Name", sortable: true,
      render: (_v, row) => <span style={{ color: "#ededed", fontWeight: 500 }}>{row._name}</span>,
    },
    {
      key: "email", label: "Email", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.email ?? "—"}</span>,
    },
    {
      key: "phone", label: "Phone", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.phone ?? "—"}</span>,
    },
    {
      key: "source", label: "Source", sortable: true, filterable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.source ?? "—"}</span>,
    },
    {
      key: "lifecycle_stage", label: "Lifecycle", sortable: true, filterable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{getLifecycleLabel(row.lifecycle_stage)}</span>,
    },
    {
      key: "member_count", label: "Members", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.member_count}</span>,
    },
    {
      key: "opportunity_count", label: "Opportunities", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.opportunity_count}</span>,
    },
    {
      key: "_stages", label: "Stages", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{row._stages}</span>,
    },
    {
      key: "_communities", label: "Communities", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{row._communities}</span>,
    },
    {
      key: "created_at", label: "Created", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{new Date(row.created_at).toLocaleDateString()}</span>,
    },
  ];

  return (
    <PageShell
      topBar={
        <TableSubHeader
          title="Contacts"
          rows={tableRows}
          totalRows={tableRows.length}
          stats={STATS}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={s => { setPageSize(s); setPage(0); }}
          search={search}
          onSearch={q => { setSearch(q); setPage(0); }}
          searchPlaceholder="Search contacts…"
          onExport={() => exportToCSV(tableRows as unknown as Record<string, unknown>[], "contacts")}
          onExportAll={() => exportToCSV(allRows as unknown as Record<string, unknown>[], "contacts-all")}
        />
      }
    >
      <DataTable<ContactRow>
        columns={tableColumns}
        rows={tableRows}
        controlledPage={page}
        controlledPageSize={pageSize}
        defaultPageSize={pageSize}
        onRowClick={row => setSelected(row)}
        emptyMessage="No contacts match the current filter"
        minWidth={1200}
      />

      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.first_name} ${selected.last_name}` : ""}
        subtitle={selected?.lifecycle_stage ? getLifecycleLabel(selected.lifecycle_stage) : undefined}
        badge={selected?.lifecycle_stage ? (
          <Badge variant="custom" label={getLifecycleLabel(selected.lifecycle_stage)}
            customColor={selected.lifecycle_stage === "homeowner" ? "#4ade80" : "#59a6bd"}
            customBg={selected.lifecycle_stage === "homeowner" ? "#1a2a1a" : "#1a2a3a"}
            customBorder={selected.lifecycle_stage === "homeowner" ? "#1f3f1f" : "#1f3f5f"} />
        ) : undefined}
        width={520}
      >
        {selected && (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>
            <Section title="Contact Info">
              <Row label="Email" value={selected.email ? <a href={`mailto:${selected.email}`} style={{ color: "#7aafdf", textDecoration: "none" }}>{selected.email}</a> : null} />
              <Row label="Phone" value={selected.phone} />
              <Row label="Source" value={selected.source} />
              <Row label="Lifecycle" value={getLifecycleLabel(selected.lifecycle_stage)} />
              <Row label="Created" value={new Date(selected.created_at).toLocaleString()} />
            </Section>

            <Section title={`Members (${selected.members.length})`}>
              {selected.members.length === 0 ? (
                <p style={{ fontSize: 13, color: "#666", margin: 0 }}>No members</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selected.members.map(m => (
                    <div key={m.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", background: "#2a2b2e", borderRadius: 6,
                    }}>
                      <div>
                        <div style={{ fontSize: 13, color: "#ededed", fontWeight: 500 }}>
                          {m.first_name ?? ""} {m.last_name ?? ""}
                        </div>
                        {m.relationship && (
                          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{m.relationship}</div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {m.role && (
                          <Badge variant="custom" label={m.role}
                            customColor="#888" customBg="#333" customBorder="#444" />
                        )}
                        {m.is_primary && (
                          <Badge variant="custom" label="Primary"
                            customColor="#4ade80" customBg="#1a2a1a" customBorder="#1f3f1f" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title={`Opportunities (${selected.opportunities.length})`}>
              {selected.opportunities.length === 0 ? (
                <p style={{ fontSize: 13, color: "#666", margin: 0 }}>No opportunities</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selected.opportunities.map(o => (
                    <div key={o.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", background: "#2a2b2e", borderRadius: 6,
                    }}>
                      <div style={{ fontSize: 13, color: "#ededed" }}>
                        {o.communities?.name ?? "Unknown Community"}
                      </div>
                      <Badge variant="custom" label={o.crm_stage ? getStageLabel(o.crm_stage) : "—"}
                        customColor="#59a6bd" customBg="#1a2a3a" customBorder="#1f3f5f" />
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Stage History Timeline */}
            <Section title={`Stage History (${transitions.length})`}>
              {loadingTransitions ? (
                <p style={{ fontSize: 13, color: "#71717a", margin: 0 }}>Loading…</p>
              ) : transitions.length === 0 ? (
                <p style={{ fontSize: 13, color: "#71717a", margin: 0 }}>No stage history</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative", paddingLeft: 16 }}>
                  {/* Vertical line */}
                  <div style={{ position: "absolute", left: 5, top: 8, bottom: 8, width: 2, background: "#27272a", borderRadius: 1 }} />
                  {transitions.map((t) => {
                    const fromLabel = t.from_stage ? getStageLabel(t.from_stage) : "(none)";
                    const toLabel = t.to_stage ? getStageLabel(t.to_stage) : "(none)";
                    // Determine direction indicator
                    const stageOrder = ["lead_div", "lead_com", "new", "contacted", "touring", "opportunity", "prospect", "under-contract", "customer", "closed-won", "homeowner"];
                    const fromIdx = stageOrder.indexOf(t.from_stage ?? "");
                    const toIdx = stageOrder.indexOf(t.to_stage ?? "");
                    let arrow = "→";
                    let borderColor = "#71717a";
                    let arrowColor = "#a1a1aa";
                    if (toIdx > fromIdx && fromIdx >= 0) {
                      arrow = "↑";
                      borderColor = "#4ade80";
                      arrowColor = "#4ade80";
                    } else if (toIdx < fromIdx && toIdx >= 0) {
                      arrow = "↓";
                      borderColor = "#f87171";
                      arrowColor = "#f87171";
                    }
                    return (
                      <div key={t.id} style={{ position: "relative", padding: "8px 0 8px 12px" }}>
                        {/* Dot on the line */}
                        <div style={{
                          position: "absolute", left: -14, top: 14, width: 8, height: 8,
                          borderRadius: "50%", background: borderColor, border: `2px solid ${borderColor}`,
                        }} />
                        <div style={{
                          padding: "8px 12px", background: "#18181b", borderRadius: 6,
                          borderLeft: `3px solid ${borderColor}`,
                        }}>
                          <div style={{ fontSize: 13, color: "#fafafa", fontWeight: 500 }}>
                            <span style={{ color: arrowColor, marginRight: 6 }}>{arrow}</span>
                            {fromLabel} → {toLabel}
                          </div>
                          {t.triggered_by && (
                            <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2 }}>by {t.triggered_by}</div>
                          )}
                          {t.reason && (
                            <div style={{ fontSize: 11, color: "#71717a", marginTop: 2 }}>{t.reason}</div>
                          )}
                          <div style={{ fontSize: 11, color: "#71717a", marginTop: 4 }}>
                            {relativeTime(t.created_at)} · {new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* Activity Feed */}
            <Section title={`Activity (${activities.length})`}>
              {loadingActivities ? (
                <p style={{ fontSize: 13, color: "#71717a", margin: 0 }}>Loading…</p>
              ) : activities.length === 0 ? (
                <p style={{ fontSize: 13, color: "#71717a", margin: 0 }}>No activity</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {activities.map((a) => {
                    const icon = CHANNEL_ICONS[a.channel ?? ""] ?? "📋";
                    const dirArrow = a.direction === "inbound" ? "↓" : a.direction === "outbound" ? "↑" : "";
                    const dirColor = a.direction === "inbound" ? "#60a5fa" : a.direction === "outbound" ? "#a78bfa" : "#a1a1aa";
                    let sentimentBadge: { label: string; color: string; bg: string; border: string } | null = null;
                    if (a.sentiment === "positive") sentimentBadge = { label: "Positive", color: "#4ade80", bg: "#1a2a1a", border: "#1f3f1f" };
                    else if (a.sentiment === "negative") sentimentBadge = { label: "Negative", color: "#f87171", bg: "#2a1a1a", border: "#3f1f1f" };
                    else if (a.sentiment === "neutral") sentimentBadge = { label: "Neutral", color: "#a1a1aa", bg: "#27272a", border: "#3f3f46" };
                    const showDuration = a.duration_seconds != null && a.duration_seconds > 0 &&
                      ["phone", "zoom_meeting", "rilla"].includes(a.channel ?? "");
                    return (
                      <div key={a.id} style={{
                        display: "flex", alignItems: "flex-start", gap: 10,
                        padding: "8px 12px", background: "#18181b", borderRadius: 6,
                      }}>
                        <div style={{ fontSize: 16, lineHeight: "20px", flexShrink: 0 }}>{icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {dirArrow && (
                              <span style={{ fontSize: 13, color: dirColor, fontWeight: 600 }}>{dirArrow}</span>
                            )}
                            <span style={{ fontSize: 13, color: "#fafafa", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {a.subject || a.channel || "Activity"}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                            {a.community_name && (
                              <span style={{ fontSize: 11, color: "#a1a1aa" }}>{a.community_name}</span>
                            )}
                            {showDuration && (
                              <span style={{ fontSize: 11, color: "#71717a" }}>{formatDuration(a.duration_seconds!)}</span>
                            )}
                            {sentimentBadge && (
                              <Badge variant="custom" label={sentimentBadge.label}
                                customColor={sentimentBadge.color} customBg={sentimentBadge.bg}
                                customBorder={sentimentBadge.border} />
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: "#71717a", whiteSpace: "nowrap", flexShrink: 0, paddingTop: 2 }}>
                          {relativeTime(a.occurred_at)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </div>
        )}
      </SlideOver>
    </PageShell>
  );
}

export default function ContactsClient(props: Props) {
  return <ContactsInner {...props} />;
}
