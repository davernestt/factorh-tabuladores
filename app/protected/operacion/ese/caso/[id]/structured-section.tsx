import { createAdminClient } from "@/lib/supabase/admin";
import {
  addRepeatableRow,
  deleteRepeatableRow,
  saveDocuments,
  saveLaborReference,
  savePersonalReferences,
  setSectionComplete,
} from "./capture-actions";

const documentTypes = [
  ["birth_certificate", "Acta de nacimiento"],
  ["official_id", "Identificación oficial"],
  ["curp", "CURP"],
  ["tax_status", "Constancia de situación fiscal / RFC"],
  ["imss", "NSS / documento IMSS"],
  ["proof_address", "Comprobante de domicilio"],
  ["proof_education", "Comprobante de estudios"],
  ["driver_license", "Licencia de conducir"],
  ["migration_document", "Documento migratorio"],
  ["other", "Otro"],
] as const;

const inputClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-orange-500";
const compactInput =
  "min-w-24 rounded-lg border border-neutral-300 bg-white px-2 py-2 text-xs outline-none focus:border-orange-500";

export default async function StructuredSection({
  caseId,
  sectionKey,
  completed,
}: {
  caseId: string;
  sectionKey: string;
  completed: boolean;
}) {
  if (sectionKey === "documentos") {
    return <Documents caseId={caseId} completed={completed} />;
  }
  if (sectionKey === "hogar") {
    return (
      <RepeatableTable
        caseId={caseId}
        sectionKey="hogar"
        completed={completed}
        entity="household"
        table="ese_household_members"
        title="Integrantes del hogar"
        addLabel="+ Agregar integrante"
        columns={[
          ["full_name", "Nombre", "text"],
          ["relationship", "Parentesco / relación", "text"],
          ["age", "Edad", "number"],
          ["education", "Escolaridad", "text"],
          ["occupation", "Ocupación", "text"],
          ["monthly_contribution", "Aportación mensual", "number"],
        ]}
      />
    );
  }
  if (sectionKey === "educacion") {
    return (
      <RepeatableTable
        caseId={caseId}
        sectionKey="educacion"
        completed={completed}
        entity="education"
        table="ese_education_records"
        title="Educación y formación"
        addLabel="+ Agregar estudio"
        columns={[
          ["level", "Nivel", "text"],
          ["institution", "Institución", "text"],
          ["period", "Periodo", "text"],
          ["status", "Estatus", "text"],
          ["document", "Documento", "text"],
          ["validation_result", "Resultado de validación", "text"],
        ]}
      />
    );
  }
  if (sectionKey === "laboral") {
    return (
      <RepeatableTable
        caseId={caseId}
        sectionKey="laboral"
        completed={completed}
        entity="employment"
        table="ese_employment_records"
        title="Trayectoria laboral declarada"
        addLabel="+ Agregar empleo"
        columns={[
          ["company", "Empresa", "text"],
          ["position", "Puesto", "text"],
          ["start_date", "Ingreso", "date"],
          ["end_date", "Egreso", "date"],
          ["reason_for_leaving", "Motivo de salida", "text"],
          ["contact", "Teléfono / contacto", "text"],
          ["validation", "Validación", "text"],
        ]}
      />
    );
  }
  if (sectionKey === "economia") {
    return <EconomyTables caseId={caseId} completed={completed} />;
  }
  if (sectionKey === "patrimonio") {
    return <PatrimonyTables caseId={caseId} completed={completed} />;
  }
  if (sectionKey === "referencia_laboral_1") {
    return <LaborReference caseId={caseId} order={1} completed={completed} />;
  }
  if (sectionKey === "referencia_laboral_2") {
    return <LaborReference caseId={caseId} order={2} completed={completed} />;
  }
  if (sectionKey === "referencias") {
    return <PersonalAndNeighborReferences caseId={caseId} completed={completed} />;
  }

  return null;
}

