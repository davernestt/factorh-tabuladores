import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {climaHash,climaSameOrigin} from "@/lib/clima/invitations";

export async function POST(req:Request){
 if(!climaSameOrigin(req))return NextResponse.json({error:"Origen no permitido."},{status:403});
 if(Number(req.headers.get("content-length")||0)>60000)
  return NextResponse.json({error:"El envío supera el límite permitido."},{status:413});
 let body:{token?:string;answers?:unknown};
 try{body=await req.json()}catch{return NextResponse.json({error:"Formato inválido."},{status:400})}
 if(!body.token||!/^[A-Za-z0-9_-]{43}$/.test(body.token)||
 !Array.isArray(body.answers)||body.answers.length<8||body.answers.length>100)
 return NextResponse.json({error:"Encuesta incompleta o enlace inválido."},{status:400});
 const db=createAdminClient();
 const {data,error}=await db.rpc("clima_submit",{
  p_token_hash:climaHash(body.token),p_answers:body.answers
 });
 if(error)return NextResponse.json({
  error:"No fue posible registrar tus respuestas. Revisa las escalas y confirma que el enlace siga activo."
 },{status:409,headers:{"Cache-Control":"no-store"}});
 return NextResponse.json({ok:true,saved:data?.saved??null},
  {headers:{"Cache-Control":"no-store"}});
}
