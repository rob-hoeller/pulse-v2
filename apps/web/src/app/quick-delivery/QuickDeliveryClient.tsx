"use client";

import { useState, useEffect } from "react";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import PageShell from "@/components/PageShell";
import TopBar from "@/components/TopBar";
import SlideOver, { Section, Row } from "@/components/SlideOver";
import Badge from "@/components/Badge";
import DataTable, { type Column, type StatConfigItem } from "@/components/DataTable";

interface Division { id: string; slug: string; name: string; }

interface SpecHome {
  id: string; home_id: number; name: string | null; transaction_type: string | null;
  division_id: number | null; division_name: string | null;
  division_parent_id: number | null; division_parent_name: string | null;
  community_id: string | null; community_name: string | null; community_slug: string | null;
  address: string | null; city: string | null; state: string | null; zip: string | null;
  lot_number: string | null; block_number: string | null; lot_block_number: string | null;
  model_id: number | null; model_name: string | null; model_marketing_name: string | null;
  bedrooms: number | null; bathrooms: number | null;
  heated_sqft: number | null; total_sqft: number | null;
  base_price: number | null; incentive_price: number | null; net_price: number | null;
  base_price_formatted: string | null; incentive_price_formatted: string | null; price_formatted: string | null;
  is_marketing_active: boolean | null; description: string | null;
  url: string | null; featured_image_url: string | null; virtual_tour_url: string | null;
  [key: string]: unknown;
}

interface Props { specHomes: SpecHome[]; divisions: Division[]; }

function formatCurrency(n: number | null): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString();
}

