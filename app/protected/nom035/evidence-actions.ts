"use server";

import {randomUUID} from "node:crypto";
import {revalidatePath} from "next/cache";
import {createAdminClient} from "@/lib/supabase/admin";
import {requireNom035User,requireNom035Organization,NOM035_UUID,nom035ValidDate} from "@/lib/nom035/access";
import {nom035EvidenceGuide,nom035GuideTasks} from "@/lib/nom035/evidence-guides";
import {nom035RequirementMap,type Nom035RequirementKey} from "@/lib/nom035/rules";

const limit=(value:FormDataEntryValue|null,size:number)=>
 String(value||"").trim().slice(0,size+1);
async function context(centerId:string,requirement:Nom035RequirementKey){
 if(!NOM035_UUID.test(centerId))throw Error("Centro inválido.");
 const user=await requireNom035User();
 const db=createAdminClient();
 const {data:center,error}=await db.from("nom035_work_centers")
  .select("organization_id,worker_count,active")
  .eq("id",centerId).maybeSingle();
 if(error||!center||!center.active)throw Error("Centro no disponible.");
 requireNom035Organization(user,center.organization_id);
 if(!nom035RequirementMap(center.worker_count).has(requirement))
  throw Error("El requisito no aplica a este centro.");
 return {user,db};
}
function requirementFrom(form:FormData):Nom035RequirementKey{
 const key=String(form.get("requirement_key")||"") as Nom035RequirementKey;
 if(!Object.prototype.hasOwnProperty.call(nom035EvidenceGuideData,key))
  throw Error("Requisito desconocido.");
 return key;
}
const nom035EvidenceGuideData={
 policy:true,prevention:true,information:true,complaints:true,severe_events:true,
 risk_identification:true,organizational_environment:true,results_report:true,intervention:true
} as const;

export async function saveNom035Task(form:FormData){
 const centerId=limit(form.get("center_id"),64);
 const requirement=requirementFrom(form);
 const taskKey=limit(form.get("task_key"),64);
 const status=limit(form.get("status"),40);
 const responsible=limit(form.get("responsible"),140);
 const due=limit(form.get("target_date"),10);
 const evidenceReference=limit(form.get("evidence_reference"),350);
 const notes=limit(form.get("notes"),700);
 if(responsible.length>140||due.length>10||evidenceReference.length>350||notes.length>700)
  throw Error("Uno de los campos supera su límite.");
 if(!["pending","in_progress","completed"].includes(status))
  throw Error("El estado de la actividad no es válido.");
 if(!nom035GuideTasks(requirement).some(t=>t.id===taskKey))
  throw Error("La actividad no existe en la guía vigente.");
 if(status==="completed"&&!evidenceReference)
  throw Error("Para marcar una actividad como terminada registra dónde está su evidencia.");
 const targetDate=nom035ValidDate(due);
 const {user,db}=await context(centerId,requirement);
 const {error}=await db.from("nom035_evidence_task_progress").upsert({
  center_id:centerId,requirement_key:requirement,task_key:taskKey,
  status,responsible,target_date:targetDate,
  evidence_reference:evidenceReference,notes,updated_by:user.userId,
  completed_at:status==="completed"?new Date().toISOString():null,
  updated_at:new Date().toISOString()
 },{onConflict:"center_id,requirement_key,task_key"});
 if(error)throw Error("No fue posible guardar la actividad: "+error.message);
 revalidatePath("/protected/nom035/"+centerId);
}
export async function reviewNom035Requirement(form:FormData){
 const centerId=limit(form.get("center_id"),64);
 const requirement=requirementFrom(form);
 const decision=limit(form.get("decision"),24);
 if(!["verified","changes_requested","not_reviewed"].includes(decision))
  throw Error("Revisión inválida.");
 const {user,db}=await context(centerId,requirement);
 const {data:progress,error:readError}=await db.from("nom035_evidence_progress")
  .select("status,proof_reference").eq("center_id",centerId)
  .eq("requirement_key",requirement).maybeSingle();
 if(readError||!progress)throw Error("Guarda primero el estado del requisito.");
 if(decision==="verified"&&(progress.status!=="documented"||!progress.proof_reference))
  throw Error("Solo puede verificarse internamente un requisito documentado.");
 const {error}=await db.from("nom035_evidence_progress")
  .update({
   internal_review:decision,
   internal_reviewed_at:decision==="not_reviewed"?null:new Date().toISOString(),
   internal_reviewed_by:decision==="not_reviewed"?null:user.userId
  }).eq("center_id",centerId).eq("requirement_key",requirement);
 if(error)throw Error("No fue posible actualizar la revisión: "+error.message);
 revalidatePath("/protected/nom035/"+centerId);
}

type AllowedFile={mime:string;extension:string;signature:(buf:Uint8Array)=>boolean};
const allowed:readonly AllowedFile[]=[
 {mime:"application/pdf",extension:"pdf",
  signature:b=>b.length>8&&String.fromCharCode(...b.slice(0,5))==="%PDF-"},
 {mime:"image/png",extension:"png",
  signature:b=>b.length>8&&[137,80,78,71,13,10,26,10].every((n,i)=>b[i]===n)},
 {mime:"image/jpeg",extension:"jpg",
  signature:b=>b.length>4&&b[0]===255&&b[1]===216&&b[2]===255}
];
export async function uploadNom035Evidence(form:FormData){
 const centerId=limit(form.get("center_id"),64);
 const requirement=requirementFrom(form);
 const title=limit(form.get("title"),140);
 const file=form.get("document");
 if(title.length<4||title.length>140)throw Error("Escribe un título de 4 a 140 caracteres.");
 // Incidents and complaints must never be stored in the general document folder.
 if(requirement==="severe_events"||requirement==="complaints")
  throw Error("Estos documentos pueden contener datos sensibles. Registra solo una referencia al expediente privado.");
 const {user,db}=await context(centerId,requirement);
 if(!(file instanceof File)||file.size<1||file.size>10*1024*1024)
  throw Error("Selecciona un PDF, PNG o JPG de hasta 10 MB.");
 const type=allowed.find(x=>x.mime===file.type);
 if(!type)throw Error("Formato no permitido. Utiliza PDF, PNG o JPG.");
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(!type.signature(bytes))throw Error("La firma del archivo no corresponde a su formato.");
 const id=randomUUID();
 const objectPath=centerId+"/"+requirement+"/"+id+"."+type.extension;
 const {error:uploadError}=await db.storage.from("nom035-evidence")
  .upload(objectPath,bytes,{contentType:type.mime,cacheControl:"3600",upsert:false});
 if(uploadError)throw Error("No fue posible almacenar el documento.");
 const name=file.name.replace(/[^\p{L}\p{N} ._\-]/gu,"_").slice(0,180);
 const {error}=await db.from("nom035_evidence_files").insert({
  id,center_id:centerId,requirement_key:requirement,title,
  original_file_name:name,storage_bucket:"nom035-evidence",
  storage_path:objectPath,mime_type:type.mime,size_bytes:file.size,uploaded_by:user.userId
 });
 if(error){
  await db.storage.from("nom035-evidence").remove([objectPath]);
  throw Error("No fue posible asociar el archivo al expediente.");
 }
 revalidatePath("/protected/nom035/"+centerId);
}
