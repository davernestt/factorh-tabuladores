import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
export async function POST(request:NextRequest){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="client"||!user.organizationId)return fail("No autorizado.",403);
 const origin=request.headers.get("origin");
 if(origin&&origin!==request.nextUrl.origin)return fail("Origen no autorizado.",403);
 let body:{requested_count?:number;notes?:string};
 try{body=await request.json()}catch{return fail("Solicitud inválida.");}
 const amount=Number(body.requested_count),notes=String(body.notes??"").trim();
 if(!Number.isInteger(amount)||amount<1||amount>20||notes.length>1000)
  return fail("Indica entre 1 y 20 usuarios y una nota breve.");
 const db=createAdminClient();
 const {count,error:quotaError}=await db.from("client_user_requests").select("id",{count:"exact",head:true})
  .eq("organization_id",user.organizationId).eq("status","pending");
 if(quotaError)return fail("No se pudo comprobar las solicitudes.",500);
 if((count??0)>=3)return fail("Tu empresa tiene solicitudes pendientes. Contacta a FactoRH para darles seguimiento.",429);
 const {error}=await db.from("client_user_requests").insert({
  organization_id:user.organizationId,requested_by:user.userId,requested_count:amount,notes,status:"pending"
 });
 if(error)return fail("No se pudo registrar la solicitud.",500);
 return NextResponse.json({ok:true,message:"Solicitud recibida. FactoRH debe autorizar y crear los usuarios manualmente."},{status:201});
}
