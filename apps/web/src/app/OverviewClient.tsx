"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CommunityCard from "@/components/CommunityCard";
import PlanCard from "@/components/PlanCard";
import SlideOver from "@/components/SlideOver";

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
  amenities_structured?: unknown[] | null;
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
  phase?: string | null;
  is_buildable?: boolean | null;
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
                amenities={comm.amenities ? comm.amenities.split(";").map((a: string) => a.trim()).filter(Boolean) : null}
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

// ─── Coming Soon Banner ───────────────────────────────────────────────────────
function ComingSoonBanner({ source }: { source: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 4,
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        fontSize: 10,
        color: "#555",
      }}
    >
      <span>•</span> {source} • Coming Soon
    </div>
  );
}

// ─── Placeholder Stat Value ───────────────────────────────────────────────────
function PlaceholderValue() {
  return (
    <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "#333" }}>—</span>
  );
}

// ─── Placeholder Stat Card ────────────────────────────────────────────────────
function PlaceholderStatCard({ label, accent = "#223347" }: { label: string; accent?: string }) {
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
      <PlaceholderValue />
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

// ─── Dummy messages for comm hub ──────────────────────────────────────────────
interface DummyMessage {
  id: number;
  direction: "IN" | "OUT";
  contact: string;
  csm: string;
  status: "NEW" | "SENT" | "COMPLETED";
  subject: string;
  preview: string;
  timeAgo: string;
  community: string;
  body: string;
}

const DUMMY_MESSAGES: Record<string, DummyMessage[]> = {
  Email: [
    {
      id: 1,
      direction: "IN",
      contact: "John Smith",
      csm: "Sarah Jones",
      status: "NEW",
      subject: "Follow up on Jameson floor plan",
      preview: "I wanted to follow up on the Jameson floor plan we discussed during my visit last week...",
      timeAgo: "2h ago",
      community: "Cardinal Grove",
      body: "Hi Sarah,\n\nI wanted to follow up on the Jameson floor plan we discussed during my visit last week. My wife and I are really interested and would love to schedule another appointment to go through the options.\n\nBest,\nJohn",
    },
    {
      id: 2,
      direction: "OUT",
      contact: "Mary Johnson",
      csm: "Mike Davis",
      status: "SENT",
      subject: "Thank you for your visit!",
      preview: "Thank you for visiting! We have some exciting new availability you should know about...",
      timeAgo: "Yesterday",
      community: "Cardinal Grove",
      body: "Hi Mary,\n\nThank you for visiting our community! We have some exciting new availability that just opened up. I'd love to connect and share more details about what might be the perfect fit for you.\n\nBest,\nMike",
    },
    {
      id: 3,
      direction: "IN",
      contact: "Robert Chen",
      csm: "Sarah Jones",
      status: "COMPLETED",
      subject: "Contract signing appointment",
      preview: "We are ready to move forward and would like to schedule our contract signing appointment...",
      timeAgo: "3d ago",
      community: "Cardinal Grove",
      body: "Hi Sarah,\n\nWe are ready to move forward and would like to schedule our contract signing appointment. Please let us know your availability this week.\n\nThank you,\nRobert",
    },
  ],
  SMS: [
    {
      id: 4,
      direction: "IN",
      contact: "Lisa Park",
      csm: "Sarah Jones",
      status: "NEW",
      subject: "SMS",
      preview: "Hey! Are there any lots left in Section 3? We are very interested...",
      timeAgo: "1h ago",
      community: "Cardinal Grove",
      body: "Hey! Are there any lots left in Section 3? We are very interested and want to move quickly if something is available.",
    },
    {
      id: 5,
      direction: "OUT",
      contact: "Tom Martinez",
      csm: "Mike Davis",
      status: "SENT",
      subject: "SMS",
      preview: "Hi Tom, just wanted to remind you about your appointment tomorrow at 2pm...",
      timeAgo: "4h ago",
      community: "Cardinal Grove",
      body: "Hi Tom, just wanted to remind you about your appointment tomorrow at 2pm. Looking forward to seeing you!",
    },
    {
      id: 6,
      direction: "IN",
      contact: "Karen White",
      csm: "Sarah Jones",
      status: "COMPLETED",
      subject: "SMS",
      preview: "Thank you so much! We are so excited about our new home...",
      timeAgo: "2d ago",
      community: "Cardinal Grove",
      body: "Thank you so much! We are so excited about our new home. You have been amazing throughout this whole process!",
    },
  ],
  Calls: [
    {
      id: 7,
      direction: "IN",
      contact: "David Lee",
      csm: "Sarah Jones",
      status: "NEW",
      subject: "Inbound call — pricing inquiry",
      preview: "Called asking about pricing for the Madison plan and lot premiums in Phase 2...",
      timeAgo: "30m ago",
      community: "Cardinal Grove",
      body: "Called asking about pricing for the Madison plan and lot premiums in Phase 2. Interested in 3-4 bedroom options. Mentioned budget around $550k. Requested callback from CSM.",
    },
    {
      id: 8,
      direction: "OUT",
      contact: "Jennifer Adams",
      csm: "Mike Davis",
      status: "SENT",
      subject: "Outbound follow-up call",
      preview: "Follow-up call after community visit. Left voicemail regarding new incentives...",
      timeAgo: "Yesterday",
      community: "Cardinal Grove",
      body: "Follow-up call after community visit last Saturday. Left voicemail regarding new incentives available through end of quarter. Requested callback.",
    },
    {
      id: 9,
      direction: "IN",
      contact: "Mark Thompson",
      csm: "Sarah Jones",
      status: "COMPLETED",
      subject: "Post-contract questions",
      preview: "Had questions about design center appointment and construction timeline...",
      timeAgo: "4d ago",
      community: "Cardinal Grove",
      body: "Had questions about design center appointment and construction timeline. All questions addressed. Scheduled design center appointment for next Tuesday at 10am.",
    },
  ],
};

function CommunityView({ community, plans, lots, modelHome, specHomes, divisions }: CommunityViewProps) {
  const router = useRouter();
  const [commHubOpen, setCommHubOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"Email" | "SMS" | "Calls">("Email");
  const [selectedMessage, setSelectedMessage] = useState<DummyMessage | null>(null);

  const division = divisions.find((d) => d.id === community.division_id);

  // ─── Lot Counts ───────────────────────────────────────────────────────────
  const availableLots = lots.filter((l) => l.lot_status === "Available" || l.lot_status === "Available Homesite");
  const buildableLots = lots.filter((l) => l.is_buildable === true && (l.lot_status === "Available" || l.lot_status === "Available Homesite"));
  const futureLots = lots.filter((l) => l.lot_status === "Future");
  const soldLots = lots.filter((l) => l.lot_status === "Sold" || l.lot_status === "Closed");
  const underConstruction = lots.filter((l) => l.construction_status === "Under Construction");
  const qdLots = lots.filter((l) => l.lot_status === "Quick Delivery");

  // ─── Phase Breakdown ──────────────────────────────────────────────────────
  interface PhaseData {
    total: number;
    available: number;
    sold: number;
    underConst: number;
    future: number;
  }
  const phaseMap = lots.reduce<Record<string, PhaseData>>((acc, lot) => {
    const key = lot.phase ?? "Unphased";
    if (!acc[key]) acc[key] = { total: 0, available: 0, sold: 0, underConst: 0, future: 0 };
    acc[key].total += 1;
    if (lot.lot_status === "Available" || lot.lot_status === "Available Homesite") acc[key].available += 1;
    if (lot.lot_status === "Sold" || lot.lot_status === "Closed") acc[key].sold += 1;
    if (lot.construction_status === "Under Construction") acc[key].underConst += 1;
    if (lot.lot_status === "Future") acc[key].future += 1;
    return acc;
  }, {});
  const phaseRows = Object.entries(phaseMap).sort(([a], [b]) => a.localeCompare(b));

  // ─── Construction Pipeline ────────────────────────────────────────────────
  const settled = lots.filter((l) => l.construction_status === "Settled" || l.lot_status === "Closed").length;
  const activeConstruction = lots.filter((l) => l.construction_status === "Under Construction").length;
  const soldNotStarted = lots.filter((l) => (l.lot_status === "Sold") && (l.construction_status === "Not Started" || !l.construction_status)).length;
  const notSold = lots.filter((l) => l.lot_status === "Available" || l.lot_status === "Available Homesite").length;

  // ─── Plans sorted by net_price ASC nulls last ────────────────────────────
  const sortedPlans = [...plans].sort((a, b) => {
    if (a.net_price == null && b.net_price == null) return 0;
    if (a.net_price == null) return 1;
    if (b.net_price == null) return -1;
    return a.net_price - b.net_price;
  });

  const lotStatusColor = (status: string | null) => {
    if (status === "Available" || status === "Available Homesite") return "#00c853";
    if (status === "Sold" || status === "Closed") return "#ef4444";
    if (status === "Reserved") return "#f59e0b";
    if (status === "Future") return "#5b80a0";
    return "#555";
  };

  const currentYear = new Date().getFullYear();
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

        {/* ── Hero image + Comm Hub button ── */}
        <div style={{ width: "100%", height: 200, overflow: "hidden", flexShrink: 0, position: "relative" }}>
          {community.featured_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={community.featured_image_url as string}
              alt={community.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "#161820" }} />
          )}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
              padding: "20px 24px 14px",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "#fff" }}>
                {community.name}
              </div>
              <div style={{ fontSize: 12, color: "#ccc", marginTop: 2 }}>
                {[community.city, community.state].filter(Boolean).join(", ")}
                {division ? ` · ${division.name}` : ""}
              </div>
            </div>
            {/* Communication Hub Button */}
            <button
              onClick={() => setCommHubOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#1a2a3f",
                border: "1px solid #1a3f6f",
                color: "#5b80a0",
                borderRadius: 8,
                padding: "8px 14px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              💬 Communication Hub
              <span
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  marginLeft: 2,
                }}
              >
                —
              </span>
            </button>
          </div>
        </div>

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
              <span style={{ color: "#8a7a5a", fontWeight: 600 }}>
                Priced from {formatPrice(community.price_from as number)}
              </span>
            )}
            {community.total_homesites && <span>{community.total_homesites} homesites</span>}
            {community.hoa_fee && <span>${community.hoa_fee}/mo HOA</span>}
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

          {/* ── Stats Row (8 cards) ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 10,
              marginBottom: 32,
            }}
          >
            <StatCard label="Plans" value={plans.length} accent="#223347" />
            <StatCard label="Avail Lots" value={availableLots.length} accent="#00c853" />
            <StatCard label="Under Const" value={underConstruction.length} accent="#5b80a0" />
            <StatCard label="QD Homes" value={specHomes.length + qdLots.length} accent="#8a7a5a" />
            <StatCard label="Leads" value="—" accent="#a855f7" comingSoon />
            <StatCard label="Prospects" value="—" accent="#f59e0b" comingSoon />
            <StatCard label="Appts" value="—" accent="#f59e0b" comingSoon />
            <StatCard label="Contracts" value="—" accent="#00c853" comingSoon />
          </div>

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* SECTION: Sales Performance */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "#ededed", margin: 0 }}>
                Sales Performance
              </h2>
              <span style={{ fontSize: 12, color: "#555" }}>{currentYear}</span>
              <ComingSoonBanner source="HBv1 Sales API" />
            </div>

            {/* Monthly grid */}
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                <thead>
                  <tr>
                    <td style={{ width: 70, fontSize: 10, color: "#444", paddingBottom: 8 }}></td>
                    {MONTHS.map((m) => (
                      <th key={m} style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, textAlign: "center", paddingBottom: 8, minWidth: 52 }}>
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Net", color: "#333", size: 18 },
                    { label: "Goal", color: "#444", size: 13 },
                    { label: "Var", color: "#333", size: 13 },
                  ].map((row) => (
                    <tr key={row.label} style={{ borderTop: "1px solid #1a1a1a" }}>
                      <td style={{ fontSize: 11, color: "#555", fontWeight: 600, padding: "8px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {row.label}
                      </td>
                      {MONTHS.map((m) => (
                        <td key={m} style={{ textAlign: "center", padding: "8px 4px" }}>
                          <span style={{ fontFamily: "var(--font-display)", fontSize: row.size, color: row.color }}>—</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { label: "Weekly Net Sales" },
                { label: "Avg Sale Price" },
                { label: "Avg Upgrades" },
              ].map((c) => (
                <div key={c.label} style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8, padding: "12px 14px" }}>
                  <PlaceholderValue />
                  <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4, fontWeight: 500 }}>
                    {c.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* SECTION: Appointments */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "#ededed", margin: 0 }}>
                Appointments
              </h2>
              <ComingSoonBanner source="Pulse v1" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
              {["Held", "Set", "Upcoming", "Cancelled", "Conversion %"].map((label) => (
                <PlaceholderStatCard key={label} label={label} accent="#f59e0b" />
              ))}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* SECTION: Prospecting & Engagement */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "#ededed", margin: 0 }}>
                Prospecting &amp; Engagement
              </h2>
              <ComingSoonBanner source="Pulse v1 + Mailchimp" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
              {["New Prospects", "Total Prospects", "A Prospects", "Unique Contacts", "Campaigns Sent"].map((label) => (
                <PlaceholderStatCard key={label} label={label} accent="#a855f7" />
              ))}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* SECTION: Inventory & Sales Pace (REAL DATA) */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "#ededed", margin: 0 }}>
                Inventory &amp; Sales Pace
              </h2>
              <span
                style={{
                  background: "#0d1f0d",
                  color: "#00c853",
                  border: "1px solid #1a3f1a",
                  borderRadius: 4,
                  fontSize: 9,
                  fontWeight: 600,
                  padding: "2px 7px",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Live
              </span>
            </div>

            {/* Top row stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
              <StatCard label="Available Lots" value={availableLots.length} accent="#00c853" />
              <StatCard label="Buildable" value={buildableLots.length} accent="#00c853" />
              <StatCard label="Future" value={futureLots.length} accent="#5b80a0" />
              <StatCard label="Sold / Closed" value={soldLots.length} accent="#ef4444" />
              <StatCard label="3-Mo Pace" value="—" accent="#f59e0b" comingSoon />
              <StatCard label="Proj. Sell-Out" value="—" accent="#f59e0b" comingSoon />
            </div>

            {/* Phase Breakdown Table */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#555", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                Phase Breakdown
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#0f0f0f", borderRadius: 8, overflow: "hidden" }}>
                  <thead>
                    <tr style={{ background: "#161616" }}>
                      {["Phase", "Total", "Available", "Sold", "Under Const", "Future"].map((h) => (
                        <th key={h} style={{ padding: "8px 12px", fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, textAlign: h === "Phase" ? "left" : "center", borderBottom: "1px solid #1f1f1f" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {phaseRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "12px", fontSize: 12, color: "#555", textAlign: "center" }}>No lots found</td>
                      </tr>
                    ) : (
                      phaseRows.map(([phase, data], idx) => (
                        <tr key={phase} style={{ background: idx % 2 === 0 ? "#111" : "#0d0d0d", borderBottom: "1px solid #1a1a1a" }}>
                          <td style={{ padding: "8px 12px", fontSize: 12, color: "#ededed", fontWeight: 600 }}>{phase}</td>
                          <td style={{ padding: "8px 12px", fontSize: 12, color: "#888", textAlign: "center" }}>{data.total}</td>
                          <td style={{ padding: "8px 12px", fontSize: 12, color: "#00c853", textAlign: "center" }}>{data.available || "—"}</td>
                          <td style={{ padding: "8px 12px", fontSize: 12, color: "#ef4444", textAlign: "center" }}>{data.sold || "—"}</td>
                          <td style={{ padding: "8px 12px", fontSize: 12, color: "#5b80a0", textAlign: "center" }}>{data.underConst || "—"}</td>
                          <td style={{ padding: "8px 12px", fontSize: 12, color: "#666", textAlign: "center" }}>{data.future || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Construction Pipeline */}
            <div>
              <div style={{ fontSize: 12, color: "#555", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                Construction Pipeline
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                <StatCard label="Settled / Closed" value={settled} accent="#555" />
                <StatCard label="Under Construction" value={activeConstruction} accent="#5b80a0" />
                <StatCard label="Sold – Not Started" value={soldNotStarted} accent="#f59e0b" />
                <StatCard label="Not Sold" value={notSold} accent="#00c853" />
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* SECTION: Plans Available (REAL DATA) */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <SectionHeader title="Plans Available" count={sortedPlans.length} />
            {sortedPlans.length === 0 ? (
              <div
                style={{
                  background: "#111",
                  border: "1px solid #1f1f1f",
                  borderRadius: 8,
                  padding: "24px",
                  color: "#555",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                No plans configured in Heartbeat for this community
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 12,
                }}
              >
                {sortedPlans.map((plan) => (
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
          </div>

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* SECTION: Model Home + Quick Delivery (REAL DATA) */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <SectionHeader title="Model Home" />
            {modelHome ? (
              <div
                style={{
                  background: "#111",
                  border: "1px solid #1a2a3f",
                  borderRadius: 10,
                  overflow: "hidden",
                  maxWidth: 480,
                  marginBottom: 20,
                }}
              >
                {modelHome.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={modelHome.image_url}
                    alt={modelHome.model_name ?? "Model Home"}
                    style={{ width: "100%", height: 200, objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: 100, background: "#161820", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 11 }}>
                    No Image
                  </div>
                )}
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ background: "#161820", color: "#5b80a0", border: "1px solid #1a2a3f", borderRadius: 4, fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", padding: "2px 7px" }}>
                      Model Home
                    </span>
                    {modelHome.leaseback && (
                      <span style={{ background: "#1f1a0f", color: "#8a7a5a", border: "1px solid #3f3a1f", borderRadius: 4, fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", padding: "2px 7px" }}>
                        Leaseback
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, color: "#ededed", marginBottom: 4 }}>
                    {modelHome.model_marketing_name ?? modelHome.model_name ?? modelHome.name ?? "Model"}
                  </div>
                  {modelHome.address && (
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>{modelHome.address}</div>
                  )}
                  {modelHome.open_hours && (
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 8, whiteSpace: "pre-line" }}>
                      {modelHome.open_hours}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {modelHome.virtual_tour_url && (
                      <a href={modelHome.virtual_tour_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#818cf8", textDecoration: "none", background: "#12121f", border: "1px solid #2a2a4a", borderRadius: 5, padding: "4px 8px" }}>
                        Virtual Tour →
                      </a>
                    )}
                    {modelHome.page_url && (
                      <a href={modelHome.page_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#5b80a0", textDecoration: "none", background: "#111820", border: "1px solid #1a2a3f", borderRadius: 5, padding: "4px 8px" }}>
                        schellbrothers.com ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8, padding: "20px 24px", color: "#555", fontSize: 13, marginBottom: 20 }}>
                No model home for this community
              </div>
            )}

            <SectionHeader title="Quick Delivery" count={specHomes.length} />
            {specHomes.length === 0 ? (
              <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8, padding: "20px 24px", color: "#555", fontSize: 13 }}>
                No quick delivery homes available
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {specHomes.map((s) => (
                  <div key={s.id} style={{ background: "#111", border: "1px solid #1f1f1f", borderLeft: "2px solid #8a7a5a", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600, color: "#ededed", marginBottom: 3 }}>
                      {s.plan_name ?? "Quick Delivery"}
                    </div>
                    {s.address && <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>{s.address}</div>}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, color: "#666" }}>
                      {s.beds && <span>{s.beds} bd</span>}
                      {s.baths && <span>{s.baths} ba</span>}
                      {s.sqft && <span>{s.sqft.toLocaleString()} sf</span>}
                      {s.list_price && <span style={{ color: "#8a7a5a", fontWeight: 600 }}>{formatPrice(s.list_price)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Communication Hub SlideOver ── */}
      <SlideOver
        open={commHubOpen}
        onClose={() => { setCommHubOpen(false); setSelectedMessage(null); }}
        title={`Communication Hub — ${community.name}`}
        width={520}
      >
        {/* Warning banner */}
        <div style={{ background: "#1a1200", border: "1px solid #3f2f00", borderRadius: 6, padding: "8px 12px", marginBottom: 16, fontSize: 12, color: "#8a7a5a" }}>
          ⚠ Live data not connected — showing sample messages
        </div>

        {/* Tab bar */}
        {!selectedMessage && (
          <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid #1f1f1f", paddingBottom: 0 }}>
            {(["Email", "SMS", "Calls"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === tab ? "2px solid #5b80a0" : "2px solid transparent",
                  color: activeTab === tab ? "#ededed" : "#555",
                  fontSize: 13,
                  fontWeight: activeTab === tab ? 600 : 400,
                  padding: "6px 14px 10px",
                  cursor: "pointer",
                  transition: "color 0.15s",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Message list / detail */}
        {selectedMessage ? (
          /* ── Detail view ── */
          <div>
            <button
              onClick={() => setSelectedMessage(null)}
              style={{ background: "none", border: "none", color: "#5b80a0", cursor: "pointer", fontSize: 12, padding: 0, marginBottom: 16, display: "flex", alignItems: "center", gap: 4 }}
            >
              ← Back
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, color: "#ededed" }}>
                {selectedMessage.contact}
              </span>
              <span style={{ background: selectedMessage.direction === "IN" ? "#1a2a3f" : "#1a1a1a", color: selectedMessage.direction === "IN" ? "#5b80a0" : "#888", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {selectedMessage.direction}
              </span>
              <span style={{ color: "#555", fontSize: 11 }}>{selectedMessage.timeAgo}</span>
            </div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 16, fontStyle: "italic" }}>
              Subject: {selectedMessage.subject}
            </div>
            <div style={{ background: "#0d0d0d", border: "1px solid #1f1f1f", borderRadius: 8, padding: "14px 16px", fontSize: 13, color: "#bbb", lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line" }}>
              {selectedMessage.body}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {["Reply", "Mark Complete", "Schedule Follow-up"].map((action) => (
                <button key={action} style={{ background: "#161616", border: "1px solid #2a2a2a", color: "#888", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
                  {action}
                </button>
              ))}
            </div>

            {/* Schellie Suggested Response */}
            <div style={{ background: "#0f1a2a", border: "1px solid #1a3f6f", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "#5b80a0", fontWeight: 700, marginBottom: 10, letterSpacing: "0.05em" }}>
                ✦ Schellie Suggested Response
              </div>
              <div style={{ fontSize: 13, color: "#8aadcc", lineHeight: 1.7, marginBottom: 14 }}>
                {`Hi ${selectedMessage.contact.split(" ")[0]}, thank you for reaching out! ${selectedMessage.direction === "IN" ? "I'd love to help answer your questions and find the perfect home for you at " + community.name + ". Would you be available for a quick call this week?" : "Looking forward to connecting with you soon. Please don't hesitate to reach out with any questions."}`}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ background: "#1a3f6f", border: "1px solid #2a5f9f", color: "#8aadcc", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                  Use This Response
                </button>
                <button style={{ background: "#161616", border: "1px solid #2a2a2a", color: "#666", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>
                  Edit
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Message list ── */
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {(DUMMY_MESSAGES[activeTab] ?? []).map((msg) => (
              <div
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                style={{
                  background: "#111",
                  border: "1px solid #1f1f1f",
                  borderRadius: 8,
                  padding: "12px 14px",
                  cursor: "pointer",
                  marginBottom: 8,
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#2a3f5a"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1f1f1f"; }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      background: msg.direction === "IN" ? "#1a2a3f" : "#1a1a1a",
                      color: msg.direction === "IN" ? "#5b80a0" : "#888",
                      fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.06em"
                    }}>
                      {msg.direction === "IN" ? "● IN" : "→ OUT"}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#ededed" }}>{msg.contact}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "#555" }}>CSM: {msg.csm}</span>
                    <span style={{
                      background: msg.status === "NEW" ? "#3f0d0d" : msg.status === "COMPLETED" ? "#0d2f0d" : "#1a1a1a",
                      color: msg.status === "NEW" ? "#ef4444" : msg.status === "COMPLETED" ? "#00c853" : "#666",
                      fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.06em"
                    }}>
                      {msg.status}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                  &ldquo;{msg.preview}&rdquo;
                </div>
                <div style={{ fontSize: 11, color: "#555" }}>
                  {msg.community} · {msg.timeAgo}
                </div>
              </div>
            ))}
          </div>
        )}
      </SlideOver>
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
