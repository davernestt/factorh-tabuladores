import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {guide1SameOrigin,guide1TokenHash} from "@/lib/nom035/guide1-invitations";

export async function POST(request:Request){
 if(!guide1SameOrigin(request))
  return NextResponse.json({error:"Origen no permitido."},{status:403});
 if(Number(request.headers.get("content-length")||0)>12000)
  return NextResponse.json({error:"La solicitud excede el límite."},{status:413});
 let body:{token?:unknown;exposed?:unknown;answers?:unknown};
 try{body=await request.json()}catch{
  return NextResponse.json({error:"Solicitud inválida."},{status:400});
 }
 if(typeof body.token!=="string"||!/^[A-Za-z0-9_-]{43}$/.test(body.token)||
  typeof body.exposed!=="boolean"||
  (body.answers!==undefined&&(body.answers===null||typeof body.answers!=="object"||
    Array.isArray(body.answers)))){
  return NextResponse.json({error:"Revisa que el cuestionario esté completo."},{status:400});
 }
 const db=createAdminClient();
 const {data,error}=await db.rpc("nom035_g1_submit",{
  p_token_hash:guide1TokenHash(body.token),
  p_exposed:body.exposed,
  p_symptoms:body.answers||{}
 });
 if(error){
  return NextResponse.json({
   error:"No fue posible guardar el cuestionario. Comprueba que todas las preguntas están contestadas y la liga siga activa."
  },{status:409,headers:{"Cache-Control":"no-store"}});
 }
 return NextResponse.json({ok:true,needsReferral:!!data?.needs_referral},
  {headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
}
