import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/app-auth";
import {hasStaffPermission} from "@/lib/staff-permissions";
import { loadC3Report } from "@/lib/c3/report";
import { createC3WordReport } from "@/lib/c3/word";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const user=await getCurrentAppUser();
 if(!await hasStaffPermission(user,"climate","reports"))return NextResponse.json({error:"No autorizado."},{status:403,headers:{"Cache-Control":"private, no-store"}});
 const {id}=await params;
 const report=await loadC3Report(id);
 if(!report)return NextResponse.json({error:"Campaña no encontrada."},{status:404,headers:{"Cache-Control":"private, no-store"}});
 if(report.campaign.status!=="closed"||report.summary.suppressed||report.summary.global==null||
   report.summary.dimensions?.length!==13||report.summary.dimensions.some(d=>d.score==null))
   return NextResponse.json({error:"El reporte final requiere una campaña cerrada, datos suficientes y todas las dimensiones calculables."},{status:409,headers:{"Cache-Control":"private, no-store"}});
 if(user?.role==="super_admin"){
   const {error:releaseError}=await createAdminClient().rpc("c3_release_final_report",{p_campaign_id:id});
   if(releaseError)return NextResponse.json({error:"No se pudo liberar el informe final con los controles de confidencialidad."},{status:409,headers:{"Cache-Control":"private, no-store"}});
 }else{
   const {data:campaign,error:releaseError}=await createAdminClient().from("c3_campaigns")
    .select("report_released_at").eq("id",id).maybeSingle();
   if(releaseError||!campaign?.report_released_at)return NextResponse.json({error:"Reporte aún no liberado por la dirección de FactoRH."},{status:403});
 }
 try{
  const word=createC3WordReport(report);
  const fileName="FactoRH_C3_PRO_Reporte_"+id.slice(0,8)+".docx";
  return new Response(new Uint8Array(word),{status:200,headers:{
   "Content-Type":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
   "Content-Disposition":'attachment; filename="'+fileName+'"',
   "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"
  }});
 }catch{
  return NextResponse.json({error:"No se pudo preparar el reporte."},{status:500,headers:{"Cache-Control":"private, no-store"}});
 }
}
