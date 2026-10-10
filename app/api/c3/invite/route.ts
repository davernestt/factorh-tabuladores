import { NextResponse } from "next/server";
import { randomBytes,createHash } from "node:crypto";
import { getCurrentAppUser } from "@/lib/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";
export async function POST(req:Request){
  const user=await getCurrentAppUser();
  if(!user||user.role==="client")return NextResponse.json({error:"No autorizado"},{status:403});
  let body:{campaignId?:string;segment?:string};
  try{body=await req.json()}catch{return NextResponse.json({error:"Solicitud inválida"},{status:400})}
  if(!body.campaignId||!["operativo","administrativo"].includes(body.segment||""))return NextResponse.json({error:"Selecciona un segmento válido"},{status:400});
  const db=createAdminClient();
  const {data:campaign,error}=await db.from("c3_campaigns").select("id,status,planned_population").eq("id",body.campaignId).maybeSingle();
  if(error||!campaign||campaign.status!=="open")return NextResponse.json({error:"La campaña no está abierta"},{status:409});
  const {count}=await db.from("c3_invites").select("id",{count:"exact",head:true}).eq("campaign_id",campaign.id).neq("status","revoked");
  if(campaign.planned_population&&Number(count??0)>=campaign.planned_population)return NextResponse.json({error:"Se alcanzó el límite de participantes elegibles"},{status:409});
  const token=randomBytes(32).toString("base64url");
  const token_hash=createHash("sha256").update(token).digest("hex");
  const {error:insertError}=await db.from("c3_invites").insert({campaign_id:campaign.id,segment:body.segment,token_hash});
  if(insertError)return NextResponse.json({error:"No se pudo generar el acceso"},{status:500});
  return NextResponse.json({url:new URL("/c3/"+token,req.url).toString()},{headers:{"Cache-Control":"no-store"}});
}
