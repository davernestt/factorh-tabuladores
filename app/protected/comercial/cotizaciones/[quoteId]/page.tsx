import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  follow_up: "Seguimiento",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Vencida",
};

async function requireUser() {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  return authData.claims;
}

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value);
}

function dateLabel(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
  }).format(new Date(value));
}

async function updateQuoteStatus(formData: FormData) {
  "use server";

  const claims = await requireUser();
  const quoteId = String(formData.get("quote_id") || "");
  const status = String(formData.get("status") || "");

  if (!quoteId || !Object.keys(statusLabels).includes(status)) {
    throw new Error("Estatus inválido.");
  }

  const db = createAdminClient();

  const { data: quote, error: quoteError } = await db
    .from("sales_quotes")
    .select(
      "id,quote_number,opportunity_id,organization_id,contact_id,status,total",
    )
    .eq("id", quoteId)
    .single();

  if (quoteError || !quote) {
    throw new Error(quoteError?.message || "No se encontró la cotización.");
  }

  const { data: opportunity, error: opportunityError } = await db
    .from("sales_opportunities")
    .select("id,title,service_type,priority")
    .eq("id", quote.opportunity_id)
    .single();

  if (opportunityError || !opportunity) {
    throw new Error(
      opportunityError?.message || "No se encontró la oportunidad relacionada.",
    );
  }

  const now = new Date().toISOString();
  const quoteUpdate: Record<string, string | null> = {
    status,
    updated_at: now,
  };

  if (status === "sent") quoteUpdate.sent_at = now;
  if (status === "accepted") quoteUpdate.accepted_at = now;
  if (status === "rejected") quoteUpdate.rejected_at = now;

  const { error } = await db
    .from("sales_quotes")
    .update(quoteUpdate)
    .eq("id", quoteId);

  if (error) throw new Error(error.message);

  let opportunityStage = "proposal_sent";
  let activityType = "proposal";
  let activitySubject = `Cotización ${quote.quote_number}: ${statusLabels[status]}`;

  if (status === "follow_up") opportunityStage = "follow_up";
  if (status === "accepted") {
    opportunityStage = "won";
    activityType = "close";
  }

  await db
    .from("sales_opportunities")
    .update({
      stage: opportunityStage,
      estimated_value: quote.total,
      last_contact_at: now,
      updated_at: now,
    })
    .eq("id", quote.opportunity_id);

  if (status === "accepted") {
    await db
      .from("organizations")
      .update({
        lifecycle_stage: "client",
        updated_at: now,
      })
      .eq("id", quote.organization_id);

    const { data: existingOrder } = await db
      .from("service_orders")
      .select("id")
      .eq("quote_id", quote.id)
      .maybeSingle();

    if (!existingOrder) {
      const { data: order, error: orderError } = await db
        .from("service_orders")
        .insert({
          quote_id: quote.id,
          opportunity_id: quote.opportunity_id,
          organization_id: quote.organization_id,
          service_type: opportunity.service_type,
          title: opportunity.title,
          status: "new",
          priority: opportunity.priority || "medium",
          commercial_value: quote.total,
        })
        .select("id,order_number")
        .single();

      if (orderError || !order) {
        throw new Error(
          orderError?.message || "No fue posible crear la orden de servicio.",
        );
      }

      await db.from("service_order_updates").insert({
        service_order_id: order.id,
        update_type: "milestone",
        title: `Orden ${order.order_number} creada desde cotización aceptada`,
        notes: "Handoff automático de Comercial a Operación.",
        created_by: typeof claims.sub === "string" ? claims.sub : null,
      });
    }
  }

  await db.from("sales_activities").insert({
    opportunity_id: quote.opportunity_id,
    organization_id: quote.organization_id,
    contact_id: quote.contact_id,
    activity_type: activityType,
    subject: activitySubject,
    status: "completed",
    completed_at: now,
    owner_id: typeof claims.sub === "string" ? claims.sub : null,
  });

  revalidatePath("/protected/comercial");
  revalidatePath("/protected/operacion");
  revalidatePath(`/protected/comercial/${quote.opportunity_id}`);
  revalidatePath(`/protected/comercial/cotizaciones/${quoteId}`);
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  await requireUser();
  const { quoteId } = await params;
  const db = createAdminClient();

  const { data: quote, error } = await db
    .from("sales_quotes")
    .select(
      "id,quote_number,opportunity_id,organization_id,status,subtotal,tax_rate,tax_amount,total,valid_until,sent_at,accepted_at,rejected_at,notes,terms,created_at",
    )
    .eq("id", quoteId)
    .single();

  if (error || !quote) notFound();

  const [organizationResult, opportunityResult, itemsResult, serviceOrderResult] = await Promise.all([
    db
      .from("organizations")
      .select("name")
      .eq("id", quote.organization_id)
      .single(),
    db
      .from("sales_opportunities")
      .select("title,service_type")
      .eq("id", quote.opportunity_id)
      .single(),
    db
      .from("sales_quote_items")
      .select("id,description,quantity,unit_price,amount,sort_order")
      .eq("quote_id", quote.id)
      .order("sort_order", { ascending: true }),
    db
      .from("service_orders")
      .select("id,order_number,status")
      .eq("quote_id", quote.id)
      .maybeSingle(),
  ]);

  const organization = organizationResult.data;
  const opportunity = opportunityResult.data;
  const items = itemsResult.data ?? [];
  const serviceOrder = serviceOrderResult.data;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href={`/protected/comercial/${quote.opportunity_id}`}
            className="text-sm font-bold text-orange-600 hover:text-orange-700"
          >
            ← Volver a la oportunidad
          </Link>
          <div className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {organization?.name ?? "Empresa"}
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            {quote.quote_number}
          </h1>
          <p className="mt-2 text-neutral-600">{opportunity?.title}</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-right shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            Total
          </div>
          <div className="mt-1 text-2xl font-black text-neutral-900">
            {money(Number(quote.total || 0))}
          </div>
        </div>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-5">
          <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-6 py-5">
              <h2 className="font-black text-neutral-900">Conceptos</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-6 py-3">Concepto</th>
                    <th className="px-4 py-3 text-right">Cantidad</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-6 py-3 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 font-semibold text-neutral-800">
                        {item.description}
                      </td>
                      <td className="px-4 py-4 text-right text-neutral-600">
                        {Number(item.quantity)}
                      </td>
                      <td className="px-4 py-4 text-right text-neutral-600">
                        {money(Number(item.unit_price))}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-neutral-900">
                        {money(Number(item.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-neutral-200 bg-neutral-50 px-6 py-5">
              <div className="ml-auto grid max-w-sm gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Subtotal</span>
                  <span className="font-semibold">{money(Number(quote.subtotal))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">IVA {Number(quote.tax_rate)}%</span>
                  <span className="font-semibold">{money(Number(quote.tax_amount))}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-neutral-300 pt-3 text-lg">
                  <span className="font-black text-neutral-900">Total</span>
                  <span className="font-black text-neutral-900">
                    {money(Number(quote.total))}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {(quote.terms || quote.notes) && (
            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              {quote.terms && (
                <div>
                  <h2 className="font-black text-neutral-900">Condiciones</h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-600">
                    {quote.terms}
                  </p>
                </div>
              )}
              {quote.notes && (
                <div className={quote.terms ? "mt-6 border-t border-neutral-200 pt-6" : ""}>
                  <h2 className="font-black text-neutral-900">Notas internas</h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-600">
                    {quote.notes}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="grid content-start gap-5">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
              Estatus
            </div>
            <div className="mt-2 text-xl font-black text-neutral-900">
              {statusLabels[quote.status] ?? quote.status}
            </div>

            <form action={updateQuoteStatus} className="mt-5 grid gap-3">
              <input type="hidden" name="quote_id" value={quote.id} />
              <select
                name="status"
                defaultValue={quote.status}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 outline-none focus:border-orange-500"
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600"
              >
                Actualizar estatus
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-black text-neutral-900">Fechas</h2>
            <div className="mt-5 grid gap-4 text-sm">
              <Info label="Creada" value={dateLabel(quote.created_at)} />
              <Info label="Vigencia" value={dateLabel(quote.valid_until)} />
              <Info label="Enviada" value={dateLabel(quote.sent_at)} />
              <Info label="Aceptada" value={dateLabel(quote.accepted_at)} />
              <Info label="Rechazada" value={dateLabel(quote.rejected_at)} />
            </div>
          </section>

          <section className="rounded-3xl bg-neutral-800 p-6 text-white shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
              Automatización
            </div>
            <p className="mt-3 text-sm leading-6 text-neutral-300">
              Al marcar esta cotización como Aceptada, la oportunidad pasa a Ganado,
              la empresa se convierte en cliente y se genera una orden de servicio
              para Operación.
            </p>
            {serviceOrder && (
              <Link
                href={`/protected/operacion/${serviceOrder.id}`}
                className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-black text-neutral-900"
              >
                Abrir {serviceOrder.order_number}
              </Link>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="mt-1 font-semibold text-neutral-800">{value}</div>
    </div>
  );
}
