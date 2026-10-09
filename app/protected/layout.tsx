import { AuthButton } from "@/components/auth-button";
import FactoRHLogo from "@/components/factorh-logo";
import { getCurrentAppUser } from "@/lib/app-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
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
          <div className="mx-auto max-w-7xl px-5 py-8">
            <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
              <p className="text-neutral-600">Cargando plataforma...</p>
            </div>
          </div>
        </main>
      }
    >
      <ProtectedShell>{children}</ProtectedShell>
    </Suspense>
  );
}

async function ProtectedShell({ children }: { children: React.ReactNode }) {
  const appUser = await getCurrentAppUser();
  if (!appUser) redirect("/auth/login");

  const isClient = appUser.role === "client";

  const adminItems = [
    { href: "/protected/evaluaciones", name: "Evaluaciones" },
    { href: "/protected", name: "PDL" },
    { href: "/protected/360", name: "360°" },
    { href: "/protected/psicometrias", name: "Psicometrías" },
    { href: "/protected/candidatos", name: "Candidatos" },
    { href: "/protected/catalogo", name: "Catálogo" },
    { href: "/protected/empresas", name: "Empresas" },
    { href: "/protected/usuarios", name: "Usuarios" },
    { href: "/protected/baterias", name: "Baterías" },
  ];

  const clientItems = [
    { href: "/protected/psicometrias", name: "Psicometrías" },
    { href: "/protected/psicometrias/nueva?fresh=1", name: "Asignar" },
  ];

  const items = isClient ? clientItems : adminItems;

  return (
    <main className="min-h-screen bg-neutral-100">
      <nav className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3">
          <Link
            href={isClient ? "/protected/psicometrias" : "/protected/evaluaciones"}
            className="flex items-center gap-3"
          >
            <div>
              <FactoRHLogo className="h-9 w-auto" priority />
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[.2em] text-neutral-500">
                {isClient
                  ? appUser.organizationName ?? "Portal Empresa"
                  : "Administración"}
              </div>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-neutral-100 p-1">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-white hover:text-orange-600"
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {!isClient && (
              <Link
                href="/"
                className="hidden text-sm font-medium text-neutral-500 hover:text-neutral-800 xl:block"
              >
                Sitio público
              </Link>
            )}

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
