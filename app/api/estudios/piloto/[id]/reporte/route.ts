import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {buildEseReport,type ReportInput} from "@/lib/ese/report-model";
import {makeEseDocx} from "@/lib/ese/export-docx";
import {makeEsePdf} from "@/lib/ese/export-pdf";

type Params={params:Promise<{id:string}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req:NextRequest,{params}:Params){
 const user=await getCurrentAppUser();
 if(user?.role!=="super_admin")return NextResponse.json({error:"Solo superadministración puede generar reportes."},{status:403});
 const {id}=await params;
 if(!uuid.test(id))return NextResponse.json({error:"Expediente inválido."},{status:400});
 const format=req.nextUrl.searchParams.get("formato");
 if(format!=="pdf"&&format!=="docx")
  return NextResponse.json({error:"Formato no admitido. Utiliza pdf o docx."},{status:400});
 const db=createAdminClient();
 const {data:c,error}=await db.from("ese_cases")
  .select("id,case_name,organization_id,study_type,position_name,is_demo,delivery_status")
  .eq("id",id).maybeSingle();
 if(error||!c?.is_demo||c.delivery_status==="released")return NextResponse.json({error:"Solo se permite generar reportes de prueba no publicados."},{status:404});
 const [orgR,reviewR,tasksR]=await Promise.all([
  db.from("organizations").select("name").eq("id",c.organization_id).maybeSingle(),
  db.from("ese_case_sections").select("data").eq("case_id",id).eq("section_key","master_review").maybeSingle(),
  db.from("ese_work_tasks").select("task_type,status,payload,updated_at").eq("case_id",id).order("updated_at")
 ]);
 if(orgR.error||reviewR.error||tasksR.error)return NextResponse.json({error:"No fue posible reunir toda la información del expediente."},{status:500});
 const tasks=tasksR.data||[];
 const merge=(type:string)=>{
  const fields:Record<string,string>={};
  for(const task of tasks.filter(t=>t.task_type===type)){
   if(task.payload&&typeof task.payload==="object"&&!Array.isArray(task.payload)){
    for(const [key,value] of Object.entries(task.payload as Record<string,unknown>)){
     if(typeof value==="string"&&value.trim())fields[key]=value;
    }
   }
  }
  return fields;
 };
 const review=reviewR.data?.data;
 const input:ReportInput={
  caseName:c.case_name,
  companyName:orgR.data?.name||"Empresa solicitante de prueba",
  studyType:c.study_type||"integral",
  position:c.position_name||"",
  visit:merge("visita"),references:merge("referencias"),
  review:review&&typeof review==="object"&&!Array.isArray(review)?
    Object.fromEntries(Object.entries(review).filter(([,v])=>typeof v==="string")) as Record<string,string>:{},
  approvedVisit:tasks.some(t=>t.task_type==="visita")&&tasks.filter(t=>t.task_type==="visita").every(t=>t.status==="aprobado"),
  approvedReferences:tasks.some(t=>t.task_type==="referencias")&&tasks.filter(t=>t.task_type==="referencias").every(t=>t.status==="aprobado")
 };
 const report=buildEseReport(input);
 const binary=format==="pdf"?makeEsePdf(report):makeEseDocx(report);
 if(binary.byteLength>8_000_000)return NextResponse.json({error:"El informe generado supera el tamaño permitido."},{status:413});
 return new NextResponse(new Uint8Array(binary),{
  status:200,
  headers:{
   "Content-Type":format==="pdf"?"application/pdf":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
   "Content-Disposition":'attachment; filename="FactoRH_ESE_Piloto_'+id.slice(0,8)+'.'+format+'"',
   "Cache-Control":"private, no-store, max-age=0",
   "X-Content-Type-Options":"nosniff"
  }
 });
}
