"use client";

import React from "react";
import Link from "next/link";

const DIVISIONS = [
  {
    id: "boise",
    name: "Boise",
    region: "Pacific Northwest",
    timezone: "America/Boise",
    state_codes: ["ID"],
    is_active: true,
    description:
      "Idaho's Treasure Valley — fast-growing market anchored by Meridian, Eagle, and Star.",
    community_count: 6,
    active_count: 4,
    coming_soon_count: 1,
    sold_out_count: 0,
    price_range: "$719K – $895K",
  },
  {
    id: "delaware-beaches",
    name: "Delaware Beaches",
    region: "Mid-Atlantic",
    timezone: "America/New_York",
    state_codes: ["DE"],
    is_active: true,
    description:
      "Schell Brothers' home market. Coastal living from Lewes to Millsboro — the largest and most diverse division.",
    community_count: 23,
    active_count: 18,
    coming_soon_count: 2,
    sold_out_count: 1,
    price_range: "$430K – $3.95M",
  },
  {
    id: "nashville",
    name: "Nashville",
    region: "Southeast",
    timezone: "America/Chicago",
    state_codes: ["TN"],
    is_active: true,
    description:
      "Middle Tennessee — Hendersonville, Gallatin, Mt. Juliet, and Lebanon corridors.",
    community_count: 10,
    active_count: 5,
    coming_soon_count: 3,
    sold_out_count: 1,
    price_range: "$645K – $980K",
  },
  {
    id: "richmond",
    name: "Richmond",
    region: "Mid-Atlantic",
    timezone: "America/New_York",
    state_codes: ["VA"],
    is_active: true,
    description:
      "Greater Richmond — Midlothian, Moseley, Chesterfield, and Ashland.",
    community_count: 11,
    active_count: 8,
    coming_soon_count: 2,
    sold_out_count: 0,
    price_range: "$460K – $915K",
  },
];

const navItems = [
  { icon: "▤", label: "Overview",      href: "/"            },
  { icon: "⊡", label: "Agents",        href: "#"            },
  { icon: "✓", label: "Tasks",         href: "#"            },
  { icon: "⊕", label: "Leads",         href: "#"            },
  { icon: "⌂", label: "Communities",   href: "/communities" },
  { icon: "⊞", label: "Divisions",     href: "/divisions"   },
  { icon: "◷", label: "Calendar",      href: "#"            },
  { icon: "◉", label: "Notifications", href: "#"            },
  { icon: "⚙", label: "Settings",      href: "#"            },
  { icon: "◈", label: "Status",        href: "/status"      },
];

type Division = {
  id: string;
  name: string;
  region: string;
  timezone: string;
  state_codes: string[];
  is_active: boolean;
  description: string;
  community_count: number;
  active_count: number;
  coming_soon_count: number;
  sold_out_count: number;
  price_range: string;
};

