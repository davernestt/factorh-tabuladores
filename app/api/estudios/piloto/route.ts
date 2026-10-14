import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";

const types=new Set(["express","esencial","integral","ejecutivo"]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request:NextRequest){
 const user=await getCurrentAppUser();
 if(user?.role!=="super_admin")return NextResponse.json({error:"Solo superadministración."},{status:403});
 if(request.headers.get("origin")!==request.nextUrl.origin)
  return NextResponse.json({error:"Origen no autorizado."},{status:403});
 let payload:{organization_id?:unknown;study_type?:unknown};
 try{payload=await request.json()}catch{return NextResponse.json({error:"Solicitud inválida."},{status:400})}
 const org=typeof payload.organization_id==="string"?payload.organization_id:"";
 const type=typeof payload.study_type==="string"?payload.study_type:"";
 if(!uuid.test(org)||!types.has(type))return NextResponse.json({error:"Empresa o estudio inválido."},{status:400});
 const db=createAdminClient();
 const {data:organization}=await db.from("organizations").select("id,active").eq("id",org).maybeSingle();
 if(!organization?.active)return NextResponse.json({error:"Empresa no habilitada."},{status:403});
 const code=crypto.randomUUID().slice(0,8).toUpperCase();
 const {data,error}=await db.from("ese_cases").insert({
  organization_id:org,case_name:`Persona de demostración ${code}`,
  study_type:type,status:"unassigned",source:"manual",
  is_demo:true,client_visible:false,progress:0
 }).select("id").single();
 if(error||!data)return NextResponse.json({error:"No se pudo crear el estudio piloto."},{status:500});
 return NextResponse.json({ok:true,id:data.id},{status:201,headers:{"Cache-Control":"no-store"}});
}
