import {NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {pulseToken,pulseHash,pulseSameOrigin} from "@/lib/pulse/invitations";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(req:Request){
 if(!pulseSameOrigin(req))return NextResponse.json({error:"Origen no permitido."},{status:403});
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")return NextResponse.json({error:"No autorizado."},{status:403});
 let input:{campaignId?:string;count?:number};
 try{input=await req.json()}catch{return NextResponse.json({error:"Datos inválidos."},{status:400})}
 if(!input.campaignId||!uuid.test(input.campaignId)||!Number.isInteger(input.count)||input.count!<1||input.count!>100)
  return NextResponse.json({error:"Solicita entre 1 y 100 ligas."},{status:400});
 const db=createAdminClient();
 const records=Array.from({length:input.count!},()=>{const id=randomUUID();return {id,hash:pulseHash(pulseToken(id))}});
 const {data,error}=await db.rpc("pulse_create_invites_bulk",{p_campaign_id:input.campaignId,p_records:records});
 if(error)return NextResponse.json({error:error.message},{status:409});
 return NextResponse.json({count:data,links:records.map(r=>({id:r.id,url:new URL("/pulso/"+pulseToken(r.id),req.url).toString()}))},{headers:{"Cache-Control":"private,no-store"}});
}
export async function GET(req:Request){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")return NextResponse.json({error:"No autorizado"},{status:403});
 const id=new URL(req.url).searchParams.get("campaignId")||"";
 if(!uuid.test(id))return NextResponse.json({error:"Campaña inválida"},{status:400});
 const db=createAdminClient();
 const {data,error}=await db.from("pulse_invites").select("id,token_hash")
  .eq("campaign_id",id).neq("status","revoked").order("created_at").limit(10000);
 if(error)return NextResponse.json({error:"No fue posible cargar las ligas."},{status:500});
 const links=(data||[]).map(row=>{
  const token=pulseToken(row.id);
  return {id:row.id,url:pulseHash(token)===row.token_hash?new URL("/pulso/"+token,req.url).toString():null};
 });
 // Never return completed state or identity mapping.
 return NextResponse.json({links,count:links.length},{headers:{"Cache-Control":"private,no-store"}});
}
