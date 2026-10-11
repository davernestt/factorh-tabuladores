"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function admin(){const u=await getCurrentAppUser();if(!u||u.role!=="super_admin")throw Error("No autorizado");return u;}
export async function createPulse(form:FormData){
 const user=await admin();
 const org=String(form.get("organization_id")||"");
 const name=String(form.get("name")||"").trim();
 const requestedFocus=String(form.get("focus")||"").trim();
 const population=Number(form.get("population"));
 const topic=String(form.get("topic")||"");
 const topics=await import("@/lib/pulse/topics");
 const selected=topics.pulseTopicFor(topic);
 const dims=selected?[...selected.dimensionCodes]:topic==="custom"?form.getAll("dimensions").map(String):[];
 const focus=requestedFocus||(selected?.intent||"Seguimiento específico de dos o tres dimensiones del clima laboral.");
 if(dims.length<2||dims.length>3||new Set(dims).size!==dims.length||dims.some(d=>!/^D(0[1-9]|1[0-3])$/.test(d)))throw Error("Selecciona un tema válido.");
 const db=createAdminClient();
 const {data:questions,error:bankError}=await db.from("c3_items").select("code,dimension_code,position").eq("instrument_code","C3").eq("response_type","likert").eq("active",true).in("dimension_code",dims).order("position");
 if(bankError||!questions||dims.some(d=>questions.filter(q=>q.dimension_code===d).length!==4))throw Error("El banco del tema está incompleto.");
 const codes=dims.flatMap(d=>questions.filter(q=>q.dimension_code===d).map(q=>q.code));
 if(!uuid.test(org)||name.length<4||name.length>150||focus.length<4||focus.length>150||
 !Number.isInteger(population)||population<1||population>100000||codes.length<8||codes.length>12||
 new Set(codes).size!==codes.length)throw Error("Revisa empresa, nombre, tema y población.");
 const {data,error}=await db.rpc("pulse_create_campaign",{p_org:org,p_name:name,p_focus:focus,p_population:population,p_codes:codes,p_actor:user.userId});
 if(error||!data)throw Error(error?.message||"No fue posible crear el pulso.");
 const {error:topicError}=await db.from("pulse_campaigns").update({topic_code:topic,topic_dimensions:dims}).eq("id",data);
 if(topicError)throw Error("Campaña creada, pero no se guardó su tema. Revísala en campañas antes de repetir.");
 revalidatePath("/protected/clima/pulsos");
 redirect("/protected/clima/pulsos/"+data);
}
export async function changePulseStatus(form:FormData){
 await admin();
 const id=String(form.get("id")||""),next=String(form.get("next")||"");
 if(!uuid.test(id)||!["open","closed"].includes(next))throw Error("Datos inválidos");
 const db=createAdminClient();
 const {data:campaign}=await db.from("pulse_campaigns").select("id,status").eq("id",id).maybeSingle();
 if(!campaign||!(next==="open"&&campaign.status==="draft"||next==="closed"&&campaign.status==="open"))throw Error("Transición inválida");
 const update=next==="open"?{status:"open",opened_at:new Date().toISOString()}:{status:"closed",closed_at:new Date().toISOString()};
 const {data,error}=await db.from("pulse_campaigns").update(update).eq("id",id).eq("status",campaign.status).select("id").maybeSingle();
 if(error||!data)throw Error(error?.message||"Estado cambió, actualiza la página.");
 revalidatePath("/protected/clima/pulsos/"+id);
 revalidatePath("/protected/clima/pulsos");
 redirect("/protected/clima/pulsos/"+id);
}
