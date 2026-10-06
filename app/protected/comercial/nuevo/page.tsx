import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function createProspect(formData: FormData) {
  "use server";

  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  const companyName = String(formData.get("company_name") || "").trim();
  const contactFirstName = String(formData.get("contact_first_name") || "").trim();
  const contactLastName = String(formData.get("contact_last_name") || "").trim();
  const jobTitle = String(formData.get("job_title") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const serviceType = String(formData.get("service_type") || "recruitment");
  const opportunityTitle = String(formData.get("opportunity_title") || "").trim();
  const source = String(formData.get("source") || "").trim();
  const priority = String(formData.get("priority") || "medium");
  const estimatedValue = Number(formData.get("estimated_value") || 0);
  const nextAction = String(formData.get("next_action") || "").trim();
  const nextActionAtRaw = String(formData.get("next_action_at") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!companyName || !contactFirstName || !opportunityTitle) {
    throw new Error("Empresa, contacto y oportunidad son obligatorios.");
  }

  const db = createAdminClient();

  const { data: existingOrg } = await db
    .from("organizations")
    .select("id,name")
    .ilike("name", companyName)
    .limit(1)
    .maybeSingle();

  let organizationId = existingOrg?.id as string | undefined;

  if (!organizationId) {
    const baseSlug =
      companyName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "prospecto";

    const { data: organization, error: orgError } = await db
      .from("organizations")
      .insert({
        name: companyName,
        slug: `${baseSlug}-${Date.now()}`,
        lifecycle_stage: "prospect",
        phone: phone || null,
        commercial_email: email || null,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (orgError || !organization) {
      throw new Error(orgError?.message || "No fue posible crear la empresa.");
    }

    organizationId = organization.id;
  }

  const { data: contact, error: contactError } = await db
    .from("sales_contacts")
    .insert({
      organization_id: organizationId,
      first_name: contactFirstName,
      last_name: contactLastName || null,
      job_title: jobTitle || null,
      email: email || null,
      phone: phone || null,
      is_primary: true,
    })
    .select("id")
    .single();

  if (contactError || !contact) {
    throw new Error(contactError?.message || "No fue posible crear el contacto.");
  }

  const ownerId = typeof authData.claims.sub === "string" ? authData.claims.sub : null;
  const nextActionAt = nextActionAtRaw
    ? new Date(nextActionAtRaw).toISOString()
    : null;

  const { data: opportunity, error: opportunityError } = await db
    .from("sales_opportunities")
    .insert({
      organization_id: organizationId,
      contact_id: contact.id,
      title: opportunityTitle,
      service_type: serviceType,
      stage: "new",
      source: source || null,
      priority,
      estimated_value: Number.isFinite(estimatedValue) ? estimatedValue : 0,
      next_action: nextAction || null,
      next_action_at: nextActionAt,
      notes: notes || null,
      owner_id: ownerId,
    })
    .select("id")
    .single();

  if (opportunityError || !opportunity) {
    throw new Error(
      opportunityError?.message || "No fue posible crear la oportunidad.",
    );
  }

  if (nextAction && nextActionAt) {
    await db.from("sales_activities").insert({
      opportunity_id: opportunity.id,
      organization_id: organizationId,
      contact_id: contact.id,
      activity_type: "follow_up",
      channel: "whatsapp",
      subject: nextAction,
      scheduled_at: nextActionAt,
      status: "pending",
      owner_id: ownerId,
    });
  }

  revalidatePath("/protected/comercial");
  redirect("/protected/comercial");
}

export default async function NuevoProspectoPage() {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Comercial
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Nuevo prospecto
          </h1>
          <p className="mt-2 text-neutral-600">
            Registra la empresa, contacto, servicio y la siguiente acción comercial.
          </p>
        </div>
        <Link
          href="/protected/comercial"
          className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-bold text-neutral-700"
        >
          Volver
        </Link>
      </div>

      <form action={createProspect} className="mt-7 grid gap-6">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-neutral-900">Empresa y contacto</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Empresa *" name="company_name" placeholder="Ej. Empresa ABC" />
            <Field label="Nombre del contacto *" name="contact_first_name" placeholder="Nombre" />
            <Field label="Apellidos" name="contact_last_name" placeholder="Apellidos" />
            <Field label="Puesto" name="job_title" placeholder="Dirección, RH, Administración..." />
            <Field label="Teléfono" name="phone" placeholder="33..." />
            <Field label="Correo" name="email" type="email" placeholder="contacto@empresa.com" />
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-neutral-900">Oportunidad comercial</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-neutral-700">
              Servicio *
              <select
                name="service_type"
                className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal text-neutral-900 outline-none focus:border-orange-500"
                defaultValue="recruitment"
              >
                <option value="recruitment">Reclutamiento y Headhunting</option>
                <option value="ese">Estudios Socioeconómicos</option>
                <option value="hr_consulting">Consultoría RH</option>
              </select>
            </label>
            <Field
              label="Oportunidad *"
              name="opportunity_title"
              placeholder="Ej. Reclutamiento Contador General"
            />
            <label className="grid gap-2 text-sm font-semibold text-neutral-700">
              Origen
              <select
                name="source"
                className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal text-neutral-900 outline-none focus:border-orange-500"
                defaultValue="whatsapp"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="linkedin">LinkedIn</option>
                <option value="facebook">Facebook</option>
                <option value="google">Google</option>
                <option value="referral">Referido</option>
                <option value="direct_prospecting">Prospección directa</option>
                <option value="previous_client">Cliente anterior</option>
                <option value="other">Otro</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-neutral-700">
              Prioridad
              <select
                name="priority"
                className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal text-neutral-900 outline-none focus:border-orange-500"
                defaultValue="medium"
              >
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </label>
            <Field
              label="Monto potencial"
              name="estimated_value"
              type="number"
              placeholder="0"
            />
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-neutral-900">Próxima acción</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Esta es la parte más importante: no dejes el prospecto sin una siguiente acción.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field
              label="Qué debo hacer"
              name="next_action"
              placeholder="Ej. Llamar para revisar vacante"
            />
            <Field
              label="Cuándo"
              name="next_action_at"
              type="datetime-local"
            />
          </div>
          <label className="mt-4 grid gap-2 text-sm font-semibold text-neutral-700">
            Notas
            <textarea
              name="notes"
              rows={4}
              className="rounded-xl border border-neutral-300 px-4 py-3 font-normal text-neutral-900 outline-none focus:border-orange-500"
              placeholder="Necesidad, contexto, acuerdos, condiciones..."
            />
          </label>
        </section>

        <div className="flex justify-end gap-3">
          <Link
            href="/protected/comercial"
            className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-700"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
          >
            Guardar prospecto
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-neutral-700">
      {label}
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        className="rounded-xl border border-neutral-300 px-4 py-3 font-normal text-neutral-900 outline-none focus:border-orange-500"
      />
    </label>
  );
}
