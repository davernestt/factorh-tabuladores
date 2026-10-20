import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {hasStaffPermission} from "@/lib/staff-permissions";
import {createAdminClient} from "@/lib/supabase/admin";
type Context={params:Promise<{id:string}>};
const idRegex=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
export async function PATCH(request:NextRequest,{params}:Context){
 const user=await getCurrentAppUser();
 if(!user||!await hasStaffPermission(user,"pdl","operate"))return fail("Sólo un evaluador autorizado de FactoRH puede calificar.",403);
 const origin=request.headers.get("origin");
 if(origin&&origin!==request.nextUrl.origin)return fail("Origen no autorizado.",403);
 const {id}=await params;
 if(!idRegex.test(id))return fail("Evaluación inválida.");
 let body:{questionId?:string;score?:number};
 try{body=await request.json()}catch{return fail("Datos inválidos.");}
 if(!body.questionId||!idRegex.test(body.questionId)||!Number.isInteger(body.score)||Number(body.score)<1||Number(body.score)>5)
  return fail("Selecciona una valoración del 1 al 5.");
 const db=createAdminClient();
 const {data:assignment,error:assignmentError}=await db.from("assessment_assignments")
  .select("id,template_id,status").eq("id",id).maybeSingle();
 if(assignmentError)return fail("No se pudo verificar la evaluación.",500);
 if(!assignment)return fail("Evaluación no encontrada.",404);
 if(assignment.status!=="completed")return fail("Primero debe concluir el participante.",409);
 const {data:template,error:templateError}=await db.from("assessment_templates")
  .select("assessment_type").eq("id",assignment.template_id).single();
 if(templateError||template?.assessment_type!=="leadership_cases")
  return fail("Este instrumento no utiliza rúbrica de casos.",400);
 const {data:question,error:questionError}=await db.from("assessment_questions")
  .select("id").eq("id",body.questionId).eq("template_id",assignment.template_id).eq("question_type","scale").maybeSingle();
 if(questionError||!question)return fail("Criterio de evaluación inválido.",400);
 const {error:saveError}=await db.from("leadership_case_ratings").upsert({
  assignment_id:id,question_id:body.questionId,score:body.score,
  rated_by:user.userId,rated_at:new Date().toISOString()
 },{onConflict:"assignment_id,question_id"});
 if(saveError)return fail("No fue posible guardar la valoración.",500);
 const {data:count,error:calcError}=await db.rpc("refresh_leadership_case_results",{p_assignment_id:id});
 if(calcError)return fail("La valoración quedó guardada, pero no se pudo actualizar el reporte.",500);
 return NextResponse.json({ok:true,ratedCount:count});
}
