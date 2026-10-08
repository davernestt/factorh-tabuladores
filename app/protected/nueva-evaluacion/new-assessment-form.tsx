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
  assessment_type: string;
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
};

type DeliveryLink = {
  assignment_id: string;
  path: string;
  template_name: string;
  relationship_type: string;
  evaluator_name: string | null;
  evaluator_email: string | null;
  evaluator_phone: string | null;
};

type CreatedResult = {
  process_id: string;
  assignment_id: string | null;
  assignment_ids: string[];
  public_token: string;
  path: string;
  participant_path: string | null;
  person_name: string;
  person_email: string | null;
  person_phone: string | null;
  organization_name: string;
  template_name: string;
  template_names: string[];
  reused_template_names: string[];
  delivery_links: DeliveryLink[];
};

type ValidResult = { template_id:string; template_name:string; source_assignment_id:string; completed_at:string; valid_until:string; validity_days:number };

export default function NewAssessmentForm({
  organizations,
  people,
  templates,
  templateAccess,
  batteries,
  batteryItems,
}: Props) {
  const initialOrganizationId = organizations[0]?.id ?? "";

  const [organizationId, setOrganizationId] = useState(initialOrganizationId);
  const [personMode, setPersonMode] = useState<"existing" | "new">(
    people.some((person) => person.organization_id === initialOrganizationId)
      ? "existing"
      : "new",
  );
  const [existingPersonId, setExistingPersonId] = useState("");
  const [templateIds, setTemplateIds] = useState<string[]>([]);
  const [selectedBatteryId, setSelectedBatteryId] = useState("");
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
  const [validResults, setValidResults] = useState<ValidResult[]>([]);
  const [validDecisions, setValidDecisions] = useState<Record<string, "reuse" | "force">>({});
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [interviewerName, setInterviewerName] = useState("");
  const [interviewerEmail, setInterviewerEmail] = useState("");
  const [interviewerPhone, setInterviewerPhone] = useState("");

  function clearPersonDraft() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setJobTitle("");
    setArea("");
  }

  function clearExternalEvaluators() {
    setManagerName("");
    setManagerEmail("");
    setManagerPhone("");
    setInterviewerName("");
    setInterviewerEmail("");
    setInterviewerPhone("");
  }

  function clearAssessmentDraft() {
    setExistingPersonId("");
    setTemplateIds([]);
    setSelectedBatteryId("");
    setProcessName("");
    setDueDate("");
    setCreated(null);
    setError(null);
    setValidResults([]);
    setValidDecisions({});
    clearPersonDraft();
    clearExternalEvaluators();
  }

  function selectPersonMode(mode: "existing" | "new") {
    setPersonMode(mode);
    setExistingPersonId("");
    clearPersonDraft();
    setValidResults([]);
    setValidDecisions({});
    setError(null);
  }

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

  const selectedManagerEvaluation = useMemo(
    () => availableTemplates.some((template) => template.assessment_type === "leadership_direction" && templateIds.includes(template.id)),
    [availableTemplates, templateIds],
  );

  const selectedInterview = useMemo(
    () => availableTemplates.some((template) => template.assessment_type === "leadership_interview" && templateIds.includes(template.id)),
    [availableTemplates, templateIds],
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
    clearAssessmentDraft();

    const hasPeople = people.some(
      (person) => person.organization_id === value,
    );
    setPersonMode(hasPeople ? "existing" : "new");
  }

  function toggleTemplate(templateId: string) {
    setSelectedBatteryId("");
    setValidResults([]);
    setValidDecisions({});
    setTemplateIds((current) =>
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId],
    );
  }

  function applyBattery(batteryId: string) {
    setSelectedBatteryId(batteryId);
    setValidResults([]);
    setValidDecisions({});

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
          reuse_template_ids: Object.entries(validDecisions).filter(([,decision])=>decision==="reuse").map(([id])=>id),
          force_template_ids: Object.entries(validDecisions).filter(([,decision])=>decision==="force").map(([id])=>id),
          manager_evaluator_name: managerName,
          manager_evaluator_email: managerEmail,
          manager_evaluator_phone: managerPhone,
          interviewer_name: interviewerName,
          interviewer_email: interviewerEmail,
          interviewer_phone: interviewerPhone,
        }),
      });

      const payload = await response.json();
      if (response.status === 409 && payload.code === "valid_results_found") {
        const rows = (payload.valid_results ?? []) as ValidResult[];
        setValidResults(rows);
        setValidDecisions((current) => ({...current, ...Object.fromEntries(rows.map((item) => [item.template_id, current[item.template_id] ?? "reuse"]))}));
        return;
      }
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

  function fullUrl(path: string) {
    return typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  }

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

          {created.participant_path && (
            <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-orange-600">Liga del líder evaluado</div>
              <div className="mt-1 text-sm text-neutral-600">Contiene únicamente las pruebas que debe responder la propia persona.</div>
              <div className="mt-3 break-all rounded-xl bg-neutral-50 p-3 text-sm font-medium text-neutral-800">{fullUrl(created.participant_path)}</div>
              <div className="mt-3">
                <CopyAssessmentLink
                  path={created.participant_path}
                  personName={created.person_name}
                  templateName={created.template_name}
                  organizationName={created.organization_name}
                  email={created.person_email}
                  phone={created.person_phone}
                />
              </div>
            </div>
          )}

          {created.delivery_links.map((link) => (
            <div key={link.assignment_id} className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-blue-700">
                {link.relationship_type === "manager" ? "Liga del jefe inmediato" : "Liga del entrevistador"}
              </div>
              <div className="mt-1 font-black text-neutral-900">{link.template_name}</div>
              <div className="mt-1 text-sm text-neutral-600">
                Evalúa a {created.person_name}{link.evaluator_name ? ` · Responde: ${link.evaluator_name}` : ""}
              </div>
              <div className="mt-3 break-all rounded-xl bg-white p-3 text-sm font-medium text-neutral-800">{fullUrl(link.path)}</div>
              <div className="mt-3">
                <CopyAssessmentLink
                  path={link.path}
                  personName={link.evaluator_name ?? "Evaluador"}
                  evaluatedPersonName={created.person_name}
                  relationshipLabel={link.relationship_type === "manager" ? "jefe inmediato" : "entrevistador"}
                  templateName={link.template_name}
                  organizationName={created.organization_name}
                  email={link.evaluator_email}
                  phone={link.evaluator_phone}
                />
              </div>
            </div>
          ))}

          {created.reused_template_names.length > 0 && <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"><strong>Resultados vigentes reutilizados:</strong> {created.reused_template_names.join(", ")}. Estas pruebas no se vuelven a contestar.</div>}
          <p className="mt-4 text-xs text-neutral-500">
            Esta liga abre el portal del participante. Si tiene varias pruebas,
            podrá responderlas desde el mismo acceso.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href="/protected"
            className="rounded-xl bg-orange-500 px-5 py-3 text-center font-bold text-white hover:bg-orange-600"
          >
            Volver al panel
          </a>
          <button
            type="button"
            onClick={() => {
              window.location.assign(
                `/protected/nueva-evaluacion?fresh=${Date.now()}`,
              );
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
    <form onSubmit={submit} autoComplete="off" className="space-y-6">
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
                onClick={() => selectPersonMode("existing")}
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
                onClick={() => selectPersonMode("new")}
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
                onChange={(event) => { setExistingPersonId(event.target.value); setValidResults([]); setValidDecisions({}); }}
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

      {(selectedManagerEvaluation || selectedInterview) && (
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Paso 3</div>
            <h2 className="mt-2 text-xl font-bold text-neutral-900">Quién responderá las evaluaciones externas</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Estas herramientas se ligan al expediente del líder evaluado, pero la liga se envía a la persona que observa o entrevista.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {selectedManagerEvaluation && (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                <div className="text-xs font-bold uppercase tracking-wide text-orange-600">Evaluación del jefe inmediato</div>
                <h3 className="mt-1 font-black text-neutral-900">Datos de quien evaluará al líder</h3>
                <div className="mt-4 space-y-4">
                  <Field label="Nombre del jefe inmediato">
                    <input className="input" value={managerName} onChange={(event)=>setManagerName(event.target.value)} required />
                  </Field>
                  <Field label="Correo (opcional)">
                    <input type="email" className="input" value={managerEmail} onChange={(event)=>setManagerEmail(event.target.value)} />
                  </Field>
                  <Field label="WhatsApp / teléfono (opcional)">
                    <input className="input" value={managerPhone} onChange={(event)=>setManagerPhone(event.target.value)} />
                  </Field>
                </div>
              </div>
            )}

            {selectedInterview && (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                <div className="text-xs font-bold uppercase tracking-wide text-orange-600">Entrevista conductual</div>
                <h3 className="mt-1 font-black text-neutral-900">Datos de quien realizará la entrevista</h3>
                <div className="mt-4 space-y-4">
                  <Field label="Nombre del entrevistador">
                    <input className="input" value={interviewerName} onChange={(event)=>setInterviewerName(event.target.value)} required />
                  </Field>
                  <Field label="Correo (opcional)">
                    <input type="email" className="input" value={interviewerEmail} onChange={(event)=>setInterviewerEmail(event.target.value)} />
                  </Field>
                  <Field label="WhatsApp / teléfono (opcional)">
                    <input className="input" value={interviewerPhone} onChange={(event)=>setInterviewerPhone(event.target.value)} />
                  </Field>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {validResults.length > 0 && (
        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm md:p-8">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Resultados vigentes detectados</div>
          <h2 className="mt-2 text-xl font-black text-neutral-900">Esta persona ya contestó una o más pruebas recientemente</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Por defecto recomendamos reutilizar el resultado vigente. Como administrador puedes forzar una nueva aplicación cuando exista una razón de negocio.</p>
          <div className="mt-5 space-y-3">{validResults.map(item => (
            <div key={item.template_id} className="rounded-2xl bg-white p-4">
              <div className="font-bold text-neutral-900">{item.template_name}</div>
              <div className="mt-1 text-xs text-neutral-500">Completada {new Date(item.completed_at).toLocaleDateString("es-MX")} · vigente hasta {new Date(item.valid_until+"T12:00:00").toLocaleDateString("es-MX")}</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className={validDecisions[item.template_id]!=="force"?"rounded-xl border border-blue-400 bg-blue-50 p-3 text-sm font-bold text-blue-800":"rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-600"}><input type="radio" className="mr-2" checked={validDecisions[item.template_id]!=="force"} onChange={()=>setValidDecisions(cur=>({...cur,[item.template_id]:"reuse"}))}/>Usar resultado vigente</label>
                <label className={validDecisions[item.template_id]==="force"?"rounded-xl border border-orange-400 bg-orange-50 p-3 text-sm font-bold text-orange-800":"rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-600"}><input type="radio" className="mr-2" checked={validDecisions[item.template_id]==="force"} onChange={()=>setValidDecisions(cur=>({...cur,[item.template_id]:"force"}))}/>Aplicar nuevamente</label>
              </div>
            </div>
          ))}</div>
          <p className="mt-4 text-xs text-blue-700">Vuelve a presionar “Crear” para continuar con estas decisiones.</p>
        </section>
      )}

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
