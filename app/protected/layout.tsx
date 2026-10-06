import { AuthButton } from "@/components/auth-button";
import { getCurrentAppUser, landingForRole } from "@/lib/auth/app-user";
import { ProtectedMainNav } from "@/components/protected-main-nav";
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

          <ProtectedMainNav
            canEvaluations={canEvaluations}
            canStudies={canStudies}
            canCommercial={canCommercial}
            canCandidates={canCandidates}
            canCompanies={canCompanies}
            isAdmin={isAdmin}
          />

          <div className="ml-auto flex shrink-0 items-center gap-3">
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

