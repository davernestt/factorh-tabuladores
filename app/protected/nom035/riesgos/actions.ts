"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {validRiskId} from "@/lib/nom035/risk-invitations";
async function onlyAdmin(){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")throw Error("Requiere acceso administrador.");
 return user;
}
const f=(fd:FormData,key:string)=>String(fd.get(key)||"").trim();
export async function createRiskCampaign(fd:FormData){
 const user=await onlyAdmin();
 const center=f(fd,"center_id");
 const title=f(fd,"title");
 const mode=f(fd,"coverage_mode");
 const target=Number(fd.get("eligible_population"));
 const protocol=f(fd,"sample_protocol_ref");
 const confirmed=fd.get("gender_protocol_confirmed")==="on";
 if(!validRiskId(center)||title.length<4||title.length>150||
   !["census","sample"].includes(mode)||!Number.isInteger(target)||
   target<1||target>100000||protocol.length>350)
   throw Error("Revisa centro, nombre y metodología.");
 const {data,error}=await createAdminClient().rpc("nom035_risk_create_campaign",{
  p_center:center,p_title:title,p_mode:mode,p_target:target,
  p_protocol:protocol,p_gender_confirm:confirmed,p_actor:user.userId
 });
 if(error||!data)throw Error(error?.message||"No se pudo crear la campaña.");
 revalidatePath("/protected/nom035/"+center+"/riesgos");
 redirect("/protected/nom035/riesgos/"+data);
}
export async function changeRiskCampaignStatus(fd:FormData){
 await onlyAdmin();
 const id=f(fd,"campaign_id"),next=f(fd,"next");
 if(!validRiskId(id)||!["open","closed"].includes(next))throw Error("Campaña o acción inválida.");
 const db=createAdminClient();
 const {data:c,error:readError}=await db.from("nom035_risk_campaigns")
  .select("id,center_id,status,workforce_snapshot").eq("id",id).maybeSingle();
 if(readError||!c)throw Error("Campaña no disponible.");
 if(!(c.status==="draft"&&next==="open"||c.status==="open"&&next==="closed"))
  throw Error("No se puede cambiar al estado seleccionado.");
 if(next==="open"){
  const {data:center}=await db.from("nom035_work_centers").select("worker_count,active")
   .eq("id",c.center_id).maybeSingle();
  if(!center?.active||center.worker_count!==c.workforce_snapshot)
   throw Error("Cambió el número de trabajadores. Crea una campaña nueva con la plantilla actual.");
 }
 const stamp=new Date().toISOString();
 const values=next==="open"?{status:"open",opened_at:stamp}:{status:"closed",closed_at:stamp};
 const {data,error}=await db.from("nom035_risk_campaigns")
  .update(values).eq("id",id).eq("status",c.status).select("id").maybeSingle();
 if(error||!data)throw Error(error?.message||"No fue posible cambiar el estado.");
 revalidatePath("/protected/nom035/riesgos/"+id);
 revalidatePath("/protected/nom035/"+c.center_id+"/riesgos");
 redirect("/protected/nom035/riesgos/"+id);
}
