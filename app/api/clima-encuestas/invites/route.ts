import {NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {climaInviteToken,climaHash,isClimaUuid,climaSameOrigin} from "@/lib/clima/invitations";

export async function POST(req:Request){
 if(!climaSameOrigin(req))return NextResponse.json({error:"Origen no permitido."},{status:403});
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")return NextResponse.json({error:"Acceso restringido."},{status:403});
 let input:{campaignId?:string;count?:number;departmentId?:string|null};
 try{input=await req.json()}catch{return NextResponse.json({error:"Datos inválidos."},{status:400})}
 if(!input.campaignId||!isClimaUuid(input.campaignId)||
 !Number.isInteger(input.count)||Number(input.count)<1||Number(input.count)>100)
 return NextResponse.json({error:"Genera entre 1 y 100 ligas."},{status:400});
 const db=createAdminClient();
 const departmentId=typeof input.departmentId==="string"&&input.departmentId.trim()?input.departmentId.trim():null;
 const {data:campaign,error:campaignError}=await db.from("clima_campaigns")
  .select("id,organization_id,status").eq("id",input.campaignId).maybeSingle();
 if(campaignError||!campaign)return NextResponse.json({error:"Campaña no encontrada."},{status:404});
 if(campaign.status!=="open")return NextResponse.json({error:"La campaña no está abierta."},{status:409});
 if(departmentId){
  if(!isClimaUuid(departmentId))return NextResponse.json({error:"Departamento inválido."},{status:400});
  const {data:dept}=await db.from("organization_departments").select("id")
   .eq("id",departmentId).eq("organization_id",campaign.organization_id).eq("active",true).maybeSingle();
  if(!dept)return NextResponse.json({error:"Departamento no autorizado para esta empresa."},{status:403});
 }
 const records=Array.from({length:Number(input.count)},()=>{
  const id=randomUUID();return {id,hash:climaHash(climaInviteToken(id))};
 });
 const {data,error}=await db.rpc("clima_create_invites_bulk",{
  p_campaign_id:input.campaignId,p_records:records
 });
 if(error)return NextResponse.json({error:error.message},{status:409});
 if(departmentId){
  const {error:groupError}=await db.from("clima_invites").update({department_id:departmentId})
   .eq("campaign_id",input.campaignId).in("id",records.map(r=>r.id));
  if(groupError){
   await db.from("clima_invites").delete().eq("campaign_id",input.campaignId)
    .in("id",records.map(r=>r.id));
   return NextResponse.json({error:"No fue posible clasificar las invitaciones. Intenta nuevamente."},{status:500});
  }
 }
 return NextResponse.json({count:data,links:records.map(r=>({
  id:r.id,departmentId,url:new URL("/clima-evaluar/"+climaInviteToken(r.id),req.url).toString()
 }))},{headers:{"Cache-Control":"private, no-store"}});
}

export async function GET(req:Request){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")return NextResponse.json({error:"Acceso restringido."},{status:403});
 const campaignId=new URL(req.url).searchParams.get("campaignId")||"";
 if(!isClimaUuid(campaignId))return NextResponse.json({error:"Campaña inválida."},{status:400});
 const db=createAdminClient();
 const {data,error}=await db.from("clima_invites").select("id,token_hash,department_id")
  .eq("campaign_id",campaignId).neq("status","revoked").order("created_at").limit(10000);
 if(error)return NextResponse.json({error:"No fue posible consultar ligas."},{status:500});
 const links=(data||[]).map(r=>{
  const token=climaInviteToken(r.id);
  return {id:r.id,departmentId:r.department_id||null,url:r.token_hash===climaHash(token)?
   new URL("/clima-evaluar/"+token,req.url).toString():null};
 });
 // Never expose each recipient's completed/pending status.
 return NextResponse.json({links,count:links.length},{headers:{"Cache-Control":"private, no-store"}});
}
