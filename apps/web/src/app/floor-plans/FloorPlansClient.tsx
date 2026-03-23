"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Division {
  id: string;
  slug: string;
  name: string;
}

interface Community {
  id: string;
  name: string;
  division_id: string;
}

interface FloorPlan {
  id: string;
  community_id: string | null;
  plan_name: string;
  plan_type: string | null;
  base_price: number | null;
  incentive_amount: number | null;
  net_price: number | null;
  min_bedrooms: number | null;
  max_bedrooms: number | null;
  min_bathrooms: number | null;
  max_bathrooms: number | null;
  min_heated_sqft: number | null;
  max_heated_sqft: number | null;
  style_filters: string[] | null;
  popularity: number | null;
  featured_image_url: string | null;
  virtual_tour_url: string | null;
  page_url: string | null;
  pdf_url: string | null;
}

interface Props {
  plans: FloorPlan[];
  communities: Community[];
  divisions: Division[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STYLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Ranch":             { bg: "#1a2a1a", text: "#00c853", border: "#1f3f1f" },
  "First Floor Suite": { bg: "#1a1f2e", text: "#0070f3", border: "#1a2a3f" },
  "2-Story":           { bg: "#2a2a1a", text: "#f5a623", border: "#3f3a1f" },
  "3-Story":           { bg: "#1f1a2e", text: "#a855f7", border: "#2a1f3f" },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number | null): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString();
}

function formatBedsOrBaths(min: number | null, max: number | null): string {
  if (min == null) return "—";
  if (max == null || max === min) return String(min);
  return `${min}–${max}`;
}

function formatSqft(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  if (min == null) return (max ?? 0).toLocaleString();
  if (max == null || max === min) return min.toLocaleString();
  return `${min.toLocaleString()} – ${max.toLocaleString()}`;
}

function popularityColor(pop: number | null): string {
  if (pop == null) return "#444";
  if (pop > 10) return "#00c853";
  if (pop >= 5) return "#f5a623";
  return "#555";
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatItem({
  label,
  value,
  color,
  isString,
}: {
  label: string;
  value: number | string;
  color: string;
  isString?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, color: "#555" }}>{label}:</span>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>
        {isString ? value : (value as number).toLocaleString()}
      </span>
    </div>
  );
}

