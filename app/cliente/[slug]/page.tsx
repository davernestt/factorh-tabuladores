import FactoRHLogo from "@/components/factorh-logo";
import { LoginForm } from "@/components/login-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export default function ClientPortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-neutral-100 px-5 py-10">
          <div className="mx-auto max-w-lg rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
            <p className="text-neutral-600">Cargando portal...</p>
          </div>
        </main>
      }
    >
      <ClientPortalContent params={params} />
    </Suspense>
  );
}

async function ClientPortalContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = createAdminClient();

  const { data: organization, error } = await db
    .from("organizations")
    .select("id,name,slug,active,lifecycle_stage")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !organization) notFound();

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
          <FactoRHLogo className="mx-auto h-16 w-auto" full priority />
          <div className="mt-4 text-xs font-bold uppercase tracking-[.18em] text-orange-600">
            Portal de empresa
          </div>
          <h1 className="mt-2 text-2xl font-black text-neutral-900">
            {organization.name}
          </h1>
          {!organization.active && (
            <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              El acceso de esta empresa se encuentra inactivo. Contacta a FactoRH.
            </div>
          )}
        </div>

        {organization.active && <LoginForm />}
      </div>
    </main>
  );
}
