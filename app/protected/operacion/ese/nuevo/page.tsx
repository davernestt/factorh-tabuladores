import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth/app-user";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireEseUser() {
  const auth = await createClient();
  const { data, error } = await auth.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const appUser = await getCurrentAppUser();
  if (!appUser || !["super_admin", "ese_operator"].includes(appUser.role)) {
    redirect("/auth/login?error=unauthorized");
  }

  return appUser;
}

async function createStudy(formData: FormData) {
  "use server";

  await requireEseUser();

  const organizationId = String(formData.get("organization_id") || "");
  const serviceOrderId = String(formData.get("service_order_id") || "").trim();
  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const positionName = String(formData.get("position_name") || "").trim();
  const studyType = String(formData.get("study_type") || "integral");
  const dueDate = String(formData.get("due_date") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!organizationId || !firstName) {
    throw new Error("Selecciona un cliente y captura el nombre de la persona candidata.");
  }

  const db = createAdminClient();

  const { data: person, error: personError } = await db
    .from("people")
    .insert({
      organization_id: organizationId,
      first_name: firstName,
      last_name: lastName || null,
      email: email || null,
      phone: phone || null,
      job_title: positionName || null,
      active: true,
    })
    .select("id")
    .single();

  if (personError || !person) {
    throw new Error(personError?.message || "No fue posible crear a la persona candidata.");
  }

  const caseName = [firstName, lastName].filter(Boolean).join(" ");

  const { data: created, error: caseError } = await db
    .from("ese_cases")
    .insert({
      service_order_id: serviceOrderId || null,
      organization_id: organizationId,
      person_id: person.id,
      case_name: caseName,
      position_name: positionName || null,
      study_type: studyType,
      due_date: dueDate || null,
      status: "unassigned",
      progress: 0,
      current_section: "general",
      source: serviceOrderId ? "crm" : "manual",
      notes: notes || null,
    })
    .select("id")
    .single();

  if (caseError || !created) {
    throw new Error(caseError?.message || "No fue posible crear el estudio.");
  }

  await db.from("ese_case_status_history").insert({
    case_id: created.id,
    from_status: null,
    to_status: "unassigned",
    notes: serviceOrderId ? "Estudio creado desde orden de servicio." : "Estudio creado manualmente.",
  });

  revalidatePath("/protected/operacion/ese");
  redirect(`/protected/operacion/ese/caso/${created.id}`);
}

export default async function NuevoEstudioPage() {
  await requireEseUser();
  const db = createAdminClient();

  const [organizationsResult, ordersResult] = await Promise.all([
    db
      .from("organizations")
      .select("id,name,lifecycle_stage")
      .in("lifecycle_stage", ["client", "prospect"])
      .order("name"),
    db
      .from("service_orders")
      .select("id,order_number,organization_id,title,status")
      .eq("service_type", "ese")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false }),
  ]);

  const organizations = organizationsResult.data ?? [];
  const orders = ordersResult.data ?? [];
  const orgNames = new Map(organizations.map((item) => [item.id, item.name]));

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/protected/operacion/ese"
        className="text-sm font-bold text-orange-600 hover:text-orange-700"
      >
        ← Volver a Estudios Socioeconómicos
      </Link>

      <div className="mt-4">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
          Nuevo estudio
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
          Crear expediente socioeconómico
        </h1>
        <p className="mt-2 text-neutral-600">
          Puede ligarse a una orden del CRM o registrarse manualmente.
        </p>
      </div>

      <form action={createStudy} className="mt-7 grid gap-6">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="font-black text-neutral-900">Origen y cliente</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-neutral-700">
              Cliente *
              <select
                name="organization_id"
                required
                className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal outline-none focus:border-orange-500"
              >
                <option value="">Seleccionar cliente</option>
                {organizations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-neutral-700">
              Orden CRM / Operación
              <select
                name="service_order_id"
                className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal outline-none focus:border-orange-500"
              >
                <option value="">Sin orden — registro manual</option>
                {orders.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.order_number} · {orgNames.get(item.organization_id) ?? "Cliente"} · {item.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="font-black text-neutral-900">Persona candidata</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Nombre *" name="first_name" required />
            <Field label="Apellidos" name="last_name" />
            <Field label="Correo electrónico" name="email" type="email" />
            <Field label="Teléfono" name="phone" />
            <Field label="Puesto evaluado" name="position_name" />

            <label className="grid gap-2 text-sm font-semibold text-neutral-700">
              Tipo de estudio
              <select
                name="study_type"
                defaultValue="integral"
                className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal outline-none focus:border-orange-500"
              >
                <option value="express">Express</option>
                <option value="esencial">Esencial</option>
                <option value="integral">Integral</option>
                <option value="ejecutivo">Ejecutivo</option>
              </select>
            </label>

            <Field label="Fecha compromiso" name="due_date" type="date" />

            <label className="grid gap-2 text-sm font-semibold text-neutral-700 md:col-span-2">
              Notas iniciales
              <textarea
                name="notes"
                rows={3}
                placeholder="Indicaciones del cliente, ubicación, contacto o información relevante..."
                className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
              />
            </label>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Link
            href="/protected/operacion/ese"
            className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-700"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
          >
            Crear estudio
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-neutral-700">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
      />
    </label>
  );
}
