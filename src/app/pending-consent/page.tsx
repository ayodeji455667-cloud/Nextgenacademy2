import { redirect } from "next/navigation";
import { getProfile, homeFor } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";

export const metadata = { title: "Waiting for consent" };

export default async function PendingConsentPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "student" || profile.parental_consent) redirect(homeFor(profile));

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
      <div className="card max-w-lg text-center">
        <div className="mb-3 text-4xl" aria-hidden>👋</div>
        <h1 className="mb-2 text-xl font-bold">Welcome, {profile.full_name}!</h1>
        <p className="mb-4 text-slate-700">
          Your account is ready. Before your lessons unlock, your teacher needs to confirm that your parent or guardian has
          agreed to you using this app.
        </p>
        <p className="mb-6 text-sm text-slate-600">
          Please give the consent form to your parent or guardian, or ask your teacher about it. Then come back and refresh this page.
        </p>
        <form action={signOut}>
          <button className="btn-secondary">Sign out</button>
        </form>
      </div>
    </div>
  );
}
