import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile, Role } from "@/lib/types";

/** The signed-in user's profile, or null. Cached for one request. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, school_id, role, full_name, class_level, parental_consent, parental_consent_at, created_at")
    .eq("id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
});

export function homeFor(profile: Pick<Profile, "role" | "parental_consent">): string {
  if (profile.role === "admin") return "/admin";
  if (profile.role === "teacher") return "/teacher";
  return profile.parental_consent ? "/student" : "/pending-consent";
}

/**
 * Use at the top of a portal layout or page. Redirects anyone who is not
 * signed in, or who has the wrong role. The database enforces the same rules
 * with RLS, so this is about sending people to the right place.
 */
export async function requireRole(...roles: Role[]): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!roles.includes(profile.role)) redirect(homeFor(profile));
  if (profile.role === "student" && !profile.parental_consent) redirect("/pending-consent");
  return profile;
}
