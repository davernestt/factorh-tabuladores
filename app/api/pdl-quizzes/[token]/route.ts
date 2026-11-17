import { NextRequest, NextResponse } from 'next/server';
import { loadInvite } from '@/lib/pdl-quizzes/server';
import { gradeQuiz } from '@/lib/pdl-quizzes/catalog';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:NextRequest,{params}:{params:Promise<{token:string}>}) {
 if(Number(request.headers.get('content-length')??0)>16000) return reply({error:'Solicitud demasiado grande.'},413);
 let body;
 try { const raw=await request.text();if(raw.length>16000)return reply({error:'Solicitud demasiado grande.'},413);body=JSON.parse(raw); }catch{return reply({error:'Solicitud inválida.'},400);}
 if(!body||typeof body.requestId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.requestId)) return reply({error:'Solicitud inválida.'},400);
 try {
  const loaded=await loadInvite((await params).token);
  if(!loaded) return reply({error:'La liga no está disponible o venció.'},404);
  let result;
  try{result=gradeQuiz(loaded.quiz.id,body.answers,body.reflection??'');}catch(e){return reply({error:(e as Error).message},400);}
  const {data,error}=await loaded.db.rpc('submit_pdl_quiz',{p_invite_id:loaded.invite.id,p_request_id:body.requestId,p_result:result});
  if(error){if(error.message.includes('quiz_unavailable'))return reply({error:'La liga venció, fue desactivada o ya agotó sus intentos.'},409);return reply({error:'No pudimos guardar tus respuestas. Intenta nuevamente.'},500);}
  return reply(data);
 }catch{return reply({error:'No pudimos guardar tus respuestas. Intenta nuevamente.'},503);}
}
