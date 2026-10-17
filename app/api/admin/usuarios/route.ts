import {NextRequest,NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getCurrentAppUser,type AppUserRole} from "@/lib/app-auth";

type Body={
 display_name?:string;email?:string;organization_id?:string;
 role?:string;client_access_level?:string;
};
const internalRoles=new Set<AppUserRole>(["commercial","recruiter","ese_operator","consultant"]);
const clientLevels=new Set(["administrator","collaborator"]);
const safe=(v:unknown)=>String(v??"").trim();
function fail(error:string,status=400){return NextResponse.json({error},{status});}

export async function POST(request:NextRequest){
 const actor=await getCurrentAppUser();
 if(!actor||actor.role!=="super_admin")return fail("Sólo el administrador general puede crear usuarios.",403);
 const origin=request.headers.get("origin");
 if(origin&&origin!==request.nextUrl.origin)return fail("Origen no autorizado.",403);
 let body:Body;
 try{body=await request.json() as Body}catch{return fail("Datos inválidos.");}
 const displayName=safe(body.display_name),email=safe(body.email).toLowerCase();
 const organizationId=safe(body.organization_id),role=safe(body.role||"client");
 const accessLevel=safe(body.client_access_level||"administrator");
 if(!displayName||displayName.length>120||!email||!email.includes("@")||!organizationId)
  return fail("Captura nombre, correo y empresa.");
 if(!clientLevels.has(accessLevel))return fail("Tipo de acceso cliente inválido.");
 if(role!=="client"&&!internalRoles.has(role as AppUserRole))
  return fail("Perfil no autorizado. Sólo el propietario conserva el rol superadministrador.");
 const db=createAdminClient();
 const {data:organization,error:orgError}=await db.from("organizations")
  .select("id,name,slug,active").eq("id",organizationId).eq("active",true).maybeSingle();
 if(orgError)return fail("No se pudo consultar la empresa.",500);
 if(!organization)return fail("La empresa no está disponible.");
 if(role!=="client"&&organization.slug!=="factorh")
  return fail("Los perfiles internos de FactoRH sólo se asignan a la empresa FactoRH.",403);
 // No se crean perfiles internos en empresas externas, incluso manipulando el formulario.
 const {data:existing,error:existingError}=await db.from("app_users").select("user_id").eq("email",email).maybeSingle();
 if(existingError)return fail("No se pudo comprobar el correo.",500);
 if(existing)return fail("Ya existe un usuario de plataforma con ese correo.",409);
 const {data:link,error:linkError}=await db.auth.admin.generateLink({type:"invite",email});
 if(linkError||!link.user)return fail(linkError?.message||"No fue posible crear la invitación.",400);
 const {error:saveError}=await db.from("app_users").insert({
  user_id:link.user.id,email,display_name:displayName,role,
  organization_id:organizationId,client_access_level:role==="client"?accessLevel:"administrator",
  active:true,updated_at:new Date().toISOString()
 });
 if(saveError){
  await db.auth.admin.deleteUser(link.user.id);
  return fail("No fue posible guardar el perfil asignado: "+saveError.message,500);
 }
 const hash=link.properties?.hashed_token;
 const url=hash?`${request.nextUrl.origin}/auth/confirm?token_hash=${encodeURIComponent(hash)}&type=invite&next=${encodeURIComponent("/auth/update-password")}`:null;
 return NextResponse.json({ok:true,user_id:link.user.id,organization_name:organization.name,invite_url:url,role,client_access_level:accessLevel},{headers:{"Cache-Control":"no-store"}});
}
