import { NextRequest,NextResponse } from 'next/server';
import { authorized360Admin } from '@/lib/feedback360-auth';
import { createAdminClient } from '@/lib/supabase/admin';
type Context={params:Promise<{id:string}>};
export async function PATCH(request:NextRequest,ctx:Context){
  if(!await authorized360Admin())return NextResponse.json({error:'No autorizado.'},{status:403});
  const {id}=await ctx.params;
  let input:{status?:string};try{input=await request.json()}catch{return NextResponse.json({error:'Petición inválida.'},{status:400})}
  if(input.status!=='closed')return NextResponse.json({error:'Estado no permitido.'},{status:400});
  const db=createAdminClient();
  const {data,error}=await db.from('feedback360_cycles').update({status:'closed',closed_at:new Date().toISOString()}).eq('id',id).eq('status','open').select('id,status').maybeSingle();
  if(error)return NextResponse.json({error:error.message},{status:500});
  if(!data)return NextResponse.json({error:'Ciclo no encontrado.'},{status:404});
  return NextResponse.json({ok:true,status:data.status});
}

export async function POST(request:NextRequest,ctx:Context){
  if(!await authorized360Admin())return NextResponse.json({error:'No autorizado.'},{status:403});
  const {randomBytes,createHash}=await import('node:crypto');
  const {id}=await ctx.params;
  let body:{rater_id?:string};try{body=await request.json()}catch{return NextResponse.json({error:'Solicitud inválida.'},{status:400})}
  if(!body.rater_id)return NextResponse.json({error:'Falta evaluador.'},{status:400});
  const db=createAdminClient();
  const {data:cycle}=await db.from('feedback360_cycles').select('status').eq('id',id).maybeSingle();
  if(cycle?.status!=='open')return NextResponse.json({error:'El ciclo no está abierto.'},{status:409});
  const token=randomBytes(32).toString('base64url');
  const token_hash=createHash('sha256').update(token).digest('hex');
  const {data,error}=await db.from('feedback360_raters').update({token_hash}).eq('id',body.rater_id).eq('cycle_id',id).eq('status','pending').select('id').maybeSingle();
  if(error)return NextResponse.json({error:'No fue posible reexpedir la liga.'},{status:500});
  if(!data)return NextResponse.json({error:'El evaluador no está pendiente.'},{status:409});
  return NextResponse.json({ok:true,path:`/360/${token}`},{headers:{'Cache-Control':'no-store'}});
}
