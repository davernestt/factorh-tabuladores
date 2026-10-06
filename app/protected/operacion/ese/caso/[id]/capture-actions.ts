"use server";

import { getCurrentAppUser } from "@/lib/auth/app-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const SECTION_COUNT = 16;

const repeatableConfig: Record<
  string,
  { table: string; fields: { key: string; type?: "number" | "integer" | "date" }[] }
> = {
  household: {
    table: "ese_household_members",
    fields: [
      { key: "full_name" },
      { key: "relationship" },
      { key: "age", type: "integer" },
      { key: "education" },
      { key: "occupation" },
      { key: "monthly_contribution", type: "number" },
    ],
  },
  education: {
    table: "ese_education_records",
    fields: [
      { key: "level" },
      { key: "institution" },
      { key: "period" },
      { key: "status" },
      { key: "document" },
      { key: "validation_result" },
    ],
  },
  employment: {
    table: "ese_employment_records",
    fields: [
      { key: "company" },
      { key: "position" },
      { key: "start_date", type: "date" },
      { key: "end_date", type: "date" },
      { key: "reason_for_leaving" },
      { key: "contact" },
      { key: "validation" },
    ],
  },
  income: {
    table: "ese_income_entries",
    fields: [
      { key: "person_name" },
      { key: "monthly_amount", type: "number" },
      { key: "source" },
      { key: "support_observation" },
    ],
  },
  expense: {
    table: "ese_expense_entries",
    fields: [
      { key: "concept" },
      { key: "monthly_amount", type: "number" },
      { key: "paid_by" },
      { key: "observations" },
    ],
  },
  asset: {
    table: "ese_assets",
    fields: [
      { key: "asset_type" },
      { key: "holder" },
      { key: "estimated_value", type: "number" },
      { key: "balance_or_lien", type: "number" },
      { key: "support_observation" },
    ],
  },
  debt: {
    table: "ese_debts",
    fields: [
      { key: "creditor" },
      { key: "debt_type" },
      { key: "monthly_payment", type: "number" },
      { key: "estimated_balance", type: "number" },
      { key: "observations" },
    ],
  },
};

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

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function numberOrNull(value: FormDataEntryValue | null) {
  const text = clean(value);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function integerOrNull(value: FormDataEntryValue | null) {
  const text = clean(value);
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanOrNull(value: FormDataEntryValue | null) {
  const text = clean(value);
  if (!text) return null;
  if (text === "yes") return true;
  if (text === "no") return false;
  return null;
}

async function refreshProgress(caseId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("ese_case_sections")
    .select("section_key")
    .eq("case_id", caseId)
    .eq("completed", true);

  const progress = Math.round(((data?.length ?? 0) / SECTION_COUNT) * 100);

  await db
    .from("ese_cases")
    .update({ progress, updated_at: new Date().toISOString() })
    .eq("id", caseId);
}

function revalidateCase(caseId: string) {
  revalidatePath("/protected/operacion/ese");
  revalidatePath(`/protected/operacion/ese/caso/${caseId}`);
}

export async function addRepeatableRow(formData: FormData) {
  await requireEseUser();

  const caseId = clean(formData.get("case_id"));
  const entity = clean(formData.get("entity"));
  const config = repeatableConfig[entity];

  if (!caseId || !config) throw new Error("Registro inválido.");

  const payload: Record<string, string | number | null> = { case_id: caseId };

  for (const field of config.fields) {
    const value = formData.get(field.key);
    if (field.type === "number") payload[field.key] = numberOrNull(value);
    else if (field.type === "integer") payload[field.key] = integerOrNull(value);
    else if (field.type === "date") payload[field.key] = clean(value) || null;
    else payload[field.key] = clean(value) || null;
  }

  const requiredKey =
    entity === "household"
      ? "full_name"
      : entity === "employment"
        ? "company"
        : entity === "income"
          ? "person_name"
          : entity === "expense"
            ? "concept"
            : entity === "asset"
              ? "asset_type"
              : entity === "debt"
                ? "creditor"
                : null;

  if (requiredKey && !payload[requiredKey]) {
    throw new Error("Falta el dato principal del registro.");
  }

  const db = createAdminClient();
  const { error } = await db.from(config.table).insert(payload);
  if (error) throw new Error(error.message);

  revalidateCase(caseId);
}

export async function deleteRepeatableRow(formData: FormData) {
  await requireEseUser();

  const caseId = clean(formData.get("case_id"));
  const entity = clean(formData.get("entity"));
  const rowId = clean(formData.get("row_id"));
  const config = repeatableConfig[entity];

  if (!caseId || !rowId || !config) throw new Error("Registro inválido.");

  const db = createAdminClient();
  const { error } = await db
    .from(config.table)
    .delete()
    .eq("id", rowId)
    .eq("case_id", caseId);

  if (error) throw new Error(error.message);
  revalidateCase(caseId);
}

export async function saveDocuments(formData: FormData) {
  const appUser = await requireEseUser();
  const caseId = clean(formData.get("case_id"));
  if (!caseId) throw new Error("Estudio inválido.");

  const rows = documentTypes.map(([key]) => ({
    case_id: caseId,
    document_type: key,
    presented: clean(formData.get(`${key}_presented`)) === "yes",
    original_checked: clean(formData.get(`${key}_original`)) === "yes",
    valid: booleanOrNull(formData.get(`${key}_valid`)),
    matches: booleanOrNull(formData.get(`${key}_matches`)),
    observations: clean(formData.get(`${key}_observations`)) || null,
    updated_at: new Date().toISOString(),
  }));

  const db = createAdminClient();
  const { error } = await db
    .from("ese_case_documents")
    .upsert(rows, { onConflict: "case_id,document_type" });

  if (error) throw new Error(error.message);

  await db.from("ese_case_sections").upsert(
    {
      case_id: caseId,
      section_key: "documentos",
      completed: formData.get("completed") === "on",
      updated_by: appUser.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "case_id,section_key" },
  );

  await refreshProgress(caseId);
  revalidateCase(caseId);
}

export async function saveLaborReference(formData: FormData) {
  const appUser = await requireEseUser();

  const caseId = clean(formData.get("case_id"));
  const sortOrder = integerOrNull(formData.get("sort_order"));
  if (!caseId || !sortOrder || ![1, 2].includes(sortOrder)) {
    throw new Error("Referencia laboral inválida.");
  }

  const payload = {
    case_id: caseId,
    sort_order: sortOrder,
    company: clean(formData.get("company")) || null,
    phone_email: clean(formData.get("phone_email")) || null,
    address: clean(formData.get("address")) || null,
    department: clean(formData.get("department")) || null,
    confirmed_position: clean(formData.get("confirmed_position")) || null,
    immediate_supervisor: clean(formData.get("immediate_supervisor")) || null,
    start_date: clean(formData.get("start_date")) || null,
    end_date: clean(formData.get("end_date")) || null,
    declared_salary: numberOrNull(formData.get("declared_salary")),
    confirmed_salary: numberOrNull(formData.get("confirmed_salary")),
    declared_reason: clean(formData.get("declared_reason")) || null,
    confirmed_reason: clean(formData.get("confirmed_reason")) || null,
    rehire_status: clean(formData.get("rehire_status")) || null,
    reference_by: clean(formData.get("reference_by")) || null,
    referrer_position: clean(formData.get("referrer_position")) || null,
    contact_date_method: clean(formData.get("contact_date_method")) || null,
    confirmed_functions: clean(formData.get("confirmed_functions")) || null,
    evaluation: clean(formData.get("evaluation")) || null,
    conclusion: clean(formData.get("conclusion")) || null,
    contact_status: clean(formData.get("contact_status")) || "pending",
    updated_at: new Date().toISOString(),
  };

  const db = createAdminClient();
  const { error } = await db
    .from("ese_labor_references")
    .upsert(payload, { onConflict: "case_id,sort_order" });

  if (error) throw new Error(error.message);

  const sectionKey = `referencia_laboral_${sortOrder}`;
  await db.from("ese_case_sections").upsert(
    {
      case_id: caseId,
      section_key: sectionKey,
      completed: formData.get("completed") === "on",
      updated_by: appUser.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "case_id,section_key" },
  );

  await refreshProgress(caseId);
  revalidateCase(caseId);
}

export async function savePersonalReferences(formData: FormData) {
  const appUser = await requireEseUser();
  const caseId = clean(formData.get("case_id"));
  if (!caseId) throw new Error("Estudio inválido.");

  const rows = [1, 2].map((sortOrder) => ({
    case_id: caseId,
    sort_order: sortOrder,
    full_name: clean(formData.get(`p${sortOrder}_full_name`)) || null,
    phone: clean(formData.get(`p${sortOrder}_phone`)) || null,
    relationship: clean(formData.get(`p${sortOrder}_relationship`)) || null,
    time_known: clean(formData.get(`p${sortOrder}_time_known`)) || null,
    general_conduct: clean(formData.get(`p${sortOrder}_general_conduct`)) || null,
    relationships: clean(formData.get(`p${sortOrder}_relationships`)) || null,
    responsibility_reliability:
      clean(formData.get(`p${sortOrder}_responsibility_reliability`)) || null,
    family_dynamic: clean(formData.get(`p${sortOrder}_family_dynamic`)) || null,
    recommendation: clean(formData.get(`p${sortOrder}_recommendation`)) || null,
    observations: clean(formData.get(`p${sortOrder}_observations`)) || null,
    updated_at: new Date().toISOString(),
  }));

  const neighbor = {
    case_id: caseId,
    full_name: clean(formData.get("n_full_name")) || null,
    phone: clean(formData.get("n_phone")) || null,
    address_location: clean(formData.get("n_address_location")) || null,
    time_known: clean(formData.get("n_time_known")) || null,
    relation_to_candidate: clean(formData.get("n_relation_to_candidate")) || null,
    observed_residency: clean(formData.get("n_observed_residency")) || null,
    coexistence_conduct: clean(formData.get("n_coexistence_conduct")) || null,
    relevant_incidents: clean(formData.get("n_relevant_incidents")) || null,
    recommendation: clean(formData.get("n_recommendation")) || null,
    observations: clean(formData.get("n_observations")) || null,
    updated_at: new Date().toISOString(),
  };

  const db = createAdminClient();
  const personalResult = await db
    .from("ese_personal_references")
    .upsert(rows, { onConflict: "case_id,sort_order" });

  if (personalResult.error) throw new Error(personalResult.error.message);

  const neighborResult = await db
    .from("ese_neighbor_references")
    .upsert(neighbor, { onConflict: "case_id" });

  if (neighborResult.error) throw new Error(neighborResult.error.message);

  await db.from("ese_case_sections").upsert(
    {
      case_id: caseId,
      section_key: "referencias",
      completed: formData.get("completed") === "on",
      updated_by: appUser.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "case_id,section_key" },
  );

  await refreshProgress(caseId);
  revalidateCase(caseId);
}

export async function setSectionComplete(formData: FormData) {
  const appUser = await requireEseUser();
  const caseId = clean(formData.get("case_id"));
  const sectionKey = clean(formData.get("section_key"));
  const completed = clean(formData.get("completed")) === "yes";

  if (!caseId || !sectionKey) throw new Error("Sección inválida.");

  const db = createAdminClient();
  const { error } = await db.from("ese_case_sections").upsert(
    {
      case_id: caseId,
      section_key: sectionKey,
      completed,
      updated_by: appUser.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "case_id,section_key" },
  );

  if (error) throw new Error(error.message);

  await refreshProgress(caseId);
  revalidateCase(caseId);
}
