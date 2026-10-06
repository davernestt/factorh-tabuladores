import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { ALL_ITEMS_360 } from '@/lib/feedback360';

type Context = { params: Promise<{ token: string }> };
type Entry = { key: string; value: number | null; not_observed?: boolean };
type Body = { answers?: Entry[]; comments?: Record<string,string> };
const invalid = (message:string,status=400) => NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
function isPastDue(dueDate:string|null|undefined) {
  if(!dueDate) return false;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const obj=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return `${obj.year}-${obj.month}-${obj.day}`>dueDate;
}
async function locate(token:string) {
  if(!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const tokenHash=createHash('sha256').update(token).digest('hex');
  const db=createAdminClient();
  const {data,error}=await db.from('feedback360_raters').select('id,cycle_id,role,status,evaluator_name').eq('token_hash',tokenHash).maybeSingle();
  if(error) throw error;
  return data;
}
export async function GET(_req:NextRequest,context:Context) {
  const {token}=await context.params;
  try {
    const rater=await locate(token);
    if(!rater || rater.status==='cancelled') return invalid('Liga inválida.',404);
    if(rater.status==='completed') return NextResponse.json({completed:true},{headers:{'Cache-Control':'no-store'}});
    const db=createAdminClient();
    const {data:cycle,error}=await db.from('feedback360_cycles').select('id,status,name,due_date,person_id,organization_id').eq('id',rater.cycle_id).single();
    if(error) throw error;
    if(cycle.status!=='open' || isPastDue(cycle.due_date)) return invalid('Esta evaluación ya no acepta respuestas.',409);
    const [{data:person},{data:org}]=await Promise.all([
      db.from('people').select('first_name,last_name,job_title').eq('id',cycle.person_id).single(),
      db.from('organizations').select('name').eq('id',cycle.organization_id).single()
    ]);
    return NextResponse.json({
      role:rater.role, evaluator_name:rater.evaluator_name,
      cycle:cycle.name, due_date:cycle.due_date,
      person_name:person?`${person.first_name} ${person.last_name??''}`.trim():'Persona evaluada',
      job_title:person?.job_title??null, organization:org?.name??null,
      questions:ALL_ITEMS_360,
    },{headers:{'Cache-Control':'no-store'}});
  } catch { return invalid('No fue posible cargar la evaluación.',500); }
}
export async function POST(request:NextRequest,context:Context) {
  const {token}=await context.params;
  try {
    const rater=await locate(token);
    if(!rater || rater.status==='cancelled') return invalid('Liga inválida.',404);
    if(rater.status==='completed') return invalid('Esta evaluación ya fue enviada.',409);
    const db=createAdminClient();
    const {data:cycle,error:cycleError}=await db.from('feedback360_cycles').select('status,due_date').eq('id',rater.cycle_id).single();
    if(cycleError || !cycle || (cycle.status!=='open' || isPastDue(cycle.due_date))) return invalid('El periodo ya no está abierto.',409);
    let body:Body;
    try { body=await request.json(); } catch { return invalid('Envío inválido.'); }
    if(!Array.isArray(body.answers) || body.answers.length!==ALL_ITEMS_360.length) return invalid('Responde los 60 reactivos.');
    const items=new Map(ALL_ITEMS_360.map(item=>[item.key,item]));
    const used=new Set<string>();
    const answers: {rater_id:string,item_key:string,rating:number|null,not_observed:boolean}[]=[];
    for(const item of body.answers) {
      if(!item || typeof item.key!=='string' || !items.has(item.key) || used.has(item.key)) return invalid('Se detectó un reactivo incorrecto o repetido.');
      used.add(item.key);
      const notObserved = item.not_observed===true;
      if(notObserved ? item.value!==null : ![1,2,3,4].includes(item.value as number)) return invalid('Todas las respuestas deben estar en escala 1-4 o «No tengo elementos para evaluarlo».');
      answers.push({rater_id:rater.id,item_key:item.key,rating:notObserved?null:item.value as number,not_observed:notObserved});
    }
    const allowedComments = new Set(['strengths','improvements','recommendations']);
    const comments = Object.entries(body.comments??{}).filter(([key,value])=>allowedComments.has(key) && typeof value==='string' && value.trim().length>0).map(([question_key,value])=>({rater_id:rater.id,question_key,comment:value.trim()}));
    if(comments.some(c=>c.comment.length>2000)) return invalid('Reduce los comentarios a 2000 caracteres por pregunta.');
    const {error:answerError}=await db.from('feedback360_answers').upsert(answers,{onConflict:'rater_id,item_key'});
    if(answerError) return invalid('No fue posible guardar las respuestas.',500);
    if(comments.length){const {error:commentsError}=await db.from('feedback360_comments').upsert(comments,{onConflict:'rater_id,question_key'});if(commentsError)return invalid('No fue posible guardar los comentarios.',500);}
    const {data:done,error:doneError}=await db.from('feedback360_raters').update({status:'completed',completed_at:new Date().toISOString()}).eq('id',rater.id).eq('status','pending').select('id');
    if(doneError||!done?.length) return invalid('No pudo finalizarse la evaluación.',409);
    return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  } catch {return invalid('Ocurrió un error al registrar la evaluación.',500);}
}
