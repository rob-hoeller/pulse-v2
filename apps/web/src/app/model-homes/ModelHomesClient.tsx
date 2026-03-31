"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import DataTable, { type Column, type StatConfigItem } from "@/components/DataTable";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Division {
  id: string;
  slug: string;
  name: string;
}

interface ModelHome {
  id: string;
  home_id: number;
  name: string | null;
  transaction_type: string | null;
  division_id: number | null;
  division_name: string | null;
  division_parent_id: number | null;
  division_parent_name: string | null;
  community_id: string | null;
  community_name: string | null;
  community_slug: string | null;
  community_parent_id: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  lot_number: string | null;
  block_number: string | null;
  lot_block_number: string | null;
  model_id: number | null;
  model_name: string | null;
  model_marketing_name: string | null;
  is_market_home: boolean | null;
  is_market_home_sold: boolean | null;
  is_model: boolean | null;
  is_model_sold: boolean | null;
  is_leaseback: boolean | null;
  is_ended_leaseback: boolean | null;
  leaseback_start_date: string | null;
  leaseback_end_date: string | null;
  days_till_lease_end: number | null;
  hours: unknown | null;
  hours_string: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  heated_sqft: number | null;
  total_sqft: number | null;
  base_price: number | null;
  incentive_price: number | null;
  net_price: number | null;
  base_price_formatted: string | null;
  price_formatted: string | null;
  listing_id: number | null;
  is_marketing_active: boolean | null;
  description: string | null;
  page_title: string | null;
  url: string | null;
  featured_image_url: string | null;
  featured_image_thumbnail_url: string | null;
  thumbnail_image_url: string | null;
  flickr_set: string | null;
  virtual_tour_url: string | null;
  filters: unknown[] | null;
  elevations: unknown[] | null;
  floor_plan_images: unknown[] | null;
  pdf_file_id: string | null;
  card_label: string | null;
  sales_center_address: string | null;
  synced_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

type ModelHomeRow = ModelHome & Record<string, unknown>;

interface Props {
  modelHomes: ModelHome[];
  divisions: Division[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(n: number | null): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ color: "#555", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 12px 0" }}>
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
      <span style={{ color: "#666", fontSize: 13, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#a1a1a1", fontSize: 12, textAlign: "right" }}>{value ?? "—"}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const isSold = status.toLowerCase().includes("sold");
  const isLease = status.toLowerCase().includes("leaseback");
  const color = isSold ? "#8a5a5a" : isLease ? "#8a7a5a" : "#5b80a0";
  const bg = isSold ? "#1e1212" : isLease ? "#1e1e12" : "#161820";
  const border = isSold ? "#3f1a1a" : isLease ? "#3f3f1a" : "#1a2a3f";
  return (
    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 500, whiteSpace: "nowrap", backgroundColor: bg, color, border: `1px solid ${border}` }}>
      {status}
    </span>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function ModelHomesClient({ modelHomes, divisions }: Props) {
  const [view, setView] = useState<"table" | "card">("table");
  const [divFilter, setDivFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [commFilter, setCommFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedHome, setSelectedHome] = useState<ModelHomeRow | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("model-homes-view");
    if (saved === "card" || saved === "table") setView(saved);
  }, []);

  function handleViewChange(v: "table" | "card") {
    setView(v);
    localStorage.setItem("model-homes-view", v);
  }

  const allRows: ModelHomeRow[] = modelHomes as ModelHomeRow[];

  const allStates = Array.from(new Set(allRows.map(r => r.state).filter(Boolean))).sort() as string[];

  const filteredComms = Array.from(new Set(
    allRows
      .filter(r => divFilter === "all" || String(r.division_parent_id) === divFilter)
      .filter(r => stateFilter === "all" || r.state === stateFilter)
      .map(r => r.community_name)
      .filter(Boolean)
  )).sort() as string[];

  const rows = allRows
    .filter(r => divFilter === "all" || String(r.division_parent_id) === divFilter)
    .filter(r => stateFilter === "all" || r.state === stateFilter)
    .filter(r => commFilter === "all" || r.community_name === commFilter)
    .filter(r => !search ||
      (r.community_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.model_marketing_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.address ?? "").toLowerCase().includes(search.toLowerCase())
    );

  const statConfig: StatConfigItem<ModelHomeRow>[] = [
    { label: "Total", color: "#666", getValue: (r) => r.length },
    { label: "Communities", color: "#a1a1a1", getValue: (r) => new Set(r.map(x => x.community_name)).size },
    { label: "States", color: "#0070f3", getValue: (r) => new Set(r.map(x => x.state)).size },
  ];

  const columns: Column<ModelHomeRow>[] = [
    {
      key: "model_marketing_name", label: "Plan Name", sticky: true,
      render: (_v, row) => <span style={{ color: "#ededed", fontWeight: 500, fontSize: 13 }}>{row.model_marketing_name ?? row.model_name ?? "—"}</span>,
    },
    {
      key: "community_name", label: "Community",
      render: (_v, row) => <span style={{ color: "#c0c0c0", fontSize: 13 }}>{row.community_name ?? "—"}</span>,
    },
    { key: "city", label: "City", filterable: true },
    { key: "state", label: "State", filterable: true },
    { key: "division_parent_name", label: "Division", filterable: true },
    {
      key: "lot_block_number", label: "Lot",
      render: (_v, row) => <span style={{ color: "#a1a1a1", fontSize: 12 }}>{row.lot_block_number ?? row.lot_number ?? "—"}</span>,
    },
    {
      key: "bedrooms", label: "Beds",
      render: (_v, row) => <span style={{ color: "#a1a1a1", fontSize: 12 }}>{row.bedrooms ?? "—"}</span>,
    },
    {
      key: "bathrooms", label: "Baths",
      render: (_v, row) => <span style={{ color: "#a1a1a1", fontSize: 12 }}>{row.bathrooms ?? "—"}</span>,
    },
    {
      key: "heated_sqft", label: "Sqft",
      render: (_v, row) => <span style={{ color: "#a1a1a1", fontSize: 12 }}>{row.heated_sqft ? row.heated_sqft.toLocaleString() : "—"}</span>,
    },
    {
      key: "base_price", label: "Base Price",
      render: (_v, row) => row.base_price
        ? <span style={{ color: "#8a7a5a", fontWeight: 600, fontSize: 13 }}>{row.base_price_formatted ?? formatCurrency(row.base_price)}</span>
        : <span style={{ color: "#444" }}>—</span>,
    },
    {
      key: "transaction_type", label: "Status",
      render: (_v, row) => <StatusBadge status={row.transaction_type} />,
    },
    {
      key: "url", label: "View", sortable: false,
      render: (_v, row) => row.url
        ? <a href={`https://www.schellbrothers.com${row.url}`} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ color: "#0070f3", fontSize: 13, textDecoration: "none" }}>↗</a>
        : <span style={{ color: "#444" }}>—</span>,
    },
  ];

