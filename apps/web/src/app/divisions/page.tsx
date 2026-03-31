import { createClient } from "@supabase/supabase-js";
import DivisionsClient from "./DivisionsClient";

export const revalidate = 60;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommunityRef {
  id: string;
  status: string | null;
  price_from: number | null;
}

interface RawDivision {
  id: string;
  slug: string;
  name: string;
  region: string;
  timezone: string;
  state_codes: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  communities: CommunityRef[];
}

export interface DivisionStats {
  id: string;
  slug: string;
  name: string;
  region: string;
  timezone: string;
  state_codes: string[];
  is_active: boolean;
  community_count: number;
  active_count: number;
  coming_soon_count: number;
  sold_out_count: number;
  plan_count: number;
  price_min: number | null;
  price_max: number | null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DivisionsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: rawDivisions }, { data: divisionPlans }] = await Promise.all([
    supabase
      .from("divisions")
      .select("*, communities(id, status, price_from)")
      .order("name")
      .returns<RawDivision[]>(),
    supabase
      .from("division_plans")
      .select("division_id")
      .returns<{ division_id: string }[]>(),
  ]);

  // Count plans per division
  const planCountByDivision: Record<string, number> = {};
  for (const dp of divisionPlans ?? []) {
    planCountByDivision[dp.division_id] = (planCountByDivision[dp.division_id] ?? 0) + 1;
  }

  const divStats: DivisionStats[] = (rawDivisions ?? []).map((d: RawDivision) => {
    const comms = d.communities ?? [];
    const prices = comms.map((c: CommunityRef) => c.price_from).filter((p): p is number => p != null);
    return {
      id:                d.id,
      slug:              d.slug,
      name:              d.name,
      region:            d.region,
      timezone:          d.timezone,
      state_codes:       d.state_codes ?? [],
      is_active:         d.is_active,
      community_count:   comms.length,
      active_count:      comms.filter((c: CommunityRef) =>
        ["active", "now-selling", "last-chance"].includes(c.status ?? "")
      ).length,
      coming_soon_count: comms.filter((c: CommunityRef) => c.status === "coming-soon").length,
      sold_out_count:    comms.filter((c: CommunityRef) => c.status === "sold-out").length,
      plan_count:        planCountByDivision[d.id] ?? 0,
      price_min:         prices.length ? Math.min(...prices) : null,
      price_max:         prices.length ? Math.max(...prices) : null,
    };
  });

  return <DivisionsClient divisions={divStats} />;
}
