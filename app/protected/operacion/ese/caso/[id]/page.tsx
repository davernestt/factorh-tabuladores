import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth/app-user";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "date" | "email" | "tel" | "number" | "textarea" | "select";
  options?: string[];
  placeholder?: string;
  wide?: boolean;
};

const sections: { key: string; label: string; fields: FieldDef[] }[] = [
  {
    key: "general",
    label: "Datos generales",
    fields: [
      { key: "fecha_nacimiento", label: "Fecha de nacimiento", type: "date" },
      { key: "lugar_nacimiento", label: "Lugar de nacimiento" },
      { key: "curp", label: "CURP" },
      { key: "rfc", label: "RFC" },
      { key: "nss", label: "NSS / IMSS" },
      { key: "telefono_alterno", label: "Teléfono alterno", type: "tel" },
    ],
  },
  {
    key: "domicilio",
    label: "Domicilio",
    fields: [
      { key: "calle_numero", label: "Calle y número", wide: true },
      { key: "colonia", label: "Colonia" },
      { key: "codigo_postal", label: "Código postal" },
      { key: "municipio", label: "Municipio / Alcaldía" },
      { key: "estado", label: "Estado" },
      { key: "entre_calles", label: "Entre calles", wide: true },
      { key: "referencia_ubicacion", label: "Referencia de ubicación", type: "textarea", wide: true },
      { key: "tiempo_residencia", label: "Tiempo de residencia" },
      { key: "domicilio_anterior", label: "Domicilio anterior", wide: true },
      { key: "motivo_cambio", label: "Motivo del cambio", wide: true },
    ],
  },
  {
    key: "documentos",
    label: "Documentos",
    fields: [
      {
        key: "validacion_documental",
        label: "Validación documental",
        type: "textarea",
        wide: true,
        placeholder:
          "Registra documento, si fue presentado, original cotejado, vigencia, coincidencia y observaciones.",
      },
    ],
  },
  {
    key: "hogar",
    label: "Integración del hogar",
    fields: [
      {
        key: "integrantes",
        label: "Personas que habitan en el domicilio",
        type: "textarea",
        wide: true,
        placeholder:
          "Nombre | Parentesco o relación | Edad | Escolaridad | Ocupación | Aportación al hogar",
      },
    ],
  },
  {
    key: "vivienda",
    label: "Vivienda y entorno",
    fields: [
      {
        key: "tipo_ocupacion",
        label: "Tipo de ocupación",
        type: "select",
        options: ["Propia", "Rentada", "Prestada", "Familiar", "Otro"],
      },
      { key: "propietario_arrendador", label: "Propietario / arrendador" },
      { key: "renta_pago", label: "Renta / pago mensual", type: "number" },
      { key: "antiguedad_vivienda", label: "Antigüedad en vivienda" },
      { key: "habitaciones", label: "Habitaciones", type: "number" },
      { key: "banos", label: "Baños", type: "number" },
      { key: "servicios", label: "Servicios disponibles", wide: true },
      { key: "mascotas", label: "Mascotas" },
      {
        key: "condiciones_observadas",
        label: "Condiciones observadas en la visita",
        type: "textarea",
        wide: true,
        placeholder:
          "Estado general, orden y limpieza, accesibilidad, seguridad del entorno y congruencia con lo declarado.",
      },
      {
        key: "observaciones_entorno",
        label: "Observaciones del domicilio y entorno",
        type: "textarea",
        wide: true,
      },
    ],
  },
  {
    key: "educacion",
    label: "Educación",
    fields: [
      {
        key: "formacion",
        label: "Educación y formación",
        type: "textarea",
        wide: true,
        placeholder:
          "Nivel | Institución | Periodo | Estatus | Documento | Resultado de validación",
      },
    ],
  },
  {
    key: "laboral",
    label: "Trayectoria laboral",
    fields: [
      {
        key: "trayectoria",
        label: "Trayectoria laboral declarada",
        type: "textarea",
        wide: true,
        placeholder:
          "Empresa | Puesto | Ingreso | Egreso | Motivo de salida | Teléfono/contacto | Validación",
      },
    ],
  },
  {
    key: "economia",
    label: "Situación económica",
    fields: [
      {
        key: "ingresos",
        label: "Ingresos mensuales",
        type: "textarea",
        wide: true,
        placeholder: "Persona que aporta | Ingreso mensual | Fuente | Soporte/observaciones",
      },
      { key: "total_ingresos", label: "Total de ingresos", type: "number" },
      { key: "ingreso_candidato", label: "Ingreso de la persona candidata", type: "number" },
      {
        key: "gastos",
        label: "Gastos mensuales",
        type: "textarea",
        wide: true,
        placeholder:
          "Alimentación, vivienda, servicios, transporte, educación y salud, créditos, recreación y otros.",
      },
      { key: "total_egresos", label: "Total de egresos", type: "number" },
      { key: "balance_mensual", label: "Balance mensual estimado", type: "number" },
      {
        key: "observaciones_economicas",
        label: "Observaciones sobre ingresos y egresos",
        type: "textarea",
        wide: true,
      },
    ],
  },
  {
    key: "patrimonio",
    label: "Patrimonio",
    fields: [
      {
        key: "activos",
        label: "Activos declarados",
        type: "textarea",
        wide: true,
        placeholder: "Tipo | Titular | Valor estimado | Saldo/gravamen | Soporte/observación",
      },
      {
        key: "obligaciones",
        label: "Obligaciones financieras",
        type: "textarea",
        wide: true,
        placeholder: "Institución/acreedor | Tipo | Pago mensual | Saldo estimado | Observaciones",
      },
      {
        key: "congruencia_economica",
        label: "Análisis de congruencia económica",
        type: "textarea",
        wide: true,
      },
      {
        key: "conclusion_economica",
        label: "Conclusión del módulo económico",
        type: "textarea",
        wide: true,
      },
    ],
  },
  {
    key: "referencia_laboral_1",
    label: "Referencia laboral 1",
    fields: [
      { key: "empresa", label: "Empresa" },
      { key: "telefono_correo", label: "Teléfono / correo" },
      { key: "domicilio", label: "Domicilio", wide: true },
      { key: "area", label: "Área / departamento" },
      { key: "puesto", label: "Puesto confirmado" },
      { key: "jefatura", label: "Jefatura inmediata" },
      { key: "fecha_ingreso", label: "Fecha de ingreso", type: "date" },
      { key: "fecha_egreso", label: "Fecha de egreso", type: "date" },
      { key: "sueldo_declarado", label: "Sueldo declarado", type: "number" },
      { key: "sueldo_confirmado", label: "Sueldo confirmado", type: "number" },
      { key: "motivo_declarado", label: "Motivo declarado", wide: true },
      { key: "motivo_confirmado", label: "Motivo confirmado", wide: true },
      { key: "recontratable", label: "¿Es recontratable?", type: "select", options: ["Sí", "No", "No informado"] },
      { key: "referencia_por", label: "Referencia proporcionada por" },
      { key: "puesto_refiere", label: "Puesto de quien refiere" },
      { key: "fecha_medio", label: "Fecha y medio de contacto" },
      { key: "funciones", label: "Funciones y responsabilidades confirmadas", type: "textarea", wide: true },
      { key: "evaluacion", label: "Evaluación de la referencia", type: "textarea", wide: true },
      { key: "conclusion", label: "Inconsistencias, aclaraciones y conclusión", type: "textarea", wide: true },
    ],
  },
  {
    key: "referencia_laboral_2",
    label: "Referencia laboral 2",
    fields: [
      { key: "empresa", label: "Empresa" },
      { key: "telefono_correo", label: "Teléfono / correo" },
      { key: "domicilio", label: "Domicilio", wide: true },
      { key: "area", label: "Área / departamento" },
      { key: "puesto", label: "Puesto confirmado" },
      { key: "jefatura", label: "Jefatura inmediata" },
      { key: "fecha_ingreso", label: "Fecha de ingreso", type: "date" },
      { key: "fecha_egreso", label: "Fecha de egreso", type: "date" },
      { key: "sueldo_declarado", label: "Sueldo declarado", type: "number" },
      { key: "sueldo_confirmado", label: "Sueldo confirmado", type: "number" },
      { key: "motivo_declarado", label: "Motivo declarado", wide: true },
      { key: "motivo_confirmado", label: "Motivo confirmado", wide: true },
      { key: "recontratable", label: "¿Es recontratable?", type: "select", options: ["Sí", "No", "No informado"] },
      { key: "referencia_por", label: "Referencia proporcionada por" },
      { key: "puesto_refiere", label: "Puesto de quien refiere" },
      { key: "fecha_medio", label: "Fecha y medio de contacto" },
      { key: "funciones", label: "Funciones y responsabilidades confirmadas", type: "textarea", wide: true },
      { key: "evaluacion", label: "Evaluación de la referencia", type: "textarea", wide: true },
      { key: "conclusion", label: "Inconsistencias, aclaraciones y conclusión", type: "textarea", wide: true },
    ],
  },
  {
    key: "referencias",
    label: "Referencias personales y vecinal",
    fields: [
      {
        key: "personal_1",
        label: "Referencia personal 1",
        type: "textarea",
        wide: true,
        placeholder:
          "Nombre, teléfono, relación, tiempo de conocerle, conducta, responsabilidad, dinámica familiar y recomendación.",
      },
      {
        key: "personal_2",
        label: "Referencia personal 2",
        type: "textarea",
        wide: true,
      },
      {
        key: "vecinal",
        label: "Referencia vecinal",
        type: "textarea",
        wide: true,
        placeholder:
          "Nombre, teléfono, domicilio, tiempo de conocerle, residencia observada, convivencia, incidentes y recomendación.",
      },
    ],
  },
  {
    key: "fotografias",
    label: "Fotografías",
    fields: [],
  },
  {
    key: "investigacion",
    label: "Reporte de investigación",
    fields: [
      {
        key: "reporte",
        label: "Reporte de investigación",
        type: "textarea",
        wide: true,
        placeholder: "Redacta libremente la investigación o genera posteriormente el borrador con IA.",
      },
    ],
  },
  {
    key: "dictamen",
    label: "Dictamen",
    fields: [
      {
        key: "fundamento",
        label: "Fundamento del dictamen",
        type: "textarea",
        wide: true,
      },
    ],
  },
];

