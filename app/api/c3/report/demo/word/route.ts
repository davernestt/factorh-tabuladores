import {NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {c3DemoReport} from "@/lib/c3/demo-report";
import {createC3WordReport} from "@/lib/c3/word";

export async function GET(){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")return NextResponse.json({error:"No autorizado."},{status:403});
 try{
  const bytes=createC3WordReport(c3DemoReport);
  return new Response(new Uint8Array(bytes),{
   status:200,
   headers:{
    "Content-Type":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition":'attachment; filename="FactoRH_C3_PRO_REPORTE_EJEMPLO_DATOS_FICTICIOS.docx"',
    "Cache-Control":"private, no-store",
    "X-Content-Type-Options":"nosniff"
   }
  });
 }catch{
  return NextResponse.json({error:"No fue posible generar el Word de ejemplo."},{status:500});
 }
}
