import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
type Params={params:Promise<{id:string}>};
const valid=(x:string)=>/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(x);
export async function POST(req:NextRequest,{params}:Params){
 const u=await getCurrentAppUser();if(u?.role!=="super_admin")return NextResponse.json({error:"No autorizado."},{status:403});
 const {id}=await params;if(!valid(id))return NextResponse.json({error:"Expediente inválido"},{status:400});
 const db=createAdminClient();
 const {data:c}=await db.from("ese_cases").select("id,delivery_status").eq("id",id).maybeSingle();
 if(!c||c.delivery_status==="released")return NextResponse.json({error:"Expediente inexistente o bloqueado."},{status:409});
 const body=await req.formData(), file=body.get("file"), kind=String(body.get("kind")||""),title=String(body.get("title")||"").trim();
 if(!(file instanceof File)||!["main_report","complement"].includes(kind)||title.length<2||title.length>160)return NextResponse.json({error:"Archivo, título o tipo inválido."},{status:400});
 if(file.size>10485760||file.size<8||!file.name.toLowerCase().endsWith(".pdf"))return NextResponse.json({error:"Sólo PDF hasta 10 MB."},{status:400});
 const buffer=Buffer.from(await file.arrayBuffer());
 if(buffer.subarray(0,5).toString("ascii")!=="%PDF-")return NextResponse.json({error:"El archivo no parece un PDF."},{status:400});
 if(kind==="main_report"){const {count}=await db.from("ese_delivery_files").select("id",{count:"exact",head:true}).eq("case_id",id).eq("kind","main_report");
 if(count)return NextResponse.json({error:"Ya existe el reporte principal. Revoca y gestiona su versión antes de sustituirlo."},{status:409})}
 const storagePath=`${id}/${crypto.randomUUID()}.pdf`;
 const uploaded=await db.storage.from("ese-deliveries").upload(storagePath,buffer,{upsert:false,contentType:"application/pdf"});
 if(uploaded.error)return NextResponse.json({error:"No fue posible guardar el PDF privado."},{status:500});
 const {error}=await db.from("ese_delivery_files").insert({case_id:id,kind,title,storage_path:storagePath,original_name:file.name.slice(0,200),size_bytes:file.size,uploaded_by:u.userId,client_deliverable:false});
 if(error){await db.storage.from("ese-deliveries").remove([storagePath]);return NextResponse.json({error:"No fue posible registrar el archivo."},{status:500})}
 await db.from("ese_delivery_audit").insert({case_id:id,actor_id:u.userId,action:kind==="complement"?"add_complement":"upload",details:{title,kind}});
 return NextResponse.json({ok:true},{status:201,headers:{"Cache-Control":"no-store"}});
}
export async function PATCH(req:NextRequest,{params}:Params){
 const u=await getCurrentAppUser();if(u?.role!=="super_admin")return NextResponse.json({error:"No autorizado"},{status:403});
 const {id}=await params;if(!valid(id))return NextResponse.json({error:"Expediente inválido"},{status:400});
 const db=createAdminClient();const {data:c}=await db.from("ese_cases").select("delivery_status").eq("id",id).maybeSingle();
 if(!c||c.delivery_status==="released")return NextResponse.json({error:"Entrega bloqueada"},{status:409});
 let b:{file_id?:string;client_deliverable?:boolean};try{b=await req.json()}catch{return NextResponse.json({error:"Datos inválidos"},{status:400})}
 if(!b.file_id||typeof b.client_deliverable!=="boolean")return NextResponse.json({error:"Selección inválida"},{status:400});
 const {data,error}=await db.from("ese_delivery_files").update({client_deliverable:b.client_deliverable}).eq("case_id",id).eq("id",b.file_id).select("id").maybeSingle();
 if(error||!data)return NextResponse.json({error:"Archivo no encontrado"},{status:404});
 return NextResponse.json({ok:true});
}
