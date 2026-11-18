"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { back, friendlyError, optStr, str } from "@/lib/redirect";
import type { Role, SubscriptionStatus } from "@/lib/types";

export async function createSchool(form: FormData) {
  await requireRole("admin");
  const name = str(form, "name");
  if (name.length < 2) back("/admin/schools", "error", "Enter the school's name.");
  const supabase = await createClient();
  // Generate the id here: admins cannot read back the row's join codes directly.
  const id = crypto.randomUUID();
  const { error } = await supabase.from("schools").insert({
    id,
    name,
    state: optStr(form, "state"),
    lga: optStr(form, "lga"),
    contact_email: optStr(form, "contact_email"),
  });
  if (error) back("/admin/schools", "error", friendlyError(error.message));
  redirect(`/admin/schools/${id}?ok=${encodeURIComponent("School created on a 30-day trial.")}`);
}

export async function updateSchool(form: FormData) {
  await requireRole("admin");
  const id = str(form, "school_id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("schools")
    .update({ name: str(form, "name"), state: optStr(form, "state"), lga: optStr(form, "lga"), contact_email: optStr(form, "contact_email") })
    .eq("id", id);
  if (error) back(`/admin/schools/${id}`, "error", friendlyError(error.message));
  back(`/admin/schools/${id}`, "ok", "School saved.");
}

export async function regenerateCodes(form: FormData) {
  await requireRole("admin");
  const id = str(form, "school_id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("regenerate_join_codes", { target_school: id });
  if (error) back(`/admin/schools/${id}`, "error", friendlyError(error.message));
  back(`/admin/schools/${id}`, "ok", "New join codes created. The old codes no longer work.");
}

export async function setLicence(form: FormData) {
  await requireRole("admin");
  const schoolId = str(form, "school_id");
  const courseId = str(form, "course_id");
  const on = str(form, "on") === "true";
  const supabase = await createClient();
  const { error } = on
    ? await supabase.from("school_courses").upsert({ school_id: schoolId, course_id: courseId }, { onConflict: "school_id,course_id", ignoreDuplicates: true })
    : await supabase.from("school_courses").delete().eq("school_id", schoolId).eq("course_id", courseId);
  if (error) back(`/admin/schools/${schoolId}`, "error", friendlyError(error.message));
  revalidatePath("/", "layout");
  back(`/admin/schools/${schoolId}`, "ok", on ? "Course unlocked for this school." : "Course removed from this school.");
}

const STATUSES: SubscriptionStatus[] = ["trial", "active", "past_due", "cancelled"];

export async function updateSubscription(form: FormData) {
  await requireRole("admin");
  const schoolId = str(form, "school_id");
  const returnTo = str(form, "return_to") || "/admin/billing";
  const status = str(form, "status") as SubscriptionStatus;
  if (!STATUSES.includes(status)) back(returnTo, "error", "Unknown status.");
  const naira = Number(str(form, "price_per_seat_naira") || "0");
  const seats = Number(str(form, "seats") || "0");
  if (!Number.isFinite(naira) || naira < 0 || !Number.isInteger(seats) || seats < 0) back(returnTo, "error", "Check the seats and price.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({
      plan: str(form, "plan") || "pilot",
      status,
      seats,
      price_per_seat_kobo: Math.round(naira * 100),
      current_period_start: optStr(form, "current_period_start"),
      current_period_end: optStr(form, "current_period_end"),
    })
    .eq("school_id", schoolId);
  if (error) back(returnTo, "error", friendlyError(error.message));
  revalidatePath("/", "layout");
  back(returnTo, "ok", "Subscription saved.");
}

const ROLES: Role[] = ["student", "teacher", "admin"];

export async function updateUser(form: FormData) {
  const me = await requireRole("admin");
  const id = str(form, "user_id");
  const role = str(form, "role") as Role;
  const schoolId = optStr(form, "school_id");
  if (!ROLES.includes(role)) back("/admin/users", "error", "Unknown role.");
  if (role !== "admin" && !schoolId) back("/admin/users", "error", "Students and teachers need a school.");
  if (id === me.id && role !== "admin") back("/admin/users", "error", "You cannot remove your own admin role.");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role, school_id: role === "admin" ? null : schoolId }).eq("id", id);
  if (error) back("/admin/users", "error", friendlyError(error.message));
  back("/admin/users", "ok", "User updated.");
}
