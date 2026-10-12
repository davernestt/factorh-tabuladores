import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {nom035RiskHash,nom035RiskSameOrigin} from "@/lib/nom035/risk-invitations";

export async function POST(req:Request){
 if(!nom035RiskSameOrigin(req))
  return NextResponse.json({error:"Origen no permitido."},{status:403});
 if(Number(req.headers.get("content-length")||0)>17000)
  return NextResponse.json({error:"Solicitud demasiado grande."},{status:413});
 let body:{token?:unknown;clients?:unknown;supervisor?:unknown;options?:unknown};
 try{body=await req.json()}catch{
  return NextResponse.json({error:"Formato de encuesta inválido."},{status:400});
 }
 if(typeof body.token!=="string"||!/^[A-Za-z0-9_-]{43}$/.test(body.token)||
   typeof body.clients!=="boolean"||typeof body.supervisor!=="boolean"||
   !body.options||typeof body.options!=="object"||Array.isArray(body.options)||
   Object.keys(body.options).length>72||
   Object.values(body.options).some(v=>!Number.isInteger(v)||Number(v)<0||Number(v)>4))
  return NextResponse.json({error:"Revisa que todas las preguntas estén completas."},{status:400});
 const {data,error}=await createAdminClient().rpc("nom035_risk_submit",{
  p_token_hash:nom035RiskHash(body.token),
  p_clients:body.clients,p_supervisor:body.supervisor,p_options:body.options
 });
 if(error)return NextResponse.json({
  error:"No se pudo registrar el cuestionario. Verifica todas las preguntas y que la liga esté activa."
 },{status:409,headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
 return NextResponse.json({ok:Boolean(data?.ok)},{headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
}
