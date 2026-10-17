import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser,type AppUserRole} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
type Context={params:Promise<{id:string}>};
type Body={display_name?:string;organization_id?:string;role?:string;client_access_level?:string;active?:boolean;};
const internalRoles=new Set<AppUserRole>(["commercial","recruiter","ese_operator","consultant"]);
const levels=new Set(["administrator","collaborator"]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
export async function PATCH(request:NextRequest,{params}:Context){
 const actor=await getCurrentAppUser();
 if(!actor||actor.role!=="super_admin")return fail("Sólo el administrador general asigna perfiles.",403);
 const origin=request.headers.get("origin");
 if(origin&&origin!==request.nextUrl.origin)return fail("Origen no autorizado.",403);
 const {id}=await params;if(!uuid.test(id))return fail("Usuario inválido.");
 let body:Body;try{body=await request.json() as Body}catch{return fail("Datos inválidos.");}
 const name=String(body.display_name??"").trim();
 const orgId=String(body.organization_id??"").trim();
 const role=String(body.role||"client"),level=String(body.client_access_level||"administrator");
 if(!name||name.length>120||!uuid.test(orgId))return fail("Captura nombre y empresa.");
 if(!levels.has(level))return fail("Nivel de acceso inválido.");
 if(role!=="client"&&!internalRoles.has(role as AppUserRole))
  return fail("No puedes asignar el rol superadministrador desde esta pantalla.",403);
 const db=createAdminClient();
 const [orgR,targetR]=await Promise.all([
  db.from("organizations").select("id,slug,active").eq("id",orgId).maybeSingle(),
  db.from("app_users").select("user_id,organization_id,role,active").eq("user_id",id).maybeSingle()
 ]);
 if(orgR.error||targetR.error)return fail("No se pudieron validar los permisos.",500);
 const org=orgR.data,target=targetR.data;
 if(!org?.active)return fail("La empresa seleccionada no está activa.");
 if(!target||target.role==="super_admin")return fail("La cuenta propietaria no puede modificarse desde este panel.",403);
 if(target.organization_id!==orgId)
  return fail("No es posible trasladar usuarios entre empresas desde este expediente.",409);
 if(role!=="client"&&org.slug!=="factorh")
  return fail("Los perfiles internos sólo pueden existir en FactoRH.",403);
 const {error}=await db.from("app_users").update({
  display_name:name,role,client_access_level:role==="client"?level:"administrator",
  active:body.active!==false,updated_at:new Date().toISOString()
 }).eq("user_id",id).neq("role","super_admin");
 if(error)return fail("No se pudo actualizar el usuario: "+error.message,500);
 return NextResponse.json({ok:true,role,client_access_level:role==="client"?level:null});
}
