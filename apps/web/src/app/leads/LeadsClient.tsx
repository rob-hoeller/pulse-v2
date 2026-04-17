"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import PageShell from "@/components/PageShell";
import TableSubHeader, { exportToCSV, type StatConfig } from "@/components/TableSubHeader";
import SlideOver, { Section, Row } from "@/components/SlideOver";
import Badge from "@/components/Badge";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import DataTable, { type Column } from "@/components/DataTable";

// ─── Supabase client (for client-side fetches) ───────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

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

interface Lead {
  id: string;
  contact_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  stage: string;
  source: string | null;
  community_id: string | null;
  community_name: string | null;
  division_id: string | null;
  division_name: string | null;
  budget_min: number | null;
  budget_max: number | null;
  opportunity_source: string | null;
  notes: string | null;
  last_activity_at: string;
  is_active: boolean;
  created_at: string;
}

interface StageTransition {
  id: string;
  from_stage: string | null;
  to_stage: string | null;
  triggered_by: string | null;
  reason: string | null;
  created_at: string;
}

type LeadRow = Lead & Record<string, unknown> & {
  _name: string;
  _community: string;
  _division: string;
  _budget: string;
  _last_activity: string;
};

interface Props {
  leads: Lead[];
  communities: Community[];
  divisions: Division[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return `$${(min / 1000).toFixed(0)}k – $${(max / 1000).toFixed(0)}k`;
  if (min != null) return `$${(min / 1000).toFixed(0)}k+`;
  return `up to $${(max! / 1000).toFixed(0)}k`;
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

function getStageLabel(stage: string): string {
  const map: Record<string, string> = {
    lead_div: "Division Lead",
    lead_com: "Community Lead",
  };
  return map[stage] ?? stage;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS: StatConfig<LeadRow>[] = [
  { label: "Total", getValue: (r) => r.length },
  { label: "Division", getValue: (r) => r.filter(x => x.stage === "lead_div").length },
  { label: "Community", getValue: (r) => r.filter(x => x.stage === "lead_com").length },
  {
    label: "Avg Budget",
    getValue: (r) => {
      const wb = r.filter(x => x.budget_min);
      if (!wb.length) return "—";
      return "$" + Math.round(wb.reduce((s, x) => s + (x.budget_min ?? 0), 0) / wb.length / 1000) + "k";
    },
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

function LeadsInner({ leads, communities, divisions }: Props) {
  const { filter } = useGlobalFilter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [leadType, setLeadType] = useState<"all" | "lead_div" | "lead_com">("all");
  const [history, setHistory] = useState<StageTransition[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => { setPage(0); }, [search, filter.divisionId, filter.communityId, leadType]);

  // Fetch stage transition history when a row is selected
  useEffect(() => {
    if (!selected) { setHistory([]); return; }
    setHistoryLoading(true);
    supabase
      .from("stage_transitions")
      .select("id, from_stage, to_stage, triggered_by, reason, created_at")
      .eq("opportunity_id", selected.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setHistory(data ?? []);
        setHistoryLoading(false);
      });
  }, [selected]);

  // Filter
  const filtered = leads.filter(l => {
    if (leadType !== "all" && l.stage !== leadType) return false;
    if (filter.communityId && l.community_id !== filter.communityId) return false;
    if (filter.divisionId && l.division_id !== filter.divisionId) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${l.first_name} ${l.last_name}`.toLowerCase().includes(q) &&
          !(l.email ?? "").toLowerCase().includes(q) &&
          !(l.phone ?? "").includes(q)) return false;
    }
    return true;
  });

  // Enrich rows
  const tableRows: LeadRow[] = filtered.map(l => {
    const comm = communities.find(c => c.id === l.community_id);
    const div = divisions.find(d => d.id === l.division_id);
    return {
      ...l,
      _name: `${l.first_name} ${l.last_name}`,
      _community: comm?.name ?? l.community_name ?? "—",
      _division: div?.name ?? l.division_name ?? comm?.division_name ?? "—",
      _budget: formatBudget(l.budget_min, l.budget_max),
      _last_activity: relativeTime(l.last_activity_at),
    };
  });

  const allRows = leads.map(l => {
    const comm = communities.find(c => c.id === l.community_id);
    const div = divisions.find(d => d.id === l.division_id);
    return { ...l, _name: `${l.first_name} ${l.last_name}`, _community: comm?.name ?? l.community_name ?? "—", _division: div?.name ?? l.division_name ?? "—", _budget: formatBudget(l.budget_min, l.budget_max), _last_activity: relativeTime(l.last_activity_at) };
  });

  const tableColumns: Column<LeadRow>[] = [
    {
      key: "_name", label: "Name", sortable: true,
      render: (_v, row) => <span style={{ color: "#ededed", fontWeight: 500 }}>{row._name}</span>,
    },
    {
      key: "stage", label: "Stage", sortable: true, filterable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{getStageLabel(row.stage)}</span>,
    },
    {
      key: "_community", label: "Community", sortable: true, filterable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._community}</span>,
    },
    {
      key: "_division", label: "Division", sortable: true, filterable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._division}</span>,
    },
    {
      key: "source", label: "Source", sortable: true, filterable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.source ?? "—"}</span>,
    },
    {
      key: "_budget", label: "Budget", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._budget}</span>,
    },
    {
      key: "_last_activity", label: "Last Activity", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._last_activity}</span>,
    },
    {
      key: "created_at", label: "Created", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{new Date(row.created_at).toLocaleDateString()}</span>,
    },
  ];

  const community = selected ? communities.find(c => c.id === selected.community_id) : null;

  return (
    <PageShell
      topBar={
        <TableSubHeader
          title="Leads"
          rows={tableRows}
          totalRows={tableRows.length}
          stats={STATS}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={s => { setPageSize(s); setPage(0); }}
          search={search}
          onSearch={q => { setSearch(q); setPage(0); }}
          searchPlaceholder="Search leads…"
          onExport={() => exportToCSV(tableRows as unknown as Record<string, unknown>[], "leads")}
          onExportAll={() => exportToCSV(allRows as unknown as Record<string, unknown>[], "leads-all")}
        />
      }
      filtersBar={
        <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "6px 16px", backgroundColor: "#0d0e10", borderBottom: "1px solid #1a1a1e" }}>
          {(["all", "lead_div", "lead_com"] as const).map(t => (
            <button key={t} onClick={() => setLeadType(t)} style={{
              padding: "4px 12px", fontSize: 11, fontWeight: leadType === t ? 600 : 400, borderRadius: 4,
              border: leadType === t ? "1px solid #3f3f46" : "1px solid transparent",
              backgroundColor: leadType === t ? "#18181b" : "transparent",
              color: leadType === t ? "#fafafa" : "#71717a",
              cursor: "pointer", transition: "all 0.15s",
            }}>
              {t === "all" ? "All Leads" : t === "lead_div" ? "Division Leads" : "Community Leads"}
            </button>
          ))}
          <span style={{ fontSize: 11, color: "#3f3f46", marginLeft: 8 }}>
            {leadType === "all" ? "" : leadType === "lead_div" ? "Division-level interest — no community assigned" : "Community-level interest — assigned to specific community"}
          </span>
        </div>
      }
    >
      <DataTable<LeadRow>
        columns={tableColumns}
        rows={tableRows}
        controlledPage={page}
        controlledPageSize={pageSize}
        defaultPageSize={pageSize}
        onRowClick={row => setSelected(row)}
        emptyMessage="No leads match the current filter"
        minWidth={1100}
      />

      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.first_name} ${selected.last_name}` : ""}
        subtitle={community?.name ?? selected?.community_name ?? undefined}
        badge={selected ? (
          <Badge variant="custom" label={getStageLabel(selected.stage)}
            customColor="#4ade80" customBg="#1a2a1a" customBorder="#1f3f1f" />
        ) : undefined}
        width={480}
      >
        {selected && (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>
            <Section title="Contact">
              <Row label="Email" value={selected.email ? <a href={`mailto:${selected.email}`} style={{ color: "#7aafdf", textDecoration: "none" }}>{selected.email}</a> : null} />
              <Row label="Phone" value={selected.phone} />
              <Row label="Source" value={selected.source} />
            </Section>
            <Section title="Interest">
              <Row label="Community" value={community?.name ?? selected.community_name} />
              <Row label="Division" value={selected.division_name} />
              <Row label="Budget" value={formatBudget(selected.budget_min, selected.budget_max)} />
            </Section>
            <Section title="Activity">
              <Row label="Last Activity" value={selected.last_activity_at ? new Date(selected.last_activity_at).toLocaleString() : null} />
              <Row label="Created" value={new Date(selected.created_at).toLocaleString()} />
            </Section>
            {selected.notes && (
              <Section title="Notes">
                <p style={{ fontSize: 13, color: "#888", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>{selected.notes}</p>
              </Section>
            )}
            <Section title="History">
              {historyLoading ? (
                <p style={{ fontSize: 12, color: "#555", margin: 0 }}>Loading…</p>
              ) : history.length === 0 ? (
                <p style={{ fontSize: 12, color: "#555", margin: 0 }}>No stage transitions recorded</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {history.map(t => (
                    <div key={t.id} style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>
                      <span style={{ color: "#aaa" }}>{t.from_stage ?? "—"}</span>
                      <span style={{ color: "#555", margin: "0 6px" }}>→</span>
                      <span style={{ color: "#ededed" }}>{t.to_stage ?? "—"}</span>
                      {t.triggered_by && <span style={{ color: "#555", marginLeft: 8 }}>by {t.triggered_by}</span>}
                      {t.reason && <span style={{ color: "#555", marginLeft: 8 }}>— {t.reason}</span>}
                      <br />
                      <span style={{ color: "#444", fontSize: 11 }}>{new Date(t.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </SlideOver>
    </PageShell>
  );
}

export default function LeadsClient(props: Props) {
  return <LeadsInner {...props} />;
}
