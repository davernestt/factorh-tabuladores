import {NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {nom035DemoWordPayload} from "@/lib/nom035/demo-report";
import {buildNom035WordReport} from "@/lib/nom035/word-export";
export async function GET(){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")
  return NextResponse.json({error:"No autorizado"},{status:403});
 const data=buildNom035WordReport(nom035DemoWordPayload("technical"));
 return new NextResponse(new Uint8Array(data),{
  headers:{
   "Content-Type":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
   "Content-Disposition":'attachment; filename="FactoRH_NOM035_Ejemplo_Ficticio.docx"',
   "Cache-Control":"no-store","X-Content-Type-Options":"nosniff"
  }
 });
}
