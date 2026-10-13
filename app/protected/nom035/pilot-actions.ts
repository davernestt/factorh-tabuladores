"use server";
import {revalidatePath} from "next/cache";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {NOM035_UUID,nom035ValidDate} from "@/lib/nom035/access";
import {requireNom035PilotReadiness} from "@/lib/nom035/pilot-readiness";

export async function updateNom035PilotAccess(form:FormData){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")throw Error("Solo FactoRH puede habilitar clientes.");
 const organizationId=String(form.get("organization_id")||"");
 const operation=String(form.get("operation")||"enable");
 if(!NOM035_UUID.test(organizationId)||!["enable","pause"].includes(operation))
  throw Error("Selecciona una empresa válida.");
 const db=createAdminClient();
 const {data:org}=await db.from("organizations")
  .select("id,active").eq("id",organizationId).maybeSingle();
 if(!org?.active)throw Error("Empresa no disponible");
 if(operation==="pause"){
  const {error}=await db.from("organization_module_subscriptions").update({
   status:"paused",updated_at:new Date().toISOString()
  }).eq("organization_id",organizationId).eq("module_key","nom035");
  if(error)throw Error("No se pudo suspender el piloto.");
 }else{
  const ends=nom035ValidDate(String(form.get("ends_on")||""));
  const today=new Date().toISOString().slice(0,10);
  const future=new Date(Date.now()+90*86400000).toISOString().slice(0,10);
  if(!ends||ends<today||ends>future)
   throw Error("Indica una fecha de vigencia entre hoy y los próximos 90 días.");
  await requireNom035PilotReadiness(organizationId);
  const {error}=await db.from("organization_module_subscriptions").upsert({
   organization_id:organizationId,module_key:"nom035",status:"trial",
   plan_name:"Piloto controlado · NOM-035",starts_on:today,ends_on:ends,
   client_notice:true,reminder_days:7,updated_at:new Date().toISOString()
  },{onConflict:"organization_id,module_key"});
  if(error)throw Error("No fue posible habilitar el piloto: "+error.message);
 }
 revalidatePath("/protected/nom035");
}
