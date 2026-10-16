import {NextRequest,NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getCurrentAppUser} from "@/lib/app-auth";
type RouteContext={params:Promise<{id:string}>};
type Body={
 operation?:"replace"|"adjust"|"pause"|"resume";
 mode?:"trial"|"package";
 plan_name?:string;
 credits_total?:number;
 valid_until?:string|null;
};
const bad=(message:string,status=400)=>NextResponse.json({error:message},{status});
const validUuid=(id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function PATCH(request:NextRequest,{params}:RouteContext){
 const current=await getCurrentAppUser();
 if(!current||current.role!=="super_admin")return bad("No autorizado.",403);
 const origin=request.headers.get("origin");
 if(origin&&origin!==request.nextUrl.origin)return bad("Origen no autorizado.",403);
 const {id}=await params;if(!validUuid(id))return bad("Empresa inválida.");
 let body:Body;try{body=await request.json()}catch{return bad("Datos inválidos.");}
 const operation=body.operation||"replace";
 if(!["replace","adjust","pause","resume"].includes(operation))return bad("Acción inválida.");
 const db=createAdminClient();
 const {data:org,error:orgError}=await db.from("organizations").select("id").eq("id",id).maybeSingle();
 if(orgError)return bad("No se pudo consultar la empresa.",500);
 if(!org)return bad("Empresa no encontrada.",404);
 const {data:existing,error:existingError}=await db.from("organization_psychometric_credits")
  .select("organization_id,plan_type,plan_name,credits_total,credits_used,valid_from,valid_until,active")
  .eq("organization_id",id).maybeSingle();
 if(existingError)return bad("No se pudo consultar el plan.",500);
 if(operation!=="replace"&&!existing)return bad("La empresa todavía no tiene un plan que modificar.",404);
 const today=new Date().toISOString().slice(0,10);
 const mode=body.mode==="package"?"package":"trial";
 const total=mode==="trial"?2:Number(body.credits_total);
 const name=mode==="trial"?"Prueba gratuita":String(body.plan_name??"").trim()||"Paquete anual";
 if(["replace","adjust"].includes(operation)){
  if(!Number.isInteger(total)||total<1||total>10000)return bad("Indica una cantidad válida de créditos.");
  if(operation==="adjust"&&existing?.plan_type!==mode)
    return bad("Para cambiar de demo a plan contratado utiliza Activar plan.");
  if(operation==="adjust"&&existing&&total<existing.credits_used)
    return bad("La cantidad total no puede ser menor a los créditos ya utilizados.");
 }
 const end=operation==="replace"&&mode==="trial"?
  (()=>{const d=new Date();d.setDate(d.getDate()+30);return d.toISOString().slice(0,10)})():
  typeof body.valid_until==="string"?body.valid_until:existing?.valid_until??null;
 if(["replace","adjust"].includes(operation)){
  if(!end||!/^\d{4}-\d{2}-\d{2}$/.test(end)||end<today)return bad("Indica un vencimiento válido a partir de hoy.");
 }
 let plan;
 if(operation==="replace"){
  const res=await db.from("organization_psychometric_credits").upsert({
   organization_id:id,plan_type:mode,plan_name:name,credits_total:total,credits_used:0,
   valid_from:today,valid_until:end,active:true,trial_single_test_only:false,updated_at:new Date().toISOString()
  },{onConflict:"organization_id"}).select("*").single();
  if(res.error)return bad("No se pudo activar el plan: "+res.error.message,500);
  plan=res.data;
 }else if(operation==="adjust"){
  const res=await db.from("organization_psychometric_credits").update({
   credits_total:total,plan_name:name,valid_until:end,updated_at:new Date().toISOString()
  }).eq("organization_id",id).gte("credits_total",0).select("*").single();
  if(res.error)return bad("No se pudo actualizar el plan: "+res.error.message,500);
  plan=res.data;
 }else{
  const res=await db.from("organization_psychometric_credits").update({
   active:operation==="resume",updated_at:new Date().toISOString()
  }).eq("organization_id",id).select("*").single();
  if(res.error)return bad("No se pudo modificar el acceso: "+res.error.message,500);
  plan=res.data;
 }
 const moduleStatus=operation==="pause"?"paused":plan.plan_type==="trial"?"trial":"active";
 const {error:moduleError}=await db.from("organization_module_subscriptions").upsert({
  organization_id:id,module_key:"psychometrics",status:moduleStatus,plan_name:plan.plan_name,
  starts_on:plan.valid_from,ends_on:plan.valid_until,requested_on:today,
  reminder_days:30,client_notice:true,updated_at:new Date().toISOString()
 },{onConflict:"organization_id,module_key"});
 if(moduleError)return bad("El plan se modificó, pero falló la sincronización con el catálogo: "+moduleError.message,500);
 await db.rpc("refresh_module_expiry_reminders");
 return NextResponse.json({ok:true,plan},{headers:{"Cache-Control":"no-store"}});
}
