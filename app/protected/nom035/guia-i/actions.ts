"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {isGuide1Uuid} from "@/lib/nom035/guide1-invitations";

async function requireAdmin(){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")throw Error("Acceso de administración requerido.");
 return user;
}
function text(form:FormData,field:string){return String(form.get(field)||"").trim();}
export async function createGuide1Campaign(form:FormData){
 const user=await requireAdmin();
 const centerId=text(form,"center_id");
 const name=text(form,"name");
 const population=Number(form.get("eligible_population"));
 const contact=text(form,"referral_contact");
 const instructions=text(form,"referral_instructions");
 const confirmed=form.get("coordinator_confirmed")==="on";
 const coverageMode=text(form,"coverage_mode");
 const basis=text(form,"identification_basis");
 if(!isGuide1Uuid(centerId)||name.length<4||name.length>140||
  !Number.isInteger(population)||population<1||
  contact.length<8||contact.length>200||
  instructions.length<30||instructions.length>1400||!confirmed||
  !["all","previously_identified"].includes(coverageMode)||
  (coverageMode==="previously_identified"&&(basis.length<12||basis.length>350))){
  throw Error("Configura el centro, la población y el canal de atención; confirma el protocolo antes de continuar.");
 }
 const db=createAdminClient();
 const {data,error}=await db.rpc("nom035_g1_create_campaign_v2",{
  p_center_id:centerId,p_name:name,p_population:population,
  p_coverage_mode:coverageMode,p_identification_basis:basis,
  p_contact:contact,p_instructions:instructions,p_confirmed:true,p_actor:user.userId
 });
 if(error||!data)throw Error(error?.message||"No fue posible crear la campaña.");
 revalidatePath("/protected/nom035/"+centerId);
 redirect("/protected/nom035/guia-i/"+data);
}
export async function updateGuide1CampaignStatus(form:FormData){
 await requireAdmin();
 const id=text(form,"campaign_id"),next=text(form,"next");
 if(!isGuide1Uuid(id)||!["open","closed"].includes(next))throw Error("Datos inválidos.");
 const db=createAdminClient();
 const {data:campaign,error:readError}=await db.from("nom035_guide1_campaigns")
 .select("id,center_id,status,referral_contact,referral_instructions,coordinator_confirmed")
 .eq("id",id).maybeSingle();
 if(readError||!campaign)throw Error("Campaña no encontrada.");
 const allowed=(campaign.status==="draft"&&next==="open")||
 (campaign.status==="open"&&next==="closed");
 if(!allowed)throw Error("No puedes realizar esta transición de campaña.");
 if(next==="open"&&(!campaign.coordinator_confirmed||
  campaign.referral_contact.length<8||campaign.referral_instructions.length<30))
  throw Error("Debe existir un canal de canalización confirmado.");
 const timestamp=new Date().toISOString();
 const update=next==="open"?{status:"open",opened_at:timestamp}:{status:"closed",closed_at:timestamp};
 const {data,error}=await db.from("nom035_guide1_campaigns")
  .update(update).eq("id",id).eq("status",campaign.status)
  .select("id").maybeSingle();
 if(error||!data)throw Error("No fue posible cambiar el estado; actualiza la página.");
 revalidatePath("/protected/nom035/guia-i/"+id);
 revalidatePath("/protected/nom035/"+campaign.center_id);
 redirect("/protected/nom035/guia-i/"+id);
}
