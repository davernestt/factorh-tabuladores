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
            <div className="mx-auto flex h-16 max-w-[1440px] items-center px-5">
              <Brand />
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
  const canEvaluations = isAdmin || role === "recruiter";
  const canStudies = isAdmin || role === "ese_operator";
  const canCandidates = isAdmin || role === "recruiter";
  const canCompanies = isAdmin || role === "recruiter";

  return (
    <main className="min-h-screen bg-neutral-100">
      <nav className="relative z-40 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1440px] items-center gap-4 px-5">
          <Link href={homeHref} className="shrink-0">
            <Brand />
          </Link>

          <div className="hidden min-w-0 flex-1 items-center gap-1 lg:flex">
            {canEvaluations && (
              <TopMenu label="Evaluaciones">
                <MenuLink
                  href="/protected"
                  title="PDL"
                  description="Programa de Desarrollo de Líderes"
                />
                <MenuLink
                  href="/protected/psicometrias"
                  title="Psicometrías"
                  description="Pruebas psicométricas y reportes"
                />
                <MenuLink
                  href="/protected/feedback360"
                  title="360°"
                  description="Evaluación multifuente"
                />
                <MenuLink
                  href="/protected/baterias"
                  title="Baterías"
                  description="Configuración y agrupación de pruebas"
                />
              </TopMenu>
            )}

            {canStudies && (
              <TopMenu label="Estudios e Investigaciones" wide>
                <MenuLink
                  href="/protected/estudios"
                  title="Dashboard de Estudios"
                  description="Solicitados, avances, cierres y dictámenes"
                />
                <MenuLink
                  href="/protected/estudios/aplicacion"
                  title="Aplicación y captura"
                  description="Estudios para levantar desde la plataforma"
                />
              </TopMenu>
            )}

            {canCommercial && (
              <Nav href="/protected/comercial">Comercial</Nav>
            )}

            {canCandidates && (
              <Nav href="/protected/candidatos">Candidatos</Nav>
            )}

            {canCompanies && <Nav href="/protected/empresas">Empresas</Nav>}

            {isAdmin && <Nav href="/protected/usuarios">Usuarios</Nav>}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <Suspense>
              <AuthButton />
            </Suspense>
          </div>
        </div>

        <div className="border-t border-neutral-100 px-4 py-2 lg:hidden">
          <div className="flex flex-wrap gap-2">
            {canEvaluations && <Nav href="/protected">Evaluaciones</Nav>}
            {canStudies && <Nav href="/protected/estudios">Estudios</Nav>}
            {canCommercial && <Nav href="/protected/comercial">Comercial</Nav>}
            {canCandidates && <Nav href="/protected/candidatos">Candidatos</Nav>}
            {canCompanies && <Nav href="/protected/empresas">Empresas</Nav>}
            {isAdmin && <Nav href="/protected/usuarios">Usuarios</Nav>}
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-5 py-8">{children}</div>
    </main>
  );
}

function Brand() {
  return (
    <div>
      <div className="text-xl font-black tracking-tight text-neutral-900">
        Factor<span className="text-orange-500">RH</span>
      </div>
      <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
        Administración
      </div>
    </div>
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
      className="whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-bold text-neutral-700 transition hover:bg-orange-50 hover:text-orange-700"
    >
      {children}
    </Link>
  );
}

function TopMenu({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-bold text-neutral-700 transition hover:bg-orange-50 hover:text-orange-700 [&::-webkit-details-marker]:hidden">
        {label}
        <span className="text-[10px] text-neutral-400 transition group-open:rotate-180">
          ▼
        </span>
      </summary>

      <div
        className={
          wide
            ? "absolute left-0 top-[calc(100%+8px)] w-[340px] overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl"
            : "absolute left-0 top-[calc(100%+8px)] w-[300px] overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl"
        }
      >
        {children}
      </div>
    </details>
  );
}

function MenuLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl px-4 py-3 transition hover:bg-orange-50"
    >
      <div className="text-sm font-black text-neutral-900">{title}</div>
      <div className="mt-1 text-xs leading-5 text-neutral-500">{description}</div>
    </Link>
  );
}
