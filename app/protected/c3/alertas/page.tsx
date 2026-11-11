import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { c3CollectAlerts, c3SortAlerts, type C3AlertCampaign, type C3AlertTask } from "@/lib/c3/action-alerts";
import C3AlertsClient from "./alerts-client";

function todayInMexicoCity(){
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"
  }).formatToParts(new Date());
  const extract=(name:string)=>parts.find(part=>part.type===name)?.value??"";
  return extract("year")+"-"+extract("month")+"-"+extract("day");
}

export default function C3AlertsPage(){
  return <Suspense fallback={<div className="rounded-3xl bg-white p-8 text-neutral-600">Cargando alertas C3 PRO...</div>}>
    <C3AlertsContent/>
  </Suspense>;
}
async function C3AlertsContent(){
  const user=await getCurrentAppUser();
  if(!user || user.role!=="super_admin")redirect("/auth/login");

  const db=createAdminClient();
  const [campaignsR,orgsR,tasksR]=await Promise.all([
    db.from("c3_campaigns").select("id,name,status,organization_id"),
    db.from("organizations").select("id,name"),
    db.from("c3_action_items")
      .select("id,campaign_id,title,owner_label,phase_days,dimension_code,priority,status,due_on")
      .in("status",["pendiente","en_proceso"]),
  ]);
  const error=campaignsR.error||orgsR.error||tasksR.error;
  if(error)return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
    No se pudieron cargar las alertas: {error.message}
  </div>;
  const orgNames=new Map((orgsR.data??[]).map(o=>[o.id,o.name]));
  const campaigns:C3AlertCampaign[]=(campaignsR.data??[]).map(c=>({
    id:c.id,name:c.name,organizationId:c.organization_id,
    organizationName:orgNames.get(c.organization_id)??"Empresa",
    status:c.status
  }));
  const tasks:C3AlertTask[]=(tasksR.data??[]).map(a=>({
    id:a.id,campaignId:a.campaign_id,title:a.title,owner:a.owner_label??"",
    phaseDays:a.phase_days,dimensionCode:a.dimension_code,
    priority:a.priority,status:a.status,dueOn:a.due_on
  }));
  const today=todayInMexicoCity();
  const items=c3SortAlerts(c3CollectAlerts(campaigns,tasks,today));
  return <div className="space-y-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/protected/c3/seguimiento" className="text-sm font-bold text-orange-600 hover:text-orange-700">
        ← Tablero de seguimiento
      </Link>
      <Link href="/protected/c3" className="text-sm font-bold text-neutral-600 hover:text-orange-600">
        Campañas C3 PRO →
      </Link>
    </div>
    <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[.17em] text-orange-600">FactoRH · Seguimiento ejecutivo</p>
      <h1 className="mt-2 text-3xl font-black text-neutral-800">Centro de alertas y agenda semanal</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">
        Prioriza compromisos vencidos, actividades con fecha próxima y acuerdos sin responsable o
        sin fecha. Prepara la reunión semanal con acciones verificables y acceso directo al plan de cada campaña.
      </p>
      <p className="mt-3 text-xs font-semibold text-neutral-500">
        Actualización al abrir la página · Zona horaria América/México_City · Sin avisos automáticos por correo o WhatsApp
      </p>
    </header>
    <C3AlertsClient items={items} today={today}/>
  </div>;
}