async function Documents({
  caseId,
  completed,
}: {
  caseId: string;
  completed: boolean;
}) {
  const db = createAdminClient();
  const { data } = await db
    .from("ese_case_documents")
    .select("document_type,presented,original_checked,valid,matches,observations")
    .eq("case_id", caseId);

  const byType = new Map((data ?? []).map((item) => [item.document_type, item]));

  return (
    <form action={saveDocuments} className="mt-6 grid gap-5">
      <input type="hidden" name="case_id" value={caseId} />

      <div className="overflow-x-auto rounded-2xl border border-neutral-200">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Documento</th>
              <th className="px-3 py-3">Presentado</th>
              <th className="px-3 py-3">Original cotejado</th>
              <th className="px-3 py-3">Vigente</th>
              <th className="px-3 py-3">Coincide</th>
              <th className="px-4 py-3">Observaciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {documentTypes.map(([key, label]) => {
              const row = byType.get(key);
              return (
                <tr key={key}>
                  <td className="px-4 py-3 font-semibold text-neutral-800">{label}</td>
                  <td className="px-3 py-3">
                    <YesNo
                      name={`${key}_presented`}
                      defaultValue={row?.presented ? "yes" : "no"}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <YesNo
                      name={`${key}_original`}
                      defaultValue={row?.original_checked ? "yes" : "no"}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <TriState
                      name={`${key}_valid`}
                      value={row?.valid}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <TriState
                      name={`${key}_matches`}
                      value={row?.matches}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      name={`${key}_observations`}
                      defaultValue={row?.observations ?? ""}
                      className={inputClass}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CompletionFooter
        completed={completed}
        submitLabel="Guardar validación documental"
      />
    </form>
  );
}

async function RepeatableTable({
  caseId,
  sectionKey,
  completed,
  entity,
  table,
  title,
  addLabel,
  columns,
}: {
  caseId: string;
  sectionKey: string;
  completed: boolean;
  entity: string;
  table: string;
  title: string;
  addLabel: string;
  columns: [string, string, "text" | "number" | "date"][];
}) {
  const db = createAdminClient();
  const { data } = await db
    .from(table)
    .select("*")
    .eq("case_id", caseId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="mt-6 grid gap-5">
      <div>
        <h3 className="font-black text-neutral-900">{title}</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Agrega tantos renglones como sean necesarios; ya no necesitas escribir la información separada por barras.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200">
        <table className="min-w-[950px] w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              {columns.map(([, label]) => (
                <th key={label} className="px-3 py-3">{label}</th>
              ))}
              <th className="px-3 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {(data ?? []).length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-neutral-400">
                  Aún no hay registros.
                </td>
              </tr>
            ) : (
              (data ?? []).map((row: any) => (
                <tr key={row.id}>
                  {columns.map(([key, , type]) => (
                    <td key={key} className="px-3 py-3 text-neutral-700">
                      {formatCell(row[key], type)}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right">
                    <form action={deleteRepeatableRow}>
                      <input type="hidden" name="case_id" value={caseId} />
                      <input type="hidden" name="entity" value={entity} />
                      <input type="hidden" name="row_id" value={row.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                      >
                        Eliminar
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}

            <tr className="bg-orange-50/40 align-top">
              <td colSpan={columns.length + 1} className="p-4">
                <form action={addRepeatableRow}>
                  <input type="hidden" name="case_id" value={caseId} />
                  <input type="hidden" name="entity" value={entity} />
                  <div
                    className="grid gap-3"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(columns.length, 4)}, minmax(150px, 1fr))`,
                    }}
                  >
                    {columns.map(([key, label, type]) => (
                      <label key={key} className="grid gap-1 text-xs font-bold text-neutral-600">
                        {label}
                        <input name={key} type={type} className={compactInput} />
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white"
                    >
                      {addLabel}
                    </button>
                  </div>
                </form>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionCompletion caseId={caseId} sectionKey={sectionKey} completed={completed} />
    </div>
  );
}

async function EconomyTables({
  caseId,
  completed,
}: {
  caseId: string;
  completed: boolean;
}) {
  const db = createAdminClient();
  const [incomeResult, expenseResult] = await Promise.all([
    db.from("ese_income_entries").select("*").eq("case_id", caseId).order("created_at"),
    db.from("ese_expense_entries").select("*").eq("case_id", caseId).order("created_at"),
  ]);

  const income = incomeResult.data ?? [];
  const expenses = expenseResult.data ?? [];
  const totalIncome = income.reduce((sum, item) => sum + Number(item.monthly_amount || 0), 0);
  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.monthly_amount || 0), 0);

  return (
    <div className="mt-6 grid gap-7">
      <MiniRepeatable
        caseId={caseId}
        entity="income"
        title="Ingresos mensuales"
        rows={income}
        columns={[
          ["person_name", "Persona que aporta", "text"],
          ["monthly_amount", "Ingreso mensual", "number"],
          ["source", "Fuente", "text"],
          ["support_observation", "Observaciones / soporte", "text"],
        ]}
      />
      <MiniRepeatable
        caseId={caseId}
        entity="expense"
        title="Gastos mensuales"
        rows={expenses}
        columns={[
          ["concept", "Concepto", "text"],
          ["monthly_amount", "Monto", "number"],
          ["paid_by", "Persona que paga", "text"],
          ["observations", "Observaciones", "text"],
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Total ingresos" value={money(totalIncome)} />
        <Summary label="Total egresos" value={money(totalExpense)} />
        <Summary label="Balance estimado" value={money(totalIncome - totalExpense)} />
      </div>

      <SectionCompletion caseId={caseId} sectionKey="economia" completed={completed} />
    </div>
  );
}

async function PatrimonyTables({
  caseId,
  completed,
}: {
  caseId: string;
  completed: boolean;
}) {
  const db = createAdminClient();
  const [assetsResult, debtsResult] = await Promise.all([
    db.from("ese_assets").select("*").eq("case_id", caseId).order("created_at"),
    db.from("ese_debts").select("*").eq("case_id", caseId).order("created_at"),
  ]);

  return (
    <div className="mt-6 grid gap-7">
      <MiniRepeatable
        caseId={caseId}
        entity="asset"
        title="Activos declarados"
        rows={assetsResult.data ?? []}
        columns={[
          ["asset_type", "Tipo", "text"],
          ["holder", "Titular", "text"],
          ["estimated_value", "Valor estimado", "number"],
          ["balance_or_lien", "Saldo / gravamen", "number"],
          ["support_observation", "Soporte / observación", "text"],
        ]}
      />

      <MiniRepeatable
        caseId={caseId}
        entity="debt"
        title="Obligaciones financieras"
        rows={debtsResult.data ?? []}
        columns={[
          ["creditor", "Institución / acreedor", "text"],
          ["debt_type", "Tipo", "text"],
          ["monthly_payment", "Pago mensual", "number"],
          ["estimated_balance", "Saldo estimado", "number"],
          ["observations", "Observaciones", "text"],
        ]}
      />

      <SectionCompletion caseId={caseId} sectionKey="patrimonio" completed={completed} />
    </div>
  );
}

function MiniRepeatable({
  caseId,
  entity,
  title,
  rows,
  columns,
}: {
  caseId: string;
  entity: string;
  title: string;
  rows: any[];
  columns: [string, string, "text" | "number" | "date"][];
}) {
  return (
    <section className="grid gap-4">
      <h3 className="font-black text-neutral-900">{title}</h3>
      <div className="overflow-x-auto rounded-2xl border border-neutral-200">
        <table className="min-w-[800px] w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              {columns.map(([, label]) => <th key={label} className="px-3 py-3">{label}</th>)}
              <th className="px-3 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map(([key, , type]) => (
                  <td key={key} className="px-3 py-3">{formatCell(row[key], type)}</td>
                ))}
                <td className="px-3 py-3 text-right">
                  <form action={deleteRepeatableRow}>
                    <input type="hidden" name="case_id" value={caseId} />
                    <input type="hidden" name="entity" value={entity} />
                    <input type="hidden" name="row_id" value={row.id} />
                    <button className="text-xs font-bold text-red-600">Eliminar</button>
                  </form>
                </td>
              </tr>
            ))}
            <tr className="bg-orange-50/40">
              <td colSpan={columns.length + 1} className="p-4">
                <form action={addRepeatableRow}>
                  <input type="hidden" name="case_id" value={caseId} />
                  <input type="hidden" name="entity" value={entity} />
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {columns.map(([key, label, type]) => (
                      <label key={key} className="grid gap-1 text-xs font-bold text-neutral-600">
                        {label}
                        <input name={key} type={type} className={compactInput} />
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white">
                      + Agregar renglón
                    </button>
                  </div>
                </form>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function LaborReference({
  caseId,
  order,
  completed,
}: {
  caseId: string;
  order: 1 | 2;
  completed: boolean;
}) {
  const db = createAdminClient();
  const { data } = await db
    .from("ese_labor_references")
    .select("*")
    .eq("case_id", caseId)
    .eq("sort_order", order)
    .maybeSingle();

  const v = data ?? ({} as any);

  return (
    <form action={saveLaborReference} className="mt-6 grid gap-4 md:grid-cols-2">
      <input type="hidden" name="case_id" value={caseId} />
      <input type="hidden" name="sort_order" value={order} />

      <TextField label="Empresa" name="company" value={v.company} />
      <TextField label="Teléfono / correo" name="phone_email" value={v.phone_email} />
      <TextField label="Domicilio" name="address" value={v.address} wide />
      <TextField label="Área / departamento" name="department" value={v.department} />
      <TextField label="Puesto confirmado" name="confirmed_position" value={v.confirmed_position} />
      <TextField label="Jefatura inmediata" name="immediate_supervisor" value={v.immediate_supervisor} />
      <TextField label="Fecha de ingreso" name="start_date" value={v.start_date} type="date" />
      <TextField label="Fecha de egreso" name="end_date" value={v.end_date} type="date" />
      <TextField label="Sueldo declarado" name="declared_salary" value={v.declared_salary} type="number" />
      <TextField label="Sueldo confirmado" name="confirmed_salary" value={v.confirmed_salary} type="number" />
      <TextField label="Motivo declarado" name="declared_reason" value={v.declared_reason} wide />
      <TextField label="Motivo confirmado" name="confirmed_reason" value={v.confirmed_reason} wide />

      <label className="grid gap-2 text-sm font-semibold text-neutral-700">
        ¿Es recontratable?
        <select name="rehire_status" defaultValue={v.rehire_status ?? ""} className={inputClass}>
          <option value="">Seleccionar</option>
          <option value="yes">Sí</option>
          <option value="no">No</option>
          <option value="not_informed">No informado</option>
        </select>
      </label>

      <label className="grid gap-2 text-sm font-semibold text-neutral-700">
        Estado del contacto
        <select name="contact_status" defaultValue={v.contact_status ?? "pending"} className={inputClass}>
          <option value="pending">Pendiente</option>
          <option value="contacted">Contactada</option>
          <option value="confirmed">Confirmada</option>
          <option value="not_found">No localizada</option>
          <option value="no_response">Sin respuesta</option>
        </select>
      </label>

      <TextField label="Referencia proporcionada por" name="reference_by" value={v.reference_by} />
      <TextField label="Puesto de quien refiere" name="referrer_position" value={v.referrer_position} />
      <TextField label="Fecha y medio de contacto" name="contact_date_method" value={v.contact_date_method} wide />
      <Area label="Funciones y responsabilidades confirmadas" name="confirmed_functions" value={v.confirmed_functions} />
      <Area label="Evaluación de la referencia" name="evaluation" value={v.evaluation} />
      <Area label="Inconsistencias, aclaraciones y conclusión" name="conclusion" value={v.conclusion} />

      <CompletionFooter completed={completed} submitLabel="Guardar referencia laboral" />
    </form>
  );
}

async function PersonalAndNeighborReferences({
  caseId,
  completed,
}: {
  caseId: string;
  completed: boolean;
}) {
  const db = createAdminClient();
  const [personalResult, neighborResult] = await Promise.all([
    db
      .from("ese_personal_references")
      .select("*")
      .eq("case_id", caseId)
      .order("sort_order"),
    db
      .from("ese_neighbor_references")
      .select("*")
      .eq("case_id", caseId)
      .maybeSingle(),
  ]);

  const personalMap = new Map((personalResult.data ?? []).map((item) => [item.sort_order, item]));
  const neighbor = neighborResult.data ?? ({} as any);

  return (
    <form action={savePersonalReferences} className="mt-6 grid gap-6">
      <input type="hidden" name="case_id" value={caseId} />

      {[1, 2].map((order) => {
        const ref = personalMap.get(order) ?? ({} as any);
        return (
          <section key={order} className="rounded-2xl border border-neutral-200 p-5">
            <h3 className="font-black text-neutral-900">Referencia personal {order}</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <TextField label="Nombre" name={`p${order}_full_name`} value={ref.full_name} />
              <TextField label="Teléfono" name={`p${order}_phone`} value={ref.phone} />
              <TextField label="Relación con la persona candidata" name={`p${order}_relationship`} value={ref.relationship} />
              <TextField label="Tiempo de conocerle" name={`p${order}_time_known`} value={ref.time_known} />
              <Area label="Conducta general" name={`p${order}_general_conduct`} value={ref.general_conduct} />
              <Area label="Relación con otras personas" name={`p${order}_relationships`} value={ref.relationships} />
              <Area label="Responsabilidad y confiabilidad" name={`p${order}_responsibility_reliability`} value={ref.responsibility_reliability} />
              <Area label="Conocimiento de la dinámica familiar" name={`p${order}_family_dynamic`} value={ref.family_dynamic} />
              <TextField label="¿La recomendaría?" name={`p${order}_recommendation`} value={ref.recommendation} />
              <Area label="Observaciones" name={`p${order}_observations`} value={ref.observations} />
            </div>
          </section>
        );
      })}

      <section className="rounded-2xl border border-neutral-200 p-5">
        <h3 className="font-black text-neutral-900">Referencia vecinal</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextField label="Nombre de la persona vecina" name="n_full_name" value={neighbor.full_name} />
          <TextField label="Teléfono" name="n_phone" value={neighbor.phone} />
          <TextField label="Domicilio / ubicación" name="n_address_location" value={neighbor.address_location} wide />
          <TextField label="Tiempo de conocerle" name="n_time_known" value={neighbor.time_known} />
          <TextField label="Relación con la persona candidata / familia" name="n_relation_to_candidate" value={neighbor.relation_to_candidate} />
          <Area label="Tiempo de residencia observado" name="n_observed_residency" value={neighbor.observed_residency} />
          <Area label="Convivencia y conducta general" name="n_coexistence_conduct" value={neighbor.coexistence_conduct} />
          <Area label="Incidentes relevantes conocidos" name="n_relevant_incidents" value={neighbor.relevant_incidents} />
          <TextField label="¿La recomendaría?" name="n_recommendation" value={neighbor.recommendation} />
          <Area label="Observaciones" name="n_observations" value={neighbor.observations} />
        </div>
      </section>

      <CompletionFooter completed={completed} submitLabel="Guardar referencias" />
    </form>
  );
}

function TextField({
  label,
  name,
  value,
  type = "text",
  wide = false,
}: {
  label: string;
  name: string;
  value?: any;
  type?: string;
  wide?: boolean;
}) {
  return (
    <label className={`grid gap-2 text-sm font-semibold text-neutral-700 ${wide ? "md:col-span-2" : ""}`}>
      {label}
      <input name={name} type={type} defaultValue={value ?? ""} className={inputClass} />
    </label>
  );
}

function Area({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value?: any;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-neutral-700 md:col-span-2">
      {label}
      <textarea name={name} rows={4} defaultValue={value ?? ""} className={inputClass} />
    </label>
  );
}

function YesNo({ name, defaultValue }: { name: string; defaultValue: string }) {
  return (
    <select name={name} defaultValue={defaultValue} className={compactInput}>
      <option value="no">No</option>
      <option value="yes">Sí</option>
    </select>
  );
}

function TriState({ name, value }: { name: string; value: boolean | null | undefined }) {
  const defaultValue = value === true ? "yes" : value === false ? "no" : "";
  return (
    <select name={name} defaultValue={defaultValue} className={compactInput}>
      <option value="">No verificado</option>
      <option value="yes">Sí</option>
      <option value="no">No</option>
    </select>
  );
}

function CompletionFooter({
  completed,
  submitLabel,
}: {
  completed: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-neutral-50 p-4 md:col-span-2 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex items-center gap-3 text-sm font-bold text-neutral-700">
        <input
          type="checkbox"
          name="completed"
          defaultChecked={completed}
          className="h-5 w-5 accent-orange-500"
        />
        Marcar esta sección como completa
      </label>
      <button
        type="submit"
        className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white"
      >
        {submitLabel}
      </button>
    </div>
  );
}

function SectionCompletion({
  caseId,
  sectionKey,
  completed,
}: {
  caseId: string;
  sectionKey: string;
  completed: boolean;
}) {
  return (
    <form action={setSectionComplete} className="flex justify-end">
      <input type="hidden" name="case_id" value={caseId} />
      <input type="hidden" name="section_key" value={sectionKey} />
      <input type="hidden" name="completed" value={completed ? "no" : "yes"} />
      <button
        type="submit"
        className={
          completed
            ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700"
            : "rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700"
        }
      >
        {completed ? "✓ Sección completa" : "Marcar sección completa"}
      </button>
    </form>
  );
}

function formatCell(value: any, type: "text" | "number" | "date") {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "number") return money(Number(value));
  return String(value);
}

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}
