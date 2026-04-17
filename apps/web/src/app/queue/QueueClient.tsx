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

interface Community { id: string; name: string; slug: string | null; division_slug: string; division_name: string; }
interface Division { id: string; slug: string; name: string; }

interface Opportunity {
  id: string;
  contact_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  opportunity_source: string | null;
  community_id: string | null;
  community_name: string | null;
  division_id: string | null;
  division_name: string | null;
  osc_id: string | null;
  osc_route_decision: string | null;
  notes: string | null;
  is_active: boolean;
  last_activity_at: string;
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

type OppRow = Opportunity & Record<string, unknown> & {
  _name: string;
  _community: string;
  _division: string;
  _status: string;
  _last_activity: string;
};

interface Props {
  opportunities: Opportunity[];
  communities: Community[];
  divisions: Division[];
}

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

function deriveStatus(opp: Opportunity): string {
  if (opp.osc_route_decision === "promoted_to_prospect") return "Promoted";
  if (opp.osc_route_decision === "demoted_to_lead" || opp.osc_route_decision === "demoted_to_marketing") return "Demoted";
  if (opp.osc_id) return "Assigned";
  return "New";
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS: StatConfig<OppRow>[] = [
  { label: "New",      getValue: (r) => r.filter(x => x._status === "New").length },
  { label: "Assigned", getValue: (r) => r.filter(x => x._status === "Assigned").length },
  { label: "Promoted", getValue: (r) => r.filter(x => x._status === "Promoted").length },
  { label: "Demoted",  getValue: (r) => r.filter(x => x._status === "Demoted").length },
];

// ─── Component ────────────────────────────────────────────────────────────────

function QueueInner({ opportunities, communities, divisions }: Props) {
  const { filter } = useGlobalFilter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [history, setHistory] = useState<StageTransition[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => { setPage(0); }, [search, filter.divisionId, filter.communityId]);

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

  const filtered = opportunities.filter(o => {
    if (filter.communityId && o.community_id !== filter.communityId) return false;
    if (filter.divisionId && o.division_id !== filter.divisionId) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${o.first_name} ${o.last_name}`.toLowerCase().includes(q) &&
          !(o.email ?? "").toLowerCase().includes(q) &&
          !(o.phone ?? "").includes(q)) return false;
    }
    return true;
  });

  const tableRows: OppRow[] = filtered.map(o => {
    const comm = communities.find(c => c.id === o.community_id);
    const div = divisions.find(d => d.id === o.division_id);
    return {
      ...o,
      _name: `${o.first_name} ${o.last_name}`,
      _community: comm?.name ?? o.community_name ?? "—",
      _division: div?.name ?? o.division_name ?? comm?.division_name ?? "—",
      _status: deriveStatus(o),
      _last_activity: relativeTime(o.last_activity_at),
    };
  });

  const allRows = opportunities.map(o => {
    const comm = communities.find(c => c.id === o.community_id);
    return { ...o, _name: `${o.first_name} ${o.last_name}`, _community: comm?.name ?? o.community_name ?? "—", _division: o.division_name ?? comm?.division_name ?? "—", _status: deriveStatus(o), _last_activity: relativeTime(o.last_activity_at) };
  });

  const tableColumns: Column<OppRow>[] = [
    { key: "_name", label: "Name", sortable: true, render: (_v, row) => <span style={{ color: "#ededed", fontWeight: 500 }}>{row._name}</span> },
    { key: "_status", label: "Status", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{row._status}</span> },
    { key: "_community", label: "Community", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._community}</span> },
    { key: "_division", label: "Division", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._division}</span> },
    { key: "source", label: "Source", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.source ?? row.opportunity_source ?? "—"}</span> },
    { key: "osc_route_decision", label: "Route Decision", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.osc_route_decision ?? "Pending"}</span> },
    { key: "_last_activity", label: "Last Activity", sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._last_activity}</span> },
    { key: "created_at", label: "Created", sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{new Date(row.created_at).toLocaleDateString()}</span> },
  ];

  const community = selected ? communities.find(c => c.id === selected.community_id) : null;

  return (
    <PageShell
      topBar={
        <TableSubHeader
          title="Queue"
          rows={tableRows}
          totalRows={tableRows.length}
          stats={STATS}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={s => { setPageSize(s); setPage(0); }}
          search={search}
          onSearch={q => { setSearch(q); setPage(0); }}
          searchPlaceholder="Search queue…"
          onExport={() => exportToCSV(tableRows as unknown as Record<string, unknown>[], "opportunities")}
          onExportAll={() => exportToCSV(allRows as unknown as Record<string, unknown>[], "queue-all")}
        />
      }
    >
      <DataTable<OppRow>
        columns={tableColumns}
        rows={tableRows}
        controlledPage={page}
        controlledPageSize={pageSize}
        defaultPageSize={pageSize}
        onRowClick={row => setSelected(row)}
        emptyMessage="No queue items match the current filter"
        minWidth={1100}
      />

      <SlideOver open={!!selected} onClose={() => setSelected(null)}
        title={selected ? `${selected.first_name} ${selected.last_name}` : ""}
        subtitle={community?.name ?? selected?.community_name ?? undefined}
        badge={selected ? <Badge variant="custom" label={deriveStatus(selected)} customColor="#f5a623" customBg="#2a2a1a" customBorder="#3f3a1f" /> : undefined}
        width={480}
      >
        {selected && (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>
            <Section title="Contact">
              <Row label="Email" value={selected.email ? <a href={`mailto:${selected.email}`} style={{ color: "#7aafdf", textDecoration: "none" }}>{selected.email}</a> : null} />
              <Row label="Phone" value={selected.phone} />
              <Row label="Source" value={selected.source ?? selected.opportunity_source} />
            </Section>
            <Section title="Routing">
              <Row label="Community" value={community?.name ?? selected.community_name} />
              <Row label="Division" value={selected.division_name ?? community?.division_name} />
              <Row label="Route Decision" value={selected.osc_route_decision ?? "Pending"} />
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

export default function QueueClient(props: Props) {
  return <QueueInner {...props} />;
}
