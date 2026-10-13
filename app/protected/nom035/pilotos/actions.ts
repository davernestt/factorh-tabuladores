"use server";
import {revalidatePath} from "next/cache";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {NOM035_UUID} from "@/lib/nom035/access";
async function requireOwner(){
 const user=await getCurrentAppUser();
 if(user?.role!=="super_admin")throw Error("Solo FactoRH puede autorizar pilotos.");
 return user;
}
export async function setNom035Pilot(form:FormData){
 await requireOwner();
 const organizationId=String(form.get("organization_id")||"");
 const operation=String(form.get("operation")||"");
 const days=Number(form.get("duration_days"));
 if(!NOM035_UUID.test(organizationId)||!["enable","pause"].includes(operation)||
  (operation==="enable"&&![15,30,60,90].includes(days)))
  throw Error("Selecciona una empresa y vigencia válidas.");
 const db=createAdminClient();
 const {data:org,error:orgError}=await db.from("organizations")
  .select("id,name,active").eq("id",organizationId).eq("active",true).maybeSingle();
 if(orgError||!org)throw Error("La empresa no está activa.");
 const {data:existing,error:readError}=await db.from("organization_module_subscriptions")
  .select("id,status").eq("organization_id",organizationId).eq("module_key","nom035").maybeSingle();
 if(readError)throw Error("No fue posible consultar la vigencia NOM-035.");
 if(operation==="pause"&&!existing)throw Error("La empresa aún no tiene piloto.");
 if(operation==="pause"){
  const {error}=await db.from("organization_module_subscriptions")
   .update({status:"paused",updated_at:new Date().toISOString()})
   .eq("organization_id",organizationId).eq("module_key","nom035");
  if(error)throw Error("No fue posible pausar el piloto.");
 }else{
  const now=new Date();
  const start=now.toISOString().slice(0,10);
  const end=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),
   now.getUTCDate()+days)).toISOString().slice(0,10);
  const {error}=await db.from("organization_module_subscriptions").upsert({
   organization_id:organizationId,module_key:"nom035",
   status:"trial",plan_name:"Piloto NOM-035 FactoRH",
   starts_on:start,ends_on:end,reminder_days:7,client_notice:true,
   updated_at:new Date().toISOString()
  },{onConflict:"organization_id,module_key"});
  if(error)throw Error("No fue posible activar el piloto: "+error.message);
 }
 revalidatePath("/protected/nom035/pilotos");
 revalidatePath("/protected/nom035");
}
