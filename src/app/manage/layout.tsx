import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { getSchoolName } from "@/lib/school";

// Content editor shared by teachers (their school's courses) and admins
// (platform courses). RLS decides which courses each person can edit.
export default async function ManageLayout({ children }: LayoutProps<"/manage">) {
  const profile = await requireRole("teacher", "admin");
  const schoolName = await getSchoolName(profile.school_id);
  return (
    <AppShell profile={profile} schoolName={schoolName}>
      {children}
    </AppShell>
  );
}
