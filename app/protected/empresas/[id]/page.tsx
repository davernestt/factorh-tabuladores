import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAppUser } from "@/lib/app-auth";
import CompanyAccessPanel from "../company-access-panel";
import CompanyCreditManager, { type CreditPlan } from "../company-credit-manager";
import CompanyModuleManager, {
  type ModuleSubscription,
  type PlatformModule,
} from "../company-module-manager";

type Organization = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  lifecycle_stage: "prospect" | "client" | "inactive";
  website: string | null;
  phone: string | null;
  commercial_email: string | null;
  notes: string | null;
};

type ClientUser = {
  user_id: string;
  email: string;
  display_name: string | null;
  active: boolean;
};

type ProcessRow = {
  id: string;
  person_id: string;
  name: string;
  status: string;
  created_at: string;
};

type AssignmentRow = {
  id: string;
  process_id: string;
  status: string;
  template_id: string;
};

type PersonRow = {
  id: string;
  first_name: string;
  last_name: string | null;
};

type ReminderRow = {
  module_key: string;
  ends_on: string;
  days_remaining: number;
};

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await getCurrentAppUser();
  if (!currentUser) redirect("/auth/login");
  if (currentUser.role !== "super_admin") redirect("/protected/psicometrias");

  const { id } = await params;
  const db = createAdminClient();

  const [
    organizationR,
    usersR,
    creditR,
    modulesR,
    subscriptionsR,
    remindersR,
    processesR,
    accessR,
  ] = await Promise.all([
    db
      .from("organizations")
      .select(
        "id,name,slug,active,lifecycle_stage,website,phone,commercial_email,notes",
      )
      .eq("id", id)
      .maybeSingle(),
    db
      .from("app_users")
      .select("user_id,email,display_name,active")
      .eq("organization_id", id)
      .eq("role", "client")
      .order("created_at"),
    db
      .from("organization_psychometric_credits")
      .select(
        "organization_id,plan_type,plan_name,credits_total,credits_used,valid_from,valid_until,active,trial_single_test_only",
      )
      .eq("organization_id", id)
      .maybeSingle(),
    db
      .from("platform_modules")
      .select("module_key,name,description,route,client_available")
      .eq("active", true)
      .order("sort_order"),
    db
      .from("organization_module_subscriptions")
      .select(
        "id,organization_id,module_key,status,plan_name,starts_on,ends_on,requested_on,requested_notes,reminder_days,client_notice",
      )
      .eq("organization_id", id),
    db
      .from("module_expiry_reminders")
      .select("module_key,ends_on,days_remaining")
      .eq("organization_id", id)
      .order("days_remaining"),
    db
      .from("assessment_processes")
      .select("id,person_id,name,status,created_at")
      .eq("organization_id", id)
      .order("created_at", { ascending: false }),
    db
      .from("organization_assessment_templates")
      .select("template_id,enabled")
      .eq("organization_id", id)
      .eq("enabled", true),
  ]);

  const firstError =
    organizationR.error ||
    usersR.error ||
    creditR.error ||
    modulesR.error ||
    subscriptionsR.error ||
    remindersR.error ||
    processesR.error ||
    accessR.error;

  if (firstError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
        <h1 className="font-bold text-red-800">No fue posible cargar la empresa</h1>
        <p className="mt-2 text-sm text-red-700">{firstError.message}</p>
      </div>
    );
  }

  if (!organizationR.data) notFound();

  const organization = organizationR.data as Organization;
  const users = (usersR.data ?? []) as ClientUser[];
  const creditPlan = (creditR.data ?? null) as CreditPlan | null;
  const modules = (modulesR.data ?? []) as PlatformModule[];
  const subscriptions = (subscriptionsR.data ?? []) as ModuleSubscription[];
  const reminders = (remindersR.data ?? []) as ReminderRow[];
  const processes = (processesR.data ?? []) as ProcessRow[];
  const subscriptionByModule = new Map(
    subscriptions.map((item) => [item.module_key, item]),
  );

  const processIds = processes.map((item) => item.id);
  const personIds = Array.from(new Set(processes.map((item) => item.person_id)));
  const templateIds = (accessR.data ?? []).map((item) => item.template_id);

  const [assignmentsR, peopleR, templatesR] = await Promise.all([
    processIds.length
      ? db
          .from("assessment_assignments")
          .select("id,process_id,status,template_id")
          .in("process_id", processIds)
      : Promise.resolve({ data: [], error: null }),
    personIds.length
      ? db
          .from("people")
          .select("id,first_name,last_name")
          .in("id", personIds)
      : Promise.resolve({ data: [], error: null }),
    templateIds.length
      ? db
          .from("assessment_templates")
          .select("id,name,assessment_type")
          .in("id", templateIds)
          .order("name")
      : Promise.resolve({ data: [], error: null }),
  ]);

  const secondaryError =
    assignmentsR.error || peopleR.error || templatesR.error;
  if (secondaryError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
        <h1 className="font-bold text-red-800">No fue posible cargar la actividad</h1>
        <p className="mt-2 text-sm text-red-700">{secondaryError.message}</p>
      </div>
    );
  }

  const assignments = (assignmentsR.data ?? []) as AssignmentRow[];
  const people = (peopleR.data ?? []) as PersonRow[];
  const personById = new Map(people.map((item) => [item.id, item]));
  const assignmentsByProcess = new Map<string, AssignmentRow[]>();
  assignments.forEach((assignment) => {
    const rows = assignmentsByProcess.get(assignment.process_id) ?? [];
    rows.push(assignment);
    assignmentsByProcess.set(assignment.process_id, rows);
  });

  const completedAssignments = assignments.filter(
    (item) => item.status === "completed",
  ).length;
  const activeAssignments = assignments.filter((item) =>
    ["pending", "in_progress"].includes(item.status),
  ).length;
  const evaluatedPeople = new Set(processes.map((item) => item.person_id)).size;
  const creditsRemaining = creditPlan
    ? Math.max(0, creditPlan.credits_total - creditPlan.credits_used)
    : 0;

  const enabledPsychometrics = (templatesR.data ?? []).filter((item) =>
    String(item.assessment_type ?? "").startsWith("psychometric_"),
  );

  return (
    <div className="space-y-7">
      <div>
        <Link
          href="/protected/empresas"
          className="text-sm font-bold text-neutral-500 hover:text-orange-600"
        >
          ← Volver a Empresas
        </Link>
      </div>

      <section className="rounded-3xl bg-[#4A4A4A] p-7 text-white shadow-sm md:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[.18em] text-orange-300">
              Ficha comercial y operativa
            </div>
            <h1 className="mt-2 text-4xl font-black">{organization.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/10 px-3 py-1.5 font-bold">
                {organization.lifecycle_stage === "prospect"
                  ? "Prospecto"
                  : organization.lifecycle_stage === "inactive"
                    ? "Inactiva"
                    : "Cliente"}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 font-bold">
                {users.length} usuario{users.length === 1 ? "" : "s"}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 font-bold">
                {enabledPsychometrics.length} pruebas habilitadas
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Personas" value={String(evaluatedPeople)} />
            <Metric label="Aplicaciones" value={String(assignments.length)} />
            <Metric label="Terminadas" value={String(completedAssignments)} />
            <Metric label="Créditos" value={String(creditsRemaining)} />
          </div>
        </div>
      </section>

      {reminders.length > 0 && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-amber-700">
            Seguimiento comercial
          </div>
          <h2 className="mt-2 text-xl font-black text-neutral-900">
            Módulos próximos a vencer
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {reminders.map((reminder) => {
              const module = modules.find(
                (item) => item.module_key === reminder.module_key,
              );
              return (
                <div
                  key={reminder.module_key}
                  className="rounded-2xl bg-white p-4 ring-1 ring-amber-200"
                >
                  <div className="font-black text-neutral-900">
                    {module?.name ?? reminder.module_key}
                  </div>
                  <div className="mt-1 text-sm text-amber-800">
                    {reminder.days_remaining >= 0
                      ? `Vence en ${reminder.days_remaining} días`
                      : `Venció hace ${Math.abs(reminder.days_remaining)} días`}
                    {" · "}
                    {new Date(reminder.ends_on + "T12:00:00").toLocaleDateString(
                      "es-MX",
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <CompanyAccessPanel
          organizationId={organization.id}
          organizationSlug={organization.slug}
          users={users}
        />

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
            Psicometrías
          </div>
          <h2 className="mt-2 text-2xl font-black text-neutral-900">
            Demo, créditos y plan
          </h2>
          <div className="mt-5">
            <CompanyCreditManager
              organizationId={organization.id}
              organizationName={organization.name}
              plan={creditPlan}
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <SmallMetric
              label="Créditos usados"
              value={creditPlan ? String(creditPlan.credits_used) : "0"}
            />
            <SmallMetric
              label="Aplicaciones activas"
              value={String(activeAssignments)}
            />
            <SmallMetric
              label="Reportes terminados"
              value={String(completedAssignments)}
            />
          </div>

          <div className="mt-5">
            <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
              Pruebas habilitadas
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {enabledPsychometrics.length ? (
                enabledPsychometrics.map((template) => (
                  <span
                    key={template.id}
                    className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-700"
                  >
                    {template.name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-neutral-500">
                  No hay psicometrías habilitadas.
                </span>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
          Módulos FactoRH
        </div>
        <h2 className="mt-2 text-2xl font-black text-neutral-900">
          Qué tiene, qué pidió y cuándo vence
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          Cada módulo conserva su propia fecha de inicio y vencimiento. Puedes registrar
          solicitudes aunque el módulo todavía no esté habilitado para autoservicio del cliente.
        </p>

        <div className="mt-6 grid gap-4">
          {modules.map((module) => (
            <CompanyModuleManager
              key={module.module_key}
              organizationId={organization.id}
              module={module}
              subscription={subscriptionByModule.get(module.module_key)}
              psychometricsManagedSeparately={
                module.module_key === "psychometrics"
              }
            />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
              Actividad
            </div>
            <h2 className="mt-2 text-2xl font-black text-neutral-900">
              Pruebas y aplicaciones recientes
            </h2>
          </div>
          <Link
            href={`/protected/psicometrias?organization=${organization.id}`}
            className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
          >
            Abrir psicometrías
          </Link>
        </div>

        <div className="mt-5 divide-y divide-neutral-100">
          {processes.slice(0, 12).map((process) => {
            const person = personById.get(process.person_id);
            const rows = assignmentsByProcess.get(process.id) ?? [];
            const done = rows.filter((item) => item.status === "completed").length;
            return (
              <div
                key={process.id}
                className="grid gap-3 py-4 md:grid-cols-[1.2fr_1fr_auto] md:items-center"
              >
                <div>
                  <div className="font-bold text-neutral-900">
                    {person
                      ? `${person.first_name} ${person.last_name ?? ""}`.trim()
                      : "Persona"}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {process.name}
                  </div>
                </div>
                <div className="text-sm text-neutral-600">
                  {done}/{rows.length} pruebas terminadas
                </div>
                <div className="text-xs text-neutral-400">
                  {new Date(process.created_at).toLocaleDateString("es-MX")}
                </div>
              </div>
            );
          })}
          {processes.length === 0 && (
            <div className="py-8 text-center text-sm text-neutral-500">
              Esta empresa todavía no tiene aplicaciones.
            </div>
          )}
        </div>
      </section>

      {(organization.commercial_email ||
        organization.phone ||
        organization.website ||
        organization.notes) && (
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
            Datos comerciales
          </div>
          <div className="mt-4 grid gap-3 text-sm text-neutral-700 md:grid-cols-2">
            {organization.commercial_email && (
              <div><strong>Correo:</strong> {organization.commercial_email}</div>
            )}
            {organization.phone && (
              <div><strong>Teléfono:</strong> {organization.phone}</div>
            )}
            {organization.website && (
              <div><strong>Sitio:</strong> {organization.website}</div>
            )}
            {organization.notes && (
              <div className="md:col-span-2">
                <strong>Notas:</strong> {organization.notes}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-300">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-neutral-900">{value}</div>
    </div>
  );
}
