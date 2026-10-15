import {NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {isC3SameOrigin} from "@/lib/c3/invitations";

const valid=(id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const cleanName=(name:string)=>name.trim().replace(/\s+/g," ");
const fail=(error:string,status=400)=>NextResponse.json({error},{status:status});
export async function GET(req:Request){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")return fail("No autorizado.",403);
 const campaignId=new URL(req.url).searchParams.get("campaignId")||"";
 if(!valid(campaignId))return fail("Campaña inválida.");
 const db=createAdminClient();
 const {data:campaign}=await db.from("c3_campaigns").select("id").eq("id",campaignId).maybeSingle();
 if(!campaign)return fail("Campaña inexistente.",404);
 const {data,error}=await db.from("c3_departments").select("id,name,organization_department_id")
  .eq("campaign_id",campaignId).order("name");
 if(error)return fail("No se pudieron cargar departamentos.",500);
 return NextResponse.json({departments:data||[]},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(req:Request){
 if(!isC3SameOrigin(req))return fail("Origen no permitido.",403);
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")return fail("No autorizado.",403);
 let input:{campaignId?:string;name?:string;sync?:boolean};
 try{input=await req.json()}catch{return fail("Solicitud inválida.")}
 const campaignId=input.campaignId||"";
 if(!valid(campaignId))return fail("Campaña inválida.");
 const db=createAdminClient();
 const {data:campaign}=await db.from("c3_campaigns")
  .select("id,organization_id,status").eq("id",campaignId).maybeSingle();
 if(!campaign)return fail("Campaña no encontrada.",404);
 if(!["draft","open"].includes(campaign.status))return fail("La campaña no admite cambios de departamentos.",409);
 const {data:catalog,error:catalogError}=await db.from("organization_departments")
  .select("id,name,organization_id,active").eq("organization_id",campaign.organization_id);
 if(catalogError)return fail("No se pudo consultar el catálogo general.",500);
 const {data:local,error:localError}=await db.from("c3_departments")
  .select("id,name,organization_department_id").eq("campaign_id",campaignId);
 if(localError)return fail("No se pudo consultar la campaña.",500);
 const existing=local||[];
 const global=catalog||[];
 if(input.sync===true){
  const active=global.filter(d=>d.active);
  if(active.length+existing.length>160)return fail("Demasiados departamentos para sincronizar automáticamente.",409);
  for(const d of active){
   const snapshot=existing.find(x=>x.name.trim().toLocaleLowerCase("es")===d.name.trim().toLocaleLowerCase("es"));
   if(snapshot){
    if(snapshot.organization_department_id!==d.id){
     const {error}=await db.from("c3_departments").update({organization_department_id:d.id})
      .eq("id",snapshot.id).eq("campaign_id",campaignId);
     if(error)return fail("No fue posible vincular un departamento anterior.",500);
    }
   }else{
    const {error}=await db.from("c3_departments").insert({
     campaign_id:campaignId,name:d.name,organization_department_id:d.id
    });
    if(error&&error.code!=="23505")return fail("No se pudo sincronizar un departamento.",500);
   }
  }
  const {data:updated,error}=await db.from("c3_departments").select("id,name,organization_department_id")
   .eq("campaign_id",campaignId).order("name");
  if(error)return fail("No se pudo actualizar la lista.",500);
  return NextResponse.json({departments:updated||[]},{headers:{"Cache-Control":"private, no-store"}});
 }
 const name=cleanName(String(input.name||""));
 if(name.length<2||name.length>80)return fail("Indica nombre de 2 a 80 caracteres.");
 const found=global.find(d=>d.name.toLocaleLowerCase("es")===name.toLocaleLowerCase("es"));
 let canonicalId=found?.id;
 if(!canonicalId){
  const {data:created,error}=await db.from("organization_departments")
   .insert({organization_id:campaign.organization_id,name}).select("id").single();
  if(error||!created)return fail(error?.code==="23505"?"Ya existe este departamento. Actualiza la lista.":"No se pudo registrar en el catálogo general.",409);
  canonicalId=created.id;
 }
 const previous=existing.find(d=>d.name.trim().toLocaleLowerCase("es")===name.toLocaleLowerCase("es"));
 if(previous){
  if(previous.organization_department_id!==canonicalId){
   await db.from("c3_departments").update({organization_department_id:canonicalId})
    .eq("id",previous.id).eq("campaign_id",campaignId);
  }
  return NextResponse.json({department:previous},{headers:{"Cache-Control":"private, no-store"}});
 }
 const {data:department,error}=await db.from("c3_departments")
  .insert({campaign_id:campaignId,name,organization_department_id:canonicalId})
  .select("id,name,organization_department_id").single();
 if(error||!department)return fail("No se pudo asociar el departamento a la campaña.",409);
 return NextResponse.json({department},{headers:{"Cache-Control":"private, no-store"}});
}
