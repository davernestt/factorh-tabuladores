import {NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {c3TokenHash,deriveC3InvitationToken,isC3SameOrigin} from "@/lib/c3/invitations";

export async function POST(req:Request){
 if(!isC3SameOrigin(req))return NextResponse.json({error:"Origen no permitido."},{status:403});
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")return NextResponse.json({error:"No autorizado."},{status:403});
 let data:{campaignId?:string;segment?:string;departmentId?:string|null;count?:number};
 try{data=await req.json();}catch{return NextResponse.json({error:"Solicitud inválida."},{status:400})}
 if(!data.campaignId||!/^[0-9a-f-]{36}$/i.test(data.campaignId)||
 !["operativo","administrativo"].includes(data.segment||"")||
 !Number.isInteger(data.count)||Number(data.count)<1||Number(data.count)>200||
 (data.departmentId!==null&&data.departmentId!==undefined&&!/^[0-9a-f-]{36}$/i.test(data.departmentId)))
 return NextResponse.json({error:"Elige un segmento y una cantidad entre 1 y 200."},{status:400});
 const db=createAdminClient();
 const records=Array.from({length:Number(data.count)},()=>{
   const id=randomUUID();const token=deriveC3InvitationToken(id);
   return {id,hash:c3TokenHash(token)};
 });
 const {data:created,error}=await db.rpc("c3_create_invites_bulk",{
  p_campaign_id:data.campaignId,p_segment:data.segment,p_department_id:data.departmentId||null,
  p_records:records
 });
 if(error||!created)return NextResponse.json({error:error?.message||"No se pudieron generar las ligas."},{status:409});
 const links=(created as {invite_id:string;reference_code:string}[]).map(row=>({
   id:row.invite_id,code:row.reference_code,segment:data.segment,
   departmentId:data.departmentId||null,distributionStatus:"pending" as const,
   url:new URL("/c3/"+deriveC3InvitationToken(row.invite_id),req.url).toString()
 }));
 return NextResponse.json({created:links,count:links.length},{headers:{"Cache-Control":"private, no-store"}});
}

export async function GET(req:Request){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")return NextResponse.json({error:"No autorizado."},{status:403});
 const campaignId=new URL(req.url).searchParams.get("campaignId")||"";
 if(!/^[0-9a-f-]{36}$/i.test(campaignId))return NextResponse.json({error:"Campaña inválida."},{status:400});
 const db=createAdminClient();
 const {data:rows,error}=await db.from("c3_invites")
 .select("id,token_hash,segment,department_id,distribution_code,distribution_status,shared_at,created_at")
 .eq("campaign_id",campaignId).neq("status","revoked").order("created_at",{ascending:true}).limit(10000);
 if(error)return NextResponse.json({error:"No fue posible recuperar el registro de distribución."},{status:500});
 const links=(rows||[]).map(row=>{
   // Older invitations used non-recoverable random tokens and intentionally cannot be recreated.
   const derived=deriveC3InvitationToken(row.id);
   const canRecover=c3TokenHash(derived)===row.token_hash;
   return {
     id:row.id,code:row.distribution_code||"LEG-"+row.id.slice(0,8),
     segment:row.segment,departmentId:row.department_id||null,
     distributionStatus:row.distribution_status,sharedAt:row.shared_at,
     url:canRecover?new URL("/c3/"+derived,req.url).toString():null
   };
 });
 // Never return individual response statuses or submission timestamps to the distribution screen.
 return NextResponse.json({links,total:links.length},{headers:{"Cache-Control":"private, no-store"}});
}
