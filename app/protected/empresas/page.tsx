import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import CompanyTestSettings from "./company-test-settings";
import CompanyManager from "./company-manager";

type Organization = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  lifecycle_stage: "prospect" | "client" | "inactive";
  website: string | null;
  phone: string | null;
  commercial_email: string | null;
  notes: string | null;
};

type Template = {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
};

type AccessRow = {
  organization_id: string;
  template_id: string;
  enabled: boolean;
  participant_sendable: boolean;
};

export default function CompaniesPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
          <p className="text-neutral-600">Cargando empresas...</p>
        </div>
      }
    >
      <CompaniesContent />
    </Suspense>
  );
}

async function CompaniesContent() {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  const db = createAdminClient();
  const [organizationsResult, templatesResult, accessResult] = await Promise.all([
    db
      .from("organizations")
      .select("id,name,slug,active,lifecycle_stage,website,phone,commercial_email,notes")
      .order("active", { ascending: false })
      .order("name"),
    db
      .from("assessment_templates")
      .select("id,organization_id,name,description")
      .eq("active", true)
      .order("name"),
    db
      .from("organization_assessment_templates")
      .select("organization_id,template_id,enabled,participant_sendable"),
  ]);

  const firstError =
    organizationsResult.error || templatesResult.error || accessResult.error;

  if (firstError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
        <h1 className="font-bold text-red-800">No fue posible cargar empresas</h1>
        <p className="mt-2 text-sm text-red-700">{firstError.message}</p>
      </div>
    );
  }

  const organizations = (organizationsResult.data ?? []) as Organization[];
  const templates = (templatesResult.data ?? []) as Template[];
  const access = (accessResult.data ?? []) as AccessRow[];

  const grouped = Array.from(
    templates.reduce((map, template) => {
      const current = map.get(template.name) ?? [];
      current.push({
        id: template.id,
        organization_id: template.organization_id,
      });
      map.set(template.name, current);
      return map;
    }, new Map<string, Array<{ id: string; organization_id: string | null }>>()),
  ).map(([name, variants]) => {
    const description =
      templates.find((template) => template.name === name)?.description ?? null;

    return { name, description, variants };
  });

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Administración
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Empresas y pruebas
          </h1>
          <p className="mt-2 max-w-3xl text-neutral-600">
            Da de alta empresas, actualiza sus datos y decide qué instrumentos
            puede utilizar cada una.
          </p>
        </div>
        <CompanyManager />
      </div>

      <div className="mt-7 space-y-6">
        {organizations.map((organization) => (
          <section
            key={organization.id}
            className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                    Empresa
                  </div>
                  <span
                    className={
                      organization.lifecycle_stage === "inactive"
                        ? "rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-neutral-500"
                        : organization.lifecycle_stage === "prospect"
                          ? "rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700"
                          : "rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"
                    }
                  >
                    {organization.lifecycle_stage === "inactive"
                      ? "Inactiva"
                      : organization.lifecycle_stage === "prospect"
                        ? "Prospecto"
                        : "Cliente"}
                  </span>
                </div>
                <h2 className="mt-1 text-2xl font-black text-neutral-900">
                  {organization.name}
                </h2>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                  {organization.commercial_email && <span>{organization.commercial_email}</span>}
                  {organization.phone && <span>{organization.phone}</span>}
                  {organization.website && <span>{organization.website}</span>}
                </div>
              </div>
              <CompanyManager organization={organization} />
            </div>

            {organization.active ? (
              <CompanyTestSettings
                organizationId={organization.id}
                catalog={grouped}
                access={access.filter(
                  (row) => row.organization_id === organization.id,
                )}
              />
            ) : (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-600">
                Esta empresa está inactiva. Puedes reactivarla desde <strong>Editar empresa</strong>.
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
