import { AuthButton } from "@/components/auth-button";
import Link from "next/link";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-neutral-100">
      <nav className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/protected" className="flex items-center gap-3">
            <div>
              <div className="text-xl font-black tracking-tight text-neutral-900">
                Factor<span className="text-orange-500">RH</span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Administración
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="hidden text-sm font-medium text-neutral-500 hover:text-neutral-900 sm:block"
            >
              Sitio público
            </Link>
            <Suspense>
              <AuthButton />
            </Suspense>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-5 py-8">{children}</div>
    </main>
  );
}
