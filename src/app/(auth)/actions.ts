"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { back, safeNext, str } from "@/lib/redirect";
import { SITE_URL } from "@/lib/env";
import { CLASS_LEVELS } from "@/lib/types";

export async function signIn(form: FormData) {
  const email = str(form, "email");
  const password = str(form, "password");
  const next = str(form, "next");
  if (!email || !password) back("/login", "error", "Enter your email and password.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) back("/login", "error", "Wrong email or password, or your email is not confirmed yet.");

  // "/" sends each role to its own home page.
  redirect(safeNext(next, "/"));
}

export async function signUp(form: FormData) {
  const fullName = str(form, "full_name");
  const email = str(form, "email");
  const password = str(form, "password");
  const joinCode = str(form, "join_code").toUpperCase();
  const rawLevel = str(form, "class_level");
  const classLevel = rawLevel === "TEACHER" ? "" : rawLevel;

  if (!fullName || !email || !password || !joinCode) back("/signup", "error", "Please fill in every field.");
  if (password.length < 8) back("/signup", "error", "Your password must be at least 8 characters.");
  if (classLevel && !(CLASS_LEVELS as readonly string[]).includes(classLevel)) back("/signup", "error", "Choose a valid class.");

  const supabase = await createClient();

  // Check the code first so the student gets a clear message.
  const { data: codeRows } = await supabase.rpc("check_join_code", { code: joinCode });
  const match = (codeRows as { school_name: string; role: string }[] | null)?.[0];
  if (!match) back("/signup", "error", "That join code was not found. Ask your teacher for your school's code.");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, join_code: joinCode, class_level: classLevel || null },
      emailRedirectTo: `${SITE_URL}/auth/callback`,
    },
  });
  if (error) back("/signup", "error", error.message);

  // If email confirmation is on (recommended), there is no session yet.
  if (!data.session) {
    back("/login", "ok", `Account created for ${match.school_name}. Check your email to confirm it, then sign in.`);
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
