"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { back, friendlyError, optStr, str } from "@/lib/redirect";

export async function setConsent(form: FormData) {
  await requireRole("teacher");
  const studentId = str(form, "student_id");
  const consent = str(form, "consent") === "true";
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ parental_consent: consent }).eq("id", studentId).eq("role", "student");
  if (error) back("/teacher/students", "error", friendlyError(error.message));
  revalidatePath("/teacher", "layout");
  back("/teacher/students", "ok", consent ? "Parental consent recorded." : "Consent removed. The student's lessons are locked.");
}

export async function gradeSubmission(form: FormData) {
  const profile = await requireRole("teacher");
  const id = str(form, "submission_id");
  const max = Number(str(form, "max_score"));
  const score = Number(str(form, "score"));
  if (!Number.isInteger(score) || score < 0 || score > max) back(`/teacher/submissions/${id}`, "error", `Score must be a whole number from 0 to ${max}.`);
  const supabase = await createClient();
  const { error } = await supabase
    .from("submissions")
    .update({ score, feedback: optStr(form, "feedback"), graded_by: profile.id, graded_at: new Date().toISOString() })
    .eq("id", id);
  if (error) back(`/teacher/submissions/${id}`, "error", friendlyError(error.message));
  revalidatePath("/teacher", "layout");
  back("/teacher/submissions", "ok", "Marked and saved.");
}

export async function returnSubmission(form: FormData) {
  await requireRole("teacher");
  const id = str(form, "submission_id");
  const supabase = await createClient();
  const { error } = await supabase.from("submissions").update({ score: null, graded_by: null, graded_at: null }).eq("id", id);
  if (error) back(`/teacher/submissions/${id}`, "error", friendlyError(error.message));
  revalidatePath("/teacher", "layout");
  back(`/teacher/submissions/${id}`, "ok", "Mark removed. The student can update their work and resubmit.");
}

export async function createWorkshop(form: FormData) {
  const profile = await requireRole("teacher");
  const title = str(form, "title");
  if (!title) back("/teacher/workshops", "error", "Give the workshop a title.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workshops")
    .insert({
      school_id: profile.school_id,
      title,
      held_on: str(form, "held_on") || new Date().toISOString().slice(0, 10),
      facilitator: optStr(form, "facilitator"),
      course_id: optStr(form, "course_id"),
      notes: optStr(form, "notes"),
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) back("/teacher/workshops", "error", friendlyError(error.message));
  redirect(`/teacher/workshops/${data.id}?ok=${encodeURIComponent("Workshop created. Now take attendance.")}`);
}

export async function saveAttendance(form: FormData) {
  const profile = await requireRole("teacher");
  const workshopId = str(form, "workshop_id");
  const studentIds = form.getAll("student_ids").map(String);
  const present = new Set(form.getAll("present").map(String));
  const supabase = await createClient();
  const rows = studentIds.map((id) => ({
    workshop_id: workshopId,
    student_id: id,
    school_id: profile.school_id,
    present: present.has(id),
    recorded_by: profile.id,
    recorded_at: new Date().toISOString(),
  }));
  if (rows.length) {
    const { error } = await supabase.from("workshop_attendance").upsert(rows, { onConflict: "workshop_id,student_id" });
    if (error) back(`/teacher/workshops/${workshopId}`, "error", friendlyError(error.message));
  }
  revalidatePath(`/teacher/workshops/${workshopId}`);
  back(`/teacher/workshops/${workshopId}`, "ok", `Attendance saved: ${present.size} of ${rows.length} present.`);
}

export async function deleteWorkshop(form: FormData) {
  await requireRole("teacher");
  const id = str(form, "workshop_id");
  const supabase = await createClient();
  const { error } = await supabase.from("workshops").delete().eq("id", id);
  if (error) back(`/teacher/workshops/${id}`, "error", friendlyError(error.message));
  back("/teacher/workshops", "ok", "Workshop deleted.");
}
