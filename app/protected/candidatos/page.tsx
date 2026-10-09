import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import EditCandidate from "./edit-candidate";
import { redirect } from "next/navigation";
import { Suspense } from "react";

type Person = {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  area: string | null;
};

type Organization = {
  id: string;
  name: string;
};

type ProcessRow = {
  id: string;
  person_id: string;
  organization_id: string;
  name: string;
};

type Assignment = {
  id: string;
  process_id: string;
  template_id: string;
  public_token: string;
  status: string;
  created_at: string;
};

type Template = {
  id: string;
  name: string;
};

export default function CandidatesPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
          <p className="text-neutral-600">Cargando candidatos...</p>
        </div>
      }
    >
      <CandidatesContent />
    </Suspense>
  );
}

async function CandidatesContent() {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  const db = createAdminClient();

  const [peopleResult, organizationsResult, processesResult, assignmentsResult, templatesResult] =
    await Promise.all([
      db
        .from("people")
        .select("id,organization_id,first_name,last_name,email,phone,job_title,area")
        .order("first_name"),
      db.from("organizations").select("id,name"),
      db.from("assessment_processes").select("id,person_id,organization_id,name"),
      db
        .from("assessment_assignments")
        .select("id,process_id,template_id,public_token,status,created_at")
        .order("created_at", { ascending: false }),
      db.from("assessment_templates").select("id,name"),
    ]);

  const firstError =
    peopleResult.error ||
    organizationsResult.error ||
    processesResult.error ||
    assignmentsResult.error ||
    templatesResult.error;

  if (firstError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
        <h1 className="font-bold text-red-800">No fue posible cargar candidatos</h1>
        <p className="mt-2 text-sm text-red-700">{firstError.message}</p>
      </div>
    );
  }

  const people = (peopleResult.data ?? []) as Person[];
  const organizationList = (organizationsResult.data ?? []) as Organization[];
  const organizations = new Map(organizationList.map((item) => [item.id, item]));
  const processes = (processesResult.data ?? []) as ProcessRow[];
  const assignments = (assignmentsResult.data ?? []) as Assignment[];
  const templates = new Map(
    ((templatesResult.data ?? []) as Template[]).map((item) => [item.id, item]),
  );

  const processesByPerson = new Map<string, ProcessRow[]>();
  for (const process of processes) {
    const list = processesByPerson.get(process.person_id) ?? [];
    list.push(process);
    processesByPerson.set(process.person_id, list);
  }

  const assignmentsByProcess = new Map<string, Assignment[]>();
  for (const assignment of assignments) {
    const list = assignmentsByProcess.get(assignment.process_id) ?? [];
    list.push(assignment);
    assignmentsByProcess.set(assignment.process_id, list);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Panel administrativo
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Candidatos
          </h1>
          <p className="mt-2 text-neutral-600">
            Aquí queda ligada cada persona con sus evaluaciones y sus ligas de acceso.
          </p>
        </div>

        <Link
          href="/protected/nueva-evaluacion"
          className="rounded-xl bg-orange-500 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-orange-600"
        >
          + Asignar evaluación
        </Link>
      </div>

      <div className="mt-7 space-y-4">
        {people.length === 0 ? (
          <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center text-neutral-500 shadow-sm">
            Aún no hay candidatos registrados.
          </div>
        ) : (
          people.map((person) => {
            const personName = `${person.first_name.trim()} ${person.last_name ?? ""}`.trim();
            const organization = organizations.get(person.organization_id);
            const personProcesses = processesByPerson.get(person.id) ?? [];
            const personAssignments = personProcesses.flatMap(
              (process) => assignmentsByProcess.get(process.id) ?? [],
            );

            return (
              <section
                key={person.id}
                className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                      {organization?.name ?? "Sin empresa"}
                    </div>
                    <h2 className="mt-2 text-xl font-black text-neutral-900">
                      {personName}
                    </h2>
                    <p className="mt-1 text-sm text-neutral-500">
                      {[person.job_title, person.area].filter(Boolean).join(" · ") ||
                        "Sin puesto registrado"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-600">
                      {person.email && <span>{person.email}</span>}
                      {person.phone && <span>{person.phone}</span>}
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3 lg:items-end">
                    <div className="text-sm font-semibold text-neutral-500">
                      {personAssignments.length}{" "}
                      {personAssignments.length === 1 ? "evaluación" : "evaluaciones"}
                    </div>
                    <EditCandidate candidate={person} organizations={organizationList} locked={personAssignments.some((a) => a.status !== "pending")} />
                  </div>
                </div>

                <div className="mt-5 border-t border-neutral-100 pt-5">
                  {personAssignments.length === 0 ? (
                    <p className="text-sm text-neutral-500">
                      Este candidato todavía no tiene evaluaciones asignadas.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {personAssignments.map((assignment) => {
                        const process = personProcesses.find(
                          (item) => item.id === assignment.process_id,
                        );
                        const template = templates.get(assignment.template_id);

                        return (
                          <div
                            key={assignment.id}
                            className="flex flex-col gap-4 rounded-2xl bg-neutral-50 p-4 md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <div className="font-semibold text-neutral-900">
                                {template?.name ?? "Evaluación"}
                              </div>
                              <div className="mt-1 text-xs text-neutral-500">
                                {process?.name ?? "Proceso"} ·{" "}
                                <StatusLabel status={assignment.status} />
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              {assignment.status !== "completed" &&
                                assignment.status !== "cancelled" && (
                                  <span className="text-xs font-semibold text-neutral-500">
                                    Evaluación asignada
                                  </span>
                                )}

                              {assignment.status === "completed" && (
                                <Link
                                  href={`/protected/evaluaciones/${assignment.id}`}
                                  className="text-xs font-bold text-orange-600 hover:text-orange-700"
                                >
                                  Ver resultado
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatusLabel({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    in_progress: "En proceso",
    completed: "Completada",
    cancelled: "Cancelada",
  };

  return <span>{labels[status] ?? status}</span>;
}
