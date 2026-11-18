import Link from "next/link";
import { signUp } from "../actions";
import { Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { CLASS_LEVELS } from "@/lib/types";

export const metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  return (
    <div className="card">
      <h1 className="mb-1 text-xl font-bold">Create your account</h1>
      <p className="mb-4 text-sm text-slate-600">You need a join code from your school. Your teacher can give it to you.</p>
      <Flash ok={sp.ok} error={sp.error} />
      <form action={signUp} className="space-y-4">
        <div>
          <label className="label" htmlFor="join_code">School join code</label>
          <input className="input uppercase tracking-widest" id="join_code" name="join_code" required autoComplete="off" />
        </div>
        <div>
          <label className="label" htmlFor="full_name">Your name</label>
          <input className="input" id="full_name" name="full_name" required maxLength={120} placeholder="e.g. Tolu A." />
          <p className="mt-1 text-xs text-slate-500">To protect your privacy, you can use your first name and the first letter of your surname.</p>
        </div>
        <div>
          <label className="label" htmlFor="class_level">Class</label>
          <select className="input" id="class_level" name="class_level" defaultValue="" required>
            <option value="" disabled>Choose your class…</option>
            <option value="TEACHER">I am a teacher</option>
            {CLASS_LEVELS.map((c) => (
              <option key={c} value={c}>{c.replace(/(\D+)(\d)/, "$1 $2")}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password (at least 8 characters)</label>
          <input className="input" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
        </div>
        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          <strong>For students under 18:</strong> a parent or guardian must agree to you using this app. Your teacher will
          confirm their consent before your lessons unlock. We only keep your name, class and school.
        </div>
        <SubmitButton pendingText="Creating account…" className="btn-primary w-full">Create account</SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account? <Link href="/login" className="font-medium text-brand-700 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
