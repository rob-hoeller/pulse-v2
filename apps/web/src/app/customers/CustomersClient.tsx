"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import TableSubHeader, { exportToCSV, type StatConfig } from "@/components/TableSubHeader";
import SlideOver, { Section, Row } from "@/components/SlideOver";
import Badge from "@/components/Badge";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import DataTable, { type Column } from "@/components/DataTable";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Community { id: string; name: string; slug: string | null; division_slug: string; division_name: string; }
interface Division { id: string; slug: string; name: string; }

interface Customer {
  id: string;
  contact_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  community_id: string | null;
  community_name: string | null;
  division_id: string | null;
  floor_plan_name: string | null;
  purchase_price: number | null;
  settlement_date: string | null;
  move_in_date: string | null;
  post_sale_stage: string;
  created_at: string;
}

type CustomerRow = Customer & Record<string, unknown> & {
  _name: string;
  _community: string;
  _division: string;
  _stage_label: string;
  _price: string;
};

interface Props {
  customers: Customer[];
  communities: Community[];
  divisions: Division[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return `$${price.toLocaleString()}`;
}

function getStageLabel(stage: string): string {
  const map: Record<string, string> = {
    sold_not_started: "Sold — Not Started",
    under_construction: "Under Construction",
    settled: "Settled",
  };
  return map[stage] ?? stage;
}

function getStageColor(stage: string): { color: string; bg: string; border: string } {
  const map: Record<string, { color: string; bg: string; border: string }> = {
    sold_not_started: { color: "#f5a623", bg: "#2a2a1a", border: "#3f3a1f" },
    under_construction: { color: "#0070f3", bg: "#1a1f2e", border: "#1a2a3f" },
    settled: { color: "#00c853", bg: "#1a2a1a", border: "#1f3f1f" },
  };
  return map[stage] ?? { color: "#888", bg: "#2a2b2e", border: "#444" };
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS: StatConfig<CustomerRow>[] = [
  { label: "Sold — Not Started", getValue: (r) => r.filter(x => x.post_sale_stage === "sold_not_started").length },
  { label: "Under Construction", getValue: (r) => r.filter(x => x.post_sale_stage === "under_construction").length },
  { label: "Settled", getValue: (r) => r.filter(x => x.post_sale_stage === "settled").length },
  {
    label: "Avg Price",
    getValue: (r) => {
      const wp = r.filter(x => x.purchase_price);
      if (!wp.length) return "—";
      return "$" + Math.round(wp.reduce((s, x) => s + (x.purchase_price ?? 0), 0) / wp.length / 1000) + "k";
    },
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

function CustomersInner({ customers, communities, divisions }: Props) {
  const { filter } = useGlobalFilter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => { setPage(0); }, [search, filter.divisionId, filter.communityId]);

  const filtered = customers.filter(c => {
    if (filter.communityId && c.community_id !== filter.communityId) return false;
    if (filter.divisionId && c.division_id !== filter.divisionId) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${c.first_name} ${c.last_name}`.toLowerCase().includes(q) &&
          !(c.email ?? "").toLowerCase().includes(q) &&
          !(c.phone ?? "").includes(q)) return false;
    }
    return true;
  });

  const tableRows: CustomerRow[] = filtered.map(c => {
    const comm = communities.find(x => x.id === c.community_id);
    const div = divisions.find(d => d.id === c.division_id);
    return {
      ...c,
      _name: `${c.first_name} ${c.last_name}`,
      _community: comm?.name ?? c.community_name ?? "—",
      _division: div?.name ?? comm?.division_name ?? "—",
      _stage_label: getStageLabel(c.post_sale_stage),
      _price: formatPrice(c.purchase_price),
    };
  });

  const allRows = customers.map(c => {
    const comm = communities.find(x => x.id === c.community_id);
    return { ...c, _name: `${c.first_name} ${c.last_name}`, _community: comm?.name ?? "—", _division: comm?.division_name ?? "—", _stage_label: getStageLabel(c.post_sale_stage), _price: formatPrice(c.purchase_price) };
  });

  const tableColumns: Column<CustomerRow>[] = [
    { key: "_name", label: "Name", sortable: true, render: (_v, row) => <span style={{ color: "#ededed", fontWeight: 500 }}>{row._name}</span> },
    { key: "_stage_label", label: "Stage", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{row._stage_label}</span> },
    { key: "_community", label: "Community", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._community}</span> },
    { key: "_division", label: "Division", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._division}</span> },
    { key: "floor_plan_name", label: "Floor Plan", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.floor_plan_name ?? "—"}</span> },
    { key: "_price", label: "Purchase Price", sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._price}</span> },
    { key: "settlement_date", label: "Settlement", sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.settlement_date ? new Date(row.settlement_date).toLocaleDateString() : "—"}</span> },
    { key: "move_in_date", label: "Move-In", sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.move_in_date ? new Date(row.move_in_date).toLocaleDateString() : "—"}</span> },
    { key: "created_at", label: "Created", sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{new Date(row.created_at).toLocaleDateString()}</span> },
  ];

  const community = selected ? communities.find(c => c.id === selected.community_id) : null;
  const stageCfg = selected ? getStageColor(selected.post_sale_stage) : null;

  return (
    <PageShell
      topBar={
        <TableSubHeader
          title="Homeowners"
          rows={tableRows}
          totalRows={tableRows.length}
          stats={STATS}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={s => { setPageSize(s); setPage(0); }}
          search={search}
          onSearch={q => { setSearch(q); setPage(0); }}
          searchPlaceholder="Search homeowners…"
          onExport={() => exportToCSV(tableRows as unknown as Record<string, unknown>[], "customers")}
          onExportAll={() => exportToCSV(allRows as unknown as Record<string, unknown>[], "customers-all")}
        />
      }
    >
      <DataTable<CustomerRow>
        columns={tableColumns}
        rows={tableRows}
        controlledPage={page}
        controlledPageSize={pageSize}
        defaultPageSize={pageSize}
        onRowClick={row => setSelected(row)}
        emptyMessage="No homeowners match the current filter"
        minWidth={1200}
      />

      <SlideOver open={!!selected} onClose={() => setSelected(null)}
        title={selected ? `${selected.first_name} ${selected.last_name}` : ""}
        subtitle={community?.name ?? selected?.community_name ?? undefined}
        badge={selected && stageCfg ? <Badge variant="custom" label={getStageLabel(selected.post_sale_stage)} customColor={stageCfg.color} customBg={stageCfg.bg} customBorder={stageCfg.border} /> : undefined}
        width={480}
      >
        {selected && (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>
            <Section title="Contact">
              <Row label="Email" value={selected.email ? <a href={`mailto:${selected.email}`} style={{ color: "#7aafdf", textDecoration: "none" }}>{selected.email}</a> : null} />
              <Row label="Phone" value={selected.phone} />
            </Section>
            <Section title="Home">
              <Row label="Community" value={community?.name ?? selected.community_name} />
              <Row label="Floor Plan" value={selected.floor_plan_name} />
              <Row label="Purchase Price" value={formatPrice(selected.purchase_price)} />
            </Section>
            <Section title="Timeline">
              <Row label="Settlement" value={selected.settlement_date ? new Date(selected.settlement_date).toLocaleDateString() : null} />
              <Row label="Move-In" value={selected.move_in_date ? new Date(selected.move_in_date).toLocaleDateString() : null} />
              <Row label="Created" value={new Date(selected.created_at).toLocaleString()} />
            </Section>
          </div>
        )}
      </SlideOver>
    </PageShell>
  );
}

export default function CustomersClient(props: Props) {
  return <CustomersInner {...props} />;
}
