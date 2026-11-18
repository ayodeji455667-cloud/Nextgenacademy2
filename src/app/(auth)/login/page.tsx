import Link from "next/link";
import { signIn } from "../actions";
import { Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  return (
    <div className="card">
      <h1 className="mb-4 text-xl font-bold">Sign in</h1>
      {!isSupabaseConfigured ? (
        <Flash error="Supabase is not configured yet. Copy .env.example to .env.local and add your project URL and key." />
      ) : null}
      <Flash ok={sp.ok} error={sp.error} />
      <form action={signIn} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <SubmitButton pendingText="Signing in…" className="btn-primary w-full">Sign in</SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        New here? <Link href="/signup" className="font-medium text-brand-700 hover:underline">Create an account with your school code</Link>
      </p>
    </div>
  );
}
