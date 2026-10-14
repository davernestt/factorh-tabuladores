import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";

type Params={params:Promise<{id:string}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(req:NextRequest,{params}:Params){
 const user=await getCurrentAppUser();
 if(user?.role!=="super_admin")return NextResponse.json({error:"Solo administrador."},{status:403});
 if(req.headers.get("origin")!==req.nextUrl.origin)return NextResponse.json({error:"Origen no permitido."},{status:403});
 const {id}=await params;if(!uuid.test(id))return NextResponse.json({error:"Expediente inválido."},{status:400});
 let body:{task_type?:unknown;assignee_id?:unknown};
 try{body=await req.json()}catch{return NextResponse.json({error:"Datos inválidos."},{status:400})}
 const type=body.task_type,assignee=body.assignee_id;
 if(!["visita","referencias"].includes(String(type))||typeof assignee!=="string"||!uuid.test(assignee))
  return NextResponse.json({error:"Tipo o asignación incorrecta."},{status:400});
 const db=createAdminClient();
 const [caseR,assigneeR]=await Promise.all([
  db.from("ese_cases").select("id,is_demo,delivery_status").eq("id",id).maybeSingle(),
  db.from("app_users").select("user_id,active,role").eq("user_id",assignee).maybeSingle()
 ]);
 if(!caseR.data?.is_demo||caseR.data.delivery_status==="released")
  return NextResponse.json({error:"Solo expedientes piloto privados sin liberar."},{status:409});
 if(!assigneeR.data?.active||!["super_admin","ese_operator"].includes(assigneeR.data.role))
  return NextResponse.json({error:"Selecciona un operador habilitado."},{status:400});
 const {data,error}=await db.from("ese_work_tasks").insert({
  case_id:id,task_type:type,assignee_id:assignee,assigned_by:user.userId,updated_by:user.userId
 }).select("id").single();
 if(error||!data)return NextResponse.json({error:error?.code==="23505"?"Este operador ya tiene asignada esa tarea.":"No pudo asignarse la tarea."},{status:409});
 await db.from("ese_work_task_audit").insert({task_id:data.id,actor_id:user.userId,action:"assign",new_status:"pendiente"});
 return NextResponse.json({ok:true,id:data.id},{status:201,headers:{"Cache-Control":"no-store"}});
}
export async function GET(_req:NextRequest,{params}:Params){
 const user=await getCurrentAppUser();
 if(!user||!["super_admin","ese_operator"].includes(user.role))return NextResponse.json({error:"No autorizado."},{status:403});
 const {id}=await params;if(!uuid.test(id))return NextResponse.json({error:"Identificador incorrecto."},{status:400});
 const db=createAdminClient();
 const {data:c}=await db.from("ese_cases").select("id,is_demo").eq("id",id).maybeSingle();
 if(!c?.is_demo)return NextResponse.json({error:"No encontrado."},{status:404});
 let query=db.from("ese_work_tasks").select("id,task_type,status,assignee_id,payload,review_notes,updated_at")
  .eq("case_id",id).order("created_at");
 if(user.role==="ese_operator")query=query.eq("assignee_id",user.userId);
 const {data,error}=await query;
 if(error)return NextResponse.json({error:"No fue posible consultar tareas."},{status:500});
 return NextResponse.json({tasks:data||[]},{headers:{"Cache-Control":"private,no-store"}});
}
