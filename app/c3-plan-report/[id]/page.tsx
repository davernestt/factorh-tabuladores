import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { getCurrentAppUser } from "@/lib/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import C3PlanReportBody, { type C3ActionReportItem } from "./report-body";

type Props={params:Promise<{id:string}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default function C3PlanReport(props:Props){
 return <Suspense fallback={<main className="min-h-screen bg-neutral-100 p-8">Preparando informe...</main>}>
  <ReportContents {...props}/>
 </Suspense>;
}
async function ReportContents({params}:Props){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")redirect("/auth/login");
 const {id}=await params;
 if(!uuid.test(id))notFound();
 const db=createAdminClient();
 const [campaignR,actionsR]=await Promise.all([
  db.from("c3_campaigns").select("id,name,status,organization_id,bank_version,report_released_at").eq("id",id).maybeSingle(),
  db.from("c3_action_items").select("id,phase_days,dimension_code,title,objective,owner_label,metric,evidence,priority,status,due_on,updated_at")
   .eq("campaign_id",id).order("phase_days").order("created_at")
 ]);
 if(campaignR.error||!campaignR.data)notFound();
 if(actionsR.error)return <main className="mx-auto max-w-2xl p-8 text-red-700">
  Error al cargar actividades: {actionsR.error.message}
 </main>;
 const campaign=campaignR.data;
 const {data:org}=await db.from("organizations").select("name").eq("id",campaign.organization_id).maybeSingle();
 const report={
  campaignId:id,campaignName:campaign.name,organizationName:org?.name||"Empresa",
  bankVersion:campaign.bank_version,
  released:!!campaign.report_released_at,
  actions:(actionsR.data||[]) as C3ActionReportItem[]
 };
 return <C3PlanReportBody report={report}/>;
}
