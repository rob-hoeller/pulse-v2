"use client";

import { useState, useEffect } from "react";
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

interface MarketingContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  community_id: string | null;
  division_id: string | null;
  subscribed_at: string;
  is_active: boolean;
  created_at: string;
}

type MarketingRow = MarketingContact & Record<string, unknown> & {
  _name: string;
  _community: string;
  _division: string;
  _subscribed: string;
};

interface Props {
  contacts: MarketingContact[];
  communities: Community[];
  divisions: Division[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

function capitalize(s: string | null): string {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS: StatConfig<MarketingRow>[] = [
  { label: "Total", getValue: (r) => r.length },
  { label: "Active", getValue: (r) => r.filter(x => x.is_active).length },
  {
    label: "This Month",
    getValue: (r) => {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      return r.filter(x => {
        const d = new Date(x.subscribed_at);
        return d.getFullYear() === y && d.getMonth() === m;
      }).length;
    },
  },
  {
    label: "Conversion Rate",
    getValue: (r) => {
      if (!r.length) return "—";
      const inactive = r.filter(x => !x.is_active).length;
      // Conversion = contacts who moved past marketing (became inactive / converted)
      return `${Math.round((inactive / r.length) * 100)}%`;
    },
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

function MarketingInner({ contacts, communities, divisions }: Props) {
  const { filter } = useGlobalFilter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MarketingContact | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => { setPage(0); }, [search, filter.divisionId, filter.communityId]);

  // Filter
  const filtered = contacts.filter(c => {
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

  // Enrich rows
  const tableRows: MarketingRow[] = filtered.map(c => {
    const comm = communities.find(cm => cm.id === c.community_id);
    const div = divisions.find(d => d.id === c.division_id);
    return {
      ...c,
      _name: `${c.first_name} ${c.last_name}`,
      _community: comm?.name ?? "—",
      _division: div?.name ?? comm?.division_name ?? "—",
      _subscribed: formatDate(c.subscribed_at),
    };
  });

  const allRows = contacts.map(c => {
    const comm = communities.find(cm => cm.id === c.community_id);
    const div = divisions.find(d => d.id === c.division_id);
    return { ...c, _name: `${c.first_name} ${c.last_name}`, _community: comm?.name ?? "—", _division: div?.name ?? "—", _subscribed: formatDate(c.subscribed_at) };
  });

  const tableColumns: Column<MarketingRow>[] = [
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
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{capitalize(row.source)}</span>,
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
      key: "_subscribed", label: "Subscribed", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._subscribed}</span>,
    },
    {
      key: "is_active", label: "Status", sortable: true, filterable: true,
      render: (_v, row) => (
        <Badge
          variant="custom"
          label={row.is_active ? "Active" : "Inactive"}
          customColor={row.is_active ? "#4ade80" : "#888"}
          customBg={row.is_active ? "#1a2a1a" : "#2a2b2e"}
          customBorder={row.is_active ? "#1f3f1f" : "#444"}
        />
      ),
    },
  ];

  const community = selected ? communities.find(c => c.id === selected.community_id) : null;

  return (
    <PageShell
      topBar={
        <TableSubHeader
          title="Marketing"
          rows={tableRows}
          totalRows={tableRows.length}
          stats={STATS}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={s => { setPageSize(s); setPage(0); }}
          search={search}
          onSearch={q => { setSearch(q); setPage(0); }}
          searchPlaceholder="Search marketing contacts…"
          onExport={() => exportToCSV(tableRows as unknown as Record<string, unknown>[], "marketing")}
          onExportAll={() => exportToCSV(allRows as unknown as Record<string, unknown>[], "marketing-all")}
        />
      }
    >
      <DataTable<MarketingRow>
        columns={tableColumns}
        rows={tableRows}
        controlledPage={page}
        controlledPageSize={pageSize}
        defaultPageSize={pageSize}
        onRowClick={row => setSelected(row)}
        emptyMessage="No marketing contacts match the current filter"
        minWidth={1100}
      />

      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.first_name} ${selected.last_name}` : ""}
        subtitle={community?.name ?? undefined}
        badge={selected ? (
          <Badge variant="custom" label={selected.is_active ? "Active" : "Inactive"}
            customColor={selected.is_active ? "#4ade80" : "#888"}
            customBg={selected.is_active ? "#1a2a1a" : "#2a2b2e"}
            customBorder={selected.is_active ? "#1f3f1f" : "#444"} />
        ) : undefined}
        width={480}
      >
        {selected && (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>
            <Section title="Contact">
              <Row label="Email" value={selected.email ? <a href={`mailto:${selected.email}`} style={{ color: "#7aafdf", textDecoration: "none" }}>{selected.email}</a> : null} />
              <Row label="Phone" value={selected.phone} />
              <Row label="Source" value={capitalize(selected.source)} />
            </Section>
            <Section title="Details">
              <Row label="Community" value={community?.name} />
              <Row label="Status" value={selected.is_active ? "Active" : "Inactive"} />
              <Row label="Subscribed" value={selected.subscribed_at ? new Date(selected.subscribed_at).toLocaleString() : null} />
              <Row label="Created" value={new Date(selected.created_at).toLocaleString()} />
            </Section>
          </div>
        )}
      </SlideOver>
    </PageShell>
  );
}

export default function MarketingClient(props: Props) {
  return <MarketingInner {...props} />;
}
