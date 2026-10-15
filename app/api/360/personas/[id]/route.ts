import {NextRequest,NextResponse} from "next/server";
import {authorized360User,can360Organization} from "@/lib/feedback360-access";
import {createAdminClient} from "@/lib/supabase/admin";
type Context={params:Promise<{id:string}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
export async function PATCH(request:NextRequest,{params}:Context){
 const user=await authorized360User();if(!user)return fail("No autorizado.",403);
 const origin=request.headers.get("origin");if(origin&&origin!==request.nextUrl.origin)return fail("Origen no autorizado.",403);
 const {id}=await params;
 if(!uuid.test(id))return fail("Persona inválida.");
 let input:{department_id?:string};
 try{input=await request.json()}catch{return fail("Solicitud inválida.");}
 const department_id=input.department_id;
 if(typeof department_id!=="string"||!uuid.test(department_id))return fail("Selecciona un departamento válido.");
 const db=createAdminClient();
 const {data:person,error:personError}=await db.from("people").select("id,organization_id").eq("id",id).maybeSingle();
 if(personError)return fail("No se pudo validar la persona.",500);
 if(!person||!can360Organization(user,person.organization_id))return fail("Persona no encontrada.",404);
 const {data:department}=await db.from("organization_departments").select("id,name")
 .eq("id",department_id).eq("organization_id",person.organization_id).eq("active",true).maybeSingle();
 if(!department)return fail("Departamento no autorizado para esta empresa.",403);
 const {data,error}=await db.from("people").update({department_id:department.id,area:department.name})
 .eq("id",id).eq("organization_id",person.organization_id)
 .select("id,organization_id,department_id,area").maybeSingle();
 if(error||!data)return fail("No se pudo actualizar el departamento.",500);
 return NextResponse.json({person:data},{headers:{"Cache-Control":"no-store"}});
}
