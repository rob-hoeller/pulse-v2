import { createClient } from "@supabase/supabase-js";
import ModelHomesClient from "./ModelHomesClient";

export const revalidate = 30;

export default async function ModelHomesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: communities }, { data: divisions }] = await Promise.all([
    supabase
      .from("communities")
      .select(
        "id,name,city,state,status,price_from,featured_image_url,division_id,page_url,model_homes"
      )
      .not("model_homes", "is", null)
      .order("name"),
    supabase.from("divisions").select("id,slug,name").order("name"),
  ]);

  return (
    <ModelHomesClient
      communities={communities ?? []}
      divisions={divisions ?? []}
    />
  );
}
