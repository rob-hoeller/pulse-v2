"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import type { DivisionOption, CommunityOption } from "./GlobalFilterBar";

interface CommunityPlanOption {
  id: string;
  plan_name: string;
}

interface Props {
  divisions: DivisionOption[];
  communities: CommunityOption[];
}

// ─── CompoundFilter ───────────────────────────────────────────────────────────

interface CompoundFilterProps {
  label: string;
  value: string | null;
  displayValue: string;
  count: number;
  options: { id: string; name: string }[];
  onChange: (id: string | null) => void;
  disabled?: boolean;
}

function CompoundFilter({ label, value, displayValue, count, options, onChange, disabled }: CompoundFilterProps) {
  const [open, setOpen] = useState(false);
  const isActive = !!value;

  return (
    <div style={{ position: "relative" }}>
      {/* Pill button */}
      <div
        onClick={() => !disabled && setOpen(!open)}
        style={{
          width: 170,
          height: 44,
          background: "#2a2b2e",
          border: `1px solid ${isActive ? "#80B602" : "#444"}`,
          borderRadius: 3,
          padding: "6px 10px",
          cursor: disabled ? "default" : "pointer",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          opacity: disabled ? 0.4 : 1,
          userSelect: "none" as const,
        }}
      >
        {/* Top row: label + arrow */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: isActive ? "#80B602" : "#666" }}>
            {label}
          </span>
          <span style={{ fontSize: 10, color: isActive ? "#80B602" : "#666" }}>▾</span>
        </div>
        {/* Bottom row: value or count */}
        <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? "#ededed" : "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {isActive ? displayValue : `${count} available`}
        </div>
      </div>

      {/* Dropdown list */}
      {open && (
        <>
          {/* Backdrop */}
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{
            position: "absolute",
            top: 48,
            left: 0,
            zIndex: 50,
            background: "#2a2b2e",
            border: "1px solid #333",
            borderRadius: 3,
            minWidth: 200,
            maxHeight: 300,
            overflowY: "auto",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}>
            {/* Clear option */}
            {isActive && (
              <div
                onClick={() => { onChange(null); setOpen(false); }}
                style={{ padding: "8px 12px", fontSize: 12, color: "#E32027", cursor: "pointer", borderBottom: "1px solid #222" }}
              >
                ✕ Clear
              </div>
            )}
            {options.map(opt => (
              <div
                key={opt.id}
                onClick={() => { onChange(opt.id); setOpen(false); }}
                style={{
                  padding: "8px 12px",
                  fontSize: 12,
                  color: value === opt.id ? "#80B602" : "#aaa",
                  cursor: "pointer",
                  background: value === opt.id ? "rgba(128,182,2,0.08)" : "transparent",
                  borderBottom: "1px solid #111",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={e => (e.currentTarget.style.background = value === opt.id ? "rgba(128,182,2,0.08)" : "transparent")}
              >
                {opt.name}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── GlobalFilterBarClient ────────────────────────────────────────────────────

export default function GlobalFilterBarClient({ divisions, communities }: Props) {
  const { filter, setDivision, setCommunity, setPlan, setLabels } =
    useGlobalFilter();

  const [plans, setPlans] = useState<CommunityPlanOption[]>([]);

  useEffect(() => {
    if (!filter.communityId) { setPlans([]); return; }
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    sb.from("community_plans")
      .select("id,plan_name")
      .eq("community_id", filter.communityId)
      .order("plan_name")
      .then(({ data }) => setPlans(data ?? []));
  }, [filter.communityId]);

  useEffect(() => {
    const divLabel = divisions.find(d => d.id === filter.divisionId)?.name;
    const commLabel = communities.find(c => c.id === filter.communityId)?.name;
    const planLabel = plans.find(p => p.id === String(filter.planModelId))?.plan_name;
    if (typeof setLabels === "function") {
      setLabels({ division: divLabel, community: commLabel, plan: planLabel });
    }
  }, [filter, divisions, communities, plans, setLabels]);

  const filteredCommunities = filter.divisionId
    ? communities.filter(c => c.division_id === filter.divisionId)
    : communities;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "0 16px",
      height: 56,
      background: "#0d0d0d",
      borderBottom: "1px solid #222",
      flexShrink: 0,
    }}>
      <CompoundFilter
        label="Division"
        value={filter.divisionId}
        displayValue={divisions.find(d => d.id === filter.divisionId)?.name ?? ""}
        count={divisions.length}
        options={divisions.map(d => ({ id: d.id, name: d.name }))}
        onChange={id => setDivision(id)}
      />
      <CompoundFilter
        label="Community"
        value={filter.communityId}
        displayValue={communities.find(c => c.id === filter.communityId)?.name ?? ""}
        count={filteredCommunities.length}
        options={filteredCommunities.map(c => ({ id: c.id, name: c.name }))}
        onChange={id => setCommunity(id)}
      />
      <CompoundFilter
        label="Floor Plan"
        value={filter.planModelId}
        displayValue={plans.find(p => p.id === filter.planModelId)?.plan_name ?? ""}
        count={plans.length}
        options={plans.map(p => ({ id: p.id, name: p.plan_name }))}
        onChange={id => setPlan(id)}
        disabled={!filter.communityId}
      />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right: bell + account */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#80B602", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>L</div>
        <span style={{ fontSize: 12, color: "#888" }}>Hello, Lance!</span>
      </div>
    </div>
  );
}
