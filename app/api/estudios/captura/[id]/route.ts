import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {ESE_VISIT_GROUPS,ESE_REFERENCE_GROUPS,sanitizeEsePayload} from "@/lib/ese/master-schema";

type Params={params:Promise<{id:string}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const groups=[...ESE_VISIT_GROUPS,...ESE_REFERENCE_GROUPS];

/** Save one section of the assigned study; this is never a general ESE update endpoint. */
export async function PUT(req:NextRequest,{params}:Params){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="ese_operator")
   return NextResponse.json({error:"No autorizado."},{status:403});
 const origin=req.headers.get("origin");
 if(origin&&origin!==req.nextUrl.origin)
   return NextResponse.json({error:"Origen no permitido."},{status:403});
 if(Number(req.headers.get("content-length")||0)>90000)
   return NextResponse.json({error:"El formulario excede el tamaño permitido."},{status:413});
 const {id}=await params;
 if(!uuid.test(id))return NextResponse.json({error:"Estudio inválido."},{status:400});
 let body:{section_key?:unknown;data?:unknown;completed?:unknown};
 try{body=await req.json()}catch{return NextResponse.json({error:"Datos inválidos."},{status:400})}
 const key=typeof body.section_key==="string"?body.section_key:"";
 const group=groups.find(x=>x.id===key);
 if(!group||typeof body.completed!=="boolean")
   return NextResponse.json({error:"Sección o estado no válido."},{status:400});
 const kind=ESE_VISIT_GROUPS.some(x=>x.id===key)?"visita":"referencias";
 const data=sanitizeEsePayload(body.data,kind);
 if(!data||Object.keys(data).some(k=>!group.fields.some(f=>f.key===k)))
   return NextResponse.json({error:"La sección contiene datos inválidos."},{status:400});
 if(body.completed&&!Object.values(data).some(v=>v.length>0))
   return NextResponse.json({error:"Captura información antes de marcar como terminada."},{status:400});

 const db=createAdminClient();
 const {data:study,error:studyError}=await db.from("ese_cases")
   .select("id,is_demo,status,assigned_to,delivery_status").eq("id",id).eq("assigned_to",user.userId).maybeSingle();
 if(studyError||!study)return NextResponse.json({error:"Estudio no asignado a tu cuenta."},{status:404});
 if(!study.is_demo&&process.env.FACTORH_ESE_PERSONAL_REQUESTS_ENABLED!=="true")
   return NextResponse.json({error:"La captura de estudios reales aún no está habilitada."},{status:403});
 if(["cancelled","delivered","review","report"].includes(study.status)||study.delivery_status==="released")
   return NextResponse.json({error:"El expediente está cerrado para captura."},{status:409});

 const {error:saveError}=await db.from("ese_case_sections").upsert({
   case_id:id,section_key:key,data,completed:body.completed,updated_by:user.userId
 },{onConflict:"case_id,section_key"});
 if(saveError)return NextResponse.json({error:"No se pudo guardar la sección."},{status:500});
 const {data:sections,error:sectionsError}=await db.from("ese_case_sections")
   .select("section_key,completed").eq("case_id",id);
 if(sectionsError)return NextResponse.json({error:"Se guardó, pero no fue posible actualizar el avance."},{status:500});
 const completed=(sections||[]).filter(s=>s.completed&&groups.some(g=>g.id===s.section_key)).length;
 const progress=Math.round(completed/groups.length*100);
 const {error:progressError}=await db.from("ese_cases").update({progress,current_section:key})
   .eq("id",id).eq("assigned_to",user.userId);
 if(progressError)return NextResponse.json({error:"Se guardó, pero falló el cálculo del avance."},{status:500});
 return NextResponse.json({ok:true,progress},{headers:{"Cache-Control":"private, no-store"}});
}
