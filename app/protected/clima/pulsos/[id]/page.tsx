import {Suspense} from "react";
import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {changePulseStatus} from "../actions";
import PulseInvites from "./pulse-invites";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Summary={suppressed:boolean;invitations:number;completed:number;population:number;ready:boolean;score?:number;items?:Array<{position:number;code:string;dimension:string;prompt:string;score:number;favorable:number}>};
export default function PulseDetail(props:{params:Promise<{id:string}>}){
 return <Suspense fallback={<p className="p-8">Cargando campaña Pulso...</p>}><Content {...props}/></Suspense>;
}
async function Content({params}:{params:Promise<{id:string}>}){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")redirect("/auth/login");
 const {id}=await params;
 if(!uuid.test(id))notFound();
 const db=createAdminClient();
 const [campaignR,questionsR,summaryR]=await Promise.all([
  db.from("pulse_campaigns").select("id,name,focus,organization_id,planned_population,status,created_at").eq("id",id).maybeSingle(),
  db.from("pulse_questions").select("position,source_item_code,dimension_name,prompt").eq("campaign_id",id).order("position"),
  db.rpc("pulse_aggregate",{p_campaign_id:id})
 ]);
 if(!campaignR.data||campaignR.error)notFound();
 if(questionsR.error||summaryR.error)return <p className="rounded-xl bg-red-50 p-6 text-red-700">Error al leer campaña o resultados.</p>;
 const campaign=campaignR.data,summary=summaryR.data as Summary;
 const {data:org}=await db.from("organizations").select("name").eq("id",campaign.organization_id).maybeSingle();
 const canReport=campaign.status==="closed"&&!summary.suppressed&&summary.completed>=5;
 return <div className="space-y-7">
  <Link href="/protected/clima/pulsos" className="text-sm font-bold text-orange-600">← Campañas de Pulso</Link>
  <section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <p className="text-xs font-black uppercase tracking-wide text-orange-600">FactoRH · Pulso</p>
   <h1 className="mt-2 text-3xl font-black text-neutral-800">{campaign.name}</h1>
   <p className="mt-2 text-sm text-neutral-600">{org?.name||"Empresa"} · {campaign.focus}</p>
   <p className="mt-4 text-sm font-semibold text-neutral-700">Estado: {campaign.status==="draft"?"Borrador":campaign.status==="open"?"Abierta":campaign.status==="closed"?"Cerrada":campaign.status}</p>
   {campaign.status!=="closed"&&<form action={changePulseStatus} className="mt-4">
    <input type="hidden" name="id" value={id}/><input type="hidden" name="next" value={campaign.status==="draft"?"open":"closed"}/>
    <button type="submit" className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white">
      {campaign.status==="draft"?"Abrir campaña y permitir respuestas":"Cerrar campaña y evaluar disponibilidad del reporte"}
    </button>
   </form>}
  </section>
  <section className="grid gap-4 sm:grid-cols-3">
   {[[String(summary.invitations),"Ligas creadas"],[String(summary.completed),"Respuestas completadas"],[summary.population?Math.round(summary.completed/summary.population*100)+"%":"—","Participación"]].map(([n,label])=><div key={label} className="rounded-2xl border border-neutral-200 bg-white p-5"><p className="text-3xl font-black text-neutral-800">{n}</p><p className="mt-1 text-sm text-neutral-600">{label}</p></div>)}
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-xl font-black text-neutral-800">Reporte agregado del Pulso</h2>
   {!canReport?<p className="mt-3 rounded-xl bg-orange-50 p-4 text-sm leading-6 text-neutral-700">Los indicadores y puntuaciones se publican únicamente después de cerrar la campaña y reunir al menos cinco cuestionarios completos. Mientras tanto, puedes consultar la participación general sin acceso a respuestas individuales.</p>:
    <><p className="mt-3 text-sm text-neutral-600">Promedio total convertido a escala de 0 a 100: <strong>{summary.score?.toFixed(1)??"—"}</strong></p>
     <p className="mt-2 text-xs text-neutral-500">Lectura descriptiva de 8–12 reactivos; no equivale al índice C3 PRO ni a una escala validada.</p>
     <div className="mt-5 divide-y divide-neutral-100">{(summary.items||[]).map(row=><div key={row.position} className="grid gap-2 py-4 md:grid-cols-[1fr_90px_110px]"><p className="text-sm text-neutral-800"><strong>{row.position}.</strong> {row.prompt}</p><p className="text-sm font-black text-neutral-800">{row.score?.toFixed(1)||"—"} / 100</p><p className="text-xs font-bold text-neutral-600">{row.favorable?.toFixed(1)||"—"}% favorable</p></div>)}</div>
    </>}
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-xl font-black text-neutral-800">Preguntas congeladas</h2>
   <div className="mt-4 divide-y divide-neutral-100">{(questionsR.data||[]).map(q=><div key={q.position} className="py-3 text-sm text-neutral-700"><span className="font-black text-orange-600">{q.source_item_code} · </span>{q.prompt}</div>)}</div>
  </section>
  <PulseInvites campaignId={id} open={campaign.status==="open"}/>
 </div>;
}
