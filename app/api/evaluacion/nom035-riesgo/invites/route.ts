import {NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {
 nom035RiskToken,nom035RiskHash,nom035RiskSameOrigin,validRiskId
} from "@/lib/nom035/risk-invitations";

async function authorized(){
 const user=await getCurrentAppUser();
 return Boolean(user&&user.role==="super_admin");
}
const responseHeaders={"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"};
export async function POST(req:Request){
 if(!nom035RiskSameOrigin(req))return NextResponse.json({error:"Origen no permitido."},{status:403});
 if(!await authorized())return NextResponse.json({error:"Acceso no autorizado."},{status:403});
 let body:{campaignId?:string;count?:number};
 try{body=await req.json()}catch{
  return NextResponse.json({error:"Solicitud inválida."},{status:400});
 }
 if(!validRiskId(body.campaignId||"")||!Number.isInteger(body.count)||
   Number(body.count)<1||Number(body.count)>100)
  return NextResponse.json({error:"Solicita de 1 a 100 enlaces."},{status:400});
 const records=Array.from({length:Number(body.count)},()=>{
  const id=randomUUID();
  return {id,hash:nom035RiskHash(nom035RiskToken(id))};
 });
 const db=createAdminClient();
 const {data,error}=await db.rpc("nom035_risk_create_invites",{
  p_campaign_id:body.campaignId,p_records:records
 });
 if(error)return NextResponse.json({error:error.message},{status:409});
 return NextResponse.json({
  count:data,
  links:records.map(r=>({id:r.id,url:new URL("/e/nom035-riesgo/"+nom035RiskToken(r.id),req.url).toString()}))
 },{headers:responseHeaders});
}
export async function GET(req:Request){
 if(!await authorized())return NextResponse.json({error:"Acceso no autorizado."},{status:403});
 const campaignId=new URL(req.url).searchParams.get("campaignId")||"";
 if(!validRiskId(campaignId))return NextResponse.json({error:"Campaña inválida."},{status:400});
 const db=createAdminClient();
 const {data,error}=await db.from("nom035_risk_invites").select("id,token_hash")
 .eq("campaign_id",campaignId).neq("status","revoked").order("created_at").limit(10000);
 if(error)return NextResponse.json({error:"No se pudieron cargar los enlaces."},{status:500});
 const links=(data||[]).map(r=>{
  const token=nom035RiskToken(r.id);
  return {id:r.id,url:r.token_hash===nom035RiskHash(token)?
   new URL("/e/nom035-riesgo/"+token,req.url).toString():null};
 });
 return NextResponse.json({count:links.length,links},{headers:responseHeaders});
}
