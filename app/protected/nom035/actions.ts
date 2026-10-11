"use server";

import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {nom035RequirementMap,nom035Tier,type Nom035RequirementKey,type Nom035Method} from "@/lib/nom035/rules";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const methods=new Set<Nom035Method>(["official_guides","validated_alternative","undecided"]);
const statuses=new Set(["pending","in_progress","documented"]);
function field(form:FormData,name:string){return String(form.get(name)||"").trim();}
function limit(value:string,size:number,name:string){
 if(value.length>size)throw Error(name+" supera el límite de longitud.");
 return value;
}
function assessmentDate(value:string):string|null{
 if(!value)return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error("Fecha de evaluación inválida.");
 const candidate=new Date(value+"T12:00:00Z");
 if(!Number.isFinite(candidate.getTime())||candidate.toISOString().slice(0,10)!==value||
 candidate.getTime()>Date.now()+86400000)throw Error("La fecha de evaluación no es válida o está en el futuro.");
 return value;
}
async function onlyAdmin(){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")throw Error("Solo el administrador FactoRH puede configurar NOM-035.");
 return user;
}
function parseCenter(form:FormData){
 const organization_id=field(form,"organization_id");
 const name=limit(field(form,"name"),160,"Nombre");
 const municipality=limit(field(form,"municipality"),120,"Municipio");
 const state=limit(field(form,"state"),120,"Estado");
 const street_address=limit(field(form,"street_address"),350,"Domicilio");
 const main_activity=limit(field(form,"main_activity"),250,"Actividad principal");
 const worker_count=Number(form.get("worker_count"));
 const assessment_method=field(form,"assessment_method") as Nom035Method;
 const last_assessment_on=assessmentDate(field(form,"last_assessment_on"));
 if(!uuid.test(organization_id)||name.length<3||name.length>160
 ||!Number.isInteger(worker_count)||worker_count<1||worker_count>100000
 ||!methods.has(assessment_method)||!state||!municipality||!main_activity)
 throw Error("Completa empresa, centro, estado, municipio, actividad principal y plantilla laboral.");
 nom035Tier(worker_count);
 return {organization_id,name,worker_count,state,municipality,street_address,main_activity,
   assessment_method,last_assessment_on};
}
export async function createNom035Center(form:FormData){
 const user=await onlyAdmin();
 const center=parseCenter(form);
 const db=createAdminClient();
 const {data:organization,error:orgError}=await db.from("organizations")
  .select("id").eq("id",center.organization_id).eq("active",true).maybeSingle();
 if(orgError||!organization)throw Error("La empresa seleccionada no está disponible.");
 const {data,error}=await db.from("nom035_work_centers")
  .insert({...center,created_by:user.userId}).select("id").single();
 if(error||!data)throw Error(error?.code==="23505"?
  "Ya existe un centro con ese nombre en la empresa.":"No se pudo registrar el centro: "+(error?.message||"Error interno"));
 revalidatePath("/protected/nom035");
 redirect("/protected/nom035/"+data.id);
}
export async function updateNom035Center(form:FormData){
 await onlyAdmin();
 const centerId=field(form,"center_id");
 if(!uuid.test(centerId))throw Error("Centro no válido.");
 const parsed=parseCenter(form);
 const db=createAdminClient();
 const {data:current,error:readError}=await db.from("nom035_work_centers")
  .select("organization_id,active").eq("id",centerId).maybeSingle();
 if(readError||!current||!current.active)throw Error("El centro no está disponible.");
 if(parsed.organization_id!==current.organization_id)throw Error("No se puede mover un centro a otra empresa.");
 const {data,error}=await db.from("nom035_work_centers").update(parsed)
  .eq("id",centerId).eq("organization_id",current.organization_id).select("id").maybeSingle();
 if(error||!data)throw Error("No fue posible actualizar el centro: "+(error?.message||""));
 revalidatePath("/protected/nom035");
 revalidatePath("/protected/nom035/"+centerId);
}
export async function updateNom035Evidence(form:FormData){
 const user=await onlyAdmin();
 const centerId=field(form,"center_id");
 const requirement=field(form,"requirement_key") as Nom035RequirementKey;
 const status=field(form,"status");
 const reference=limit(field(form,"proof_reference"),350,"Referencia documental");
 const notes=limit(field(form,"notes"),700,"Observaciones");
 if(!uuid.test(centerId)||!statuses.has(status))throw Error("Datos de seguimiento inválidos.");
 if(status==="documented"&&!reference)throw Error("Para marcar documentado agrega una referencia verificable de la evidencia.");
 const db=createAdminClient();
 const {data:center,error:centerError}=await db.from("nom035_work_centers")
  .select("id,worker_count,active").eq("id",centerId).maybeSingle();
 if(centerError||!center||!center.active)throw Error("Centro no disponible.");
 if(!nom035RequirementMap(center.worker_count).has(requirement))throw Error("Este requisito no corresponde al tamaño del centro.");
 const {error}=await db.from("nom035_evidence_progress").upsert({
  center_id:centerId,requirement_key:requirement,status,proof_reference:reference,
  notes,updated_by:user.userId
 },{onConflict:"center_id,requirement_key"});
 if(error)throw Error("No fue posible actualizar el expediente: "+error.message);
 revalidatePath("/protected/nom035");
 revalidatePath("/protected/nom035/"+centerId);
}
