import { NextRequest,NextResponse } from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {hasStaffPermission} from "@/lib/staff-permissions";
import {createAdminClient} from "@/lib/supabase/admin";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
export async function GET(request:NextRequest){
 const user=await getCurrentAppUser();if(!user)return fail("No autorizado.",403);
 const organization_id=user.role==="client"?user.organizationId||"":request.nextUrl.searchParams.get("organization_id")||"";
 if(!uuid.test(organization_id)||!((user.role==="super_admin"||await hasStaffPermission(user,"feedback360","view"))||(user.role==="client"&&user.organizationId===organization_id)))return fail("Empresa no autorizada.",403);
 const db=createAdminClient();
 const {data,error}=await db.from("organization_departments").select("id,organization_id,name,active")
  .eq("organization_id",organization_id).order("name");
 if(error)return fail("No se pudieron cargar los departamentos.",500);
 return NextResponse.json({departments:data??[]},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:NextRequest){
 const user=await getCurrentAppUser();if(!user)return fail("No autorizado.",403);
 const origin=request.headers.get("origin");if(origin&&origin!==request.nextUrl.origin)return fail("Origen no autorizado.",403);
 if(Number(request.headers.get("content-length")||0)>1500)return fail("Solicitud extensa.",413);
 let body:{organization_id?:string;name?:string};
 try{body=await request.json()}catch{return fail("Datos inválidos.");}
 const organization_id=user.role==="client"?user.organizationId||"":body.organization_id||"";
 const name=typeof body.name==="string"?body.name.trim().replace(/\s+/g," "):"";
 if(!uuid.test(organization_id)||!(user.role==="super_admin"||(user.role==="client"&&user.organizationId===organization_id)))return fail("Empresa no autorizada.",403);
 if(user.role!=="client"&&!await hasStaffPermission(user,"feedback360","operate"))return fail("No tienes permisos para agregar departamentos.",403);
  if(name.length<2||name.length>100)return fail("Escribe un departamento de 2 a 100 caracteres.");
 const db=createAdminClient();
 const {data:org}=await db.from("organizations").select("id").eq("id",organization_id).eq("active",true).maybeSingle();
 if(!org)return fail("Empresa no activa.",403);
 const {data,error}=await db.from("organization_departments").insert({organization_id,name})
  .select("id,organization_id,name,active").single();
 if(error?.code==="23505")return fail("Ya existe un departamento con ese nombre.",409);
 if(error||!data)return fail("No fue posible crear el departamento.",500);
 return NextResponse.json({department:data},{status:201,headers:{"Cache-Control":"no-store"}});
}
