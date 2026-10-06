"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CopyAssessmentLink from "../copy-assessment-link";

type Organization = {
  id: string;
  name: string;
};

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

type Template = {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
};

type TemplateAccess = {
  organization_id: string;
  template_id: string;
  enabled: boolean;
  participant_sendable: boolean;
};

type Battery = {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
};

type BatteryItem = {
  battery_id: string;
  template_id: string;
  sort_order: number;
};

type Props = {
  organizations: Organization[];
  people: Person[];
  templates: Template[];
  templateAccess: TemplateAccess[];
  batteries: Battery[];
  batteryItems: BatteryItem[];
  initialOrganizationId?: string;
  initialPersonId?: string;
  initialProcessName?: string;
  returnTo?: string;
  initialRecruitmentCandidateId?: string;
};

type CreatedResult = {
  process_id: string;
  assignment_id: string | null;
  assignment_ids: string[];
  public_token: string;
  path: string;
  person_name: string;
  person_email: string | null;
  person_phone: string | null;
  organization_name: string;
  template_name: string;
  template_names: string[];
};

export default function NewAssessmentForm({
  organizations,
  people,
  templates,
  templateAccess,
  batteries,
  batteryItems,
  initialOrganizationId: initialOrganizationIdProp,
  initialPersonId,
  initialProcessName,
  returnTo,
  initialRecruitmentCandidateId,
}: Props) {
  const initialOrganizationId =
    initialOrganizationIdProp &&
    organizations.some((organization) => organization.id === initialOrganizationIdProp)
      ? initialOrganizationIdProp
      : organizations[0]?.id ?? "";

  const preselectedPerson =
    initialPersonId
      ? people.find(
          (person) =>
            person.id === initialPersonId &&
            person.organization_id === initialOrganizationId,
        )
      : undefined;

  const [organizationId, setOrganizationId] = useState(initialOrganizationId);
  const [personMode, setPersonMode] = useState<"existing" | "new">(
    preselectedPerson ||
    people.some((person) => person.organization_id === initialOrganizationId)
      ? "existing"
      : "new",
  );
  const [existingPersonId, setExistingPersonId] = useState(
    preselectedPerson?.id ?? "",
  );
  const [templateIds, setTemplateIds] = useState<string[]>([]);
  const [selectedBatteryId, setSelectedBatteryId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [area, setArea] = useState("");
  const [processName, setProcessName] = useState(initialProcessName ?? "");
  const [dueDate, setDueDate] = useState("");
  const [created, setCreated] = useState<CreatedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const availablePeople = useMemo(
    () => people.filter((person) => person.organization_id === organizationId),
    [people, organizationId],
  );

  const allowedTemplateIds = useMemo(
    () =>
      new Set(
        templateAccess
          .filter(
            (row) =>
              row.organization_id === organizationId &&
              row.enabled &&
              row.participant_sendable,
          )
          .map((row) => row.template_id),
      ),
    [templateAccess, organizationId],
  );

  const availableTemplates = useMemo(
    () => templates.filter((template) => allowedTemplateIds.has(template.id)),
    [templates, allowedTemplateIds],
  );

  const availableBatteries = useMemo(() => {
    return batteries.filter((battery) => {
      if (
        battery.organization_id !== null &&
        battery.organization_id !== organizationId
      ) {
        return false;
      }

      const items = batteryItems.filter(
        (item) => item.battery_id === battery.id,
      );

      return (
        items.length > 0 &&
        items.every((item) => allowedTemplateIds.has(item.template_id))
      );
    });
  }, [batteries, batteryItems, organizationId, allowedTemplateIds]);

  function changeOrganization(value: string) {
    setOrganizationId(value);
    setExistingPersonId("");
    setTemplateIds([]);
    setSelectedBatteryId("");
    setCreated(null);

    const hasPeople = people.some(
      (person) => person.organization_id === value,
    );
    setPersonMode(hasPeople ? "existing" : "new");
  }

  function toggleTemplate(templateId: string) {
    setSelectedBatteryId("");
    setTemplateIds((current) =>
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId],
    );
  }

  function applyBattery(batteryId: string) {
    setSelectedBatteryId(batteryId);

    if (!batteryId) return;

    const ids = batteryItems
      .filter((item) => item.battery_id === batteryId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => item.template_id)
      .filter((id) => allowedTemplateIds.has(id));

    setTemplateIds(ids);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setCreated(null);

    try {
      const response = await fetch("/api/admin/evaluaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: organizationId,
          template_ids: templateIds,
          existing_person_id:
            personMode === "existing" ? existingPersonId : null,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          job_title: jobTitle,
          area,
          process_name: processName,
          due_date: dueDate || null,
          recruitment_job_candidate_id: initialRecruitmentCandidateId || null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No fue posible crear la evaluación.");
      }

      setCreated(payload as CreatedResult);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible crear la evaluación.",
      );
    } finally {
      setSaving(false);
    }
  }

  const fullUrl =
    created && typeof window !== "undefined"
      ? `${window.location.origin}${created.path}`
      : "";

  if (created) {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm md:p-8">
        <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
          Liga creada
        </div>
        <h2 className="mt-4 text-2xl font-black text-neutral-900">
          Evaluaciones asignadas correctamente
        </h2>
        <p className="mt-2 text-neutral-600">
          {created.person_name} · {created.organization_name}
        </p>

        <div className="mt-6 rounded-2xl bg-neutral-50 p-5">
          <div className="text-sm font-semibold text-neutral-900">
            {created.template_name}
          </div>

          {created.template_names.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {created.template_names.map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-600 ring-1 ring-neutral-200"
                >
                  {name}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Liga única para responder
          </div>
          <div className="mt-2 break-all rounded-xl border border-neutral-200 bg-white p-3 text-sm font-medium text-neutral-800">
            {fullUrl}
          </div>

          <div className="mt-4">
            <CopyAssessmentLink
              path={created.path}
              personName={created.person_name}
              templateName={created.template_name}
              organizationName={created.organization_name}
              email={created.person_email}
              phone={created.person_phone}
            />
          </div>

          <p className="mt-4 text-xs text-neutral-500">
            Esta liga abre el portal del participante. Si tiene varias pruebas,
            podrá responderlas desde el mismo acceso.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={returnTo ?? "/protected"}
            className="rounded-xl bg-orange-500 px-5 py-3 text-center font-bold text-white hover:bg-orange-600"
          >
            {returnTo ? "Volver al proceso de selección" : "Volver al panel"}
          </Link>
          <button
            type="button"
            onClick={() => {
              setCreated(null);
              setExistingPersonId("");
              setTemplateIds([]);
              setSelectedBatteryId("");
              setProcessName("");
              setDueDate("");
            }}
            className="rounded-xl border border-neutral-300 bg-white px-5 py-3 font-bold text-neutral-800 hover:bg-neutral-50"
          >
            Crear otra evaluación
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
            Paso 1
          </div>
          <h2 className="mt-2 text-xl font-bold text-neutral-900">
            Empresa y colaborador
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Empresa">
            <select
              value={organizationId}
              onChange={(event) => changeOrganization(event.target.value)}
              className="input"
              required
            >
              <option value="">Selecciona empresa</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tipo de colaborador">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPersonMode("existing")}
                disabled={availablePeople.length === 0}
                className={
                  personMode === "existing"
                    ? "rounded-xl border border-orange-500 bg-orange-50 px-4 py-3 font-semibold text-orange-700"
                    : "rounded-xl border border-neutral-300 px-4 py-3 font-semibold text-neutral-700 disabled:opacity-40"
                }
              >
                Existente
              </button>
              <button
                type="button"
                onClick={() => setPersonMode("new")}
                className={
                  personMode === "new"
                    ? "rounded-xl border border-orange-500 bg-orange-50 px-4 py-3 font-semibold text-orange-700"
                    : "rounded-xl border border-neutral-300 px-4 py-3 font-semibold text-neutral-700"
                }
              >
                Nueva persona
              </button>
            </div>
          </Field>
        </div>

        {personMode === "existing" ? (
          <div className="mt-5">
            <Field label="Colaborador">
              <select
                value={existingPersonId}
                onChange={(event) => setExistingPersonId(event.target.value)}
                className="input"
                required
              >
                <option value="">Selecciona colaborador</option>
                {availablePeople.map((person) => (
                  <option key={person.id} value={person.id}>
                    {`${person.first_name} ${person.last_name ?? ""}`.trim()}
                    {person.job_title ? ` · ${person.job_title}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Nombre">
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="input"
                required
              />
            </Field>
            <Field label="Apellidos">
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="input"
              />
            </Field>
            <Field label="Correo">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input"
              />
            </Field>
            <Field label="Teléfono">
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="input"
              />
            </Field>
            <Field label="Puesto">
              <input
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                className="input"
              />
            </Field>
            <Field label="Área">
              <input
                value={area}
                onChange={(event) => setArea(event.target.value)}
                className="input"
              />
            </Field>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
            Paso 2
          </div>
          <h2 className="mt-2 text-xl font-bold text-neutral-900">
            Elige las evaluaciones
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Puedes seleccionar una sola prueba o varias. En ambos casos se genera
            una sola liga para el participante.
          </p>
        </div>

        {availableBatteries.length > 0 && (
          <div className="mb-5">
            <Field label="Batería predeterminada (opcional)">
              <select
                value={selectedBatteryId}
                onChange={(event) => applyBattery(event.target.value)}
                className="input"
              >
                <option value="">Personalizada: elegir pruebas manualmente</option>
                {availableBatteries.map((battery) => (
                  <option key={battery.id} value={battery.id}>
                    {battery.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {availableTemplates.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            Esta empresa todavía no tiene pruebas habilitadas para enviarse a
            participantes. Puedes configurarlas desde la sección Empresas.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {availableTemplates.map((template) => {
              const selected = templateIds.includes(template.id);
              return (
                <label
                  key={template.id}
                  className={
                    selected
                      ? "cursor-pointer rounded-2xl border border-orange-400 bg-orange-50 p-4"
                      : "cursor-pointer rounded-2xl border border-neutral-200 bg-neutral-50 p-4 hover:border-neutral-300"
                  }
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleTemplate(template.id)}
                      className="mt-1 h-4 w-4 accent-orange-500"
                    />
                    <div>
                      <div className="font-bold text-neutral-900">
                        {template.name}
                      </div>
                      {template.description && (
                        <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-neutral-50 p-4 text-sm">
          <span className="font-bold text-neutral-900">
            {templateIds.length}
          </span>{" "}
          <span className="text-neutral-600">
            {templateIds.length === 1
              ? "evaluación seleccionada"
              : "evaluaciones seleccionadas"}
          </span>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="Fecha límite (opcional)">
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="input"
            />
          </Field>

          <Field label="Nombre del proceso o batería (opcional)">
            <input
              value={processName}
              onChange={(event) => setProcessName(event.target.value)}
              className="input"
              placeholder="Ej. Batería de ingreso · Ventas"
            />
          </Field>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href={returnTo ?? "/protected"}
          className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-center font-bold text-neutral-700 hover:bg-neutral-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={saving || !organizationId || templateIds.length === 0}
          className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving
            ? "Creando..."
            : templateIds.length > 1
              ? "Crear batería y liga"
              : "Crear evaluación y liga"}
        </button>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid rgb(212 212 212);
          border-radius: 0.75rem;
          background: white;
          padding: 0.75rem 0.875rem;
          color: rgb(23 23 23);
          outline: none;
        }
        .input:focus {
          border-color: rgb(249 115 22);
          box-shadow: 0 0 0 3px rgb(255 237 213);
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-neutral-800">
        {label}
      </span>
      {children}
    </label>
  );
}
