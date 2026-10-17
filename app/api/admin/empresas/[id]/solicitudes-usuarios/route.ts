import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
type Context={params:Promise<{id:string}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function PATCH(request:NextRequest,{params}:Context){
 const actor=await getCurrentAppUser();
 if(!actor||actor.role!=="super_admin")return NextResponse.json({error:"No autorizado."},{status:403});
 const origin=request.headers.get("origin");
 if(origin&&origin!==request.nextUrl.origin)return NextResponse.json({error:"Origen no autorizado."},{status:403});
 const {id}=await params;
 if(!uuid.test(id))return NextResponse.json({error:"Empresa inválida."},{status:400});
 let body:{request_id?:string;status?:string};
 try{body=await request.json()}catch{return NextResponse.json({error:"Datos inválidos."},{status:400});}
 if(!body.request_id||!uuid.test(body.request_id)||!["reviewed","fulfilled","rejected"].includes(body.status??""))
  return NextResponse.json({error:"Estado no válido."},{status:400});
 const db=createAdminClient();
 const {data,error}=await db.from("client_user_requests")
  .update({status:body.status,reviewed_by:actor.userId,reviewed_at:new Date().toISOString()})
  .eq("id",body.request_id).eq("organization_id",id).in("status",["pending","reviewed"]).select("id").maybeSingle();
 if(error)return NextResponse.json({error:"Error actualizando la solicitud."},{status:500});
 if(!data)return NextResponse.json({error:"La solicitud ya fue atendida."},{status:409});
 return NextResponse.json({ok:true,notice:"El estado de la solicitud cambió. Esta acción no creó usuarios."});
}
