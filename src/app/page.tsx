import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile, homeFor } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { APP_NAME, APP_TAGLINE } from "@/lib/site";

// Signed-in visitors are sent to their portal, so this page depends on the request.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (isSupabaseConfigured) {
    const profile = await getProfile();
    if (profile) redirect(homeFor(profile));
  }

  const features = [
    { title: "Short video lessons", body: "Six-minute lessons made for JSS and SS students, with Nigerian examples and characters." },
    { title: "Quizzes with instant feedback", body: "Every answer comes with a simple explanation, so students learn from mistakes." },
    { title: "Projects and certificates", body: "Practical projects marked by teachers, and a certificate when a course is complete." },
    { title: "In-school workshops", body: "Teachers record workshop attendance and follow each class's progress." },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2 font-bold text-brand-700">
          <Image src="/icons/icon-192.png" alt="" width={32} height={32} className="rounded-md" />
          {APP_NAME}
        </div>
        <div className="flex gap-2">
          <Link href="/login" className="btn-secondary">Sign in</Link>
          <Link href="/signup" className="btn-primary">Join with school code</Link>
        </div>
      </header>

      <section className="bg-gradient-to-b from-brand-50 to-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            {APP_TAGLINE.charAt(0).toUpperCase() + APP_TAGLINE.slice(1)}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Practical courses in internet safety, digital skills and AI for students aged 11 to 18, with tools for teachers
            and school leaders.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">Get started</Link>
            <Link href="/login" className="btn-secondary px-6 py-3 text-base">I have an account</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="card">
            <h2 className="font-semibold text-slate-900">{f.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="card flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">For schools</h2>
            <p className="text-sm text-slate-600">Schools subscribe per term for their students. Each school&apos;s data is kept separate and private.</p>
          </div>
          <a href="mailto:hello@example.com" className="btn-secondary">Talk to us</a>
        </div>
      </section>

      <footer className="mt-auto border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {APP_NAME}. Student data is handled in line with the Nigeria Data Protection Act.
      </footer>
    </div>
  );
}
