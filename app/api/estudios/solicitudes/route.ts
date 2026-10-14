import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
const allowed=new Set(["express","esencial","integral","ejecutivo","referencias_laborales","investigacion_laboral"]);
export async function POST(req:NextRequest){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="client"||!user.organizationId)return NextResponse.json({error:"Acceso exclusivo para clientes."},{status:403});
 let payload:{service_key?:string;quantity?:number};
 try{payload=await req.json()}catch{return NextResponse.json({error:"Solicitud no válida."},{status:400})}
 if(!allowed.has(payload.service_key||"")||!Number.isInteger(payload.quantity)||payload.quantity!<1||payload.quantity!>100)
  return NextResponse.json({error:"Selecciona un servicio y una cantidad válida."},{status:400});
 const db=createAdminClient();
 const {data:org}=await db.from("organizations").select("id,active").eq("id",user.organizationId).maybeSingle();
 if(!org?.active)return NextResponse.json({error:"La empresa no está activa."},{status:403});
 const {error}=await db.from("ese_service_requests").insert({organization_id:user.organizationId,service_key:payload.service_key,quantity:payload.quantity,requested_by:user.userId});
 if(error)return NextResponse.json({error:"No se pudo registrar la solicitud."},{status:500});
 return NextResponse.json({ok:true},{status:201,headers:{"Cache-Control":"no-store"}});
}
