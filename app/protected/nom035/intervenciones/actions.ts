"use server";
import {revalidatePath} from "next/cache";
import {nom035AuthorizedCenter} from "@/lib/nom035/server-access";
import {NOM035_UUID,nom035ValidDate} from "@/lib/nom035/access";

const s=(f:FormData,k:string)=>String(f.get(k)||"").trim();
const validScopes=["organizational","group","individual_referral"];
const validStatuses=["planned","in_progress","completed","verified","cancelled"];
const validSeverity=["pending_review","medio","alto","muy_alto"];

export async function saveNom035Intervention(form:FormData){
 const centerId=s(form,"center_id");
 const id=s(form,"id");
 const campaignId=s(form,"campaign_id");
 const scope=s(form,"measure_scope");
 const status=s(form,"status");
 const severity=s(form,"severity");
 const area=s(form,"affected_area");
 const description=s(form,"description");
 const responsible=s(form,"responsible");
 const sourceDomain=s(form,"source_domain");
 const evidence=s(form,"evidence_reference");
 const effectiveness=s(form,"effectiveness_notes");
 const note=s(form,"change_note");
 const progress=Number(form.get("progress_percent"));
 if((id&&!NOM035_UUID.test(id))||
 (campaignId&&!NOM035_UUID.test(campaignId))||
 !validScopes.includes(scope)||!validStatuses.includes(status)||!validSeverity.includes(severity)||
 area.length<3||area.length>180||description.length<15||description.length>1200||
 responsible.length<3||responsible.length>180||
 sourceDomain.length>150||evidence.length>350||effectiveness.length>1400||
 !Number.isInteger(progress)||progress<0||progress>100||
 (id&&(note.length<8||note.length>700))){
  throw Error("Revisa la medida, responsable, modalidad y campos del seguimiento.");
 }
 if((status==="completed"||status==="verified")&&(progress!==100||!evidence))
  throw Error("Para cerrar una medida registra el 100% de avance y su evidencia.");
 if(status==="verified"&&!effectiveness)
  throw Error("La verificación requiere evaluar la efectividad de la medida.");
 const starts=nom035ValidDate(s(form,"starts_on"));
 const due=nom035ValidDate(s(form,"due_on"));
 const evaluation=nom035ValidDate(s(form,"evaluation_on"));
 if(starts&&due&&due<starts)throw Error("La fecha compromiso debe ser posterior al inicio.");
 const {db,user}=await nom035AuthorizedCenter(centerId);
 const {error}=await db.rpc("nom035_save_intervention",{
  p_center:centerId,p_id:id||null,p_campaign:campaignId||null,
  p_domain:sourceDomain,p_severity:severity,p_scope:scope,
  p_area:area,p_description:description,p_responsible:responsible,
  p_start:starts,p_due:due,p_evaluation:evaluation,
  p_status:status,p_progress:progress,p_reference:evidence,
  p_effectiveness:effectiveness,p_actor:user.userId,p_note:note
 });
 if(error)throw Error("No fue posible guardar el plan de intervención: "+error.message);
 revalidatePath("/protected/nom035/"+centerId+"/intervenciones");
 revalidatePath("/protected/nom035/"+centerId);
}
