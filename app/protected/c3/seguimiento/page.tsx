import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import C3PortfolioClient, { type PortfolioCampaign, type PortfolioAction } from "./portfolio-client";

export default function C3TrackingPage() {
  return <Suspense fallback={<p className="rounded-2xl bg-white p-8 text-neutral-600">
    Cargando tablero ejecutivo C3 PRO...
  </p>}><C3TrackingContent/></Suspense>;
}
function centralMexicoDay() {
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"
  }).formatToParts(new Date());
  const get=(name:string)=>parts.find(part=>part.type===name)?.value||"";
  return get("year")+"-"+get("month")+"-"+get("day");
}
function plusSevenDays(day:string) {
  const date=new Date(day+"T12:00:00Z");
  date.setUTCDate(date.getUTCDate()+7);
  return date.toISOString().slice(0,10);
}
async function C3TrackingContent() {
  const user=await getCurrentAppUser();
  // The tracking portfolio is an internal consulting tool; client users and other
  // operational roles cannot see administrative commitments across organizations.
  if(!user||user.role!=="super_admin")redirect("/auth/login");

  const db=createAdminClient();
  const [campaignResult,orgResult,actionsResult]=await Promise.all([
    db.from("c3_campaigns")
      .select("id,name,organization_id,status,report_released_at")
      .order("created_at",{ascending:false}),
    db.from("organizations").select("id,name").order("name"),
    db.from("c3_action_items")
      .select("id,campaign_id,title,owner_label,phase_days,priority,status,dimension_code,due_on,updated_at")
      .order("created_at",{ascending:false}),
  ]);
  const error=campaignResult.error||orgResult.error||actionsResult.error;
  if(error)return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
    No pudimos cargar el seguimiento ejecutivo: {error.message}
  </div>;
  const orgMap=new Map((orgResult.data||[]).map(o=>[o.id,o.name]));
  const campaigns:PortfolioCampaign[]=(campaignResult.data||[]).map(c=>({
    id:c.id,name:c.name,organizationId:c.organization_id,
    organizationName:orgMap.get(c.organization_id)||"Empresa",
    status:c.status,reportReleased:!!c.report_released_at
  }));
  const actions:PortfolioAction[]=(actionsResult.data||[]).map(a=>({
    id:a.id,campaignId:a.campaign_id,title:a.title,owner:a.owner_label||"",
    phaseDays:a.phase_days,priority:a.priority,status:a.status,
    dimensionCode:a.dimension_code,dueOn:a.due_on,updatedAt:a.updated_at
  }));
  const today=centralMexicoDay();
  return <div className="space-y-7">
    <Link href="/protected/c3" className="text-sm font-bold text-orange-600 hover:text-orange-700">
      ← Volver a C3 PRO
    </Link>
    <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[.17em] text-orange-600">
        FactoRH · Consultoría organizacional
      </p>
      <h1 className="mt-2 text-3xl font-black text-neutral-800">
        Tablero ejecutivo de seguimiento
      </h1>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-neutral-600">
        Visualiza de manera consolidada los compromisos de los planes C3 PRO a 30, 60 y 90 días.
        Identifica actividades atrasadas, responsables de implementación y avance por campaña,
        sin abrir resultados individuales de la encuesta.
      </p>
      <p className="mt-3 text-xs font-semibold text-orange-700">
        Instrumento C3 en fase piloto · Seguimiento administrativo independiente de las puntuaciones
      </p>
    </header>
    <C3PortfolioClient campaigns={campaigns} actions={actions}
      today={today} sevenDays={plusSevenDays(today)}/>
  </div>;
}
