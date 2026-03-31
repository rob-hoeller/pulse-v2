"use client";

import { useRouter } from "next/navigation";
import CommunityCard from "@/components/CommunityCard";
import PlanCard from "@/components/PlanCard";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Division {
  id: string;
  slug: string;
  name: string;
  region: string;
  timezone: string;
  state_codes: string[];
  is_active: boolean;
}

export interface Community {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  division_id: string;
  price_from: number | null;
  featured_image_url: string | null;
  model_homes: string | null;
  amenities: string | null;
  status: string | null;
  page_url: string | null;
  hoa_fee: number | null;
  hoa_period: string | null;
  school_district: string | null;
  short_description: string | null;
  total_homesites: number | null;
  has_model: boolean;
}

export interface CommunityPlan {
  id: string;
  community_id: string;
  plan_name: string;
  beds: number | null;
  baths: number | null;
  sqft_min: number | null;
  sqft_max: number | null;
  base_price: number | null;
  incentive_amount: number | null;
  net_price: number | null;
  featured_image_url: string | null;
  page_url: string | null;
}

export interface LotRow {
  id: string | number;
  community_id: string | null;
  lot_number: string | null;
  lot_status: string | null;
  construction_status: string | null;
  is_available: boolean | null;
  lot_premium: number | null;
  address: string | null;
}

export interface ModelHome {
  id: string;
  community_id: string | null;
  community_name: string | null;
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  model_name: string | null;
  model_marketing_name: string | null;
  image_url: string | null;
  virtual_tour_url: string | null;
  page_url: string | null;
  open_hours: string | null;
  leaseback: boolean | null;
}

export interface SpecHome {
  id: string;
  community_id: string | null;
  community_name: string | null;
  plan_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  list_price: number | null;
  image_url: string | null;
  page_url: string | null;
}

