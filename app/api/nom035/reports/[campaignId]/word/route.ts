import {NextResponse} from "next/server";
import {getNom035ReportBundle} from "@/lib/nom035/report-data";
import {buildNom035WordReport} from "@/lib/nom035/word-export";
type Props={params:Promise<{campaignId:string}>};

export async function GET(req:Request,{params}:Props){
 const {campaignId}=await params;
 let bundle:Awaited<ReturnType<typeof getNom035ReportBundle>>;
 try{bundle=await getNom035ReportBundle(campaignId)}
 catch{return NextResponse.json({error:"No disponible o sin autorización"},{status:404});}
 const {campaign,center,organizationName,groups,draft,actions,privacyReady,targetAchieved}=bundle;
 if(!privacyReady)return NextResponse.json({
  error:"Para proteger la privacidad, el reporte estará disponible al cerrar la campaña y obtener al menos 10 respuestas."
 },{status:409,headers:{"Cache-Control":"no-store"}});
 const kind=new URL(req.url).searchParams.get("vista")==="ejecutiva"?"executive":"technical";
 const buffer=buildNom035WordReport({
  kind,company:organizationName,center:center.name,
  address:[center.street_address,center.municipality,center.state].filter(Boolean).join(", "),
  activity:center.main_activity,guide:campaign.guide,version:campaign.bank_version,
  population:campaign.workforce_snapshot,target:campaign.eligible_population,
  completed:campaign.completed_count,covered:targetAchieved,
  validated:draft?.validation_status==="internal_review",
  objective:draft?.objective||"",activities:draft?.activities||"",
  method:draft?.methodology_notes||"",conclusions:draft?.conclusions||"",
  recommendations:draft?.recommendations||"",interventions:draft?.intervention_notes||"",
  responsible:draft?.responsible_name||"",license:draft?.professional_license||"",
  aggregates:groups,actions
 });
 return new NextResponse(new Uint8Array(buffer),{
  status:200,
  headers:{
   "Content-Type":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
   "Content-Disposition":'attachment; filename="FactoRH_NOM035_'+(kind==="executive"?"Ejecutivo":"Tecnico")+'_'+campaign.guide+'.docx"',
   "Cache-Control":"private, no-store","Referrer-Policy":"no-referrer",
   "X-Content-Type-Options":"nosniff"
  }
 });
}
