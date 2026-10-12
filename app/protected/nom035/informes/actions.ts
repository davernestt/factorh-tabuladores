"use server";
import {revalidatePath} from "next/cache";
import {nom035AuthorizedRiskCampaign} from "@/lib/nom035/server-access";

const values=[
 ["objective",2000],["activities",4000],["methodology_notes",4000],
 ["conclusions",4500],["recommendations",4500],["intervention_notes",4000],
 ["responsible_name",180],["professional_license",80]
] as const;
export async function saveNom035TechnicalReport(form:FormData){
 const campaignId=String(form.get("campaign_id")||"");
 const {user,db,campaign}=await nom035AuthorizedRiskCampaign(campaignId);
 const fields:Record<string,string>={};
 for(const [field,max] of values){
  const value=String(form.get(field)||"").trim();
  if(value.length>max)throw Error("El campo "+field+" supera el tamaño permitido.");
  fields[field]=value;
 }
 const {data:previous,error:readError}=await db.from("nom035_report_drafts")
  .select("validation_status").eq("campaign_id",campaignId).maybeSingle();
 if(readError)throw Error("No pudo consultarse el informe");
 if(previous?.validation_status==="internal_review"&&user.role!=="super_admin")
  throw Error("El informe fue revisado internamente; solicita ajustes al administrador.");
 const {error}=await db.from("nom035_report_drafts").upsert({
  campaign_id:campaignId,...fields,
  validation_status:"draft",reviewed_at:null,reviewed_by:null,
  updated_by:user.userId,updated_at:new Date().toISOString()
 },{onConflict:"campaign_id"});
 if(error)throw Error("No se guardó el informe: "+error.message);
 revalidatePath("/protected/nom035/riesgos/"+campaignId+"/informe");
 revalidatePath("/protected/nom035/riesgos/"+campaignId);
}
export async function reviewNom035TechnicalReport(form:FormData){
 const campaignId=String(form.get("campaign_id")||"");
 const {user,db,campaign,center}=await nom035AuthorizedRiskCampaign(campaignId);
 if(user.role!=="super_admin")throw Error("Solo el administrador FactoRH puede revisar internamente el informe.");
 if(campaign.status!=="closed"||campaign.completed_count<10||
   campaign.completed_count<campaign.eligible_population)
  throw Error("La campaña debe estar cerrada y cumplir con la población requerida.");
 const {data:report,error}=await db.from("nom035_report_drafts")
  .select("*").eq("campaign_id",campaignId).maybeSingle();
 if(error||!report)throw Error("Guarda primero el informe técnico.");
 for(const name of ["objective","activities","methodology_notes","conclusions","recommendations","responsible_name"]){
  if(String(report[name]||"").trim().length<10)
   throw Error("Completa el apartado del informe: "+name);
 }
 if(!center.street_address||!center.main_activity)
  throw Error("Completa domicilio y actividad principal del centro antes de revisar.");
 const {error:updateError}=await db.from("nom035_report_drafts").update({
  validation_status:"internal_review",reviewed_by:user.userId,
  reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()
 }).eq("campaign_id",campaignId);
 if(updateError)throw Error("No se pudo registrar la revisión: "+updateError.message);
 revalidatePath("/protected/nom035/riesgos/"+campaignId+"/informe");
}
