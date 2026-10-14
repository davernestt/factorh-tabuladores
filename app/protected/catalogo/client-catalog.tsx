import ClientCatalogView from "./client-catalog-view";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAppUser } from "@/lib/app-auth";

type Module = {
  module_key: string; name: string; description: string | null;
  route: string | null; client_available: boolean;
};
type Trial = { credits_total: number; credits_used: number; active: boolean; valid_until: string | null; plan_type: string; plan_name: string };
type Subscription = { module_key: string; status: string; starts_on: string | null; ends_on: string | null };
type Instrument = { id: string; name: string; description: string | null; assessment_type: string };

function validSubscription(sub?:Subscription){
  if(!sub || !["trial","active"].includes(sub.status))return false;
  const today=new Date().toISOString().slice(0,10);
  return (!sub.starts_on||sub.starts_on<=today)&&(!sub.ends_on||sub.ends_on>=today);
}

export default async function ClientCatalog(){
  const user=await getCurrentAppUser();
  if(!user || user.role!=="client" || !user.organizationId) redirect("/auth/login");
  const db=createAdminClient();
  const [modulesR,templatesR,creditsR,subscriptionsR,accessR]=await Promise.all([
    db.from("platform_modules").select("module_key,name,description,route,client_available").eq("active",true).order("sort_order"),
    db.from("assessment_templates").select("id,name,description,assessment_type")
      .is("organization_id",null).eq("active",true).like("assessment_type","psychometric_%").order("name"),
    db.from("organization_psychometric_credits").select("plan_type,plan_name,credits_total,credits_used,valid_until,active")
      .eq("organization_id",user.organizationId).maybeSingle(),
    db.from("organization_module_subscriptions").select("module_key,status,starts_on,ends_on")
      .eq("organization_id",user.organizationId),
    db.from("organization_assessment_templates").select("template_id,enabled,participant_sendable")
      .eq("organization_id",user.organizationId).eq("enabled",true).eq("participant_sendable",true)
  ]);
  const error=modulesR.error||templatesR.error||creditsR.error||subscriptionsR.error||accessR.error;
  if(error)return <section className="rounded-3xl border border-red-200 bg-white p-7 text-sm text-red-700">No fue posible cargar el catálogo comercial. Inténtalo de nuevo.</section>;

  const modules=(modulesR.data||[]) as Module[];
  const instruments=(templatesR.data||[]) as Instrument[];
  const subs=new Map(((subscriptionsR.data||[]) as Subscription[]).map(sub=>[sub.module_key,sub]));
  const credits=creditsR.data as Trial | null;
  const allowed=new Set((accessR.data||[]).map(item=>item.template_id));
  const remaining=credits?Math.max(0,credits.credits_total-credits.credits_used):0;
  const current=Boolean(credits?.active&&(!credits.valid_until||credits.valid_until>=new Date().toISOString().slice(0,10)));
  const availablePsychometrics=current&&remaining>0&&allowed.size>0&&validSubscription(subs.get("psychometrics"));
  const accessible=(module:Module)=>module.client_available&&(
    module.module_key==="psychometrics"?availablePsychometrics:
    module.module_key==="nom035"?validSubscription(subs.get("nom035")):false
  );
  return <ClientCatalogView
    modules={modules} instruments={instruments} credits={credits}
    organizationName={user.organizationName} availablePsychometrics={availablePsychometrics}
    allowedIds={[...allowed]} accessibleKeys={modules.filter(accessible).map(m=>m.module_key)}
  />;
}