  // ── Top bar ──────────────────────────────────────────────────────────────────
  const topBar = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 44, borderBottom: "1px solid #1f1f1f", background: "#0d0d0d", flexShrink: 0 }}>
      <h1 style={{ color: "#ededed", fontSize: 14, fontWeight: 600, margin: 0 }}>Model Homes</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="text" placeholder="Search model homes..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: "#111", border: "1px solid #2a2a2a", color: "#a1a1a1", borderRadius: 6, padding: "5px 12px", fontSize: 12, outline: "none", width: 200 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#1a1a1a", borderRadius: 8, padding: 3, border: "1px solid #2a2a2a" }}>
          {(["card", "table"] as const).map((v, i) => (
            <button key={v} onClick={() => handleViewChange(v)} style={{ background: view === v ? "#2a2a2a" : "transparent", border: "none", color: view === v ? "#ededed" : "#555", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 14, transition: "background 0.15s, color 0.15s" }}>
              {i === 0 ? "⊞" : "≡"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Stats bar ────────────────────────────────────────────────────────────────
  const statsBar = (
    <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "6px 24px", backgroundColor: "#0d0d0d", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
      {[
        { label: "Total", value: rows.length, color: "#666" },
        { label: "Communities", value: new Set(rows.map(r => r.community_name)).size, color: "#a1a1a1" },
        { label: "States", value: new Set(rows.map(r => r.state)).size, color: "#0070f3" },
      ].map(s => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#555" }}>{s.label}:</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{(s.value as number).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );

  // ── Filter bar ───────────────────────────────────────────────────────────────
  const selectStyle: React.CSSProperties = { background: "#111", border: "1px solid #2a2a2a", color: "#a1a1a1", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", outline: "none" };

  const divisionOptions = Array.from(
    new Map(allRows.filter(r => r.division_parent_id && r.division_parent_name).map(r => [String(r.division_parent_id), r.division_parent_name!])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const filtersBar = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 24px", borderBottom: "1px solid #1a1a1a", background: "#0a0a0a", flexShrink: 0, flexWrap: "wrap" }}>
      <select value={divFilter} onChange={e => { setDivFilter(e.target.value); setCommFilter("all"); }} style={selectStyle}>
        <option value="all">All Divisions</option>
        {divisionOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
      <select value={stateFilter} onChange={e => { setStateFilter(e.target.value); setCommFilter("all"); }} style={selectStyle}>
        <option value="all">All States</option>
        {allStates.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={commFilter} onChange={e => setCommFilter(e.target.value)} style={selectStyle}>
        <option value="all">All Communities</option>
        {filteredComms.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  );

  // ── Card view ────────────────────────────────────────────────────────────────
  const cardView = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-6">
      {rows.map(home => (
        <div key={home.id} onClick={() => setSelectedHome(home)}
          style={{ borderRadius: 8, border: "1px solid #1f1f1f", backgroundColor: "#111111", overflow: "hidden", cursor: "pointer", transition: "border-color 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "#2a2a2a")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "#1f1f1f")}
        >
          {home.featured_image_url ? (
            <img src={home.featured_image_url} alt={home.model_marketing_name ?? ""} style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ width: "100%", height: 140, backgroundColor: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 28, opacity: 0.2 }}>⌂</span>
            </div>
          )}
          <div style={{ padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#ededed", marginBottom: 2 }}>{home.model_marketing_name ?? home.model_name ?? home.name ?? "—"}</div>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>{home.community_name}</div>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>{home.city}, {home.state}</div>
            {home.lot_block_number && <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>Lot #{home.lot_block_number}</div>}
            {home.transaction_type && <div style={{ marginBottom: 6 }}><StatusBadge status={home.transaction_type} /></div>}
            {home.url && (
              <a href={`https://www.schellbrothers.com${home.url}`} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ fontSize: 12, color: "#0070f3", textDecoration: "none", fontWeight: 500 }}>
                View Model Home →
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // ── Slide-over ───────────────────────────────────────────────────────────────
  const slideOver = selectedHome && (
    <>
      <div onClick={() => setSelectedHome(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }} />
      <div style={{ position: "fixed", top: 0, right: 0, width: 520, height: "100vh", background: "#111", borderLeft: "1px solid #1f1f1f", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 6 }}><StatusBadge status={selectedHome.transaction_type} /></div>
            <h2 style={{ color: "#ededed", fontSize: 16, fontWeight: 600, margin: 0 }}>{selectedHome.model_marketing_name ?? selectedHome.model_name ?? selectedHome.name ?? "—"}</h2>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{selectedHome.community_name}</div>
          </div>
          <button onClick={() => setSelectedHome(null)} style={{ background: "transparent", border: "none", color: "#555", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1, marginTop: 2 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {selectedHome.featured_image_url ? (
            <img src={selectedHome.featured_image_url} alt={selectedHome.name ?? ""} style={{ width: "100%", borderRadius: 8, marginBottom: 20, objectFit: "cover", maxHeight: 220 }} />
          ) : (
            <div style={{ width: "100%", height: 160, backgroundColor: "#1a1a1a", borderRadius: 8, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 32, opacity: 0.2 }}>⌂</span>
            </div>
          )}

          <Section title="Pricing">
            <Row label="Base Price" value={<span style={{ color: "#8a7a5a", fontWeight: 600 }}>{selectedHome.base_price_formatted ?? formatCurrency(selectedHome.base_price)}</span>} />
          </Section>

          <Section title="Home Details">
            <Row label="Plan" value={selectedHome.model_marketing_name ?? selectedHome.model_name} />
            <Row label="Bedrooms" value={selectedHome.bedrooms ?? "—"} />
            <Row label="Bathrooms" value={selectedHome.bathrooms ?? "—"} />
            <Row label="Heated Sqft" value={selectedHome.heated_sqft ? selectedHome.heated_sqft.toLocaleString() : "—"} />
            <Row label="Total Sqft" value={selectedHome.total_sqft ? selectedHome.total_sqft.toLocaleString() : "—"} />
            <Row label="Lot" value={selectedHome.lot_block_number ?? selectedHome.lot_number ?? "—"} />
          </Section>

          <Section title="Location">
            <Row label="Address" value={selectedHome.address} />
            <Row label="City" value={selectedHome.city} />
            <Row label="State" value={selectedHome.state} />
            <Row label="Zip" value={selectedHome.zip} />
            <Row label="Division" value={selectedHome.division_parent_name} />
            <Row label="Community" value={selectedHome.community_name} />
          </Section>

          {selectedHome.hours_string && (
            <Section title="Hours">
              <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, margin: 0 }} dangerouslySetInnerHTML={{ __html: selectedHome.hours_string.replace(/<br[^>]*>/g, "\n") }} />
            </Section>
          )}

          {selectedHome.is_leaseback && (
            <Section title="Leaseback">
              <Row label="Start" value={selectedHome.leaseback_start_date} />
              <Row label="End" value={selectedHome.leaseback_end_date} />
              <Row label="Days Remaining" value={selectedHome.days_till_lease_end != null ? `${selectedHome.days_till_lease_end} days` : "—"} />
            </Section>
          )}

          {selectedHome.description && (
            <Section title="Description">
              <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{selectedHome.description}</p>
            </Section>
          )}

          <Section title="Actions">
            {selectedHome.url && (
              <a href={`https://www.schellbrothers.com${selectedHome.url}`} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6, border: "1px solid #1a2a3f", backgroundColor: "#1a1f2e", color: "#0070f3", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>
                ↗ View on schellbrothers.com
              </a>
            )}
            {selectedHome.virtual_tour_url && (
              <a href={selectedHome.virtual_tour_url} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6, border: "1px solid #1a3f1a", backgroundColor: "#1a2e1a", color: "#5a8a5a", fontSize: 13, textDecoration: "none", fontWeight: 500, marginTop: 8 }}>
                ▶ Virtual Tour
              </a>
            )}
          </Section>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar activeHref="/model-homes" />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {topBar}
        {filtersBar}
        {view === "card" && statsBar}
        <div style={{ flex: 1, overflow: "auto" }}>
          {view === "table"
            ? <DataTable<ModelHomeRow> columns={columns} rows={rows} statConfig={statConfig} defaultPageSize={100} onRowClick={setSelectedHome} emptyMessage="No model homes" minWidth={1100} />
            : cardView}
        </div>
      </main>
      {slideOver}
    </div>
  );
}
