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
  if (!organizationId || name.length < 4 || !Number.isInteger(planned) || planned < 1 || planned > 100000) {
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
  if (!user || user.role === "client") throw new Error("No autorizado.");
  const id = String(formData.get("id") || "");
  const next = String(formData.get("status") || "");
  if (!["open", "closed"].includes(next)) throw new Error("Estado inválido.");
  const db = createAdminClient();
  const { data } = await db.from("c3_campaigns").select("id,status").eq("id",id).maybeSingle();
  if (!data || (next === "open" && data.status !== "draft") || (next === "closed" && data.status !== "open")) {
    throw new Error("Transición de estado no permitida.");
  }
  const { error } = await db.from("c3_campaigns").update({
    status:next,
    ...(next === "open" ? { opened_at: new Date().toISOString() } : { closed_at: new Date().toISOString() })
  }).eq("id",id).eq("status",data.status);
  if (error) throw new Error(error.message);
  revalidatePath("/protected/c3/" + id);
  revalidatePath("/protected/c3");
  redirect("/protected/c3/" + id);
}
