import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  return authData.claims;
}

async function createQuote(formData: FormData) {
  "use server";

  const claims = await requireUser();
  const opportunityId = String(formData.get("opportunity_id") || "");
  const validUntil = String(formData.get("valid_until") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const terms = String(formData.get("terms") || "").trim();
  const taxRate = Number(formData.get("tax_rate") || 16);

  if (!opportunityId) {
    throw new Error("Oportunidad inválida.");
  }

  const items = Array.from({ length: 5 }, (_, index) => {
    const position = index + 1;
    const description = String(
      formData.get(`item_${position}_description`) || "",
    ).trim();
    const quantity = Number(formData.get(`item_${position}_quantity`) || 1);
    const unitPrice = Number(formData.get(`item_${position}_price`) || 0);

    return {
      description,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unit_price: Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0,
      sort_order: position,
    };
  }).filter((item) => item.description);

  if (!items.length) {
    throw new Error("Agrega al menos un concepto a la cotización.");
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );
  const safeTaxRate =
    Number.isFinite(taxRate) && taxRate >= 0 ? taxRate : 16;
  const taxAmount = subtotal * (safeTaxRate / 100);
  const total = subtotal + taxAmount;

  const db = createAdminClient();

  const { data: opportunity, error: opportunityError } = await db
    .from("sales_opportunities")
    .select("id,organization_id,contact_id,title")
    .eq("id", opportunityId)
    .single();

  if (opportunityError || !opportunity) {
    throw new Error(
      opportunityError?.message || "No se encontró la oportunidad.",
    );
  }

  const { data: quote, error: quoteError } = await db
    .from("sales_quotes")
    .insert({
      opportunity_id: opportunity.id,
      organization_id: opportunity.organization_id,
      contact_id: opportunity.contact_id,
      status: "draft",
      subtotal,
      tax_rate: safeTaxRate,
      tax_amount: taxAmount,
      total,
      valid_until: validUntil || null,
      notes: notes || null,
      terms: terms || null,
      created_by: typeof claims.sub === "string" ? claims.sub : null,
    })
    .select("id,quote_number")
    .single();

  if (quoteError || !quote) {
    throw new Error(
      quoteError?.message || "No fue posible crear la cotización.",
    );
  }

  const { error: itemsError } = await db.from("sales_quote_items").insert(
    items.map((item) => ({
      quote_id: quote.id,
      ...item,
    })),
  );

  if (itemsError) {
    await db.from("sales_quotes").delete().eq("id", quote.id);
    throw new Error(itemsError.message);
  }

  const now = new Date().toISOString();

  await db
    .from("sales_opportunities")
    .update({
      stage: "proposal_sent",
      estimated_value: total,
      last_contact_at: now,
      next_action: "Dar seguimiento a cotización",
      updated_at: now,
    })
    .eq("id", opportunity.id);

  await db.from("sales_activities").insert({
    opportunity_id: opportunity.id,
    organization_id: opportunity.organization_id,
    contact_id: opportunity.contact_id,
    activity_type: "proposal",
    subject: `Cotización ${quote.quote_number} creada`,
    notes: `Total: ${new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(total)}`,
    status: "completed",
    completed_at: now,
    owner_id: typeof claims.sub === "string" ? claims.sub : null,
  });

  revalidatePath("/protected/comercial");
  revalidatePath(`/protected/comercial/${opportunity.id}`);
  redirect(`/protected/comercial/cotizaciones/${quote.id}`);
}

export default async function NuevaCotizacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const db = createAdminClient();

  const { data: opportunity, error } = await db
    .from("sales_opportunities")
    .select("id,organization_id,title,service_type,estimated_value")
    .eq("id", id)
    .single();

  if (error || !opportunity) notFound();

  const { data: organization } = await db
    .from("organizations")
    .select("name")
    .eq("id", opportunity.organization_id)
    .single();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href={`/protected/comercial/${opportunity.id}`}
            className="text-sm font-bold text-orange-600 hover:text-orange-700"
          >
            ← Volver a la oportunidad
          </Link>
          <div className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {organization?.name ?? "Empresa"}
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Nueva cotización
          </h1>
          <p className="mt-2 text-neutral-600">{opportunity.title}</p>
        </div>

        <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">
          Folio automático al guardar
        </div>
      </div>

      <form action={createQuote} className="mt-7 grid gap-6">
        <input type="hidden" name="opportunity_id" value={opportunity.id} />

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-black text-neutral-900">Conceptos</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Puedes registrar hasta cinco conceptos en esta primera versión.
              </p>
            </div>
            <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">
              Cantidad × precio unitario
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {Array.from({ length: 5 }, (_, index) => {
              const position = index + 1;
              return (
                <div
                  key={position}
                  className="grid gap-3 rounded-2xl border border-neutral-200 p-4 md:grid-cols-[1fr_120px_170px]"
                >
                  <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                    Concepto {position}
                    <input
                      name={`item_${position}_description`}
                      required={position === 1}
                      placeholder={
                        position === 1
                          ? "Ej. Servicio de reclutamiento y selección"
                          : "Concepto adicional"
                      }
                      className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                    Cantidad
                    <input
                      name={`item_${position}_quantity`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      defaultValue="1"
                      className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                    Precio unitario
                    <input
                      name={`item_${position}_price`}
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={
                        position === 1
                          ? String(Number(opportunity.estimated_value || 0))
                          : "0"
                      }
                      className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="font-black text-neutral-900">Condiciones comerciales</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-neutral-700">
              IVA %
              <input
                name="tax_rate"
                type="number"
                min="0"
                step="0.01"
                defaultValue="16"
                className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-neutral-700">
              Vigencia
              <input
                name="valid_until"
                type="date"
                className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
              />
            </label>
          </div>

          <label className="mt-4 grid gap-2 text-sm font-semibold text-neutral-700">
            Condiciones / términos
            <textarea
              name="terms"
              rows={4}
              placeholder="Ej. 50% anticipo, garantía, tiempos de entrega..."
              className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
            />
          </label>

          <label className="mt-4 grid gap-2 text-sm font-semibold text-neutral-700">
            Notas internas
            <textarea
              name="notes"
              rows={3}
              placeholder="Información interna de esta propuesta..."
              className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
            />
          </label>
        </section>

        <div className="flex justify-end gap-3">
          <Link
            href={`/protected/comercial/${opportunity.id}`}
            className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-700"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
          >
            Crear cotización
          </button>
        </div>
      </form>
    </div>
  );
}
