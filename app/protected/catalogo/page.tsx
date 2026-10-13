import { getCurrentAppUser } from "@/lib/app-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClientCatalog from "./client-catalog";

/**
 * El catálogo comercial de clientes es independiente.
 * Para administración, el catálogo de instrumentos es parte de Psicometrías,
 * donde se puede consultar antes de asignar pruebas.
 */
export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="rounded-3xl border border-neutral-200 bg-white p-8 text-sm text-neutral-500">Cargando catálogo...</div>}>
      <CatalogContent />
    </Suspense>
  );
}

async function CatalogContent() {
  const user = await getCurrentAppUser();
  if (!user) redirect("/auth/login");
  if (user.role === "client") return <ClientCatalog />;
  redirect("/protected/psicometrias?view=pruebas");
}