export default function QuickDeliveryClient({ specHomes, divisions }: Props) {
  const { filter, labels } = useGlobalFilter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SpecHome | null>(null);

  // Map global filter divisionId (UUID) → division name → match against division_parent_name
  const globalDivName = filter.divisionId
    ? divisions.find(d => d.id === filter.divisionId)?.name ?? null
    : null;

  // Apply filters — global filter takes priority, no local div/comm dropdowns
  const rows = specHomes.filter(r => {
    // Division filter: match by name since spec_homes uses integer division_parent_id
    if (globalDivName && r.division_parent_name !== globalDivName) return false;
    // Community filter: match by community_name since community_id in spec_homes is HB string not UUID
    if (filter.communityId) {
      const commName = labels.community;
      if (commName && r.community_name !== commName) return false;
    }
    // Search
    if (search) {
      const q = search.toLowerCase();
      if (
        !(r.community_name ?? "").toLowerCase().includes(q) &&
        !(r.model_marketing_name ?? "").toLowerCase().includes(q) &&
        !(r.address ?? "").toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const statConfig: StatConfigItem<SpecHome>[] = [
    { label: "Total",       color: "var(--text-3)", getValue: r => r.length },
    { label: "Communities", color: "var(--text-2)", getValue: r => new Set(r.map(x => x.community_name)).size },
    { label: "States",      color: "var(--text-2)", getValue: r => new Set(r.map(x => x.state)).size },
    {
      label: "Avg Price", color: "var(--blue)", isString: true,
      getValue: r => {
        const wp = r.filter(x => x.net_price && x.net_price > 0);
        if (!wp.length) return "—";
        const avg = wp.reduce((s, x) => s + (x.net_price ?? 0), 0) / wp.length;
        return `$${Math.round(avg / 1000)}k`;
      },
    },
  ];

  const columns: Column<SpecHome>[] = [
    { key: "model_marketing_name", label: "Plan Name", sticky: true, sortable: true,
      render: (_v, r) => <span style={{ color: "#ededed", fontWeight: 500, fontSize: 13 }}>{r.model_marketing_name ?? r.model_name ?? "—"}</span> },
    { key: "community_name", label: "Community", sortable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 13 }}>{r.community_name ?? "—"}</span> },
    { key: "city",  label: "City",  sortable: true, render: (_v, r) => <span style={{ color: "#888", fontSize: 13 }}>{r.city ?? "—"}</span> },
    { key: "state", label: "State", sortable: true, render: (_v, r) => <span style={{ color: "#888", fontSize: 13 }}>{r.state ?? "—"}</span> },
    { key: "division_parent_name", label: "Division", sortable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 13 }}>{r.division_parent_name ?? "—"}</span> },
    { key: "lot_block_number", label: "Lot",
      render: (_v, r) => <span style={{ color: "#888", fontSize: 12 }}>{r.lot_block_number ?? r.lot_number ?? "—"}</span> },
    { key: "bedrooms",  label: "Beds",  render: (_v, r) => <span style={{ color: "#888", fontSize: 12 }}>{r.bedrooms ?? "—"}</span> },
    { key: "bathrooms", label: "Baths", render: (_v, r) => <span style={{ color: "#888", fontSize: 12 }}>{r.bathrooms ?? "—"}</span> },
    { key: "heated_sqft", label: "Sqft",
      render: (_v, r) => <span style={{ color: "#888", fontSize: 12 }}>{r.heated_sqft ? r.heated_sqft.toLocaleString() : "—"}</span> },
    { key: "net_price", label: "Net Price", sortable: true,
      render: (_v, r) => r.net_price
        ? <span style={{ color: "var(--blue)", fontWeight: 700, fontSize: 13 }}>{r.price_formatted ?? formatCurrency(r.net_price)}</span>
        : <span style={{ color: "#444" }}>—</span> },
    { key: "incentive_price", label: "Incentive",
      render: (_v, r) => r.incentive_price && r.incentive_price > 0
        ? <Badge variant="active" label={`Save $${r.incentive_price.toLocaleString()}`} customColor="#80B602" customBg="#162800" customBorder="#2a4a00" />
        : <span style={{ color: "#333" }}>—</span> },
  ];

  const planName = selected?.model_marketing_name ?? selected?.model_name ?? selected?.name ?? "—";

  return (
    <PageShell
      topBar={
        <TopBar
          title="Quick Delivery"
          right={
            <input
              type="text"
              placeholder="Search homes, plans, communities…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: "#161718", border: "1px solid #333", color: search ? "#ededed" : "#888", borderRadius: 3, height: 28, fontSize: 12, padding: "0 8px", width: 220, outline: "none" }}
            />
          }
        />
      }
    >
      <DataTable<SpecHome>
        columns={columns}
        rows={rows}
        statConfig={statConfig}
        defaultPageSize={100}
        onRowClick={setSelected}
        emptyMessage="No quick delivery homes"
        minWidth={1100}
      />

      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={planName}
        subtitle={selected?.community_name ?? undefined}
        width={520}
      >
        {selected && (
          <>
            {selected.featured_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.featured_image_url} alt={planName} style={{ width: "100%", borderRadius: 8, marginBottom: 20, objectFit: "cover", maxHeight: 220, display: "block" }} />
            )}
            <Section title="Pricing">
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--blue)", marginBottom: 8 }}>
                {selected.price_formatted ?? formatCurrency(selected.net_price)}
              </div>
              <Row label="Base Price" value={selected.base_price_formatted ?? formatCurrency(selected.base_price)} />
              {selected.incentive_price && selected.incentive_price > 0 && (
                <Row label="Incentive" value={<span style={{ color: "#80B602" }}>− {selected.incentive_price_formatted ?? formatCurrency(selected.incentive_price)}</span>} />
              )}
            </Section>
            <Section title="Home Specs">
              <Row label="Plan"        value={selected.model_marketing_name ?? selected.model_name} />
              <Row label="Bedrooms"    value={selected.bedrooms} />
              <Row label="Bathrooms"   value={selected.bathrooms} />
              <Row label="Heated Sqft" value={selected.heated_sqft ? selected.heated_sqft.toLocaleString() : null} />
              <Row label="Total Sqft"  value={selected.total_sqft ? selected.total_sqft.toLocaleString() : null} />
              <Row label="Lot"         value={selected.lot_block_number ?? selected.lot_number} />
            </Section>
            <Section title="Location">
              <Row label="Address"   value={selected.address} />
              <Row label="City"      value={selected.city} />
              <Row label="State"     value={selected.state} />
              <Row label="Community" value={selected.community_name} />
              <Row label="Division"  value={selected.division_parent_name} />
            </Section>
            {selected.description && (
              <Section title="Description">
                <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{selected.description}</p>
              </Section>
            )}
            <Section title="Actions">
              {selected.virtual_tour_url && (
                <a href={selected.virtual_tour_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6, border: "1px solid #1a3f1a", backgroundColor: "#1a2e1a", color: "#80B602", fontSize: 13, textDecoration: "none", fontWeight: 500, marginBottom: 8 }}>
                  ▶ Virtual Tour
                </a>
              )}
              {selected.url && (
                <a href={`https://www.schellbrothers.com${selected.url}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6, border: "1px solid #1a3f50", backgroundColor: "#0d2229", color: "var(--blue)", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>
                  ↗ View on schellbrothers.com
                </a>
              )}
            </Section>
          </>
        )}
      </SlideOver>
    </PageShell>
  );
}
