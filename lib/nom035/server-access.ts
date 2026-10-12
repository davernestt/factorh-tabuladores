import {createAdminClient} from "@/lib/supabase/admin";
import {requireNom035User,requireNom035Organization,NOM035_UUID} from "@/lib/nom035/access";

export async function nom035AuthorizedCenter(centerId:string){
 if(!NOM035_UUID.test(centerId))throw Error("Centro inválido");
 const user=await requireNom035User();
 const db=createAdminClient();
 const {data:center,error}=await db.from("nom035_work_centers")
  .select("id,organization_id,worker_count,name,active")
  .eq("id",centerId).eq("active",true).maybeSingle();
 if(error||!center)throw Error("Centro no disponible");
 requireNom035Organization(user,center.organization_id);
 return {user,db,center};
}
export async function nom035AuthorizedRiskCampaign(campaignId:string){
 if(!NOM035_UUID.test(campaignId))throw Error("Campaña inválida");
 const user=await requireNom035User();
 const db=createAdminClient();
 const {data:campaign,error}=await db.from("nom035_risk_campaigns")
  .select("*").eq("id",campaignId).maybeSingle();
 if(error||!campaign)throw Error("Campaña no disponible");
 const {data:center}=await db.from("nom035_work_centers")
  .select("id,organization_id,worker_count,name,street_address,municipality,state,main_activity,active")
  .eq("id",campaign.center_id).eq("active",true).maybeSingle();
 if(!center)throw Error("Centro no disponible");
 requireNom035Organization(user,center.organization_id);
 return {user,db,campaign,center};
}
