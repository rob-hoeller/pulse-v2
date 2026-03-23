"use client";

import Sidebar from "@/components/Sidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Community {
  id: string;
  name: string;
  slug: string | null;
  status: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  division_name: string;
  division_slug: string;
  description: string | null;
  short_description: string | null;
  priced_from: number | null;
  hoa_fee: number | null;
  hoa_period: string | null;
  is_55_plus: boolean;
  has_model: boolean;
  has_lotworks: boolean;
  school_district: string | null;
  school_elementary: string | null;
  school_middle: string | null;
  school_high: string | null;
  sales_phone: string | null;
  sales_center_address: string | null;
  amenities: string | null;
  featured_image_url: string | null;
  logo_image_url: string | null;
  brochure_url: string | null;
  lot_map_url: string | null;
  page_url: string | null;
  marketing_video_url: string | null;
  latitude: number | null;
  longitude: number | null;
  flickr_set_id: string | null;
  model_homes: string | null;
  spec_homes: string | null;
}

interface Plan {
  id: string;
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
  virtual_tour_url: string | null;
  pdf_url: string | null;
  page_url: string | null;
  featured_image_url: string | null;
}

interface Lot {
  id: string;
  lot_number: string;
  lot_status: string | null;
  construction_status: string | null;
  is_available: boolean;
  lot_premium: number;
  address: string | null;
  block: string | null;
  phase: string | null;
}

interface Props {
  community: Community;
  plans: Plan[];
  lots: Lot[];
}

interface ModelHome {
  name: string;
  url: string;
  home_id: number;
}

interface SpecHome {
  name: string;
  url: string;
  home_id: number;
  lot_block_number: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  const active = ["active", "now-selling", "last-chance"].includes(status ?? "");
  return (
    <span
      style={{
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 4,
        backgroundColor: active ? "#1a2a1a" : "#1a1a1a",
        color: active ? "#00c853" : "#555",
        border: `1px solid ${active ? "#1f3f1f" : "#2a2a2a"}`,
        fontWeight: 500,
      }}
    >
      {active ? "Active" : "Not Active"}
    </span>
  );
}

