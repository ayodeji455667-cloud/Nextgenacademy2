import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { updateUser } from "../actions";
import { Flash, PageHeader } from "@/components/ui";

export const metadata = { title: "Users" };

export default async function AdminUsers({ searchParams }: PageProps<"/admin/users">) {
  const sp = await searchParams;
  const me = await requireRole("admin");
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const role = typeof sp.role === "string" ? sp.role : "";
  const supabase = await createClient();
  let query = supabase.from("profiles").select("id, full_name, role, school_id, class_level, parental_consent, created_at").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.ilike("full_name", `%${q.replace(/[%_]/g, "")}%`);
  if (role === "student" || role === "teacher" || role === "admin") query = query.eq("role", role);
  const [{ data: users }, { data: schools }] = await Promise.all([query, supabase.from("schools").select("id, name").order("name")]);

  return (
    <>
      <PageHeader title="Users" subtitle="Change a user's role or school. Showing the newest 200." />
      <Flash ok={sp.ok} error={sp.error} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" name="q" defaultValue={q} placeholder="Search by name" />
        <select className="input max-w-[10rem]" name="role" defaultValue={role}>
          <option value="">All roles</option><option value="student">Students</option><option value="teacher">Teachers</option><option value="admin">Admins</option>
        </select>
        <button className="btn-secondary">Filter</button>
      </form>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Role and school</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {((users ?? []) as Profile[]).map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">{u.full_name}{u.id === me.id ? " (you)" : ""}</td>
                <td className="px-4 py-3">{u.class_level ?? "—"}</td>
                <td className="px-4 py-3">
                  <form action={updateUser} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="user_id" value={u.id} />
                    <select className="input w-auto py-1" name="role" defaultValue={u.role} aria-label="Role">
                      <option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option>
                    </select>
                    <select className="input w-auto py-1" name="school_id" defaultValue={u.school_id ?? ""} aria-label="School">
                      <option value="">No school (admins only)</option>
                      {(schools ?? []).map((s) => <option key={s.id as string} value={s.id as string}>{s.name as string}</option>)}
                    </select>
                    <button className="btn-secondary px-3 py-1 text-xs">Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
