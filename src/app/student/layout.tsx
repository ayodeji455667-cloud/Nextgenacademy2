import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { getSchoolName } from "@/lib/school";

export default async function StudentLayout({ children }: LayoutProps<"/student">) {
  const profile = await requireRole("student");
  const schoolName = await getSchoolName(profile.school_id);
  return (
    <AppShell profile={profile} schoolName={schoolName}>
      {children}
    </AppShell>
  );
}
