import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePdlQuizInvite } from "@/lib/pdl/resolve-quiz-invite";

const fail=(error:string,status=400)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
export async function POST(request:NextRequest){
  const body=await request.json().catch(()=>null);
  const token=String(body?.token??"");
  const answers=body?.answers;
  const request_id=String(body?.request_id??"");
  if(!/^[a-f0-9]{64}$/.test(token)||!answers||typeof answers!=="object"||Array.isArray(answers)||! /^[0-9a-f-]{36}$/i.test(request_id))return fail("Solicitud inválida");
  const db=createAdminClient();
  let invite: Awaited<ReturnType<typeof resolvePdlQuizInvite>>;
  try { invite=await resolvePdlQuizInvite(token); }
  catch { return fail("No se pudo verificar la invitación",500); }
  if(!invite||!invite.active||new Date(invite.expires_at).getTime()<=Date.now())return fail("Invitación inválida o vencida",403);
  const [quiz,items,attempts]=await Promise.all([
    db.from("pdl_quiz_catalog").select("published,passing_score").eq("quiz_id",invite.quiz_id).eq("version",invite.quiz_version).maybeSingle(),
    db.from("pdl_quiz_items").select("position,question,options,correct_option,explanation").eq("quiz_id",invite.quiz_id).eq("version",invite.quiz_version).order("position"),
    db.from("pdl_quiz_attempts").select("attempt_number,request_id,result").eq("invite_id",invite.id).order("attempt_number")
  ]);
  if(quiz.error||items.error||attempts.error)return fail("No se pudo consultar la evaluación",500);
  if(!quiz.data?.published||(items.data??[]).length!==10)return fail("Evaluación no disponible",404);
  const repeated=(attempts.data??[]).find(x=>x.request_id===request_id);
  if(repeated)return NextResponse.json({score:repeated.result?.score,passed:repeated.result?.passed,attempt_number:repeated.attempt_number},{headers:{"Cache-Control":"no-store"}});
  const n=(attempts.data??[]).length;
  if(n>=invite.max_attempts)return fail("Ya utilizaste tus intentos",409);
  if(Object.keys(answers).length!==10)return fail("Responde todas las preguntas");
  let hits=0;
  const feedback=[];
  for(const item of items.data??[]){
    const chosen=answers[String(item.position)];
    const options=Array.isArray(item.options)?item.options:[];
    if(!options.some(o=>o.value===chosen))return fail("Una respuesta no es válida");
    const isCorrect=item.correct_option===chosen;
    if(isCorrect)hits++;
    feedback.push({id:"q"+item.position,prompt:item.question,selected:chosen,correct:item.correct_option,isCorrect,explanation:item.explanation});
  }
  const score=hits*10,passed=score>=quiz.data.passing_score;
  const attempt_number=n+1;
  const {error}=await db.from("pdl_quiz_attempts").insert({invite_id:invite.id,request_id,attempt_number,result:{score,passed,feedback}});
  // La clave única (invite_id,attempt_number) protege dos envíos concurrentes del mismo intento.
  if(error)return fail("No se pudo guardar. Actualiza la página antes de volver a enviar.",409);
  return NextResponse.json({score,passed,attempt_number},{headers:{"Cache-Control":"no-store"}});
}
