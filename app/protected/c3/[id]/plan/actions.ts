"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAppUser } from "@/lib/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dims=new Set(["D01","D02","D03","D04","D05","D06","D07","D08","D09","D10","D11","D12","D13"]);
const priorities=new Set(["alta","media","baja"]);
const states=new Set(["pendiente","en_proceso","completada","cancelada"]);
const string=(form:FormData,key:string,max:number)=>String(form.get(key)??"").trim().slice(0,max);
function dateField(value:string) {
 if(!value) return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value+"T12:00:00Z")))throw Error("La fecha no es válida.");
 return value;
}
async function ensureAdmin() {
 const user=await getCurrentAppUser();
 if(!user || user.role!=="super_admin")throw Error("No autorizado para administrar planes C3.");
 return user;
}
async function ensureCampaign(id:string){
 if(!uuid.test(id))throw Error("Campaña inválida.");
 const db=createAdminClient();
 const {data,error}=await db.from("c3_campaigns").select("id,status,organization_id").eq("id",id).maybeSingle();
 if(error||!data)throw Error("No existe la campaña.");
 return {db,campaign:data};
}

export async function createC3Action(form:FormData){
 const user=await ensureAdmin();
 const campaignId=string(form,"campaign_id",36);
 const {db,campaign}=await ensureCampaign(campaignId);
 if(campaign.status==="cancelled")throw Error("La campaña está cancelada.");
 const title=string(form,"title",160), objective=string(form,"objective",1200);
 const owner=string(form,"owner_label",120), metric=string(form,"metric",400);
 const phase=Number(form.get("phase_days"));
 const priority=string(form,"priority",10);
 const dim=string(form,"dimension_code",3);
 if(title.length<8||![30,60,90].includes(phase)||!priorities.has(priority)|| (dim&&!dims.has(dim)))throw Error("Revisa título, fase, prioridad y dimensión.");
 const {error}=await db.from("c3_action_items").insert({
  campaign_id:campaignId,title,objective,phase_days:phase,priority,
  dimension_code:dim||null,owner_label:owner,metric,due_on:dateField(string(form,"due_on",10)),
  created_by:user.userId
 });
 if(error)throw Error("No se pudo guardar la acción: "+error.message);
 revalidatePath("/protected/c3/"+campaignId+"/plan");
}

export async function updateC3Action(form:FormData){
 await ensureAdmin();
 const campaignId=string(form,"campaign_id",36),id=string(form,"id",36);
 const {db,campaign}=await ensureCampaign(campaignId);
 if(!uuid.test(id)||campaign.status==="cancelled")throw Error("Acción no disponible.");
 const status=string(form,"status",20),evidence=string(form,"evidence",1200);
 if(!states.has(status))throw Error("Estado inválido.");
 const {data,error}=await db.from("c3_action_items")
   .update({status,evidence}).eq("campaign_id",campaignId).eq("id",id).select("id").maybeSingle();
 if(error||!data)throw Error("No se pudo actualizar la actividad.");
 revalidatePath("/protected/c3/"+campaignId+"/plan");
}
