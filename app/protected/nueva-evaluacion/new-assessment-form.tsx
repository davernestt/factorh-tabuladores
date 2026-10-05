"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

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

type Props = {
  organizations: Organization[];
  people: Person[];
  templates: Template[];
};

type CreatedResult = {
  assignment_id: string;
  public_token: string;
  path: string;
  person_name: string;
  organization_name: string;
  template_name: string;
};

export default function NewAssessmentForm({
  organizations,
  people,
  templates,
}: Props) {
  const [organizationId, setOrganizationId] = useState(
    organizations[0]?.id ?? "",
  );
  const [personMode, setPersonMode] = useState<"existing" | "new">(
    people.some((person) => person.organization_id === organizations[0]?.id)
      ? "existing"
      : "new",
  );
  const [existingPersonId, setExistingPersonId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [area, setArea] = useState("");
  const [processName, setProcessName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [created, setCreated] = useState<CreatedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const availablePeople = useMemo(
    () => people.filter((person) => person.organization_id === organizationId),
    [people, organizationId],
  );

  const availableTemplates = useMemo(
    () =>
      templates.filter(
        (template) =>
          template.organization_id === null ||
          template.organization_id === organizationId,
      ),
    [templates, organizationId],
  );

  function changeOrganization(value: string) {
    setOrganizationId(value);
    setExistingPersonId("");
    setTemplateId("");
    setCreated(null);

    const hasPeople = people.some(
      (person) => person.organization_id === value,
    );
    setPersonMode(hasPeople ? "existing" : "new");
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
          template_id: templateId,
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

  if (created) {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm md:p-8">
        <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
          Evaluación creada
        </div>
        <h2 className="mt-4 text-2xl font-black text-neutral-900">
          Evaluación asignada correctamente
        </h2>
        <p className="mt-2 text-neutral-600">
          {created.person_name} · {created.organization_name}
        </p>

        <div className="mt-6 rounded-2xl bg-neutral-50 p-5">
          <div className="text-sm font-semibold text-neutral-900">
            {created.template_name}
          </div>
          <p className="mt-2 text-sm text-neutral-600">
            La liga quedó guardada con este candidato. Desde el panel de
            Candidatos podrás copiarla, abrirla o enviarla cuando la necesites.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/protected/candidatos"
            className="rounded-xl bg-orange-500 px-5 py-3 text-center font-bold text-white hover:bg-orange-600"
          >
            Ir a Candidatos
          </Link>
          <button
            type="button"
            onClick={() => {
              setCreated(null);
              setExistingPersonId("");
              setTemplateId("");
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
            Evaluación y fecha
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Evaluación">
            <select
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              className="input"
              required
            >
              <option value="">Selecciona evaluación</option>
              {availableTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            {organizationId && availableTemplates.length === 0 && (
              <p className="mt-2 text-sm text-amber-700">
                Esta empresa todavía no tiene evaluaciones disponibles.
              </p>
            )}
          </Field>

          <Field label="Fecha límite (opcional)">
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="input"
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Nombre del proceso (opcional)">
              <input
                value={processName}
                onChange={(event) => setProcessName(event.target.value)}
                className="input"
                placeholder="Ej. Diagnóstico de Liderazgo 2026"
              />
            </Field>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/protected"
          className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-center font-bold text-neutral-700 hover:bg-neutral-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={saving || !organizationId || !templateId}
          className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Creando..." : "Crear evaluación"}
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
