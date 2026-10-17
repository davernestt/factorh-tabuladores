import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {operationModules,type StaffGrant} from "@/lib/staff-permissions";
type Context={params:Promise<{id:string}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
export async function PATCH(request:NextRequest,{params}:Context){
 const actor=await getCurrentAppUser();
 if(!actor||actor.role!=="super_admin")return fail("Únicamente el propietario configura permisos.",403);
 const origin=request.headers.get("origin");
 if(origin&&origin!==request.nextUrl.origin)return fail("Origen no autorizado.",403);
 const {id}=await params;
 if(!uuid.test(id))return fail("Usuario inválido.");
 let body:{grants?:StaffGrant[]};
 try{body=await request.json()}catch{return fail("Datos inválidos.");}
 const entries=body.grants;
 if(!Array.isArray(entries)||entries.length!==operationModules.length)return fail("Debes revisar los siete módulos.");
 const keys=entries.map(g=>g?.module_key);
 if(new Set(keys).size!==operationModules.length||keys.some(k=>!operationModules.includes(k)))
  return fail("Módulos inválidos o duplicados.");
 if(entries.some(g=>typeof g.can_view!=="boolean"||typeof g.can_operate!=="boolean"||typeof g.can_reports!=="boolean"))
  return fail("Permisos inválidos.");
 const db=createAdminClient();
 const {data:user,error:userError}=await db.from("app_users")
  .select("user_id,role,organization_id,active").eq("user_id",id).maybeSingle();
 if(userError||!user||!user.active||["client","super_admin"].includes(user.role))return fail("Sólo puedes configurar al equipo operativo interno.",403);
 const [orgR,profileR]=await Promise.all([
  db.from("organizations").select("slug").eq("id",user.organization_id).maybeSingle(),
  db.from("staff_access_profiles").select("activated").eq("user_id",id).maybeSingle()
 ]);
 if(orgR.error||profileR.error||orgR.data?.slug!=="factorh"||!profileR.data)return fail("Perfil interno no configurado.",403);
 if(profileR.data.activated)return fail("Desactiva el perfil y vuelve a validarlo antes de modificar permisos activos.",409);
 const {error}=await db.from("staff_module_grants").upsert(entries.map(g=>({
  user_id:id,module_key:g.module_key,can_view:g.can_view,can_operate:g.can_operate,can_reports:g.can_reports
 })),{onConflict:"user_id,module_key"});
 if(error)return fail("No se pudieron guardar los permisos en borrador.",500);
 return NextResponse.json({ok:true,activated:false,message:"Matriz guardada en borrador. No se activaron accesos."});
}
