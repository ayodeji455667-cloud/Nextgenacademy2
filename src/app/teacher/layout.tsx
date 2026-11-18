import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { getSchoolName } from "@/lib/school";

export default async function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  const profile = await requireRole("teacher");
  const schoolName = await getSchoolName(profile.school_id);
  return (
    <AppShell profile={profile} schoolName={schoolName}>
      {children}
    </AppShell>
  );
}
