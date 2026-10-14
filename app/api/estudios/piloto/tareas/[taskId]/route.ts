import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
type Params={params:Promise<{taskId:string}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses=["pendiente","en_proceso","en_revision","correcciones","aprobado"];
type Action="save"|"submit"|"request_changes"|"approve";
const allowedKeys:Record<string,Record<string,(v:unknown)=>boolean>>={
 visita:{
  housing:v=>typeof v==="string"&&["","propia","rentada","familiar","otra"].includes(v),
  visit_result:v=>typeof v==="string"&&["","pendiente","realizada","no_realizada"].includes(v),
  observations:v=>typeof v==="string"&&v.length<=1600
 },
 referencias:{
  company:v=>typeof v==="string"&&v.length<=160,
  source_role:v=>typeof v==="string"&&v.length<=120,
  outcome:v=>typeof v==="string"&&["","corroborada","sin_contacto","aclaracion"].includes(v),
  observations:v=>typeof v==="string"&&v.length<=1600
 }
};
function cleanPayload(value:unknown,type:string){
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const data=value as Record<string,unknown>,validation=allowedKeys[type],keys=Object.keys(data);
 if(!validation||keys.length>4||keys.some(key=>!validation[key]||!validation[key](data[key])))return null;
 return Object.fromEntries(keys.map(k=>[k,String(data[k]).trim()]));
}
export async function PATCH(req:NextRequest,{params}:Params){
 const user=await getCurrentAppUser();
 if(!user||!["super_admin","ese_operator"].includes(user.role))
  return NextResponse.json({error:"No autorizado."},{status:403});
 if(req.headers.get("origin")!==req.nextUrl.origin)return NextResponse.json({error:"Origen no permitido."},{status:403});
 const {taskId}=await params;if(!uuid.test(taskId))return NextResponse.json({error:"Tarea inválida."},{status:400});
 let body:{action?:unknown;payload?:unknown;review_notes?:unknown};
 try{body=await req.json()}catch{return NextResponse.json({error:"Datos incorrectos."},{status:400})}
 const action=body.action;
 if(!["save","submit","request_changes","approve"].includes(String(action)))
  return NextResponse.json({error:"Acción incorrecta."},{status:400});
 const db=createAdminClient();
 const {data:task,error}=await db.from("ese_work_tasks")
  .select("id,case_id,task_type,assignee_id,status,payload").eq("id",taskId).maybeSingle();
 if(error||!task||!statuses.includes(task.status))return NextResponse.json({error:"No se encontró la tarea."},{status:404});
 if(user.role!=="super_admin"&&task.assignee_id!==user.userId)
  return NextResponse.json({error:"La tarea no está asignada a tu usuario."},{status:403});
 const {data:c}=await db.from("ese_cases").select("id,is_demo,delivery_status").eq("id",task.case_id).maybeSingle();
 if(!c?.is_demo||c.delivery_status==="released")
  return NextResponse.json({error:"Solo tareas de piloto sin publicar."},{status:409});
 const admin=user.role==="super_admin";
 const record:Record<string,unknown>={updated_by:user.userId,updated_at:new Date().toISOString()};
 let next:string;
 if(action==="save"||action==="submit"){
  if(task.status==="aprobado"||task.status==="en_revision")
   return NextResponse.json({error:"La tarea está bloqueada para captura."},{status:409});
  const payload=cleanPayload(body.payload,task.task_type);
  if(!payload)return NextResponse.json({error:"Campos no permitidos o texto demasiado largo."},{status:400});
  if(action==="submit"){
   if(task.task_type==="visita"&&(!payload.visit_result||!payload.observations))
    return NextResponse.json({error:"Registra resultado de visita y observaciones."},{status:400});
   if(task.task_type==="referencias"&&(!payload.company||!payload.outcome||!payload.observations))
    return NextResponse.json({error:"Registra empresa, resultado y observaciones."},{status:400});
  }
  record.payload=payload;next=action==="submit"?"en_revision":"en_proceso";
  if(action==="submit")record.submitted_at=new Date().toISOString();
 }else{
  if(!admin)return NextResponse.json({error:"Solo FactoRH revisa y aprueba."},{status:403});
  if(task.status!=="en_revision")return NextResponse.json({error:"La tarea no está enviada a revisión."},{status:409});
  next=action==="approve"?"aprobado":"correcciones";
  const review=typeof body.review_notes==="string"?body.review_notes.trim():"";
  if(review.length>500||(action==="request_changes"&&review.length<5))
   return NextResponse.json({error:"Agrega una observación concreta de 5 a 500 caracteres."},{status:400});
  record.review_notes=review;
  if(action==="approve")record.approved_at=new Date().toISOString();
 }
 record.status=next;
 const {data:updated,error:updateError}=await db.from("ese_work_tasks")
  .update(record).eq("id",taskId).eq("status",task.status).select("id").maybeSingle();
 if(updateError||!updated)return NextResponse.json({error:"La tarea cambió; actualiza antes de continuar."},{status:409});
 await db.from("ese_work_task_audit").insert({task_id:taskId,actor_id:user.userId,
  action,previous_status:task.status,new_status:next});
 return NextResponse.json({ok:true,status:next},{headers:{"Cache-Control":"no-store"}});
}
