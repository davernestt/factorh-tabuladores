import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {hasStaffPermission} from "@/lib/staff-permissions";
import {createAdminClient} from "@/lib/supabase/admin";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** FactoRH alone assigns or reassigns a study. Operators and clients cannot call this endpoint. */
export async function POST(req:NextRequest){
 const user=await getCurrentAppUser();
 if(!user||user.role==="client"||user.role==="ese_operator"||
    !await hasStaffPermission(user,"studies","operate"))
   return NextResponse.json({error:"No autorizado."},{status:403});
 const origin=req.headers.get("origin");
 if(origin&&origin!==req.nextUrl.origin)
   return NextResponse.json({error:"Origen no permitido."},{status:403});
 if(Number(req.headers.get("content-length")||0)>2048)
   return NextResponse.json({error:"Solicitud demasiado extensa."},{status:413});
 let body:{case_id?:unknown;operator_id?:unknown};
 try{body=await req.json()}catch{return NextResponse.json({error:"Solicitud inválida."},{status:400})}
 const caseId=typeof body.case_id==="string"?body.case_id:"";
 const operatorId=typeof body.operator_id==="string"?body.operator_id:"";
 if(!uuid.test(caseId)||!uuid.test(operatorId))
   return NextResponse.json({error:"Identificadores inválidos."},{status:400});

 const db=createAdminClient();
 const {data:operator,error:operatorError}=await db.from("app_users")
   .select("user_id,role,active").eq("user_id",operatorId).maybeSingle();
 if(operatorError||!operator||!operator.active||operator.role!=="ese_operator")
   return NextResponse.json({error:"Selecciona un aplicador activo."},{status:400});

 const {data:study,error:studyError}=await db.from("ese_cases")
   .select("id,status,assigned_to,delivery_status").eq("id",caseId).maybeSingle();
 if(studyError||!study)return NextResponse.json({error:"Estudio no encontrado."},{status:404});
 if(["delivered","cancelled"].includes(study.status)||study.delivery_status==="released")
   return NextResponse.json({error:"El expediente está cerrado o liberado."},{status:409});
 if(study.assigned_to===operatorId)return NextResponse.json({ok:true,unchanged:true});

 // Optimistic condition prevents overwriting an assignment altered by another coordinator.
 let update=db.from("ese_cases").update({
   assigned_to:operatorId,
   status:study.status==="requested"||study.status==="unassigned"?"pending_contact":study.status
 }).eq("id",caseId).eq("status",study.status);
 update=study.assigned_to?update.eq("assigned_to",study.assigned_to):update.is("assigned_to",null);
 const {data:updated,error:updateError}=await update.select("id").maybeSingle();
 if(updateError)return NextResponse.json({error:"No se pudo asignar el aplicador."},{status:500});
 if(!updated)return NextResponse.json({error:"El estudio cambió mientras se asignaba. Actualiza la página."},{status:409});

 // Audit entry must be persisted; revert when the change cannot be audited.
 const {error:auditError}=await db.from("ese_case_status_history").insert({
   case_id:caseId,from_status:study.status,
   to_status:study.status==="requested"||study.status==="unassigned"?"pending_contact":study.status,
   changed_by:user.userId,
   notes:study.assigned_to?"Reasignación de aplicador por personal FactoRH.":"Asignación inicial de aplicador por personal FactoRH."
 });
 if(auditError){
   await db.from("ese_cases").update({assigned_to:study.assigned_to,status:study.status})
     .eq("id",caseId).eq("assigned_to",operatorId);
   return NextResponse.json({error:"No pudo registrarse la auditoría de asignación."},{status:500});
 }
 return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
