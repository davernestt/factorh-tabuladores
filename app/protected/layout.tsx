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
            <div className="hidden items-center gap-1 rounded-xl bg-neutral-100 p-1 md:flex">
              <Link
                href="/protected"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-white hover:text-neutral-900"
              >
                Evaluaciones
              </Link>
              <Link
                href="/protected/comercial"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-orange-600 hover:bg-white hover:text-orange-700"
              >
                Comercial
              </Link>
              <Link
                href="/protected/candidatos"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-white hover:text-neutral-900"
              >
                Candidatos
              </Link>
              <Link
                href="/protected/catalogo"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-white hover:text-neutral-900"
              >
                Catálogo
              </Link>
              <Link
                href="/protected/empresas"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-white hover:text-neutral-900"
              >
                Empresas
              </Link>
              <Link
                href="/protected/baterias"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-white hover:text-neutral-900"
              >
                Baterías
              </Link>
            </div>
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
