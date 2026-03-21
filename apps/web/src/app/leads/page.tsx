import { createClient } from "@supabase/supabase-js";
import LeadsClient from "./LeadsClient";

export const revalidate = 30;

export default async function LeadsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: leads }, { data: rawCommunities }] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .order("last_activity_at", { ascending: false }),
    supabase
      .from("communities")
      .select("id, name, slug, divisions(slug, name)")
      .order("name"),
  ]);

  const communities = (rawCommunities ?? []).map((c: any) => ({
    id: c.id as string,
    name: c.name as string,
    slug: (c.slug ?? null) as string | null,
    division_slug: ((c.divisions as any)?.slug ?? "") as string,
    division_name: ((c.divisions as any)?.name ?? "") as string,
  }));

  return <LeadsClient leads={leads ?? []} communities={communities} />;
}
