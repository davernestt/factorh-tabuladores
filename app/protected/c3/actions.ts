"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createC3Campaign(formData: FormData) {
  const user = await getCurrentAppUser();
  if (!user || user.role === "client") throw new Error("No autorizado.");
  const organizationId = String(formData.get("organization_id") || "");
  const name = String(formData.get("name") || "").trim().slice(0, 150);
  const planned = Number(formData.get("planned_population"));
  const breakdown = String(formData.get("report_breakdown") || "none");
  if (!organizationId || name.length < 4 || !Number.isInteger(planned) || planned < 1 || planned > 100000 || !["none","segment","department"].includes(breakdown)) {
    throw new Error("Revisa empresa, nombre y población elegible.");
  }
  const db = createAdminClient();
  const { data: org } = await db.from("organizations").select("id").eq("id", organizationId).eq("active", true).maybeSingle();
  if (!org) throw new Error("Empresa no disponible.");
  const { data, error } = await db.from("c3_campaigns").insert({
    organization_id: organizationId,
    name,
    planned_population: planned,
    scope: "operativo_administrativo",
    report_breakdown: breakdown,
    created_by: user.userId
  }).select("id").single();
  if (error || !data) throw new Error(error?.message || "No se creó la campaña.");
  const { error: linkError } = await db.from("c3_campaign_instruments").insert({ campaign_id: data.id, instrument_code: "C3" });
  if (linkError) throw new Error(linkError.message);
  revalidatePath("/protected/c3");
  redirect("/protected/c3/" + data.id);
}

export async function changeC3CampaignStatus(formData: FormData) {
  const user = await getCurrentAppUser();
  if (!user || user.role !== "super_admin") throw new Error("No autorizado.");
  const id = String(formData.get("id") || "");
  const next = String(formData.get("status") || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
      !["open", "closed"].includes(next)) throw new Error("Estado o campaña inválido.");
  const db = createAdminClient();
  const { data } = await db.from("c3_campaigns").select("id,status").eq("id",id).maybeSingle();
  const validTransition = !!data && (
    (next === "open" && ["draft","closed"].includes(data.status)) ||
    (next === "closed" && data.status === "open")
  );
  if (!validTransition || !data) throw new Error("Transición de estado no permitida.");
  // Reopening a closed campaign preserves its original opened_at, frozen questions,
  // and all invitations and answers. Only the close marker is cleared.
  const fields = next === "closed"
    ? { status: "closed", closed_at: new Date().toISOString() }
    : data.status === "draft"
      ? { status: "open", opened_at: new Date().toISOString(), closed_at: null }
      : { status: "open", closed_at: null };
  const { data: updated, error } = await db.from("c3_campaigns")
    .update(fields).eq("id",id).eq("status",data.status).select("id").maybeSingle();
  if (error || !updated) throw new Error(error?.message || "La campaña cambió de estado. Actualiza e intenta nuevamente.");
  revalidatePath("/protected/c3/" + id);
  revalidatePath("/protected/c3");
  redirect("/protected/c3/" + id);
}