export interface DivisionPlan {
  id: string;
  division_id: string;
  marketing_name: string;
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────

function formatPrice(n: number): string {
  return "$" + n.toLocaleString("en-US");
}

function ComingSoonBadge() {
  return (
    <span
      style={{
        display: "inline-block",
        background: "#1a1a1a",
        color: "#555",
        border: "1px solid #2a2a2a",
        borderRadius: 20,
        fontSize: 9,
        fontWeight: 600,
        padding: "1px 7px",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        marginLeft: 6,
        verticalAlign: "middle",
        whiteSpace: "nowrap",
      }}
    >
      Coming Soon
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  accent: string;
  comingSoon?: boolean;
}

function StatCard({ label, value, accent, comingSoon }: StatCardProps) {
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #1f1f1f",
        borderLeft: `3px solid ${accent}`,
        borderRadius: 8,
        padding: "12px 14px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 28,
          fontWeight: 700,
          color: "#ededed",
          lineHeight: 1.1,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {value}
        {comingSoon && <ComingSoonBadge />}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#666",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginTop: 4,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 16,
          fontWeight: 600,
          color: "#ededed",
          margin: 0,
        }}
      >
        {title}
      </h2>
      {count !== undefined && (
        <span
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: 20,
            color: "#666",
            fontSize: 11,
            fontWeight: 600,
            padding: "1px 9px",
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Funnel Placeholder ───────────────────────────────────────────────────────

function FunnelPlaceholder() {
  const stages = [
    "Subscribed → Lead",
    "Lead → Prospect",
    "Prospect → Contract",
    "Contract → Close",
    "Overall",
  ];
  return (
    <div>
      <SectionHeader title="Funnel Metrics" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {stages.map((stage) => (
          <div
            key={stage}
            style={{
              background: "#111",
              border: "1px solid #1f1f1f",
              borderRadius: 8,
              padding: "12px 14px",
              position: "relative",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                fontWeight: 700,
                color: "#ededed",
              }}
            >
              —
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#555",
                marginTop: 4,
                lineHeight: 1.3,
              }}
            >
              {stage}
            </div>
            <div
              style={{
                marginTop: 6,
                display: "inline-block",
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: 12,
                fontSize: 9,
                color: "#444",
                fontWeight: 600,
                padding: "2px 7px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              • Coming Soon
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "#444",
          padding: "10px 14px",
          background: "#0d0d0d",
          borderRadius: 6,
          border: "1px solid #1a1a1a",
        }}
      >
        Funnel data coming soon — connect lead system
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORP VIEW
// ═══════════════════════════════════════════════════════════════════════════════

interface CorpViewProps {
  divisions: Division[];
  communities: Community[];
  lots: LotRow[];
  modelHomes: ModelHome[];
  specHomes: SpecHome[];
}

function CorpView({ divisions, communities, lots, modelHomes, specHomes }: CorpViewProps) {
  const router = useRouter();

  const availableLots = lots.filter((l) => l.is_available);
  const totalLots = lots.length;

  // Count plans per division using communities join
  const commByDiv: Record<string, Community[]> = {};
  for (const c of communities) {
    if (!commByDiv[c.division_id]) commByDiv[c.division_id] = [];
    commByDiv[c.division_id].push(c);
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#0d0d0d" }}>
      {/* Top bar */}
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
        <h1 style={{ fontFamily: "var(--font-display)", color: "#ededed", fontSize: 15, fontWeight: 600, margin: 0 }}>
          HBx Intelligence Platform
        </h1>
        <span style={{ color: "#555", fontSize: 12 }}>{dateStr}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {/* Summary stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: 10,
            marginBottom: 28,
          }}
        >
          <StatCard label="Divisions" value={divisions.length} accent="#223347" />
          <StatCard label="Communities" value={communities.length} accent="#223347" />
          <StatCard label="Plans" value="102" accent="#223347" />
          <StatCard label="Total Lots" value={totalLots || "—"} accent="#00c853" comingSoon={totalLots === 0} />
          <StatCard label="Available Lots" value={availableLots.length || "—"} accent="#00c853" comingSoon={availableLots.length === 0} />
          <StatCard label="Model Homes" value={modelHomes.length} accent="#5b80a0" />
          <StatCard label="Quick Delivery" value={specHomes.length} accent="#8a7a5a" />
          <StatCard label="Leads" value="—" accent="#a855f7" comingSoon />
          <StatCard label="Prospects" value="—" accent="#f59e0b" comingSoon />
          <StatCard label="Contracts" value="—" accent="#f59e0b" comingSoon />
        </div>

        {/* Division cards */}
        <SectionHeader title="Divisions" count={divisions.length} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
            marginBottom: 32,
          }}
        >
          {divisions.map((div) => {
            const divComms = commByDiv[div.id] ?? [];
            const divLots = lots.filter((l) => {
              const comm = communities.find((c) => c.id === l.community_id);
              return comm?.division_id === div.id;
            });
            const divAvailLots = divLots.filter((l) => l.is_available);
            const divModelHomes = modelHomes.filter((m) => {
              const comm = communities.find((c) => c.name === m.community_name);
              return comm?.division_id === div.id;
            });
            const divSpecHomes = specHomes.filter((s) => {
              const comm = communities.find((c) => c.name === s.community_name);
              return comm?.division_id === div.id;
            });

            return (
              <div
                key={div.id}
                onClick={() => router.push(`/?div=${div.id}`)}
                style={{
                  background: "#111",
                  border: "1px solid #1f1f1f",
                  borderLeft: "3px solid #223347",
                  borderRadius: 10,
                  padding: "14px 16px",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#334";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#1f1f1f";
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#ededed",
                    marginBottom: 4,
                  }}
                >
                  {div.name}
                </div>
                <div style={{ color: "#555", fontSize: 11, marginBottom: 12 }}>
                  {div.region} · {div.state_codes?.join(", ")}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  {[
                    { label: "Communities", value: divComms.length, accent: "#223347" },
                    { label: "Model Homes", value: divModelHomes.length, accent: "#5b80a0" },
                    { label: "Available Lots", value: divAvailLots.length || "—", accent: "#00c853" },
                    { label: "Quick Delivery", value: divSpecHomes.length, accent: "#8a7a5a" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        background: "#161616",
                        borderRadius: 6,
                        padding: "8px 10px",
                        border: "1px solid #1f1f1f",
                        borderLeft: `2px solid ${s.accent}`,
                      }}
                    >
                      <div style={{ color: "#555", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3, fontWeight: 600 }}>
                        {s.label}
                      </div>
                      <div style={{ color: "#ededed", fontSize: 15, fontWeight: 700 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: "#555" }}>Leads: —</span>
                  <ComingSoonBadge />
                  <span style={{ fontSize: 10, color: "#555", marginLeft: 4 }}>Prospects: —</span>
                  <ComingSoonBadge />
                </div>
              </div>
            );
          })}
        </div>

        {/* Funnel placeholder */}
        <FunnelPlaceholder />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIVISION VIEW
// ═══════════════════════════════════════════════════════════════════════════════

interface DivisionViewProps {
  communities: Community[];
  divisionPlans: DivisionPlan[];
  lots: LotRow[];
  divisions: Division[];
  selectedDivisionId: string;
}

function DivisionView({ communities, divisionPlans, lots, divisions, selectedDivisionId }: DivisionViewProps) {
  const router = useRouter();

  const division = divisions.find((d) => d.id === selectedDivisionId);
  const availableLots = lots.filter((l) => l.is_available && communities.some((c) => c.id === l.community_id));
  const underConstruction = lots.filter(
    (l) => l.construction_status === "Under Construction" && communities.some((c) => c.id === l.community_id)
  );

  // Count model homes / spec per community (from community.has_model)
  const modelHomeComms = communities.filter((c) => c.has_model);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#0d0d0d" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 24px",
          height: 44,
          borderBottom: "1px solid #1f1f1f",
          background: "#0d0d0d",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{
            background: "none",
            border: "none",
            color: "#555",
            cursor: "pointer",
            fontSize: 13,
            padding: 0,
          }}
        >
          ← Corp
        </button>
        <span style={{ color: "#333" }}>·</span>
        <h1 style={{ fontFamily: "var(--font-display)", color: "#ededed", fontSize: 15, fontWeight: 600, margin: 0 }}>
          {division?.name ?? "Division"}
        </h1>
        <span style={{ color: "#555", fontSize: 12 }}>
          {communities.length} Communities · {divisionPlans.length} Plans
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {/* Summary stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: 10,
            marginBottom: 28,
          }}
        >
          <StatCard label="Communities" value={communities.length} accent="#223347" />
          <StatCard label="Plans" value={divisionPlans.length} accent="#223347" />
          <StatCard label="Available Lots" value={availableLots.length} accent="#00c853" />
          <StatCard label="Under Construction" value={underConstruction.length} accent="#5b80a0" />
          <StatCard label="Model Homes" value={modelHomeComms.length} accent="#5b80a0" />
          <StatCard label="Leads" value="—" accent="#a855f7" comingSoon />
          <StatCard label="Prospects" value="—" accent="#f59e0b" comingSoon />
        </div>

        {/* Community cards */}
        <SectionHeader title="Communities" count={communities.length} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
            marginBottom: 32,
          }}
        >
          {communities.map((comm) => {
            const commPlans = divisionPlans.filter((p) => p.division_id === comm.division_id);
            const hasModel = comm.has_model;
            return (
              <CommunityCard
                key={comm.id}
                name={comm.name}
                city={comm.city}
                state={comm.state}
                priceFrom={comm.price_from}
                imageUrl={comm.featured_image_url}
                modelHomeName={hasModel ? "Model Home" : null}
                status={comm.status}
                amenities={comm.amenities ? JSON.parse(comm.amenities) : null}
                onClick={() => router.push(`/?comm=${comm.id}`)}
              />
            );
          })}
        </div>

        {/* Funnel */}
        <FunnelPlaceholder />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMUNITY VIEW
// ═══════════════════════════════════════════════════════════════════════════════

interface CommunityViewProps {
  community: Community & Record<string, unknown>;
  plans: CommunityPlan[];
  lots: LotRow[];
  modelHome: ModelHome | null;
  specHomes: SpecHome[];
  divisions: { id: string; name: string; slug: string }[];
}

function CommunityView({ community, plans, lots, modelHome, specHomes, divisions }: CommunityViewProps) {
  const router = useRouter();

  const division = divisions.find((d) => d.id === community.division_id);
  const availableLots = lots.filter((l) => l.lot_status === "Available");
  const underConstruction = lots.filter((l) => l.construction_status === "Under Construction");

  const lotStatusColor = (status: string | null) => {
    if (status === "Available") return "#00c853";
    if (status === "Sold") return "#ef4444";
    if (status === "Reserved") return "#f59e0b";
    return "#555";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#0d0d0d" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 24px",
          height: 44,
          borderBottom: "1px solid #1f1f1f",
          background: "#0d0d0d",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 13, padding: 0 }}
        >
          ← Corp
        </button>
        {division && (
          <>
            <span style={{ color: "#333" }}>·</span>
            <button
              onClick={() => router.push(`/?div=${division.id}`)}
              style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 13, padding: 0 }}
            >
              {division.name}
            </button>
          </>
        )}
        <span style={{ color: "#333" }}>·</span>
        <h1 style={{ fontFamily: "var(--font-display)", color: "#ededed", fontSize: 15, fontWeight: 600, margin: 0 }}>
          {community.name}
        </h1>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Hero image */}
        {community.featured_image_url && (
          <div style={{ width: "100%", height: 200, overflow: "hidden", flexShrink: 0, position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={community.featured_image_url as string}
              alt={community.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
                padding: "20px 24px 14px",
              }}
            >
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "#fff" }}>
                {community.name}
              </div>
              <div style={{ fontSize: 12, color: "#ccc", marginTop: 2 }}>
                {[community.city, community.state].filter(Boolean).join(", ")}
                {division ? ` · ${division.name}` : ""}
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: 24 }}>
          {/* Community meta strip */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              fontSize: 12,
              color: "#666",
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: "1px solid #1a1a1a",
            }}
          >
            {community.price_from && (
              <span>
                <span style={{ color: "#8a7a5a", fontWeight: 600 }}>
                  Priced from {formatPrice(community.price_from as number)}
                </span>
              </span>
            )}
            {community.total_homesites && <span>{community.total_homesites} homesites</span>}
            {community.hoa_fee && (
              <span>
                ${community.hoa_fee}/mo HOA
              </span>
            )}
            {community.school_district && <span>School: {community.school_district}</span>}
            {community.page_url && (
              <a
                href={community.page_url as string}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#818cf8", textDecoration: "none" }}
              >
                View on schellbrothers.com ↗
              </a>
            )}
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 10,
              marginBottom: 28,
            }}
          >
            <StatCard label="Available Plans" value={plans.length} accent="#223347" />
            <StatCard label="Available Lots" value={availableLots.length} accent="#00c853" />
            <StatCard label="Under Construction" value={underConstruction.length} accent="#5b80a0" />
            <StatCard label="Quick Delivery" value={specHomes.length} accent="#8a7a5a" />
            <StatCard label="Leads" value="—" accent="#a855f7" comingSoon />
            <StatCard label="Prospects" value="—" accent="#f59e0b" comingSoon />
          </div>

          {/* 3-column content grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 400px",
              gap: 24,
              alignItems: "start",
            }}
          >
            {/* Left column: Plans + Lots */}
            <div>
              {/* Plans */}
              <SectionHeader title="Plans Available" count={plans.length} />
              {plans.length === 0 ? (
                <div style={{ color: "#555", fontSize: 13, marginBottom: 24 }}>No plans found.</div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: 12,
                    marginBottom: 28,
                  }}
                >
                  {plans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      planName={plan.plan_name}
                      beds={plan.beds}
                      baths={plan.baths}
                      sqft={plan.sqft_min}
                      netPrice={plan.net_price}
                      basePrice={plan.base_price}
                      incentiveAmount={plan.incentive_amount}
                      imageUrl={plan.featured_image_url}
                      pageUrl={plan.page_url ?? undefined}
                    />
                  ))}
                </div>
              )}

              {/* Lots */}
              <SectionHeader title="Available Lots" count={availableLots.length} />
              {availableLots.length === 0 ? (
                <div style={{ color: "#555", fontSize: 13 }}>No available lots.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {availableLots.slice(0, 30).map((lot) => (
                    <div
                      key={lot.id}
                      style={{
                        background: "#111",
                        border: "1px solid #1f1f1f",
                        borderRadius: 6,
                        padding: "8px 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: "#ededed", fontSize: 12, fontWeight: 600 }}>
                          Lot {lot.lot_number ?? "—"}
                        </span>
                        {lot.address && (
                          <span style={{ color: "#555", fontSize: 11 }}>{lot.address}</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {lot.lot_premium ? (
                          <span style={{ color: "#8a7a5a", fontSize: 11 }}>
                            +{formatPrice(lot.lot_premium)} premium
                          </span>
                        ) : null}
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: lotStatusColor(lot.lot_status),
                            background: "#1a1a1a",
                            border: `1px solid ${lotStatusColor(lot.lot_status)}33`,
                            borderRadius: 4,
                            padding: "1px 6px",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {lot.lot_status ?? "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {availableLots.length > 30 && (
                    <div style={{ color: "#555", fontSize: 12, textAlign: "center", padding: 8 }}>
                      + {availableLots.length - 30} more lots
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right column: Model Home + QD + Funnel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Model Home */}
              {modelHome && (
                <div
                  style={{
                    background: "#111",
                    border: "1px solid #1a2a3f",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  {modelHome.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={modelHome.image_url}
                      alt={modelHome.model_name ?? "Model Home"}
                      style={{ width: "100%", height: 160, objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: 100,
                        background: "#161820",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#333",
                        fontSize: 11,
                      }}
                    >
                      No Image
                    </div>
                  )}
                  <div style={{ padding: "12px 14px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          background: "#161820",
                          color: "#5b80a0",
                          border: "1px solid #1a2a3f",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          padding: "2px 7px",
                        }}
                      >
                        Model Home
                      </span>
                      {modelHome.leaseback && (
                        <span
                          style={{
                            background: "#1f1a0f",
                            color: "#8a7a5a",
                            border: "1px solid #3f3a1f",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            padding: "2px 7px",
                          }}
                        >
                          Leaseback
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#ededed",
                        marginBottom: 4,
                      }}
                    >
                      {modelHome.model_marketing_name ?? modelHome.model_name ?? modelHome.name ?? "Model"}
                    </div>
                    {modelHome.address && (
                      <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>{modelHome.address}</div>
                    )}
                    {modelHome.open_hours && (
                      <div style={{ fontSize: 11, color: "#666" }}>{modelHome.open_hours}</div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      {modelHome.virtual_tour_url && (
                        <a
                          href={modelHome.virtual_tour_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 11,
                            color: "#818cf8",
                            textDecoration: "none",
                            background: "#12121f",
                            border: "1px solid #2a2a4a",
                            borderRadius: 5,
                            padding: "4px 8px",
                          }}
                        >
                          Virtual Tour →
                        </a>
                      )}
                      {modelHome.page_url && (
                        <a
                          href={modelHome.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 11,
                            color: "#5b80a0",
                            textDecoration: "none",
                            background: "#111820",
                            border: "1px solid #1a2a3f",
                            borderRadius: 5,
                            padding: "4px 8px",
                          }}
                        >
                          schellbrothers.com ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Delivery */}
              {specHomes.length > 0 && (
                <div>
                  <SectionHeader title="Quick Delivery" count={specHomes.length} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {specHomes.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          background: "#111",
                          border: "1px solid #1f1f1f",
                          borderLeft: "2px solid #8a7a5a",
                          borderRadius: 8,
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#ededed",
                            marginBottom: 3,
                          }}
                        >
                          {s.plan_name ?? "Quick Delivery"}
                        </div>
                        {s.address && (
                          <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>{s.address}</div>
                        )}
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, color: "#666" }}>
                          {s.beds && <span>{s.beds} bd</span>}
                          {s.baths && <span>{s.baths} ba</span>}
                          {s.sqft && <span>{s.sqft.toLocaleString()} sf</span>}
                          {s.list_price && (
                            <span style={{ color: "#8a7a5a", fontWeight: 600 }}>
                              {formatPrice(s.list_price)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mini funnel */}
              <div
                style={{
                  background: "#111",
                  border: "1px solid #1f1f1f",
                  borderRadius: 8,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#ededed",
                    marginBottom: 12,
                  }}
                >
                  Community Funnel
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {[
                    { label: "Leads", accent: "#a855f7" },
                    { label: "Prospects", accent: "#f59e0b" },
                    { label: "Contracts", accent: "#00c853" },
                  ].map((stage, i, arr) => (
                    <div key={stage.label} style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                      <div
                        style={{
                          background: "#161616",
                          borderRadius: 6,
                          padding: "8px 10px",
                          border: `1px solid ${stage.accent}33`,
                          flex: 1,
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 20,
                            fontWeight: 700,
                            color: "#ededed",
                          }}
                        >
                          —
                        </div>
                        <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{stage.label}</div>
                      </div>
                      {i < arr.length - 1 && (
                        <span style={{ color: "#333", fontSize: 14 }}>→</span>
                      )}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: "inline-block",
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: 12,
                    fontSize: 9,
                    color: "#444",
                    fontWeight: 600,
                    padding: "2px 8px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  • Coming Soon
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

type OverviewClientProps =
  | ({ view: "corp" } & CorpViewProps)
  | ({ view: "division" } & DivisionViewProps)
  | ({ view: "community" } & CommunityViewProps);

export default function OverviewClient(props: OverviewClientProps) {
  if (props.view === "corp") {
    const { view: _v, ...rest } = props;
    return <CorpView {...rest} />;
  }
  if (props.view === "division") {
    const { view: _v, ...rest } = props;
    return <DivisionView {...rest} />;
  }
  const { view: _v, ...rest } = props;
  return <CommunityView {...rest} />;
}
