import { AuthButton } from "@/components/auth-button";
import { getCurrentAppUser } from "@/lib/app-auth";
import { hasNom035Subscription } from "@/lib/nom035/access";
import { has360Access } from "@/lib/feedback360-access";
import { createAdminClient } from "@/lib/supabase/admin";
import {getCoordinatorAccess,operationLabels} from "@/lib/staff-permissions";
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
  const [nom035Enabled, feedback360Enabled] = isClient ? await Promise.all([hasNom035Subscription(appUser),has360Access(appUser)]) : [true,true];

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
    { href: "/protected/evaluaciones", name: "Centro de evaluaciones" },
    { href: "/protected/estudios", name: "Estudios e Investigaciones" },
    { href: "/protected/candidatos", name: "Candidatos" },
    { href: "/protected/empresas", name: "Centro de Clientes" },
  ];

  const clientItems = [
    { href: "/protected/catalogo", name: "Explorar catálogo" },
    { href: "/protected/solicitar-usuarios", name: "Solicitar usuarios" },
    { href: "/protected/estudios", name: "Estudios e Investigaciones" },
    { href: "/protected/psicometrias", name: "Mis psicometrías" },
    { href: "/protected/psicometrias/nueva?fresh=1", name: "Asignar" },
    ...(feedback360Enabled ? [{ href: "/protected/360", name: "Mi 360°" }] : []),
    ...(nom035Enabled ? [{ href: "/protected/nom035", name: "NOM-035" }] : []),
  ];

  const staffAccess=!isClient&&appUser.role!=="super_admin"?await getCoordinatorAccess(appUser):null;
  const staffPaths:Record<string,string>={
    psychometrics:"/protected/psicometrias",
    feedback360:"/protected/360",
    pdl:"/protected/evaluaciones",
    nom035:"/protected/nom035",
    climate:"/protected/clima",
    studies:"/protected/estudios",
    candidates:"/protected/candidatos"
  };
  const staffItems=staffAccess?.activated
    ? [{href:"/protected/mi-acceso",name:"Mi panel"},
       ...staffAccess.grants.filter(g=>g.can_view).map(g=>({href:staffPaths[g.module_key],name:operationLabels[g.module_key]}))]
    :appUser.role==="ese_operator"
      ?[{href:"/protected/estudios/tareas",name:"Mis tareas de Estudios"}]
      :[{href:"/protected/mi-acceso",name:"Mi acceso FactoRH"}];
  const items=appUser.role==="super_admin"?adminItems
    :isClient
      ?appUser.clientAccessLevel==="collaborator"
        ?[{href:"/protected/catalogo",name:"Catálogo autorizado"},{href:"/protected/solicitar-usuarios",name:"Solicitar usuarios"}]
        :clientItems
      :staffItems;

  return (
    <main className="min-h-screen bg-neutral-100">
      <nav className="border-b border-neutral-200 bg-white" aria-label="Navegación principal">
        <div className="mx-auto max-w-7xl px-5 py-4">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <Link
              href={isClient ? "/protected/catalogo" : appUser.role==="super_admin"?"/protected/evaluaciones":"/protected/mi-acceso"}
              aria-label="FactoRH · Inicio"
              className="inline-flex min-w-0 items-center gap-4 rounded-xl px-2 py-1 transition-colors hover:bg-orange-50"
            >
              <span className="shrink-0 whitespace-nowrap text-[28px] font-extrabold leading-none tracking-tight sm:text-[30px]">
                <span className="text-neutral-500">Facto</span>
                <span className="text-orange-600">RH</span>
              </span>
              <span className="hidden max-w-[240px] truncate border-l border-neutral-200 pl-3 text-xs font-medium text-neutral-500 sm:inline-block">
                {isClient ? appUser.organizationName ?? "Portal de empresa" : appUser.role==="super_admin"?"Administración":"Equipo FactoRH"}
              </span>
            </Link>

            <div className="flex shrink-0 items-center gap-4">
              {!isClient && (
                <Link
                  href="/"
                  className="hidden text-sm font-medium text-neutral-500 hover:text-neutral-800 lg:inline"
                >
                  Sitio público
                </Link>
              )}
              <Suspense>
                <AuthButton />
              </Suspense>
            </div>
          </div>

          <div className="mt-4 min-w-0 rounded-xl bg-neutral-100 p-1">
            <div className="flex gap-1 overflow-x-auto whitespace-nowrap">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-white hover:text-orange-600"
                >
                  {item.name}
                </Link>
              ))}
            </div>
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
