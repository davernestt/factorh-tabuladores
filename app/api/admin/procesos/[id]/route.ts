import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { relationshipForAssessmentType } from "@/lib/pdl-evaluation-role";

const ADMIN_EMAILS = ["david@factorh.com.mx"];
type RouteContext={params:Promise<{id:string}>};
type Body={
  organization_id?:string; person_id?:string; process_name?:string; due_date?:string|null;
  first_name?:string; last_name?:string; email?:string; phone?:string; job_title?:string; area?:string;
  template_ids?:string[];
  manager_evaluator_name?:string; manager_evaluator_email?:string; manager_evaluator_phone?:string;
  interviewer_name?:string; interviewer_email?:string; interviewer_phone?:string;
};
const clean=(v:unknown)=>typeof v==="string"?v.trim():"";

export async function PATCH(request:NextRequest,context:RouteContext){
  const auth=await createClient(); const {data,error}=await auth.auth.getClaims();
  const email=String(data?.claims?.email??"").trim().toLowerCase();
  if(error||!data?.claims||!ADMIN_EMAILS.includes(email))return NextResponse.json({error:"No autorizado."},{status:403});

  const {id}=await context.params; const body=(await request.json()) as Body; const db=createAdminClient();
  const {data:process,error:processError}=await db.from("assessment_processes")
    .select("id,organization_id,person_id,name,status,public_token,target_date").eq("id",id).maybeSingle();
  if(processError)return NextResponse.json({error:processError.message},{status:500});
  if(!process)return NextResponse.json({error:"Proceso no encontrado."},{status:404});

  const [assignmentsR,reusedR]=await Promise.all([
    db.from("assessment_assignments").select("id,template_id,status").eq("process_id",id),
    db.from("assessment_process_reused_results").select("id,template_id").eq("process_id",id),
  ]);
  if(assignmentsR.error||reusedR.error)return NextResponse.json({error:assignmentsR.error?.message??reusedR.error?.message},{status:500});

  const assignments=assignmentsR.data??[]; const reused=reusedR.data??[];
  const identityLocked=assignments.some(a=>["in_progress","completed"].includes(a.status))||reused.length>0;
  const processCompleted=process.status==="completed";
  const organizationId=clean(body.organization_id)||process.organization_id;
  const personId=clean(body.person_id)||process.person_id;

  if(identityLocked&&(organizationId!==process.organization_id||personId!==process.person_id)){
    return NextResponse.json({error:"La empresa y el colaborador ya no pueden cambiarse porque el proceso tiene avance o resultados reutilizados."},{status:400});
  }

  const {data:organization,error:orgError}=await db.from("organizations").select("id,name,active").eq("id",organizationId).eq("active",true).maybeSingle();
  if(orgError)return NextResponse.json({error:orgError.message},{status:500});
  if(!organization)return NextResponse.json({error:"La empresa seleccionada no está disponible."},{status:400});

  const {data:person,error:personError}=await db.from("people").select("id,organization_id,active").eq("id",personId).eq("organization_id",organizationId).eq("active",true).maybeSingle();
  if(personError)return NextResponse.json({error:personError.message},{status:500});
  if(!person)return NextResponse.json({error:"El colaborador seleccionado no pertenece a la empresa."},{status:400});

  const requested=Array.from(new Set((Array.isArray(body.template_ids)?body.template_ids:[]).map(clean).filter(Boolean)));
  if(!requested.length)return NextResponse.json({error:"El proceso debe conservar al menos una evaluación o resultado vigente."},{status:400});

  const immutableIds=new Set(assignments.filter(a=>["in_progress","completed"].includes(a.status)).map(a=>a.template_id));
  for(const templateId of immutableIds){
    if(!requested.includes(templateId))return NextResponse.json({error:"No puedes quitar una evaluación que ya inició o fue completada."},{status:400});
  }

  if(processCompleted){
    const currentIds=new Set([...assignments.map(a=>a.template_id),...reused.map(r=>r.template_id)]);
    if(requested.some(id=>!currentIds.has(id))||[...currentIds].some(id=>!requested.includes(id))){
      return NextResponse.json({error:"Un proceso completado conserva su batería histórica. Crea un proceso nuevo para aplicar evaluaciones adicionales."},{status:400});
    }
  }

  const [templatesR,accessR]=await Promise.all([
    db.from("assessment_templates").select("id,name,assessment_type,active").in("id",requested).eq("active",true),
    db.from("organization_assessment_templates").select("template_id,enabled,participant_sendable").eq("organization_id",organizationId).in("template_id",requested),
  ]);
  if(templatesR.error||accessR.error)return NextResponse.json({error:templatesR.error?.message??accessR.error?.message},{status:500});
  if((templatesR.data??[]).length!==requested.length)return NextResponse.json({error:"Una o más evaluaciones no están disponibles."},{status:400});
  const allowed=new Set((accessR.data??[]).filter(x=>x.enabled&&x.participant_sendable).map(x=>x.template_id));
  if(requested.some(id=>!allowed.has(id)))return NextResponse.json({error:"Una o más evaluaciones no están habilitadas para esta empresa."},{status:400});

  const templateById=new Map((templatesR.data??[]).map(t=>[t.id,t]));
  const requiresManager=(templatesR.data??[]).some(t=>t.assessment_type==="leadership_direction");
  const requiresInterviewer=(templatesR.data??[]).some(t=>t.assessment_type==="leadership_interview");
  const managerName=clean(body.manager_evaluator_name);
  const managerEmail=clean(body.manager_evaluator_email).toLowerCase()||null;
  const managerPhone=clean(body.manager_evaluator_phone)||null;
  const interviewerName=clean(body.interviewer_name);
  const interviewerEmail=clean(body.interviewer_email).toLowerCase()||null;
  const interviewerPhone=clean(body.interviewer_phone)||null;
  if(requiresManager&&!managerName)return NextResponse.json({error:"Indica quién responderá la evaluación del jefe inmediato."},{status:400});
  if(requiresInterviewer&&!interviewerName)return NextResponse.json({error:"Indica quién realizará la entrevista conductual."},{status:400});

  const firstName=clean(body.first_name);
  if(!firstName)return NextResponse.json({error:"El nombre del colaborador es obligatorio."},{status:400});
  const personUpdate=await db.from("people").update({
    first_name:firstName,last_name:clean(body.last_name)||null,email:clean(body.email).toLowerCase()||null,
    phone:clean(body.phone)||null,job_title:clean(body.job_title)||null,area:clean(body.area)||null,
  }).eq("id",personId);
  if(personUpdate.error)return NextResponse.json({error:personUpdate.error.message},{status:500});

  const personName=`${firstName} ${clean(body.last_name)}`.trim();
  const personEmail=clean(body.email).toLowerCase()||null;
  const personPhone=clean(body.phone)||null;
  const dueDate=clean(body.due_date)?`${clean(body.due_date)}T23:59:59`:null;

  const processUpdate=await db.from("assessment_processes").update({
    organization_id:organizationId,person_id:personId,name:clean(body.process_name)||process.name,target_date:clean(body.due_date)||null,
  }).eq("id",id);
  if(processUpdate.error)return NextResponse.json({error:processUpdate.error.message},{status:500});

  const pendingToDelete=assignments.filter(a=>a.status==="pending"&&!requested.includes(a.template_id));
  if(pendingToDelete.length){
    const del=await db.from("assessment_assignments").delete().in("id",pendingToDelete.map(x=>x.id));
    if(del.error)return NextResponse.json({error:del.error.message},{status:500});
  }
  const reusedToDelete=reused.filter(r=>!requested.includes(r.template_id));
  if(reusedToDelete.length){
    const del=await db.from("assessment_process_reused_results").delete().in("id",reusedToDelete.map(x=>x.id));
    if(del.error)return NextResponse.json({error:del.error.message},{status:500});
  }

  const existingIds=new Set([
    ...assignments.filter(a=>!pendingToDelete.some(x=>x.id===a.id)).map(a=>a.template_id),
    ...reused.filter(r=>!reusedToDelete.some(x=>x.id===r.id)).map(r=>r.template_id),
  ]);
  const evaluatorFor=(templateId:string)=>{
    const template=templateById.get(templateId);
    const relationship=relationshipForAssessmentType(template?.assessment_type??"");
    if(relationship==="manager")return {relationship,name:managerName,email:managerEmail,phone:managerPhone};
    if(relationship==="interviewer")return {relationship,name:interviewerName,email:interviewerEmail,phone:interviewerPhone};
    return {relationship:"self",name:personName,email:personEmail,phone:personPhone};
  };

  const toAdd=requested.filter(templateId=>!existingIds.has(templateId));
  if(toAdd.length){
    const ins=await db.from("assessment_assignments").insert(toAdd.map(templateId=>{
      const evaluator=evaluatorFor(templateId);
      return {
        process_id:id,template_id:templateId,relationship_type:evaluator.relationship,
        evaluator_name:evaluator.name,evaluator_email:evaluator.email,evaluator_phone:evaluator.phone,
        due_date:dueDate,status:"pending",
      };
    }));
    if(ins.error)return NextResponse.json({error:ins.error.message},{status:500});
  }

  for(const assignment of assignments.filter(a=>a.status==="pending"&&requested.includes(a.template_id))){
    const evaluator=evaluatorFor(assignment.template_id);
    const upd=await db.from("assessment_assignments").update({
      relationship_type:evaluator.relationship,evaluator_name:evaluator.name,evaluator_email:evaluator.email,
      evaluator_phone:evaluator.phone,due_date:dueDate,
    }).eq("id",assignment.id);
    if(upd.error)return NextResponse.json({error:upd.error.message},{status:500});
  }

  return NextResponse.json({ok:true,path:`/p/${process.public_token}`});
}
