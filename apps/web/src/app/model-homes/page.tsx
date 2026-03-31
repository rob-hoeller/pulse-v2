import { createClient } from "@supabase/supabase-js";
import ModelHomesClient from "./ModelHomesClient";

export const revalidate = 30;

export default async function ModelHomesPage({
  searchParams,
}: {
  searchParams: Promise<{ div?: string; comm?: string; plan?: string }>;
}) {
  const { div: filterDiv, comm: filterComm } = await searchParams;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  let modelHomesQuery = supabase.from("model_homes").select("*").order("community_name");
  if (filterComm) {
    modelHomesQuery = modelHomesQuery.eq("community_id", filterComm);
  } else if (filterDiv) {
    modelHomesQuery = modelHomesQuery.eq("division_parent_id", filterDiv);
  }

  const [{ data: modelHomes }, { data: divisions }] = await Promise.all([
    modelHomesQuery,
    supabase.from("divisions").select("id,slug,name").order("name"),
  ]);

  return (
    <ModelHomesClient
      modelHomes={modelHomes ?? []}
      divisions={divisions ?? []}
    />
  );
}
