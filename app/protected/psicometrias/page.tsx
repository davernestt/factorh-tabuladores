import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Template = {
  id: string;
  name: string;
  description: string | null;
  assessment_type: string;
  version: number;
  validity_days: number | null;
};

type Assignment = {
  id: string;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  process_id: string;
  template_id: string;
};

type ProcessRow = {
  id: string;
  person_id: string;
  organization_id: string;
  name: string;
};

type Person = {
  id: string;
  first_name: string;
  last_name: string | null;
  job_title: string | null;
  area: string | null;
};

type Organization = { id: string; name: string };

export default function PsychometricsPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
          <p className="text-neutral-600">Cargando psicometrías...</p>
        </div>
      }
    >
      <PsychometricsContent />
    </Suspense>
  );
}

async function PsychometricsContent() {
  const auth = await createClient();
  const { data: authData, error: authError } = await auth.auth.getClaims();
  if (authError || !authData?.claims) redirect("/auth/login");

  const db = createAdminClient();

  const templatesR = await db
    .from("assessment_templates")
    .select("id,name,description,assessment_type,version,validity_days")
    .like("assessment_type", "psychometric_%")
    .eq("active", true)
    .order("name");

  if (templatesR.error) return <ErrorCard message={templatesR.error.message} />;

  const templates = (templatesR.data ?? []) as Template[];
  const templateIds = templates.map((item) => item.id);

  const assignmentsR = templateIds.length
    ? await db
        .from("assessment_assignments")
        .select("id,status,created_at,started_at,completed_at,process_id,template_id")
        .in("template_id", templateIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (assignmentsR.error) return <ErrorCard message={assignmentsR.error.message} />;

  const assignments = (assignmentsR.data ?? []) as Assignment[];
  const processIds = Array.from(new Set(assignments.map((item) => item.process_id)));

  const processesR = processIds.length
    ? await db
        .from("assessment_processes")
        .select("id,person_id,organization_id,name")
        .in("id", processIds)
    : { data: [], error: null };

  if (processesR.error) return <ErrorCard message={processesR.error.message} />;

  const processes = (processesR.data ?? []) as ProcessRow[];
  const personIds = Array.from(new Set(processes.map((item) => item.person_id)));
  const organizationIds = Array.from(new Set(processes.map((item) => item.organization_id)));

  const [peopleR, organizationsR] = await Promise.all([
    personIds.length
      ? db
          .from("people")
          .select("id,first_name,last_name,job_title,area")
          .in("id", personIds)
      : Promise.resolve({ data: [], error: null }),
    organizationIds.length
      ? db.from("organizations").select("id,name").in("id", organizationIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (peopleR.error || organizationsR.error) {
    return <ErrorCard message={peopleR.error?.message ?? organizationsR.error?.message ?? "Error"} />;
  }

  const templateById = new Map(templates.map((item) => [item.id, item]));
  const processById = new Map(processes.map((item) => [item.id, item]));
  const peopleById = new Map(((peopleR.data ?? []) as Person[]).map((item) => [item.id, item]));
  const organizationById = new Map(((organizationsR.data ?? []) as Organization[]).map((item) => [item.id, item]));

  const completed = assignments.filter((item) => item.status === "completed").length;
  const active = assignments.filter((item) => ["pending", "in_progress"].includes(item.status)).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-bold uppercase tracking-[.2em] text-orange-600">
            FactorRH · Psicometrías
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Evaluación psicométrica
          </h1>
          <p className="mt-3 max-w-3xl text-neutral-600">
            Instrumentos propios de FactorRH para explorar tendencias laborales, razonamiento, motivadores y otros constructos relevantes para selección y desarrollo.
          </p>
        </div>
        <Link
          href="/protected/psicometrias/nueva?fresh=1"
          className="rounded-xl bg-orange-500 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-orange-600"
        >
          + Asignar psicometría
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Instrumentos propios" value={String(templates.length)} />
        <Metric label="Aplicaciones activas" value={String(active)} />
        <Metric label="Reportes generados" value={String(completed)} />
      </section>

      <section>
        <div>
          <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
            Catálogo psicométrico
          </div>
          <h2 className="mt-2 text-2xl font-black text-neutral-900">
            Instrumentos disponibles
          </h2>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {templates.map((template) => (
            <article
              key={template.id}
              className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-orange-600">
                    Instrumento FactorRH · v{template.version}
                  </div>
                  <h3 className="mt-2 text-xl font-black text-neutral-900">{template.name}</h3>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  Experimental
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-neutral-600">
                {template.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-neutral-100 px-3 py-1 font-semibold text-neutral-600">
                  Vigencia: {template.validity_days ?? "Configurable"} días
                </span>
                {template.assessment_type === "psychometric_vector" && (
                  <>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 font-semibold text-neutral-600">64 reactivos</span>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 font-semibold text-neutral-600">4 dimensiones</span>
                  </>
                )}
              </div>
              <div className="mt-5 border-t border-neutral-100 pt-5">
                <Link
                  href="/protected/psicometrias/nueva?fresh=1"
                  className="text-sm font-bold text-orange-600 hover:text-orange-700"
                >
                  Asignar instrumento →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-6 py-5">
          <h2 className="font-black text-neutral-900">Aplicaciones recientes</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Seguimiento de personas con psicometrías asignadas y acceso a sus reportes.
          </p>
        </div>

        {assignments.length === 0 ? (
          <div className="p-10 text-center text-neutral-500">
            Todavía no hay aplicaciones psicométricas.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {assignments.slice(0, 50).map((assignment) => {
              const process = processById.get(assignment.process_id);
              const person = process ? peopleById.get(process.person_id) : undefined;
              const organization = process ? organizationById.get(process.organization_id) : undefined;
              const template = templateById.get(assignment.template_id);
              const name = person
                ? `${person.first_name.trim()} ${person.last_name ?? ""}`.trim()
                : "Sin participante";

              return (
                <div
                  key={assignment.id}
                  className="grid gap-4 px-6 py-5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.4fr)_minmax(130px,.7fr)_auto] md:items-center"
                >
                  <div>
                    <div className="font-black text-neutral-900">{name}</div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {[person?.job_title, person?.area].filter(Boolean).join(" · ") || "Sin puesto registrado"}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-neutral-500">{organization?.name ?? "—"}</div>
                  </div>
                  <div>
                    <div className="font-bold text-neutral-800">{template?.name ?? "Psicometría"}</div>
                    <div className="mt-1 text-xs text-neutral-400">
                      Asignada {formatDate(assignment.created_at)}
                    </div>
                  </div>
                  <div>
                    <StatusBadge status={assignment.status} />
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    {assignment.status === "completed" ? (
                      <Link
                        href={`/protected/psicometrias/${assignment.id}`}
                        className="text-sm font-bold text-orange-600 hover:text-orange-700"
                      >
                        Ver reporte
                      </Link>
                    ) : (
                      <Link
                        href={`/protected/evaluaciones/${assignment.id}`}
                        className="text-sm font-bold text-orange-600 hover:text-orange-700"
                      >
                        Ver avance
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-neutral-500">Ruta de desarrollo</div>
        <h2 className="mt-2 text-xl font-black text-neutral-900">Siguientes instrumentos</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Después de Vector Conductual construiremos Mapa de Necesidades Laborales, Razonamiento Laboral General, Adaptabilidad Social y Liderazgo, Valores y Motivadores, Integridad y Criterio Laboral y Personalidad Laboral Big Five.
        </p>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="mt-2 text-3xl font-black text-neutral-900">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    in_progress: "En proceso",
    completed: "Completada",
    cancelled: "Cancelada",
  };
  const classes: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    in_progress: "bg-blue-50 text-blue-700",
    completed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-neutral-100 text-neutral-500",
  };
  return (
    <span className={"inline-flex rounded-full px-3 py-1 text-xs font-bold " + (classes[status] ?? classes.cancelled)}>
      {labels[status] ?? status}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
      <h1 className="font-bold text-red-800">No fue posible cargar Psicometrías</h1>
      <p className="mt-2 text-sm text-red-700">{message}</p>
    </div>
  );
}
