import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/app-auth";
import { loadC3Report } from "@/lib/c3/report";
import { createC3WordReport } from "@/lib/c3/word";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")return NextResponse.json({error:"No autorizado."},{status:403,headers:{"Cache-Control":"private, no-store"}});
 const {id}=await params;
 const report=await loadC3Report(id);
 if(!report)return NextResponse.json({error:"Campaña no encontrada."},{status:404,headers:{"Cache-Control":"private, no-store"}});
 if(report.summary.suppressed||report.summary.global==null||
   report.summary.dimensions?.length!==13||report.summary.dimensions.some(d=>d.score==null))
   return NextResponse.json({error:"El reporte no puede emitirse porque no hay datos suficientes para proteger la confidencialidad y calcular todas las dimensiones."},{status:409,headers:{"Cache-Control":"private, no-store"}});
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
