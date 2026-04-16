import { createClient } from "@supabase/supabase-js";
import OpportunitiesClient from "./OpportunitiesClient";

export const revalidate = 30;

export default async function OpportunitiesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: leads }, { data: rawCommunities }, { data: divisions }] = await Promise.all([
    supabase
      .from("leads")
      .select("*, contacts(first_name, last_name, email, phone)")
      .eq("crm_stage", "opportunity")
      .order("last_activity_at", { ascending: false }),
    supabase
      .from("communities")
      .select("id, name, slug, divisions(slug, name)")
      .order("name"),
    supabase.from("divisions").select("id, slug, name").order("name"),
  ]);

  const flatOpps = (leads ?? []).map((l: any) => ({
    id: l.id,
    contact_id: l.contact_id,
    first_name: l.contacts?.first_name ?? "—",
    last_name: l.contacts?.last_name ?? "",
    email: l.contacts?.email ?? null,
    phone: l.contacts?.phone ?? null,
    source: l.source ?? null,
    opportunity_source: l.opportunity_source ?? null,
    community_id: l.community_id ?? null,
    division_id: l.division_id ?? null,
    osc_id: l.osc_id ?? null,
    osc_route_decision: l.osc_route_decision ?? null,
    notes: l.notes ?? null,
    is_active: l.is_active ?? true,
    last_activity_at: l.last_activity_at ?? l.created_at,
    created_at: l.created_at,
  }));

  const communities = (rawCommunities ?? []).map((c: any) => ({
    id: c.id as string,
    name: c.name as string,
    slug: (c.slug ?? null) as string | null,
    division_slug: ((c.divisions as any)?.slug ?? "") as string,
    division_name: ((c.divisions as any)?.name ?? "") as string,
  }));

  return (
    <OpportunitiesClient
      opportunities={flatOpps}
      communities={communities}
      divisions={divisions ?? []}
    />
  );
}