function DonutChart({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const cx = 80;
  const cy = 80;
  const r = 60;
  const strokeW = 20;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={160} height={160} viewBox="0 0 160 160" style={{ flexShrink: 0 }}>
      {data
        .filter((d) => d.value > 0)
        .map((d, i) => {
          const dash = (d.value / total) * circumference;
          const gap = circumference - dash;
          const el = (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={strokeW}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += dash;
          return el;
        })}
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        fill="#ededed"
        fontSize={20}
        fontWeight={700}
      >
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#555" fontSize={9}>
        TOTAL LOTS
      </text>
    </svg>
  );
}

function PopularityBars({ plans }: { plans: Plan[] }) {
  const sorted = [...plans]
    .filter((p) => p.popularity)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  const max = Math.max(...sorted.map((p) => p.popularity ?? 0), 1);

  if (sorted.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "#555" }}>No popularity data available.</div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {sorted.map((p) => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{ fontSize: 11, color: "#a1a1a1", width: 80, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {p.plan_name}
          </span>
          <div
            style={{
              flex: 1,
              height: 6,
              backgroundColor: "#1a1a1a",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${((p.popularity ?? 0) / max) * 100}%`,
                height: "100%",
                backgroundColor: "#0070f3",
                borderRadius: 3,
                transition: "width 0.3s",
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: "#555", width: 20, textAlign: "right" }}>
            {p.popularity}
          </span>
        </div>
      ))}
    </div>
  );
}

function PriceBars({ plans }: { plans: Plan[] }) {
  const sorted = [...plans]
    .filter((p) => p.net_price)
    .sort((a, b) => (a.net_price ?? 0) - (b.net_price ?? 0));

  if (sorted.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "#555" }}>No pricing data available.</div>
    );
  }

  const minPrice = Math.min(...sorted.map((p) => p.net_price ?? 0));
  const maxPrice = Math.max(...sorted.map((p) => p.net_price ?? 0));
  const range = maxPrice - minPrice || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {sorted.map((p) => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{ fontSize: 11, color: "#a1a1a1", width: 80, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {p.plan_name}
          </span>
          <div
            style={{
              flex: 1,
              height: 6,
              backgroundColor: "#1a1a1a",
              borderRadius: 3,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                marginLeft: `${(((p.net_price ?? 0) - minPrice) / range) * 100}%`,
                width: "8px",
                height: "100%",
                backgroundColor: "#00c853",
                borderRadius: 3,
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: "#00c853", width: 72, textAlign: "right" }}>
            ${((p.net_price ?? 0) / 1000).toFixed(0)}k
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Card wrapper helper ──────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: 8,
        border: "1px solid #1f1f1f",
        backgroundColor: "#111111",
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "#555",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CommunityDetailClient({ community, plans, lots }: Props) {
  // Lot stats
  const lotStats = {
    total: lots.length,
    available: lots.filter((l) => l.lot_status === "Available Homesite").length,
    sold: lots.filter((l) => l.lot_status === "Sold").length,
    future: lots.filter((l) => l.lot_status === "Future Homesite").length,
    model: lots.filter((l) => (l.lot_status || "").includes("Model")).length,
    qd: lots.filter((l) => l.lot_status === "Quick Delivery").length,
  };

  const LOT_STATUS_DATA = [
    { label: "Available", value: lotStats.available, color: "#00c853" },
    { label: "Sold", value: lotStats.sold, color: "#444" },
    { label: "Future", value: lotStats.future, color: "#f5a623" },
    { label: "Model", value: lotStats.model, color: "#a855f7" },
    { label: "Quick Del", value: lotStats.qd, color: "#0070f3" },
  ];

  // Parse model + spec homes safely
  let modelHomes: ModelHome[] = [];
  let specHomes: SpecHome[] = [];
  try {
    modelHomes = JSON.parse(community.model_homes || "[]") as ModelHome[];
  } catch {
    modelHomes = [];
  }
  try {
    specHomes = JSON.parse(community.spec_homes || "[]") as SpecHome[];
  } catch {
    specHomes = [];
  }

  // Amenities pills
  const amenityList = community.amenities
    ? community.amenities
        .split(";")
        .map((a) => a.trim())
        .filter(Boolean)
    : [];

  // Bed/bath range helpers
  function bedRange(p: Plan): string {
    if (!p.min_bedrooms && !p.max_bedrooms) return "—";
    if (p.min_bedrooms === p.max_bedrooms) return `${p.min_bedrooms}`;
    return `${p.min_bedrooms ?? ""}–${p.max_bedrooms ?? ""}`;
  }
  function bathRange(p: Plan): string {
    if (!p.min_bathrooms && !p.max_bathrooms) return "—";
    if (p.min_bathrooms === p.max_bathrooms) return `${p.min_bathrooms}`;
    return `${p.min_bathrooms ?? ""}–${p.max_bathrooms ?? ""}`;
  }
  function sqftRange(p: Plan): string {
    if (!p.min_heated_sqft && !p.max_heated_sqft) return "—";
    if (p.min_heated_sqft === p.max_heated_sqft)
      return `${(p.min_heated_sqft ?? 0).toLocaleString()}`;
    return `${(p.min_heated_sqft ?? 0).toLocaleString()}–${(p.max_heated_sqft ?? 0).toLocaleString()}`;
  }

  // Table cell style
  const td: React.CSSProperties = {
    padding: "6px 12px",
    fontSize: 12,
    color: "#a1a1a1",
    borderBottom: "1px solid #1a1a1a",
    whiteSpace: "nowrap",
  };
  const th: React.CSSProperties = {
    padding: "6px 12px",
    fontSize: 10,
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 500,
    textAlign: "left",
    borderBottom: "1px solid #1f1f1f",
    whiteSpace: "nowrap",
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar activeHref="/communities" />

      <main className="flex-1 overflow-y-auto">
        {/* ── Hero Bar ─────────────────────────────────────────────────────── */}
        <div
          style={{
            borderBottom: "1px solid #1f1f1f",
            padding: "16px 24px",
            backgroundColor: "#0a0a0a",
            position: "sticky",
            top: 0,
            zIndex: 10,
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Left: breadcrumb + badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <a
                href="/communities"
                style={{ color: "#555", fontSize: 12, textDecoration: "none" }}
              >
                ← Communities
              </a>
              <span style={{ color: "#333" }}>/</span>
              <span style={{ color: "#ededed", fontSize: 14, fontWeight: 600 }}>
                {community.name}
              </span>
              <StatusBadge status={community.status} />
              {community.is_55_plus && (
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 6px",
                    borderRadius: 3,
                    backgroundColor: "#1a1f2e",
                    color: "#0070f3",
                    border: "1px solid #1a2a3f",
                  }}
                >
                  55+
                </span>
              )}
              {community.city && community.state && (
                <span style={{ fontSize: 12, color: "#555" }}>
                  {community.city}, {community.state}
                </span>
              )}
            </div>

            {/* Right: resource links */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {community.brochure_url && (
                <a
                  href={community.brochure_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 4,
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    color: "#a1a1a1",
                    textDecoration: "none",
                  }}
                >
                  ⬇ Brochure
                </a>
              )}
              {community.lot_map_url && (
                <a
                  href={community.lot_map_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 4,
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    color: "#a1a1a1",
                    textDecoration: "none",
                  }}
                >
                  ◫ Lot Map
                </a>
              )}
              {community.page_url && (
                <a
                  href={`https://schellbrothers.com${community.page_url}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 4,
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    color: "#a1a1a1",
                    textDecoration: "none",
                  }}
                >
                  ↗ Website
                </a>
              )}
              {community.marketing_video_url && (
                <a
                  href={community.marketing_video_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 4,
                    backgroundColor: "#1a1f2e",
                    border: "1px solid #1a2a3f",
                    color: "#0070f3",
                    textDecoration: "none",
                  }}
                >
                  ▶ Video
                </a>
              )}
            </div>
          </div>

          {community.short_description && (
            <div
              style={{
                fontSize: 12,
                color: "#555",
                marginTop: 6,
                fontStyle: "italic",
              }}
            >
              {community.short_description}
            </div>
          )}
        </div>

        {/* ── Stats Row ────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 1,
            borderBottom: "1px solid #1f1f1f",
            backgroundColor: "#1f1f1f",
          }}
        >
          {[
            {
              label: "Priced From",
              value: community.priced_from
                ? `$${community.priced_from.toLocaleString()}`
                : "—",
              color: "#00c853",
            },
            {
              label: "Available Lots",
              value: lotStats.available.toString(),
              color: "#00c853",
            },
            {
              label: "Total Lots",
              value: lotStats.total.toString(),
              color: "#666",
            },
            {
              label: "Floor Plans",
              value: plans.length.toString(),
              color: "#a1a1a1",
            },
            {
              label: "HOA / mo",
              value: community.hoa_fee ? `$${community.hoa_fee}` : "—",
              color: "#a1a1a1",
            },
            {
              label: "Sold",
              value: lotStats.sold.toString(),
              color: "#555",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{ backgroundColor: "#0a0a0a", padding: "14px 20px" }}
            >
              <div
                style={{ fontSize: 18, fontWeight: 700, color: s.color }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#555",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginTop: 2,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Main 2-column Grid ───────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            padding: 24,
          }}
        >
          {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Lot Status Donut Chart */}
            <SectionCard title="Lot Status">
              <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <DonutChart data={LOT_STATUS_DATA} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {LOT_STATUS_DATA.filter((d) => d.value > 0).map((d) => (
                    <div
                      key={d.label}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: d.color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 12, color: "#a1a1a1" }}>
                        {d.label}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#ededed",
                          marginLeft: "auto",
                          paddingLeft: 16,
                        }}
                      >
                        {d.value}
                      </span>
                    </div>
                  ))}
                  {LOT_STATUS_DATA.every((d) => d.value === 0) && (
                    <span style={{ fontSize: 12, color: "#555" }}>No lot data.</span>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Floor Plan Popularity Chart */}
            <SectionCard title="Plan Popularity">
              <PopularityBars plans={plans} />
            </SectionCard>

            {/* Price Range Chart */}
            <SectionCard title="Price Range by Plan">
              <PriceBars plans={plans} />
            </SectionCard>

          </div>

          {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Floor Plans Table */}
            <SectionCard title={`Floor Plans (${plans.length})`}>
              {plans.length === 0 ? (
                <div style={{ fontSize: 12, color: "#555" }}>
                  No floor plans available.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 12,
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={th}>Plan</th>
                        <th style={th}>Beds</th>
                        <th style={th}>Baths</th>
                        <th style={th}>SqFt</th>
                        <th style={th}>Net Price</th>
                        <th style={th}>Style</th>
                        <th style={th}>Tour</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plans.map((p) => (
                        <tr
                          key={p.id}
                          style={{ transition: "background 0.15s" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#161616")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = "transparent")
                          }
                        >
                          <td style={{ ...td, color: "#ededed", fontWeight: 500 }}>
                            {p.page_url ? (
                              <a
                                href={`https://schellbrothers.com${p.page_url}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "#ededed", textDecoration: "none" }}
                              >
                                {p.plan_name}
                              </a>
                            ) : (
                              p.plan_name
                            )}
                          </td>
                          <td style={td}>{bedRange(p)}</td>
                          <td style={td}>{bathRange(p)}</td>
                          <td style={td}>{sqftRange(p)}</td>
                          <td style={{ ...td, color: "#00c853" }}>
                            {p.net_price
                              ? `$${p.net_price.toLocaleString()}`
                              : "—"}
                          </td>
                          <td style={td}>
                            {p.style_filters && p.style_filters.length > 0 ? (
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {p.style_filters.map((s) => (
                                  <span
                                    key={s}
                                    style={{
                                      fontSize: 10,
                                      padding: "1px 5px",
                                      borderRadius: 3,
                                      backgroundColor: "#1a1a1a",
                                      border: "1px solid #2a2a2a",
                                      color: "#666",
                                    }}
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: "#444" }}>—</span>
                            )}
                          </td>
                          <td style={td}>
                            {p.virtual_tour_url ? (
                              <a
                                href={p.virtual_tour_url}
                                target="_blank"
                                rel="noreferrer"
                                title="Virtual Tour"
                                style={{ color: "#0070f3", fontSize: 14 }}
                              >
                                ▶
                              </a>
                            ) : (
                              <span style={{ color: "#333" }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            {/* Model Homes + Spec Homes */}
            {(modelHomes.length > 0 || specHomes.length > 0) && (
              <SectionCard title="Model & Spec Homes">
                {modelHomes.length > 0 && (
                  <div style={{ marginBottom: specHomes.length > 0 ? 16 : 0 }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#444",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 8,
                      }}
                    >
                      Model Homes
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {modelHomes.map((m) => (
                        <div
                          key={m.home_id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            borderRadius: 4,
                            backgroundColor: "#0f0f0f",
                            border: "1px solid #1a1a1a",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                backgroundColor: "#a855f7",
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ fontSize: 12, color: "#ededed" }}>
                              {m.name}
                            </span>
                          </div>
                          <a
                            href={`https://schellbrothers.com${m.url}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 11, color: "#555", textDecoration: "none" }}
                          >
                            ↗
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {specHomes.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#444",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 8,
                      }}
                    >
                      Spec Homes
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {specHomes.map((s) => (
                        <div
                          key={s.home_id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            borderRadius: 4,
                            backgroundColor: "#0f0f0f",
                            border: "1px solid #1a1a1a",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                backgroundColor: "#0070f3",
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ fontSize: 12, color: "#ededed" }}>
                              {s.name}
                            </span>
                            {s.lot_block_number && (
                              <span style={{ fontSize: 11, color: "#555" }}>
                                · Lot {s.lot_block_number}
                              </span>
                            )}
                          </div>
                          <a
                            href={`https://schellbrothers.com${s.url}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 11, color: "#555", textDecoration: "none" }}
                          >
                            ↗
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Community Info */}
            <SectionCard title="Community Info">
              {/* Amenities */}
              {amenityList.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#444",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 8,
                    }}
                  >
                    Amenities
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {amenityList.map((a) => (
                      <span
                        key={a}
                        style={{
                          fontSize: 11,
                          padding: "3px 8px",
                          borderRadius: 12,
                          backgroundColor: "#161616",
                          border: "1px solid #2a2a2a",
                          color: "#a1a1a1",
                        }}
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Schools */}
              {(community.school_district ||
                community.school_elementary ||
                community.school_middle ||
                community.school_high) && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#444",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 8,
                    }}
                  >
                    Schools
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {community.school_district && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 10, color: "#555", width: 64, flexShrink: 0 }}>
                          District
                        </span>
                        <span style={{ fontSize: 12, color: "#a1a1a1" }}>
                          {community.school_district}
                        </span>
                      </div>
                    )}
                    {community.school_elementary && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 10, color: "#555", width: 64, flexShrink: 0 }}>
                          Elementary
                        </span>
                        <span style={{ fontSize: 12, color: "#a1a1a1" }}>
                          {community.school_elementary}
                        </span>
                      </div>
                    )}
                    {community.school_middle && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 10, color: "#555", width: 64, flexShrink: 0 }}>
                          Middle
                        </span>
                        <span style={{ fontSize: 12, color: "#a1a1a1" }}>
                          {community.school_middle}
                        </span>
                      </div>
                    )}
                    {community.school_high && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 10, color: "#555", width: 64, flexShrink: 0 }}>
                          High
                        </span>
                        <span style={{ fontSize: 12, color: "#a1a1a1" }}>
                          {community.school_high}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contact */}
              {(community.sales_phone || community.sales_center_address) && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#444",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 8,
                    }}
                  >
                    Sales Contact
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {community.sales_phone && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 10, color: "#555", width: 64, flexShrink: 0 }}>
                          Phone
                        </span>
                        <a
                          href={`tel:${community.sales_phone}`}
                          style={{ fontSize: 12, color: "#a1a1a1", textDecoration: "none" }}
                        >
                          {community.sales_phone}
                        </a>
                      </div>
                    )}
                    {community.sales_center_address && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 10, color: "#555", width: 64, flexShrink: 0 }}>
                          Address
                        </span>
                        <span style={{ fontSize: 12, color: "#a1a1a1" }}>
                          {community.sales_center_address}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* HOA */}
              {community.hoa_fee && (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#444",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 8,
                    }}
                  >
                    HOA
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "#555", width: 64, flexShrink: 0 }}>
                      Fee
                    </span>
                    <span style={{ fontSize: 12, color: "#a1a1a1" }}>
                      ${community.hoa_fee.toLocaleString()}
                      {community.hoa_period ? ` / ${community.hoa_period}` : " / mo"}
                    </span>
                  </div>
                </div>
              )}

              {/* Division */}
              {community.division_name && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #1a1a1a" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "#555", width: 64, flexShrink: 0 }}>
                      Division
                    </span>
                    <span style={{ fontSize: 12, color: "#a1a1a1" }}>
                      {community.division_name}
                    </span>
                  </div>
                </div>
              )}
            </SectionCard>

          </div>
        </div>
      </main>
    </div>
  );
}
