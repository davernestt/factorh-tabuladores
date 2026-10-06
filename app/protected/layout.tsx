import { AuthButton } from "@/components/auth-button";
import { getCurrentAppUser, landingForRole } from "@/lib/auth/app-user";
import Link from "next/link";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-neutral-100">
          <nav className="border-b border-neutral-200 bg-white">
            <div className="mx-auto flex h-16 max-w-7xl items-center px-5">
              <div>
                <div className="text-xl font-black tracking-tight text-neutral-900">
                  Factor<span className="text-orange-500">RH</span>
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  Administración
                </div>
              </div>
            </div>
          </nav>
          <div className="mx-auto max-w-7xl px-5 py-8">
            <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
              <p className="text-neutral-600">Cargando FactoRH...</p>
            </div>
          </div>
        </main>
      }
    >
      <ProtectedLayoutContent>{children}</ProtectedLayoutContent>
    </Suspense>
  );
}

async function ProtectedLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const appUser = await getCurrentAppUser();
  const role = appUser?.role ?? "client";
  const homeHref = appUser ? landingForRole(role) : "/auth/login";

  const isAdmin = role === "super_admin";
  const canCommercial = isAdmin || role === "commercial";
  const canOperate =
    isAdmin || ["recruiter", "ese_operator", "consultant"].includes(role);
  const canAssess = isAdmin || role === "recruiter";
  const canRecruit = isAdmin || role === "recruiter";

  return (
    <main className="min-h-screen bg-neutral-100">
      <nav className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href={homeHref} className="flex items-center gap-3">
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
              {isAdmin && <Nav href="/protected/dashboard">Dashboard</Nav>}

              {canAssess && <Nav href="/protected">Evaluaciones</Nav>}

              {canCommercial && (
                <Nav href="/protected/comercial">Comercial</Nav>
              )}

              {canOperate && <Nav href="/protected/operacion">Operación</Nav>}

              {canRecruit && (
                <>
                  <Nav href="/protected/candidatos">Candidatos</Nav>
                  <Nav href="/protected/catalogo">Catálogo</Nav>
                  <Nav href="/protected/empresas">Empresas</Nav>
                  <Nav href="/protected/baterias">Baterías</Nav>
                </>
              )}

              {isAdmin && <Nav href="/protected/usuarios">Usuarios</Nav>}
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

function Nav({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-white hover:text-orange-700"
    >
      {children}
    </Link>
  );
}
