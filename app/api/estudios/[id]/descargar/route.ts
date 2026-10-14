import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
type Params={params:Promise<{id:string}>};
export async function GET(req:NextRequest,{params}:Params){
 const user=await getCurrentAppUser();if(!user)return NextResponse.json({error:"No autorizado."},{status:401});
 const {id}=await params,fileId=req.nextUrl.searchParams.get("archivo");
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)||!fileId||!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(fileId))return NextResponse.json({error:"Identificador inválido."},{status:400});
 const db=createAdminClient();
 const {data:c}=await db.from("ese_cases").select("organization_id,delivery_status,client_visible").eq("id",id).maybeSingle();
 if(!c)return NextResponse.json({error:"No encontrado"},{status:404});
 const admin=user.role==="super_admin";
 if(!admin&&(user.role!=="client"||!user.organizationId||user.organizationId!==c.organization_id||c.delivery_status!=="released"||!c.client_visible))return NextResponse.json({error:"Archivo no disponible."},{status:403});
 const {data:file}=await db.from("ese_delivery_files").select("id,title,storage_path,client_deliverable").eq("case_id",id).eq("id",fileId).maybeSingle();
 if(!file||(!admin&&!file.client_deliverable))return NextResponse.json({error:"Archivo no disponible."},{status:404});
 const download=await db.storage.from("ese-deliveries").download(file.storage_path);
 if(download.error||!download.data)return NextResponse.json({error:"No se encontró el PDF."},{status:404});
 const binary=await download.data.arrayBuffer();
 return new NextResponse(binary,{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="FactoRH-${file.id}.pdf"`,"Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff"}});
}
