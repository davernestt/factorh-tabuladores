import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {pulseHash,pulseSameOrigin} from "@/lib/pulse/invitations";
export async function POST(req:Request){
 if(!pulseSameOrigin(req))return NextResponse.json({error:"Origen no permitido"},{status:403});
 if(Number(req.headers.get("content-length")||0)>25000)return NextResponse.json({error:"Solicitud muy grande"},{status:413});
 let input:{token?:string;answers?:unknown};
 try{input=await req.json()}catch{return NextResponse.json({error:"Datos inválidos"},{status:400})}
 if(!input.token||!/^[A-Za-z0-9_-]{43}$/.test(input.token)||!Array.isArray(input.answers)||input.answers.length<8||input.answers.length>12)
  return NextResponse.json({error:"Respuestas incompletas"},{status:400});
 const {data,error}=await createAdminClient().rpc("pulse_submit",{p_token_hash:pulseHash(input.token),p_answers:input.answers});
 if(error)return NextResponse.json({error:"No fue posible registrar las respuestas. Verifica que la liga siga activa y todas las preguntas estén completas."},{status:409,headers:{"Cache-Control":"no-store"}});
 return NextResponse.json({ok:true,saved:data?.saved||null},{headers:{"Cache-Control":"no-store"}});
}
