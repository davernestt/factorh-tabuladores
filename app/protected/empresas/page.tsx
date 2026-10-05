import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import CompanyTestSettings from "./company-test-settings";

type Organization = {
  id: string;
  name: string;
  slug: string;
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
      .select("id,name,slug")
      .eq("active", true)
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
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
          Administración
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
          Empresas y pruebas
        </h1>
        <p className="mt-2 max-w-3xl text-neutral-600">
          Decide qué instrumentos puede utilizar cada empresa y cuáles pueden
          enviarse directamente a un candidato o colaborador.
        </p>
      </div>

      <div className="mt-7 space-y-6">
        {organizations.map((organization) => (
          <section
            key={organization.id}
            className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                Empresa
              </div>
              <h2 className="mt-1 text-2xl font-black text-neutral-900">
                {organization.name}
              </h2>
            </div>

            <CompanyTestSettings
              organizationId={organization.id}
              catalog={grouped}
              access={access.filter(
                (row) => row.organization_id === organization.id,
              )}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
