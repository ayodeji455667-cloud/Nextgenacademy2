import Image from "next/image";
import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/site";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-4 py-10">
      <Link href="/" className="mb-6 flex flex-col items-center gap-2 text-center">
        <Image src="/icons/icon-192.png" alt="" width={56} height={56} className="rounded-xl shadow" />
        <span className="text-xl font-bold text-brand-800">{APP_NAME}</span>
        <span className="text-sm text-slate-600">{APP_TAGLINE}</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
