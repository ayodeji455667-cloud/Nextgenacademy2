import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getProfile, homeFor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { APP_NAME } from "@/lib/site";
import { PrintButton } from "./print-button";

export const metadata = { title: "Certificate" };

// Visible only to the student, their teachers and admins (enforced by RLS).
export default async function CertificatePage({ params }: PageProps<"/certificates/[code]">) {
  const { code } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();
  const { data: cert } = await supabase
    .from("certificates")
    .select("code, issued_at, student_id, courses(title), profiles(full_name), schools(name)")
    .eq("code", code)
    .maybeSingle();
  if (!cert) notFound();

  const course = cert.courses as unknown as { title: string } | null;
  const student = cert.profiles as unknown as { full_name: string } | null;
  const school = cert.schools as unknown as { name: string } | null;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="no-print mx-auto mb-4 flex max-w-4xl justify-between">
        <a href={homeFor(profile)} className="text-sm font-medium text-brand-700 hover:underline">← Back</a>
        <PrintButton />
      </div>
      <div className="mx-auto max-w-4xl rounded-2xl border-8 border-double border-brand-600 bg-white p-10 text-center shadow-xl sm:p-16">
        <Image src="/icons/icon-192.png" alt="" width={64} height={64} className="mx-auto rounded-xl" />
        <div className="mt-4 text-sm font-semibold uppercase tracking-[0.3em] text-brand-700">{APP_NAME}</div>
        <h1 className="mt-6 text-4xl font-extrabold text-slate-900 sm:text-5xl">Certificate of Completion</h1>
        <p className="mt-8 text-slate-600">This certifies that</p>
        <p className="mt-2 text-3xl font-bold text-slate-900">{student?.full_name}</p>
        {school ? <p className="mt-1 text-slate-600">of {school.name}</p> : null}
        <p className="mt-6 text-slate-600">has successfully completed</p>
        <p className="mt-2 text-2xl font-semibold text-brand-800">{course?.title}</p>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <span>Issued {new Date(cert.issued_at as string).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</span>
          <span>Certificate code: <strong className="font-mono text-slate-700">{cert.code as string}</strong></span>
        </div>
      </div>
    </div>
  );
}