const statusLabels: Record<string, string> = {
  requested: "Solicitado",
  unassigned: "Por asignar",
  pending_contact: "Pendiente de contacto",
  scheduled: "Visita programada",
  fieldwork: "En campo",
  waiting_info: "Pendiente de información",
  verification: "Verificación",
  review: "En revisión",
  report: "Reporte",
  delivered: "Terminado",
  cancelled: "Cancelado",
};

const resultLabels: Record<string, string> = {
  recommended: "Recomendable",
  with_reservations: "Recomendable con observaciones",
  not_recommended: "No recomendable",
  not_conclusive: "No concluyente",
};

const photoCategories = [
  ["fachada", "Fachada y persona candidata"],
  ["sala", "Sala / espacio común"],
  ["comedor", "Comedor"],
  ["cocina", "Cocina"],
  ["entorno", "Entorno inmediato"],
  ["complementaria", "Evidencia complementaria"],
] as const;

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

async function saveSection(formData: FormData) {
  "use server";

  const appUser = await requireEseUser();
  const caseId = String(formData.get("case_id") || "");
  const sectionKey = String(formData.get("section_key") || "");
  const section = sections.find((item) => item.key === sectionKey);
  if (!caseId || !section) throw new Error("Sección inválida.");

  const payload: Record<string, string> = {};
  for (const field of section.fields) {
    payload[field.key] = String(formData.get(field.key) || "").trim();
  }

  const completed = formData.get("completed") === "on";
  const db = createAdminClient();

  const { error } = await db.from("ese_case_sections").upsert(
    {
      case_id: caseId,
      section_key: sectionKey,
      data: payload,
      completed,
      updated_by: appUser.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "case_id,section_key" },
  );

  if (error) throw new Error(error.message);

  const { data: completedRows } = await db
    .from("ese_case_sections")
    .select("section_key")
    .eq("case_id", caseId)
    .eq("completed", true);

  const progress = Math.round(((completedRows?.length ?? 0) / sections.length) * 100);

  await db
    .from("ese_cases")
    .update({
      progress,
      current_section: sectionKey,
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  revalidatePath(`/protected/operacion/ese/caso/${caseId}`);
  revalidatePath("/protected/operacion/ese");
}

async function updateCaseControl(formData: FormData) {
  "use server";

  const appUser = await requireEseUser();
  const caseId = String(formData.get("case_id") || "");
  const status = String(formData.get("status") || "requested");
  const result = String(formData.get("result") || "");
  const dueDate = String(formData.get("due_date") || "").trim();

  const db = createAdminClient();
  const { data: previous } = await db
    .from("ese_cases")
    .select("status")
    .eq("id", caseId)
    .single();

  const { error } = await db
    .from("ese_cases")
    .update({
      status,
      result: result || null,
      due_date: dueDate || null,
      completed_at: status === "delivered" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  if (error) throw new Error(error.message);

  if (previous?.status !== status) {
    await db.from("ese_case_status_history").insert({
      case_id: caseId,
      from_status: previous?.status ?? null,
      to_status: status,
      changed_by: appUser.userId,
    });
  }

  revalidatePath(`/protected/operacion/ese/caso/${caseId}`);
  revalidatePath("/protected/operacion/ese");
}

async function assignToMe(formData: FormData) {
  "use server";

  const appUser = await requireEseUser();
  const caseId = String(formData.get("case_id") || "");
  const db = createAdminClient();

  const { error } = await db
    .from("ese_cases")
    .update({
      assigned_to: appUser.userId,
      status: "pending_contact",
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  if (error) throw new Error(error.message);

  revalidatePath(`/protected/operacion/ese/caso/${caseId}`);
  revalidatePath("/protected/operacion/ese");
}

async function uploadPhoto(formData: FormData) {
  "use server";

  const appUser = await requireEseUser();
  const caseId = String(formData.get("case_id") || "");
  const category = String(formData.get("category") || "");
  const file = formData.get("file");

  if (!caseId || !photoCategories.some(([value]) => value === category)) {
    throw new Error("Categoría inválida.");
  }

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecciona una fotografía.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("El archivo supera el límite de 10 MB.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${caseId}/${category}/${crypto.randomUUID()}.${ext}`;
  const db = createAdminClient();

  const { error: uploadError } = await db.storage
    .from("ese-evidence")
    .upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { error } = await db.from("ese_case_photos").insert({
    case_id: caseId,
    category,
    file_path: path,
    uploaded_by: appUser.userId,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/protected/operacion/ese/caso/${caseId}?section=fotografias`);
}

export default async function EseCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  await requireEseUser();
  const { id } = await params;
  const query = await searchParams;
  const activeKey = sections.some((item) => item.key === query.section)
    ? String(query.section)
    : "general";

  const db = createAdminClient();

  const { data: study, error } = await db
    .from("ese_cases")
    .select(
      "id,service_order_id,organization_id,person_id,case_name,position_name,study_type,status,result,due_date,progress,assigned_to,notes,created_at,updated_at",
    )
    .eq("id", id)
    .single();

  if (error || !study) notFound();

  const [orgResult, personResult, sectionResult, photosResult] = await Promise.all([
    db.from("organizations").select("name").eq("id", study.organization_id).single(),
    study.person_id
      ? db
          .from("people")
          .select("first_name,last_name,email,phone,job_title")
          .eq("id", study.person_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
    db.from("ese_case_sections").select("section_key,data,completed").eq("case_id", id),
    db
      .from("ese_case_photos")
      .select("id,category,file_path,created_at")
      .eq("case_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const savedSections = new Map(
    (sectionResult.data ?? []).map((item) => [item.section_key, item]),
  );
  const activeSection = sections.find((item) => item.key === activeKey) ?? sections[0];
  const saved = savedSections.get(activeKey);
  const values = (saved?.data ?? {}) as Record<string, string>;
  const photos = photosResult.data ?? [];

  const signedPhotos = await Promise.all(
    photos.map(async (photo) => {
      const { data: signed } = await db.storage
        .from("ese-evidence")
        .createSignedUrl(photo.file_path, 3600);
      return { ...photo, url: signed?.signedUrl ?? null };
    }),
  );

  return (
    <div>
      <Link
        href="/protected/operacion/ese"
        className="text-sm font-bold text-orange-600 hover:text-orange-700"
      >
        ← Volver al dashboard de estudios
      </Link>

      <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            {orgResult.data?.name ?? "Cliente"} · {study.study_type}
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            {study.case_name}
          </h1>
          <p className="mt-2 text-neutral-600">
            {study.position_name || personResult.data?.job_title || "Sin puesto registrado"}
            {personResult.data?.phone ? ` · ${personResult.data.phone}` : ""}
          </p>
        </div>

        <div className="min-w-72 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-neutral-700">Avance del estudio</span>
            <span className="font-black text-orange-600">{study.progress ?? 0}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-orange-500"
              style={{ width: `${Math.max(0, Math.min(100, study.progress ?? 0))}%` }}
            />
          </div>
          <div className="mt-3 text-xs text-neutral-500">
            {savedSections.size} de {sections.length} secciones iniciadas
          </div>
        </div>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[260px_1fr_310px]">
        <aside className="grid content-start gap-2">
          {sections.map((section, index) => {
            const sectionSaved = savedSections.get(section.key);
            return (
              <Link
                key={section.key}
                href={`/protected/operacion/ese/caso/${study.id}?section=${section.key}`}
                className={
                  activeKey === section.key
                    ? "flex items-center justify-between gap-3 rounded-xl bg-neutral-800 px-4 py-3 text-sm font-bold text-white"
                    : "flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 hover:border-orange-300"
                }
              >
                <span>{index + 1}. {section.label}</span>
                <span className={sectionSaved?.completed ? "text-emerald-500" : "text-neutral-400"}>
                  {sectionSaved?.completed ? "✓" : "·"}
                </span>
              </Link>
            );
          })}
        </aside>

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
              Captura del estudio
            </div>
            <h2 className="mt-2 text-2xl font-black text-neutral-900">
              {activeSection.label}
            </h2>
          </div>

          {activeKey === "fotografias" ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {photoCategories.map(([category, label]) => {
                const categoryPhotos = signedPhotos.filter((item) => item.category === category);
                return (
                  <div key={category} className="rounded-2xl border border-neutral-200 p-4">
                    <h3 className="font-black text-neutral-900">{label}</h3>
                    <form action={uploadPhoto} className="mt-4 grid gap-3">
                      <input type="hidden" name="case_id" value={study.id} />
                      <input type="hidden" name="category" value={category} />
                      <input
                        type="file"
                        name="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        required
                        className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:font-bold file:text-orange-700"
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-neutral-800 px-4 py-2.5 text-sm font-bold text-white"
                      >
                        Subir fotografía
                      </button>
                    </form>

                    {categoryPhotos.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {categoryPhotos.map((photo) =>
                          photo.url ? (
                            <img
                              key={photo.id}
                              src={photo.url}
                              alt={label}
                              className="aspect-[4/3] w-full rounded-xl object-cover"
                            />
                          ) : null,
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <form action={saveSection} className="mt-6 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="case_id" value={study.id} />
              <input type="hidden" name="section_key" value={activeSection.key} />

              {activeSection.fields.map((field) => (
                <Field
                  key={field.key}
                  field={field}
                  defaultValue={values[field.key] ?? ""}
                />
              ))}

              <label className="mt-2 flex items-center gap-3 rounded-2xl bg-neutral-50 p-4 text-sm font-bold text-neutral-700 md:col-span-2">
                <input
                  type="checkbox"
                  name="completed"
                  defaultChecked={saved?.completed ?? false}
                  className="h-5 w-5 accent-orange-500"
                />
                Marcar esta sección como completa
              </label>

              <div className="flex justify-end md:col-span-2">
                <button
                  type="submit"
                  className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600"
                >
                  Guardar sección
                </button>
              </div>
            </form>
          )}
        </section>

        <aside className="grid content-start gap-5">
          <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-neutral-900">Control del estudio</h2>

            <form action={updateCaseControl} className="mt-5 grid gap-4">
              <input type="hidden" name="case_id" value={study.id} />

              <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                Estatus
                <select
                  name="status"
                  defaultValue={study.status}
                  className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                Resultado
                <select
                  name="result"
                  defaultValue={study.result ?? ""}
                  className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal"
                >
                  <option value="">Pendiente</option>
                  {Object.entries(resultLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                Fecha compromiso
                <input
                  name="due_date"
                  type="date"
                  defaultValue={study.due_date ?? ""}
                  className="rounded-xl border border-neutral-300 px-4 py-3 font-normal"
                />
              </label>

              <button
                type="submit"
                className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white"
              >
                Guardar control
              </button>
            </form>
          </section>

          {!study.assigned_to && (
            <form action={assignToMe} className="rounded-3xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
              <input type="hidden" name="case_id" value={study.id} />
              <div className="text-xs font-black uppercase tracking-[0.16em] text-orange-700">
                Sin asignar
              </div>
              <p className="mt-2 text-sm leading-6 text-neutral-700">
                Este estudio todavía no tiene aplicador responsable.
              </p>
              <button
                type="submit"
                className="mt-4 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white"
              >
                Asignarme este estudio
              </button>
            </form>
          )}

          <section className="rounded-3xl bg-neutral-800 p-5 text-white shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-orange-400">
              Próximos pasos
            </div>
            <p className="mt-3 text-sm leading-6 text-neutral-300">
              Completa las secciones, integra fotografías y referencias; después podremos generar el reporte final desde la información capturada.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({ field, defaultValue }: { field: FieldDef; defaultValue: string }) {
  const className =
    "rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal outline-none focus:border-orange-500";

  return (
    <label className={`grid gap-2 text-sm font-semibold text-neutral-700 ${field.wide ? "md:col-span-2" : ""}`}>
      {field.label}
      {field.type === "textarea" ? (
        <textarea
          name={field.key}
          rows={5}
          defaultValue={defaultValue}
          placeholder={field.placeholder}
          className={className}
        />
      ) : field.type === "select" ? (
        <select name={field.key} defaultValue={defaultValue} className={className}>
          <option value="">Seleccionar</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : (
        <input
          name={field.key}
          type={field.type ?? "text"}
          defaultValue={defaultValue}
          placeholder={field.placeholder}
          className={className}
        />
      )}
    </label>
  );
}
