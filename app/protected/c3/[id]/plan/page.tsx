import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import PlanManager from "./plan-manager";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default function C3PlanPage(props:{params:Promise<{id:string}>}){
 return <Suspense fallback={<p className="rounded-2xl bg-white p-8 text-neutral-600">Cargando plan de acción...</p>}><C3PlanContent {...props}/></Suspense>;
}
async function C3PlanContent({params}:{params:Promise<{id:string}>}){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")redirect("/auth/login");
 const {id}=await params;
 if(!uuid.test(id))notFound();
 const db=createAdminClient();
 const [campaignR,actionsR]=await Promise.all([
  db.from("c3_campaigns").select("id,name,organization_id,status,report_released_at").eq("id",id).maybeSingle(),
  db.from("c3_action_items").select("id,campaign_id,phase_days,dimension_code,title,objective,owner_label,metric,evidence,priority,status,due_on,created_at")
   .eq("campaign_id",id).order("phase_days").order("created_at")
 ]);
 if(!campaignR.data||campaignR.error)notFound();
 if(actionsR.error)return <p className="rounded-2xl bg-red-50 p-6 text-red-800">No se pudo abrir el plan: {actionsR.error.message}</p>;
 const campaign=campaignR.data;
 const {data:org}=await db.from("organizations").select("name").eq("id",campaign.organization_id).maybeSingle();
 return <div className="space-y-7">
  <Link href={"/protected/c3/"+id} className="text-sm font-bold text-orange-600">← Volver a campaña C3 PRO</Link>
  <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-wide text-neutral-500">Seguimiento de intervención</span><Link href={"/c3-plan-report/"+id} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white hover:bg-orange-700">Informe ejecutivo para Dirección →</Link></div>
  <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">FactoRH · Gestión de intervención</p>
   <h1 className="mt-2 text-3xl font-black text-neutral-800">Plan de acción · 90 días</h1>
   <p className="mt-2 text-neutral-600">{org?.name||"Empresa"} · {campaign.name}</p>
   <p className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm leading-6 text-neutral-700">
    {campaign.report_released_at
      ?"Informe final emitido. Las actividades pueden sustentarse en las dimensiones publicables y contrastarse con entrevistas y datos operativos."
      :"La campaña todavía no tiene un informe final publicado. Puedes preparar tareas preliminares de implementación, pero NO interpretar respuestas individuales ni presentar estos acuerdos como hallazgos de la encuesta."}
   </p>
  </header>
  <PlanManager campaignId={id} cancelled={campaign.status==="cancelled"} actions={(actionsR.data||[]).map(a=>({
   id:a.id,phase_days:a.phase_days,dimension_code:a.dimension_code,title:a.title,objective:a.objective,
   owner_label:a.owner_label,metric:a.metric,evidence:a.evidence,priority:a.priority,status:a.status,due_on:a.due_on
  }))}/>
 </div>;
}
