import {NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {
 guide1Token,guide1TokenHash,guide1SameOrigin,isGuide1Uuid
} from "@/lib/nom035/guide1-invitations";

const privateHeaders={"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"};
async function authorized(){
 const user=await getCurrentAppUser();
 return Boolean(user&&user.role==="super_admin");
}
export async function POST(req:Request){
 if(!guide1SameOrigin(req))return NextResponse.json({error:"Origen no permitido."},{status:403});
 if(!await authorized())return NextResponse.json({error:"Acceso restringido."},{status:403});
 let body:{campaignId?:string;count?:number};
 try{body=await req.json()}catch{
  return NextResponse.json({error:"Datos inválidos."},{status:400});
 }
 if(!isGuide1Uuid(body.campaignId||"")||!Number.isInteger(body.count)||
  Number(body.count)<1||Number(body.count)>100){
  return NextResponse.json({error:"Indica una campaña y entre 1 y 100 ligas."},{status:400});
 }
 const records=Array.from({length:body.count as number},()=>{
  const id=randomUUID();return {id,hash:guide1TokenHash(guide1Token(id))};
 });
 const db=createAdminClient();
 const {data,error}=await db.rpc("nom035_g1_create_invites",{
  p_campaign_id:body.campaignId,p_records:records
 });
 if(error)return NextResponse.json({error:error.message},{status:409});
 return NextResponse.json({count:data,links:records.map(r=>({
  id:r.id,url:new URL("/e/nom035-i/"+guide1Token(r.id),req.url).toString()
 }))},{headers:privateHeaders});
}
export async function GET(req:Request){
 if(!await authorized())return NextResponse.json({error:"Acceso restringido."},{status:403});
 const campaignId=new URL(req.url).searchParams.get("campaignId")||"";
 if(!isGuide1Uuid(campaignId))return NextResponse.json({error:"Campaña inválida."},{status:400});
 const db=createAdminClient();
 const {data,error}=await db.from("nom035_guide1_invites")
  .select("id,token_hash").eq("campaign_id",campaignId)
  .neq("status","revoked").order("created_at").limit(10000);
 if(error)return NextResponse.json({error:"No se pudieron recuperar los enlaces."},{status:500});
 const links=(data||[]).map(r=>{
  const token=guide1Token(r.id);
  return {id:r.id,url:r.token_hash===guide1TokenHash(token)?
   new URL("/e/nom035-i/"+token,req.url).toString():null};
 });
 // Neither per-person completion status nor any clinical outcome is exposed here.
 return NextResponse.json({count:links.length,links},{headers:privateHeaders});
}
