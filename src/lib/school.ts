import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getSchoolName(schoolId: string | null): Promise<string | null> {
  if (!schoolId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("schools").select("name").eq("id", schoolId).maybeSingle();
  return (data?.name as string | undefined) ?? null;
}
