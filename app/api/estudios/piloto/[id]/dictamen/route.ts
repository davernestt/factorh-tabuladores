import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
type Params={params:Promise<{id:string}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowed:Record<string,number>={
 "service.responsible":180,"service.request_date":10,"service.visit_date":10,"service.close_date":10,
 "executive.summary":2500,"research.report":5000,"verdict.result":50,"verdict.rationale":2500
};
const verdicts=["","Recomendable","Recomendable con observaciones","No recomendable","No concluyente"];
export async function PUT(req:NextRequest,{params}:Params){
 const user=await getCurrentAppUser();
 if(user?.role!=="super_admin")return NextResponse.json({error:"Solo superadministración."},{status:403});
 if(req.headers.get("origin")!==req.nextUrl.origin)return NextResponse.json({error:"Origen no permitido."},{status:403});
 const {id}=await params;if(!uuid.test(id))return NextResponse.json({error:"Caso inválido."},{status:400});
 if(Number(req.headers.get("content-length")||0)>12500)return NextResponse.json({error:"Contenido demasiado largo."},{status:413});
 let body:unknown;
 try{body=await req.json()}catch{return NextResponse.json({error:"Datos incorrectos."},{status:400})}
 if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({error:"Formato incorrecto."},{status:400});
 const input=body as Record<string,unknown>,data:Record<string,string>={};
 if(Object.keys(input).length>Object.keys(allowed).length)return NextResponse.json({error:"Campos no permitidos."},{status:400});
 for(const [key,value]of Object.entries(input)){
  if(!(key in allowed)||typeof value!=="string"||value.length>allowed[key])
   return NextResponse.json({error:"Campo inválido: "+key},{status:400});
  data[key]=value.trim();
 }
 if(data["verdict.result"]&&!verdicts.includes(data["verdict.result"]))
  return NextResponse.json({error:"Resultado no válido."},{status:400});
 for(const key of ["service.request_date","service.visit_date","service.close_date"])
  if(data[key]&&!/^\d{4}-\d{2}-\d{2}$/.test(data[key]))
   return NextResponse.json({error:"Fecha incorrecta."},{status:400});
 const db=createAdminClient();
 const {data:c}=await db.from("ese_cases").select("id,is_demo,delivery_status").eq("id",id).maybeSingle();
 if(!c?.is_demo||c.delivery_status==="released")return NextResponse.json({error:"Solo se permite trabajar en pilotos sin liberar."},{status:409});
 const {error}=await db.from("ese_case_sections").upsert({
  case_id:id,section_key:"master_review",data,completed:false,updated_by:user.userId,updated_at:new Date().toISOString()
 },{onConflict:"case_id,section_key"});
 if(error)return NextResponse.json({error:"No fue posible guardar la revisión."},{status:500});
 return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
