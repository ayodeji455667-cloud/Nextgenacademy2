import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/site";
import type { Profile } from "@/lib/types";
import { signOut } from "@/app/(auth)/actions";
import { NavLinks } from "@/components/nav-links";

const NAV: Record<Profile["role"], { href: string; label: string }[]> = {
  student: [
    { href: "/student", label: "Dashboard" },
    { href: "/student/courses", label: "Courses" },
    { href: "/student/certificates", label: "Certificates" },
  ],
  teacher: [
    { href: "/teacher", label: "Dashboard" },
    { href: "/teacher/students", label: "Students" },
    { href: "/teacher/content", label: "Content" },
    { href: "/teacher/submissions", label: "Grading" },
    { href: "/teacher/workshops", label: "Workshops" },
  ],
  admin: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/schools", label: "Schools" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/courses", label: "Courses" },
    { href: "/admin/billing", label: "Billing" },
  ],
};

export function AppShell({ profile, schoolName, children }: { profile: Profile; schoolName?: string | null; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-brand-700">
            <Image src="/icons/icon-192.png" alt="" width={28} height={28} className="rounded-md" />
            {APP_NAME}
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-600 sm:inline">
              {profile.full_name}
              {schoolName ? ` · ${schoolName}` : ""}
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">{profile.role}</span>
            </span>
            <form action={signOut}>
              <button className="btn-secondary px-3 py-1.5">Sign out</button>
            </form>
          </div>
        </div>
        <NavLinks items={NAV[profile.role]} />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
