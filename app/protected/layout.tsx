import { AuthButton } from "@/components/auth-button";
import FactoRHLogo from "@/components/factorh-logo";
import { getCurrentAppUser } from "@/lib/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";
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

  let expiryNotices: Array<{
    module_key: string;
    ends_on: string;
    days_remaining: number;
  }> = [];
  let moduleNameByKey = new Map<string, string>();

  if (isClient && appUser.organizationId) {
    const db = createAdminClient();
    const [noticesR, modulesR] = await Promise.all([
      db
        .from("module_expiry_reminders")
        .select("module_key,ends_on,days_remaining")
        .eq("organization_id", appUser.organizationId)
        .eq("client_visible", true)
        .order("days_remaining"),
      db
        .from("platform_modules")
        .select("module_key,name")
        .eq("active", true),
    ]);

    if (!noticesR.error) {
      expiryNotices = noticesR.data ?? [];
    }
    if (!modulesR.error) {
      moduleNameByKey = new Map(
        (modulesR.data ?? []).map((item) => [item.module_key, item.name]),
      );
    }
  }

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
        <div className="mx-auto flex min-h-24 max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-3">
          <Link
            href={isClient ? "/protected/psicometrias" : "/protected/evaluaciones"}
            className="flex shrink-0 items-center rounded-2xl px-2 py-1 transition-colors hover:bg-orange-50"
          >
            <div className="flex flex-col">
              <FactoRHLogo full className="h-[74px] w-auto max-w-[290px] object-contain object-left sm:h-[82px] sm:max-w-[340px]" priority />
              <span className="mt-1 text-[10px] font-medium tracking-wide text-neutral-500">
                {isClient ? appUser.organizationName ?? "Portal de empresa" : "Panel administrativo"}
              </span>
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

      <div className="mx-auto max-w-7xl px-5 py-8">
        {isClient && expiryNotices.length > 0 && (
          <div className="mb-6 space-y-3">
            {expiryNotices.map((notice) => (
              <div
                key={notice.module_key}
                className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4"
              >
                <div className="text-xs font-bold uppercase tracking-[.14em] text-amber-700">
                  Aviso de vigencia
                </div>
                <div className="mt-1 text-sm font-bold text-neutral-900">
                  {moduleNameByKey.get(notice.module_key) ?? notice.module_key}:{" "}
                  {notice.days_remaining >= 0
                    ? `quedan ${notice.days_remaining} días de acceso`
                    : "la vigencia terminó"}
                </div>
                <div className="mt-1 text-xs text-neutral-600">
                  Vigencia hasta{" "}
                  {new Date(notice.ends_on + "T12:00:00").toLocaleDateString("es-MX")}.
                  Contacta a FactoRH para renovar o ampliar tu servicio.
                </div>
              </div>
            ))}
          </div>
        )}
        {children}
      </div>
    </main>
  );
}
