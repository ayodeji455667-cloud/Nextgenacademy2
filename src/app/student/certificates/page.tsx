import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Certificates" };

export default async function StudentCertificates() {
  const profile = await requireRole("student");
  const supabase = await createClient();
  const { data } = await supabase
    .from("certificates")
    .select("code, issued_at, courses(title)")
    .eq("student_id", profile.id)
    .order("issued_at", { ascending: false });

  return (
    <>
      <PageHeader title="My certificates" subtitle="Finish a course to earn a certificate." />
      {(data ?? []).length === 0 ? (
        <EmptyState>No certificates yet. Keep learning!</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(data ?? []).map((c) => (
            <Link key={c.code as string} href={`/certificates/${c.code}`} className="card hover:border-brand-500">
              <div className="text-3xl" aria-hidden>🏅</div>
              <div className="mt-2 font-semibold">{(c.courses as unknown as { title: string } | null)?.title}</div>
              <div className="text-sm text-slate-500">Issued {new Date(c.issued_at as string).toLocaleDateString("en-NG")} · {c.code as string}</div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
