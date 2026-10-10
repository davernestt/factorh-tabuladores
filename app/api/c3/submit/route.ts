import {NextResponse} from "next/server";
import {createHash} from "node:crypto";
import {createAdminClient} from "@/lib/supabase/admin";
export async function POST(req:Request){
 if(Number(req.headers.get("content-length")||0)>100000)return NextResponse.json({error:"Solicitud demasiado grande."},{status:413});
 let body:{token?:string;answers?:unknown};
 try{body=await req.json()}catch{return NextResponse.json({error:"Datos inválidos."},{status:400})}
 if(!body.token||!/^[A-Za-z0-9_-]{43}$/.test(body.token)||!Array.isArray(body.answers)||body.answers.length>152){
  return NextResponse.json({error:"Datos inválidos."},{status:400});
 }
 const tokenHash=createHash("sha256").update(body.token).digest("hex");
 const db=createAdminClient();
 const {data,error}=await db.rpc("c3_submit_pilot",{p_token_hash:tokenHash,p_answers:body.answers});
 if(error){return NextResponse.json({error:"No fue posible registrar la encuesta. Comprueba que todas las preguntas estén contestadas y que la liga siga activa."},{status:409,headers:{"Cache-Control":"no-store"}})}
 return NextResponse.json({ok:true,saved:data?.saved??null},{headers:{"Cache-Control":"no-store"}});
}
