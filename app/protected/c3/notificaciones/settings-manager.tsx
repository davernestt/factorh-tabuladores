"use client";

import { useMemo, useState, useTransition } from "react";
import { Mail, ShieldCheck, Clock3, Save } from "lucide-react";
import { updateC3NotificationSettings } from "./actions";

type Org={id:string;name:string};
type Setting={
 organization_id:string;recipient_emails:string[];deadline_enabled:boolean;
 weekly_enabled:boolean;weekly_weekday:number;
};
type Delivery={
 id:string;organization_id:string;notification_kind:string;delivery_date:string;
 status:string;action_count:number;created_at:string;sent_at:string|null;
};
const weekdayLabels={1:"Lunes",2:"Martes",3:"Miércoles",4:"Jueves",5:"Viernes"} as const;
export default function NotificationSettingsManager({
 organizations,savedSettings,deliveryHistory,infrastructureReady
}:{organizations:Org[];savedSettings:Setting[];deliveryHistory:Delivery[];infrastructureReady:boolean}){
 const [organization,setOrganization]=useState(organizations[0]?.id||"");
 const [pending,startTransition]=useTransition();
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const saved=useMemo(()=>new Map(savedSettings.map(s=>[s.organization_id,s])),[savedSettings]);
 const current=saved.get(organization);
 const [editing,setEditing]=useState<Record<string,{
  emails:string;daily:boolean;weekly:boolean;weekday:number
 }>>({});
 const local=editing[organization];
 const values=local||{
  emails:(current?.recipient_emails||[]).join("\n"),
  daily:current?.deadline_enabled||false,
  weekly:current?.weekly_enabled||false,
  weekday:current?.weekly_weekday||5
 };
 function patch(change:Partial<typeof values>){
  setEditing(prev=>({...prev,[organization]:{...values,...change}}));
  setError("");setNotice("");
 }
 function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!organization)return;
  const form=new FormData();
  form.set("organization_id",organization);
  form.set("recipient_emails",values.emails);
  form.set("weekly_weekday",String(values.weekday));
  if(values.daily)form.set("deadline_enabled","on");
  if(values.weekly)form.set("weekly_enabled","on");
  setError("");setNotice("");
  startTransition(async()=>{
   try{
    await updateC3NotificationSettings(form);
    setNotice("Configuración guardada. Solo se enviarán correos si ambos componentes (configuración y servicio externo) están activos.");
   }catch(e){
    setError(e instanceof Error?e.message:"No fue posible guardar la configuración.");
   }
  });
 }
 const nameById=new Map(organizations.map(o=>[o.id,o.name]));
 const visibleHistory=deliveryHistory.filter(row=>row.organization_id===organization).slice(0,12);
 return <div className="space-y-6">
  <section className={"rounded-2xl border p-5 "+(infrastructureReady?
   "border-emerald-200 bg-emerald-50":"border-orange-200 bg-orange-50")}>
   <div className="flex flex-wrap items-center gap-2">
    <ShieldCheck className="h-5 w-5 text-neutral-700"/>
    <h2 className="font-black text-neutral-800">Estado de infraestructura</h2>
   </div>
   <p className="mt-2 text-sm leading-6 text-neutral-700">
    {infrastructureReady
     ?"Credenciales básicas de cron y correo presentes. Puedes habilitar empresas después de verificar que el remitente esté aprobado y el programador esté desplegado."
     :"Pendiente de configurar CRON_SECRET, RESEND_API_KEY y C3_FROM_EMAIL en Vercel. Puedes guardar destinatarios, pero las opciones de envío permanecerán desactivadas hasta completar esa configuración."}
   </p>
   <p className="mt-2 text-xs leading-5 text-neutral-600">
    El proceso está diseñado para ejecutarse una vez al día, aproximadamente a las 9:00 a. m.
    de Guadalajara. Los resúmenes se envían únicamente el día seleccionado, y las alertas
    diarias solo cuando existan compromisos próximos a vencer o vencidos.
   </p>
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <div className="flex flex-wrap items-center gap-2">
    <Mail className="h-5 w-5 text-orange-600"/>
    <h2 className="text-xl font-black text-neutral-800">Destinatarios y periodicidad</h2>
   </div>
   {!organizations.length?<p className="mt-4 text-sm text-neutral-500">No hay empresas activas disponibles.</p>:
   <>
    <label className="mt-5 block text-sm font-bold text-neutral-700">Empresa
     <select className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3"
      value={organization} onChange={e=>{setOrganization(e.target.value);setError("");setNotice("");}}>
      {organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
     </select>
    </label>
    <form onSubmit={save} className="mt-5 space-y-5">
     <label className="block text-sm font-bold text-neutral-700">
      Destinatarios de RH o Dirección (máximo tres correos)
      <textarea className="mt-2 w-full rounded-xl border border-neutral-300 p-3 text-sm font-normal"
       rows={4} value={values.emails} onChange={e=>patch({emails:e.target.value})}
       placeholder={"rh@empresa.com\nresponsable@empresa.com"}/>
      <span className="mt-2 block text-xs font-normal leading-6 text-neutral-500">
       Coloca un correo por línea. Estos destinatarios tendrán acceso al detalle de actividades del plan,
       no a las respuestas de los participantes.
      </span>
     </label>
     <label className="flex items-start gap-3 rounded-2xl border border-neutral-200 p-4">
      <input type="checkbox" checked={values.daily} disabled={!infrastructureReady}
       onChange={e=>patch({daily:e.target.checked})} className="mt-1 h-4 w-4 accent-orange-600"/>
      <span><strong className="text-sm text-neutral-800">Recordatorio diario de compromisos</strong>
       <span className="mt-1 block text-xs leading-6 text-neutral-600">
        Envía alertas solo si hay actividades vencidas, que vencen hoy o en los próximos siete días.
        No envía correos vacíos.
       </span></span>
     </label>
     <label className="flex items-start gap-3 rounded-2xl border border-neutral-200 p-4">
      <input type="checkbox" checked={values.weekly} disabled={!infrastructureReady}
       onChange={e=>patch({weekly:e.target.checked})} className="mt-1 h-4 w-4 accent-orange-600"/>
      <span><strong className="text-sm text-neutral-800">Resumen semanal para RH</strong>
       <span className="mt-1 block text-xs leading-6 text-neutral-600">
        Incluye estado de compromisos, responsables y fechas, incluso si no hubo incidencias.
       </span></span>
     </label>
     <label className="block text-sm font-bold text-neutral-700">Día de envío del resumen semanal
      <select value={values.weekday} onChange={e=>patch({weekday:Number(e.target.value)})}
       className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3">
       {Object.entries(weekdayLabels).map(([day,label])=><option key={day} value={day}>{label}</option>)}
      </select>
     </label>
     {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
     {notice&&<p role="status" className="rounded-xl bg-neutral-100 p-4 text-sm font-semibold text-neutral-700">{notice}</p>}
     <button type="submit" disabled={pending}
      className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
      <Save className="h-4 w-4"/>{pending?"Guardando...":"Guardar configuración"}
     </button>
     <p className="text-xs text-neutral-500">
      Estado guardado: {current?.deadline_enabled?"alertas diarias activas":"alertas diarias desactivadas"} ·
      {" "}{current?.weekly_enabled?"resumen semanal activo":"resumen semanal desactivado"}.
      La configuración inicial de todas las empresas es desactivada.
     </p>
    </form>
   </>}
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-orange-600"/>
    <h2 className="text-xl font-black text-neutral-800">Historial de intentos de envío</h2></div>
   <p className="mt-2 text-xs leading-6 text-neutral-500">
    Permite auditar envíos, errores y reintentos. No contiene el cuerpo del mensaje ni respuestas individuales.
   </p>
   {!visibleHistory.length?<p className="mt-4 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">
    Todavía no hay envíos para {nameById.get(organization)||"esta empresa"}. Esto es normal mientras el servicio no esté activado.
   </p>:
   <div className="mt-4 divide-y divide-neutral-100">
    {visibleHistory.map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
     <div><p className="font-bold text-neutral-800">{row.notification_kind==="weekly_digest"?"Resumen semanal":"Recordatorio diario"}</p>
      <p className="mt-1 text-xs text-neutral-500">{row.delivery_date} · {row.action_count} actividades incluidas</p></div>
     <span className={"rounded-lg px-3 py-2 text-xs font-bold "+(
      row.status==="sent"?"bg-emerald-50 text-emerald-700":
      row.status==="failed"?"bg-red-50 text-red-700":"bg-neutral-100 text-neutral-600")}>
      {row.status==="sent"?"Enviado":row.status==="failed"?"Falló":"En proceso / no confirmado"}
     </span>
    </div>)}
   </div>}
  </section>
 </div>;
}