function StatCell({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div style={{ fontSize: "18px", fontWeight: 600, color: "#ededed" }}>
        {value}
      </div>
      <div
        style={{
          fontSize: "10px",
          color: "#555",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginTop: "2px",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function DivisionCard({ division }: { division: Division }) {
  return (
    <a
      href={`/communities?division=${division.id}`}
      style={{ textDecoration: "none" }}
    >
      <div
        className="rounded-xl border bg-[#111111] p-6 cursor-pointer transition-colors hover:border-[#2a2a2a]"
        style={{ borderColor: "#1f1f1f" }}
      >
        {/* Top row: name + active badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
          <span style={{ fontSize: "16px", fontWeight: 600, color: "#ededed" }}>
            {division.name}
          </span>
          {division.is_active && (
            <span
              style={{
                backgroundColor: "#1a2a1a",
                color: "#00c853",
                border: "1px solid #1f3f1f",
                fontSize: "10px",
                padding: "1px 8px",
                borderRadius: "4px",
                lineHeight: "1.6",
              }}
            >
              Active
            </span>
          )}
        </div>

        {/* Region + state codes */}
        <div style={{ fontSize: "12px", color: "#666", marginBottom: "2px" }}>
          {division.region} · {division.state_codes.join(", ")}
        </div>

        {/* Timezone */}
        <div style={{ fontSize: "11px", color: "#555" }}>{division.timezone}</div>

        {/* Description */}
        <div
          style={{
            fontSize: "12px",
            color: "#a1a1a1",
            lineHeight: "1.6",
            marginTop: "12px",
          }}
        >
          {division.description}
        </div>

        {/* Divider */}
        <div
          style={{
            borderTop: "1px solid #1f1f1f",
            marginTop: "16px",
            paddingTop: "16px",
          }}
        >
          {/* Stats row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "8px",
            }}
          >
            <StatCell value={division.community_count} label="Communities" />
            <StatCell value={division.active_count} label="Active" />
            <StatCell value={division.coming_soon_count} label="Coming Soon" />
            <StatCell value={division.price_range} label="Price Range" />
          </div>
        </div>

        {/* View Communities link */}
        <div
          style={{
            fontSize: "12px",
            color: "#555",
            marginTop: "16px",
            display: "inline-block",
            transition: "color 0.15s",
          }}
          className="hover:text-[#ededed]"
        >
          View Communities →
        </div>
      </div>
    </a>
  );
}

export default function DivisionsPage() {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        backgroundColor: "#0a0a0a",
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: "220px",
          flexShrink: 0,
          backgroundColor: "#0a0a0a",
          borderRight: "1px solid #1f1f1f",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        {/* Brand header */}
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #1f1f1f" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🦞</span>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#ededed" }}>
                Pulse v2
              </div>
              <div style={{ fontSize: "10px", color: "#555" }}>HBx AI Factory</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {navItems.map((item) => {
            const isActive = item.href === "/divisions";
            return (
              <Link
                key={item.label}
                href={item.href}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "7px 16px",
                    margin: "1px 6px",
                    borderRadius: "6px",
                    backgroundColor: isActive ? "#1a1a1a" : "transparent",
                    color: isActive ? "#ededed" : "#666",
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "background-color 0.15s, color 0.15s",
                  }}
                >
                  <span style={{ fontSize: "14px", width: "16px", textAlign: "center" }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #1f1f1f",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                backgroundColor: "#1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
              }}
            >
              🦞
            </div>
            {/* Green pulse dot */}
            <div
              style={{
                position: "absolute",
                bottom: "0",
                right: "0",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#00c853",
                border: "1.5px solid #0a0a0a",
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#ededed" }}>
              Schellie
            </div>
            <div style={{ fontSize: "10px", color: "#555" }}>Orchestrator · Online</div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: "auto" }}>
        {/* Top bar */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            backgroundColor: "rgba(10,10,10,0.8)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid #1f1f1f",
            padding: "10px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h1 style={{ fontSize: "14px", fontWeight: 600, color: "#ededed", margin: 0 }}>
            Divisions
          </h1>
        </div>

        {/* Page body */}
        <div style={{ padding: "24px" }}>
          {/* Section 1 — Division Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "16px",
              marginBottom: "32px",
            }}
          >
            {DIVISIONS.map((division) => (
              <DivisionCard key={division.id} division={division} />
            ))}
          </div>

          {/* Section 2 — Summary Table */}
          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#ededed",
                marginBottom: "12px",
              }}
            >
              Division Comparison
            </div>

            <div
              style={{
                overflowX: "auto",
                borderRadius: "8px",
                border: "1px solid #1f1f1f",
              }}
            >
              <table
                style={{
                  minWidth: "900px",
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Division",
                      "Region",
                      "States",
                      "Timezone",
                      "Total",
                      "Active",
                      "Coming Soon",
                      "Price Range",
                    ].map((col) => (
                      <th
                        key={col}
                        style={{
                          backgroundColor: "#0d0d0d",
                          color: "#555",
                          fontSize: "11px",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          padding: "10px 16px",
                          borderBottom: "1px solid #1f1f1f",
                          textAlign: "left",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DIVISIONS.map((division, idx) => (
                    <tr
                      key={division.id}
                      style={{
                        borderBottom:
                          idx < DIVISIONS.length - 1
                            ? "1px solid #1a1a1a"
                            : "none",
                      }}
                      className="hover:bg-[#111111]"
                    >
                      <td
                        style={{
                          padding: "10px 16px",
                          fontSize: "13px",
                          color: "#ededed",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {division.name}
                      </td>
                      <td
                        style={{
                          padding: "10px 16px",
                          fontSize: "13px",
                          color: "#a1a1a1",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {division.region}
                      </td>
                      <td
                        style={{
                          padding: "10px 16px",
                          fontSize: "13px",
                          color: "#a1a1a1",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {division.state_codes.join(", ")}
                      </td>
                      <td
                        style={{
                          padding: "10px 16px",
                          fontSize: "13px",
                          color: "#a1a1a1",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {division.timezone}
                      </td>
                      <td
                        style={{
                          padding: "10px 16px",
                          fontSize: "13px",
                          color: "#a1a1a1",
                          textAlign: "center",
                        }}
                      >
                        {division.community_count}
                      </td>
                      <td
                        style={{
                          padding: "10px 16px",
                          fontSize: "13px",
                          color: "#a1a1a1",
                          textAlign: "center",
                        }}
                      >
                        {division.active_count}
                      </td>
                      <td
                        style={{
                          padding: "10px 16px",
                          fontSize: "13px",
                          color: "#a1a1a1",
                          textAlign: "center",
                        }}
                      >
                        {division.coming_soon_count}
                      </td>
                      <td
                        style={{
                          padding: "10px 16px",
                          fontSize: "13px",
                          color: "#a1a1a1",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {division.price_range}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
