"use server";

import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {isClimaUuid} from "@/lib/clima/invitations";

async function requireAdmin(){
 const user=await getCurrentAppUser();
 if(!user || user.role!=="super_admin")throw Error("No autorizado para administrar instrumentos de clima.");
 return user;
}

export async function createClimaCampaign(form:FormData){
 const user=await requireAdmin();
 const organizationId=String(form.get("organization_id")||"");
 const name=String(form.get("name")||"").trim();
 const variant=String(form.get("variant")||"");
 const moduleCode=variant==="module"?String(form.get("module_code")||""):null;
 const planned=Number(form.get("planned_population"));
 if(!isClimaUuid(organizationId)||name.length<4||name.length>150||
 !["esencial","module"].includes(variant)||
 (variant==="module"&&!/^M0[1-8]$/.test(moduleCode||""))||
 !Number.isInteger(planned)||planned<1||planned>100000)
 throw Error("Revisa empresa, instrumento, nombre y población elegible.");
 const db=createAdminClient();
 const {data,error}=await db.rpc("clima_create_campaign",{
  p_org:organizationId,p_title:name,p_variant:variant,p_module_code:moduleCode,
  p_population:planned,p_actor:user.userId
 });
 if(error||!data)throw Error(error?.message||"No se pudo crear la campaña.");
 revalidatePath("/protected/clima/encuestas");
 redirect("/protected/clima/encuestas/"+data);
}

export async function changeClimaStatus(form:FormData){
 await requireAdmin();
 const id=String(form.get("campaign_id")||""),next=String(form.get("next")||"");
 if(!isClimaUuid(id)||!["open","closed"].includes(next))throw Error("Campaña inválida.");
 const db=createAdminClient();
 const {data:row,error:readError}=await db.from("clima_campaigns")
 .select("id,status").eq("id",id).maybeSingle();
 if(readError||!row||!(
  next==="open"&&row.status==="draft"||
  next==="closed"&&row.status==="open"
 ))throw Error("Transición de estado no permitida.");
 const fields=next==="open"?
  {status:"open",opened_at:new Date().toISOString()}:
  {status:"closed",closed_at:new Date().toISOString()};
 const {data,error}=await db.from("clima_campaigns")
  .update(fields).eq("id",id).eq("status",row.status).select("id").maybeSingle();
 if(error||!data)throw Error(error?.message||"Campaña modificada por otra sesión. Actualiza la página.");
 revalidatePath("/protected/clima/encuestas");
 revalidatePath("/protected/clima/encuestas/"+id);
 redirect("/protected/clima/encuestas/"+id);
}
