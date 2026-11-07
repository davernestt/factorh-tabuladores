import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {hasStaffPermission} from "@/lib/staff-permissions";
import {createAdminClient} from "@/lib/supabase/admin";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Accepts a pending ESE request and creates exactly one linked case atomically.
 * Disabled until migration + privacy + all access tests are approved.
 */
export async function POST(req:NextRequest){
 const user=await getCurrentAppUser();
 if(!user||user.role==="client"||user.role==="ese_operator"||
    !await hasStaffPermission(user,"studies","operate"))
   return NextResponse.json({error:"No autorizado."},{status:403});
 if(req.headers.get("origin")!==req.nextUrl.origin)
   return NextResponse.json({error:"Origen no autorizado."},{status:403});
 if(Number(req.headers.get("content-length")||0)>2048)
   return NextResponse.json({error:"Solicitud demasiado extensa."},{status:413});
 // Both conditions must be enabled only after legal/security sign-off.
 if(process.env.FACTORH_ESE_PERSONAL_REQUESTS_ENABLED!=="true"||
    process.env.FACTORH_ESE_REQUEST_CONVERSION_ENABLED!=="true")
   return NextResponse.json({error:"Conversión de solicitudes pendiente de activación segura."},{status:503});
 let payload:{request_id?:unknown};
 try{payload=await req.json()}catch{return NextResponse.json({error:"Solicitud inválida."},{status:400})}
 const requestId=typeof payload.request_id==="string"?payload.request_id:"";
 if(!uuid.test(requestId))return NextResponse.json({error:"Solicitud inválida."},{status:400});
 const db=createAdminClient();
 const {data:request,error:requestError}=await db.from("ese_service_requests")
  .select("id,organization_id,service_key,status").eq("id",requestId).maybeSingle();
 if(requestError||!request)return NextResponse.json({error:"Solicitud no encontrada."},{status:404});
 if(!["express","esencial","integral","ejecutivo"].includes(request.service_key))
   return NextResponse.json({error:"Este servicio no corresponde a un estudio socioeconómico."},{status:400});
 if(!["requested","reviewing","accepted"].includes(request.status))
   return NextResponse.json({error:"Solicitud cancelada o no procesable."},{status:409});
 const {data:org,error:orgError}=await db.from("organizations")
  .select("id,active").eq("id",request.organization_id).maybeSingle();
 if(orgError||!org?.active)return NextResponse.json({error:"Empresa no activa."},{status:409});
 // The RPC owns the transaction, row lock, unique request_id, and status audit.
 const {data:caseId,error:conversionError}=await db.rpc("ese_accept_service_request",{
   p_request_id:requestId,p_actor_id:user.userId
 });
 if(conversionError||!caseId){
   console.error("ESE request-to-case conversion failed",{requestId,code:conversionError?.code});
   return NextResponse.json({error:"No fue posible abrir el expediente. Verifica la migración y reintenta."},{status:500});
 }
 return NextResponse.json({ok:true,case_id:caseId},{headers:{"Cache-Control":"private, no-store"}});
}
