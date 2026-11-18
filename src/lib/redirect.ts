import { redirect } from "next/navigation";

/** Redirect back to a page with a message shown by <Flash>. */
export function back(path: string, kind: "ok" | "error", message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message)}`);
}

export function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optStr(form: FormData, key: string): string | null {
  const v = str(form, key);
  return v === "" ? null : v;
}

/** Only allow redirects to paths inside this app. */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return fallback;
}

/** Turn a database error into something a student or teacher can read. */
export function friendlyError(message: string | undefined): string {
  if (!message) return "Something went wrong. Please try again.";
  if (message.includes("row-level security")) return "You don't have permission to do that.";
  if (message.includes("duplicate key")) return "That already exists.";
  return message;
}