function StyleBadge({ style }: { style: string }) {
  const colors = STYLE_COLORS[style] ?? { bg: "#1a1a1a", text: "#a1a1a1", border: "#2a2a2a" };
  return (
    <span
      style={{
        fontSize: 10,
        padding: "2px 7px",
        borderRadius: 4,
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {style}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3
        style={{
          color: "#555",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 12,
          margin: "0 0 12px 0",
        }}
      >
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "#666", fontSize: 13 }}>{label}</span>
      <span style={{ color: "#a1a1a1", fontSize: 12, textAlign: "right", maxWidth: "60%" }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function FloorPlansClient({ plans, communities, divisions }: Props) {
  const [view, setView] = useState<"table" | "card">("table");
  const [divFilter, setDivFilter] = useState("all");
  const [commFilter, setCommFilter] = useState("all");
  const [styleFilter, setStyleFilter] = useState("all");
  const [bedsFilter, setBedsFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<keyof FloorPlan | "community_name">("community_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<FloorPlan | null>(null);

  // Hydrate view from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("floorplans-view");
    if (saved === "card" || saved === "table") setView(saved);
  }, []);

  function handleViewChange(v: "table" | "card") {
    setView(v);
    localStorage.setItem("floorplans-view", v);
  }

  function handleSort(col: keyof FloorPlan | "community_name") {
    if (col === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  // When division filter changes, reset community filter
  function handleDivChange(val: string) {
    setDivFilter(val);
    setCommFilter("all");
  }

  // Cascaded community list
  const filteredCommunities =
    divFilter === "all"
      ? communities
      : communities.filter((c) => c.division_id === divFilter);

  // Community lookup map
  const commMap = new Map(communities.map((c) => [c.id, c]));
  const divMap = new Map(divisions.map((d) => [d.id, d]));

  function getCommunityName(plan: FloorPlan): string {
    return plan.community_id ? (commMap.get(plan.community_id)?.name ?? "—") : "—";
  }

  function getDivisionName(plan: FloorPlan): string {
    if (!plan.community_id) return "—";
    const comm = commMap.get(plan.community_id);
    if (!comm) return "—";
    return divMap.get(comm.division_id)?.name ?? "—";
  }

  // Filtered + sorted rows
  const rows = plans
    .filter(
      (p) =>
        divFilter === "all" ||
        communities.find((c) => c.id === p.community_id)?.division_id === divFilter
    )
    .filter((p) => commFilter === "all" || p.community_id === commFilter)
    .filter(
      (p) =>
        styleFilter === "all" || (p.style_filters ?? []).includes(styleFilter)
    )
    .filter(
      (p) => bedsFilter === "all" || (p.min_bedrooms ?? 0) >= parseInt(bedsFilter)
    )
    .filter(
      (p) =>
        priceFilter === "all" || (p.net_price ?? 0) <= parseInt(priceFilter)
    )
    .filter(
      (p) =>
        !search || p.plan_name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      if (sortCol === "community_name") {
        av = getCommunityName(a);
        bv = getCommunityName(b);
      } else {
        av = (a[sortCol] as string | number) ?? "";
        bv = (b[sortCol] as string | number) ?? "";
      }
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      // Secondary sort: plan_name
      if (cmp !== 0) return sortDir === "asc" ? cmp : -cmp;
      const sc = a.plan_name.localeCompare(b.plan_name, undefined, { numeric: true });
      return sortDir === "asc" ? sc : -sc;
    });

  // Stats (computed from filtered rows)
  const withPrice = rows.filter((p) => p.net_price);
  const stats = {
    total: rows.length,
    avgPrice:
      withPrice.reduce((s, p) => s + (p.net_price ?? 0), 0) / (withPrice.length || 1),
    ranch: rows.filter((p) => (p.style_filters ?? []).includes("Ranch")).length,
    firstFloor: rows.filter((p) => (p.style_filters ?? []).includes("First Floor Suite")).length,
    twoStory: rows.filter((p) => (p.style_filters ?? []).some((f) => f.includes("2-Story"))).length,
    withTour: rows.filter((p) => p.virtual_tour_url).length,
  };

  const sortArrow = (col: keyof FloorPlan | "community_name") =>
    sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  // ── Top bar ──────────────────────────────────────────────────────────────────

  const topBar = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 44,
        borderBottom: "1px solid #1f1f1f",
        background: "#0d0d0d",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h1 style={{ color: "#ededed", fontSize: 14, fontWeight: 600, margin: 0 }}>
          Floor Plans
        </h1>
        <span
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "#666",
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 600,
            padding: "1px 8px",
          }}
        >
          {rows.length}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#1a1a1a", borderRadius: 8, padding: 3, border: "1px solid #2a2a2a" }}>
        {(["card", "table"] as const).map((v, i) => (
          <button
            key={v}
            onClick={() => handleViewChange(v)}
            style={{
              background: view === v ? "#2a2a2a" : "transparent",
              border: "none",
              color: view === v ? "#ededed" : "#555",
              borderRadius: 6,
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: 14,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {i === 0 ? "⊞" : "≡"}
          </button>
        ))}
      </div>
    </div>
  );

  // ── Stats bar ─────────────────────────────────────────────────────────────────

  const statsBar = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "6px 24px",
        backgroundColor: "#0d0d0d",
        borderBottom: "1px solid #1a1a1a",
        flexShrink: 0,
      }}
    >
      <StatItem label="Total" value={stats.total} color="#666" />
      <StatItem
        label="Avg Net Price"
        value={"$" + Math.round(stats.avgPrice / 1000) + "k"}
        color="#a1a1a1"
        isString
      />
      <StatItem label="Ranch" value={stats.ranch} color="#00c853" />
      <StatItem label="1st Floor Suite" value={stats.firstFloor} color="#0070f3" />
      <StatItem label="2-Story" value={stats.twoStory} color="#f5a623" />
      <StatItem label="w/ Virtual Tour" value={stats.withTour} color="#a855f7" />
    </div>
  );

  // ── Filters bar ───────────────────────────────────────────────────────────────

  const selectStyle: React.CSSProperties = {
    background: "#111",
    border: "1px solid #2a2a2a",
    color: "#a1a1a1",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 12,
    cursor: "pointer",
    outline: "none",
  };

  const filtersBar = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 24px",
        borderBottom: "1px solid #1a1a1a",
        background: "#0a0a0a",
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      {/* Division */}
      <select value={divFilter} onChange={(e) => handleDivChange(e.target.value)} style={selectStyle}>
        <option value="all">All Divisions</option>
        {divisions.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      {/* Community (cascaded) */}
      <select value={commFilter} onChange={(e) => setCommFilter(e.target.value)} style={selectStyle}>
        <option value="all">All Communities</option>
        {filteredCommunities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Style */}
      <select value={styleFilter} onChange={(e) => setStyleFilter(e.target.value)} style={selectStyle}>
        <option value="all">All Styles</option>
        <option value="Ranch">Ranch</option>
        <option value="First Floor Suite">First Floor Suite</option>
        <option value="2-Story">2-Story</option>
        <option value="3-Story">3-Story</option>
      </select>

      {/* Min beds */}
      <select value={bedsFilter} onChange={(e) => setBedsFilter(e.target.value)} style={selectStyle}>
        <option value="all">Any Beds</option>
        <option value="2">2+</option>
        <option value="3">3+</option>
        <option value="4">4+</option>
        <option value="5">5+</option>
      </select>

      {/* Max price */}
      <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} style={selectStyle}>
        <option value="all">Any Price</option>
        <option value="500000">Under $500k</option>
        <option value="600000">Under $600k</option>
        <option value="700000">Under $700k</option>
        <option value="800000">Under $800k</option>
        <option value="1000000">Under $1M</option>
      </select>

      {/* Search */}
      <input
        type="text"
        placeholder="Search plans…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          ...selectStyle,
          minWidth: 160,
          color: "#ededed",
          background: "#111",
        }}
      />
    </div>
  );

  // ── Table view ────────────────────────────────────────────────────────────────

  const thStyle: React.CSSProperties = {
    background: "#111",
    color: "#666",
    fontSize: 11,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    padding: "6px 12px",
    whiteSpace: "nowrap",
    cursor: "pointer",
    borderBottom: "1px solid #1f1f1f",
    userSelect: "none",
  };

  const tdStyle: React.CSSProperties = {
    padding: "6px 12px",
    color: "#a1a1a1",
    fontSize: 12,
    borderBottom: "1px solid #161616",
    whiteSpace: "nowrap",
  };

  type ColDef = {
    label: string;
    col: keyof FloorPlan | "community_name" | "division_name";
    sortKey?: keyof FloorPlan | "community_name";
    render: (p: FloorPlan) => React.ReactNode;
    sticky?: boolean;
  };

  const columns: ColDef[] = [
    {
      label: "Plan Name",
      col: "plan_name",
      sortKey: "plan_name",
      sticky: true,
      render: (p) => (
        <span style={{ color: "#ededed", fontWeight: 500, fontSize: 13 }}>{p.plan_name}</span>
      ),
    },
    {
      label: "Community",
      col: "community_name",
      sortKey: "community_name",
      render: (p) => getCommunityName(p),
    },
    {
      label: "Division",
      col: "division_name",
      render: (p) => getDivisionName(p),
    },
    {
      label: "Style",
      col: "style_filters",
      render: (p) => (
        <div style={{ display: "flex", gap: 4 }}>
          {(p.style_filters ?? []).map((s) => (
            <StyleBadge key={s} style={s} />
          ))}
        </div>
      ),
    },
    {
      label: "Beds",
      col: "min_bedrooms",
      sortKey: "min_bedrooms",
      render: (p) => formatBedsOrBaths(p.min_bedrooms, p.max_bedrooms),
    },
    {
      label: "Baths",
      col: "min_bathrooms",
      sortKey: "min_bathrooms",
      render: (p) => formatBedsOrBaths(p.min_bathrooms, p.max_bathrooms),
    },
    {
      label: "SqFt",
      col: "min_heated_sqft",
      sortKey: "min_heated_sqft",
      render: (p) => formatSqft(p.min_heated_sqft, p.max_heated_sqft),
    },
    {
      label: "Net Price",
      col: "net_price",
      sortKey: "net_price",
      render: (p) =>
        p.net_price != null ? (
          <span style={{ color: "#00c853", fontWeight: 700 }}>
            {formatCurrency(p.net_price)}
          </span>
        ) : (
          "—"
        ),
    },
    {
      label: "Base",
      col: "base_price",
      sortKey: "base_price",
      render: (p) => formatCurrency(p.base_price),
    },
    {
      label: "Incentive",
      col: "incentive_amount",
      sortKey: "incentive_amount",
      render: (p) =>
        p.incentive_amount != null ? (
          <span style={{ color: "#f5a623" }}>
            -${p.incentive_amount.toLocaleString()}
          </span>
        ) : (
          "—"
        ),
    },
    {
      label: "Pop",
      col: "popularity",
      sortKey: "popularity",
      render: (p) => (
        <span style={{ color: popularityColor(p.popularity), fontWeight: 600 }}>
          {p.popularity ?? "—"}
        </span>
      ),
    },
    {
      label: "Tour",
      col: "virtual_tour_url",
      render: (p) =>
        p.virtual_tour_url ? (
          <a
            href={p.virtual_tour_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ color: "#a855f7", textDecoration: "none", fontSize: 14 }}
          >
            ◉
          </a>
        ) : (
          "—"
        ),
    },
    {
      label: "PDF",
      col: "pdf_url",
      render: (p) =>
        p.pdf_url ? (
          <a
            href={p.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ color: "#0070f3", textDecoration: "none", fontSize: 14 }}
          >
            ⬇
          </a>
        ) : (
          "—"
        ),
    },
  ];

  const tableView = (
    <div
      style={{
        overflowX: "auto",
        overflowY: "auto",
        maxHeight: "calc(100vh - 140px)",
        position: "relative",
      }}
    >
      <table style={{ minWidth: 1400, borderCollapse: "collapse", width: "100%" }}>
        <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.label}
                style={{
                  ...thStyle,
                  ...(col.sticky
                    ? { position: "sticky", left: 0, zIndex: 3, background: "#111" }
                    : {}),
                }}
                onClick={() => col.sortKey && handleSort(col.sortKey)}
              >
                {col.label}
                {col.sortKey ? sortArrow(col.sortKey) : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              key={p.id}
              onClick={() => setSelected(p)}
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#161616")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {columns.map((col) => (
                <td
                  key={col.label}
                  style={{
                    ...tdStyle,
                    ...(col.sticky
                      ? {
                          position: "sticky",
                          left: 0,
                          background: "#0d0d0d",
                          zIndex: 1,
                        }
                      : {}),
                  }}
                >
                  {col.render(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Card view ─────────────────────────────────────────────────────────────────

  const cardView = (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-6"
    >
      {rows.map((p) => {
        const commName = getCommunityName(p);
        const styles = p.style_filters ?? [];

        return (
          <div
            key={p.id}
            onClick={() => setSelected(p)}
            style={{
              borderRadius: 8,
              border: "1px solid #1f1f1f",
              backgroundColor: "#111111",
              padding: 12,
              cursor: "pointer",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1f1f1f")}
          >
            {/* Top row: plan name + badges */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 6,
                marginBottom: 4,
              }}
            >
              <span
                style={{ fontSize: 13, fontWeight: 500, color: "#ededed", lineHeight: 1.3 }}
              >
                {p.plan_name}
              </span>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {styles.map((s) => (
                  <StyleBadge key={s} style={s} />
                ))}
              </div>
            </div>

            {/* Community */}
            <div style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>{commName}</div>

            {/* Pricing */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
              {p.net_price != null ? (
                <span style={{ fontSize: 14, fontWeight: 600, color: "#00c853" }}>
                  {formatCurrency(p.net_price)}
                </span>
              ) : null}
              {p.base_price != null && p.net_price !== p.base_price && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#444",
                    textDecoration: "line-through",
                  }}
                >
                  {formatCurrency(p.base_price)}
                </span>
              )}
            </div>

            {/* Incentive badge */}
            {p.incentive_amount != null && (
              <div style={{ marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 7px",
                    borderRadius: 4,
                    backgroundColor: "#2a2a1a",
                    color: "#f5a623",
                    border: "1px solid #3f3a1f",
                    fontWeight: 500,
                  }}
                >
                  -${p.incentive_amount.toLocaleString()}
                </span>
              </div>
            )}

            {/* Specs */}
            <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
              {formatBedsOrBaths(p.min_bedrooms, p.max_bedrooms)}bd
              {" · "}
              {formatBedsOrBaths(p.min_bathrooms, p.max_bathrooms)}ba
              {p.min_heated_sqft != null || p.max_heated_sqft != null
                ? ` · ${formatSqft(p.min_heated_sqft, p.max_heated_sqft)} sf`
                : ""}
            </div>

            {/* Bottom row: popularity + links */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {p.popularity != null ? (
                <span
                  style={{
                    fontSize: 11,
                    color: popularityColor(p.popularity),
                    fontWeight: 600,
                  }}
                >
                  ★ {p.popularity}
                </span>
              ) : (
                <span />
              )}
              <div style={{ display: "flex", gap: 10 }}>
                {p.virtual_tour_url && (
                  <a
                    href={p.virtual_tour_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: "#a855f7", fontSize: 13, textDecoration: "none" }}
                    title="Virtual Tour"
                  >
                    ◉ Tour
                  </a>
                )}
                {p.pdf_url && (
                  <a
                    href={p.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: "#0070f3", fontSize: 13, textDecoration: "none" }}
                    title="Download PDF"
                  >
                    ⬇ PDF
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── Slide-over ────────────────────────────────────────────────────────────────

  const slideOver = selected && (
    <>
      {/* Overlay */}
      <div
        onClick={() => setSelected(null)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 40,
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 560,
          height: "100vh",
          background: "#111",
          borderLeft: "1px solid #1f1f1f",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #1f1f1f",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {(selected.style_filters ?? []).map((s) => (
                <StyleBadge key={s} style={s} />
              ))}
            </div>
            <h2 style={{ color: "#ededed", fontSize: 16, fontWeight: 600, margin: 0 }}>
              {selected.plan_name}
            </h2>
          </div>
          <button
            onClick={() => setSelected(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#555",
              fontSize: 22,
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
              marginTop: 2,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* Pricing */}
          <Section title="Pricing">
            {selected.net_price != null && (
              <div style={{ marginBottom: 8 }}>
                <span
                  style={{ fontSize: 22, fontWeight: 700, color: "#00c853" }}
                >
                  {formatCurrency(selected.net_price)}
                </span>
                <span style={{ fontSize: 12, color: "#555", marginLeft: 6 }}>net price</span>
              </div>
            )}
            <Row label="Base Price" value={formatCurrency(selected.base_price)} />
            <Row
              label="Incentive Amount"
              value={
                selected.incentive_amount != null
                  ? (
                      <span style={{ color: "#f5a623" }}>
                        -${selected.incentive_amount.toLocaleString()}
                      </span>
                    )
                  : null
              }
            />
          </Section>

          {/* Specs */}
          <Section title="Specs">
            <Row
              label="Bedrooms"
              value={formatBedsOrBaths(selected.min_bedrooms, selected.max_bedrooms)}
            />
            <Row
              label="Bathrooms"
              value={formatBedsOrBaths(selected.min_bathrooms, selected.max_bathrooms)}
            />
            <Row
              label="Heated SqFt"
              value={formatSqft(selected.min_heated_sqft, selected.max_heated_sqft)}
            />
            <Row label="Plan Type" value={selected.plan_type} />
          </Section>

          {/* Community */}
          <Section title="Community">
            <Row label="Community" value={getCommunityName(selected)} />
            <Row label="Division" value={getDivisionName(selected)} />
          </Section>

          {/* Assets */}
          {(selected.virtual_tour_url || selected.pdf_url || selected.page_url) && (
            <Section title="Assets">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selected.virtual_tour_url && (
                  <a
                    href={selected.virtual_tour_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: "1px solid #2a1f3f",
                      backgroundColor: "#1f1a2e",
                      color: "#a855f7",
                      fontSize: 13,
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    ◉ Virtual Tour
                  </a>
                )}
                {selected.pdf_url && (
                  <a
                    href={selected.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: "1px solid #1a2a3f",
                      backgroundColor: "#1a1f2e",
                      color: "#0070f3",
                      fontSize: 13,
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    ⬇ PDF Download
                  </a>
                )}
                {selected.page_url && (
                  <a
                    href={selected.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: "1px solid #2a2a2a",
                      backgroundColor: "#1a1a1a",
                      color: "#a1a1a1",
                      fontSize: 13,
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    ↗ View on Website
                  </a>
                )}
              </div>
            </Section>
          )}

          {/* Popularity */}
          {selected.popularity != null && (
            <Section title="Popularity">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: popularityColor(selected.popularity),
                  }}
                >
                  {selected.popularity}
                </span>
                <span style={{ fontSize: 13, color: "#555" }}>Interest Score</span>
              </div>
            </Section>
          )}

        </div>
      </div>
    </>
  );

  // ── Layout ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar activeHref="/floor-plans" />
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {topBar}
        {statsBar}
        {filtersBar}
        <div style={{ flex: 1, overflow: "auto" }}>
          {view === "table" ? tableView : cardView}
        </div>
      </main>
      {slideOver}
    </div>
  );
}
