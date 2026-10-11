import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import NotificationSettingsManager from "./settings-manager";

export default function C3NotificationPage(){
  return <Suspense fallback={<p className="rounded-2xl bg-white p-8 text-neutral-600">Cargando configuración de avisos...</p>}>
    <C3NotificationContent/>
  </Suspense>;
}
async function C3NotificationContent(){
  const user=await getCurrentAppUser();
  if(!user||user.role!=="super_admin")redirect("/auth/login");
  const db=createAdminClient();
  const [orgsR,settingsR,historyR]=await Promise.all([
    db.from("organizations").select("id,name").eq("active",true).order("name"),
    db.from("c3_notification_settings")
      .select("organization_id,recipient_emails,deadline_enabled,weekly_enabled,weekly_weekday"),
    db.from("c3_notification_deliveries")
      .select("id,organization_id,notification_kind,delivery_date,status,action_count,created_at,sent_at")
      .order("created_at",{ascending:false}).limit(30)
  ]);
  const error=orgsR.error||settingsR.error||historyR.error;
  if(error)return <div className="rounded-2xl bg-red-50 p-6 text-red-800">Error al cargar configuración: {error.message}</div>;
  const configured=!!process.env.CRON_SECRET && !!process.env.RESEND_API_KEY && !!process.env.C3_FROM_EMAIL;
  return <div className="space-y-7">
    <Link href="/protected/c3/alertas" className="text-sm font-bold text-orange-600">← Centro de alertas</Link>
    <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">FactoRH · Administración</p>
      <h1 className="mt-2 text-3xl font-black text-neutral-800">Recordatorios por correo · C3 PRO</h1>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-neutral-600">
        Configura hasta tres destinatarios por empresa, alertas diarias de vencimientos
        y un resumen semanal. Los mensajes incluyen únicamente compromisos administrativos;
        nunca resultados ni respuestas individuales de la encuesta.
      </p>
    </header>
    <NotificationSettingsManager
      organizations={orgsR.data||[]}
      savedSettings={settingsR.data||[]}
      deliveryHistory={historyR.data||[]}
      infrastructureReady={configured}/>
  </div>;
}
