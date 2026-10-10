import { Suspense } from "react";
import Link from "next/link";
import { notFound,redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import CampaignStatusControls from "./campaign-status-controls";
import InviteGenerator from "./invite-generator";



type DimensionResult = {
  code: string; name: string; pillar: string; score: number | null;
  favorability: number | null; neutrality: number | null;
  unfavorable: number | null; participants: number | null; suppressed: boolean;
};
type PillarResult = { name: string; score: number | null };
type C3Aggregate = {
  suppressed: boolean;
  population: number | null;
  invitations: number; completed: number; participation?: number | null;
  dimensions?: DimensionResult[]; pillars?: PillarResult[];
  global?: number | null; enps?: number | null; enps_responses?: number | null;
  version?: string; validated?: boolean;
};
type C3GroupSummary = {
  enabled:boolean; suppressed:boolean; mode?:string;
  reason?:string; groups?:Array<{label:string;completed:number;score:number|null;
    pillars:Array<{name:string;score:number|null}>}>;
};
const numberText=(n:number|null|undefined,decimals=1)=>typeof n==="number"?n.toFixed(decimals):"—";

export default function C3CampaignDetail(props:{params:Promise<{id:string}>}) {
  return <Suspense fallback={<p className="rounded-2xl bg-white p-8 text-neutral-600">Cargando diagnóstico...</p>}><C3CampaignDetailContent {...props}/></Suspense>;
}
async function C3CampaignDetailContent({params}:{params:Promise<{id:string}>}) {
  const user=await getCurrentAppUser();
  if(!user||user.role!=="super_admin")redirect("/auth/login");
  const {id}=await params;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))notFound();
  const db=createAdminClient();
  const [campaignResult,statsResult,groupResult]=await Promise.all([
    db.from("c3_campaigns").select("id,name,status,organization_id,planned_population,scope,bank_version,report_breakdown,created_at").eq("id",id).maybeSingle(),
    db.rpc("c3_campaign_aggregate",{p_campaign_id:id}),
    db.rpc("c3_safe_group_summary",{p_campaign_id:id}),
  ]);
  if(campaignResult.error||!campaignResult.data)notFound();
  if(statsResult.error)return <div className="rounded-2xl bg-red-50 p-6 text-red-700">No se pudo generar el dashboard: {statsResult.error.message}</div>;
  const campaign=campaignResult.data;
  const summary=statsResult.data as C3Aggregate;
  const grouped=groupResult.error?{enabled:false,suppressed:true} as C3GroupSummary:groupResult.data as C3GroupSummary;
  const {data:company}=await db.from("organizations").select("name").eq("id",campaign.organization_id).maybeSingle();
  const participation=summary.population&&summary.population>0?Math.min(100,Math.max(0,100*summary.completed/summary.population)):0;
  return <div className="space-y-7">
    <Link href="/protected/c3" className="text-sm font-bold text-orange-600">← Campañas C3 PRO</Link>
    <header>
      <p className="text-xs font-black uppercase tracking-[.17em] text-orange-600">{company?.name||"Empresa"} · Prepiloto metodológico</p>
      <h1 className="mt-2 text-3xl font-black text-neutral-800">{campaign.name}</h1>
      <p className="mt-2 max-w-4xl text-neutral-600">Población: personal operativo y administrativo. Los resultados no incluyen respuestas individuales y están sujetos a criterios de confidencialidad.</p>
    </header>
    <div className="grid gap-4 md:grid-cols-4">
      {[
        [String(summary.population??"—"),"Población elegible"],
        [String(summary.invitations),"Ligas vigentes o utilizadas"],
        [String(summary.completed),"Cuestionarios terminados"],
        [summary.population?numberText(100*summary.completed/summary.population)+"%":"—","Participación"]
      ].map(([value,label])=><div key={label} className="rounded-2xl border border-neutral-200 bg-white p-5"><p className="text-3xl font-black text-neutral-800">{value}</p><p className="mt-2 text-sm text-neutral-500">{label}</p></div>)}
    </div>
    <section className="rounded-3xl border border-neutral-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-lg font-black text-neutral-800">Estado de la campaña</h2><p className="mt-1 text-sm text-neutral-500">Versión del banco: {campaign.bank_version}</p></div>
        <span className="rounded-full bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700">{campaign.status==="draft"?"Borrador":campaign.status==="open"?"Abierta":campaign.status==="closed"?"Cerrada":"Cancelada"}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full bg-orange-500" style={{width:participation+"%"}} /></div>
      <p className="mt-3 text-sm text-neutral-600">Las preguntas se congelan al abrir la campaña. Los resultados se liberan solo al cerrarla y cumplir los criterios de cobertura. Puedes reabrir un cierre accidental mientras no se haya consultado ni descargado el informe final.</p>
      <p className="mt-2 text-xs text-orange-700">Después de emitir el primer reporte final, la campaña quedará cerrada definitivamente para proteger la confidencialidad. Un nuevo levantamiento requerirá otra campaña.</p>
      <CampaignStatusControls campaignId={id} status={campaign.status}/>
    </section>
    <InviteGenerator campaignId={id} disabled={campaign.status!=="open"}/>
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">Dashboard ejecutivo</p><h2 className="mt-2 text-2xl font-black text-neutral-800">Clima, Cultura y Compromiso</h2></div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-600">Instrumento en validación</span>
          <Link href="/protected/c3/demo/reporte" className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100">Ver informe de ejemplo</Link>
          {campaign.status==="closed" && !summary.suppressed && summary.global != null && summary.dimensions?.length===13 && summary.dimensions.every(d=>d.score!==null) &&
            <Link href={"/c3-report/"+id} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700">Ver reporte ejecutivo →</Link>}
        </div>
      </div>
      {campaign.status!=="closed" || summary.suppressed?
        <p className="mt-5 rounded-2xl bg-neutral-50 p-5 text-sm leading-6 text-neutral-700">Los indicadores se mantienen ocultos mientras la campaña está abierta. Una vez cerrada, se necesitan por lo menos <strong>5 cuestionarios completos</strong> y cobertura suficiente de las 13 dimensiones. Los desgloses también requieren grupos seguros para publicar.</p>:
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-neutral-100 p-5"><p className="text-sm font-semibold text-neutral-500">Índice global C3 · 0–100</p><p className="mt-2 text-4xl font-black text-neutral-800">{numberText(summary.global)}</p><p className="mt-2 text-xs text-neutral-500">Promedio de tres pilares; cada dimensión requiere cobertura suficiente.</p></div>
            <div className="rounded-2xl bg-neutral-100 p-5"><p className="text-sm font-semibold text-neutral-500">eNPS · −100 a 100</p><p className="mt-2 text-4xl font-black text-neutral-800">{numberText(summary.enps)}</p><p className="mt-2 text-xs text-neutral-500">No forma parte del índice C3. No se publica con menos de cinco respuestas válidas.</p></div>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {(summary.pillars||[]).map(p=><div key={p.name} className="rounded-2xl border border-neutral-200 p-5"><div className="text-xs font-black uppercase tracking-[.12em] text-neutral-500">{p.name}</div><p className="mt-2 text-3xl font-black text-neutral-800">{numberText(p.score)}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full bg-orange-500" style={{width:Math.min(100,Math.max(0,p.score||0))+"%"}} /></div></div>)}
          </div>
          <div className="mt-8">
            <h3 className="text-lg font-black text-neutral-800">Resultados por dimensión</h3>
            <p className="mt-1 text-sm text-neutral-500">Índice normalizado y favorabilidad son indicadores diferentes. Las dimensiones sin datos suficientes no se calculan.</p>
            <div className="mt-4 space-y-3">
              {(summary.dimensions||[]).map(d=><div key={d.code} className="rounded-2xl border border-neutral-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-orange-600">{d.code} · {d.pillar}</p><p className="mt-1 font-bold text-neutral-800">{d.name}</p></div>
                <div className="text-right"><p className="text-xl font-black text-neutral-800">{numberText(d.score)}</p><p className="text-xs text-neutral-500">{d.favorability===null?"Favorabilidad no publicable":numberText(d.favorability)+"% favorable"}</p></div></div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full bg-orange-500" style={{width:Math.min(100,Math.max(0,d.score??0))+"%"}} /></div>
              </div>)}
            </div>
          </div>
        </>
      }
      <p className="mt-6 text-xs leading-5 text-neutral-500">Resultados descriptivos del piloto. No constituyen una validación científica ni equivalen a una evaluación NOM-035. Los desgloses aplican un umbral mínimo y ocultamiento complementario.</p>
    </section>
    {campaign.status==="closed" && grouped.enabled&&<section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[.15em] text-orange-600">Comparativo confidencial</p>
          <h2 className="mt-2 text-xl font-black text-neutral-800">
            {campaign.report_breakdown==="department"?"Clima por departamento":"Clima por tipo de personal"}
          </h2>
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-600">Umbral ≥ 5 · Sin respuestas individuales</span>
      </div>
      {grouped.suppressed?
        <p className="mt-4 rounded-xl bg-neutral-50 p-5 text-sm leading-6 text-neutral-600">{grouped.reason||"No hay datos suficientes para mostrar un comparativo protegido."} La comparación se oculta por completo para impedir deducir los resultados de un grupo pequeño.</p>:
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {(grouped.groups||[]).map(g=><div key={g.label} className="rounded-2xl border border-neutral-200 p-5">
            <p className="font-black text-neutral-800">{g.label}</p>
            <p className="mt-1 text-xs text-neutral-500">{g.completed} respuestas completas · cifras agrupadas</p>
            <p className="mt-3 text-3xl font-black text-orange-600">{numberText(g.score)}<span className="text-base font-normal text-neutral-400"> / 100</span></p>
            <div className="mt-4 space-y-2">{(g.pillars||[]).map(p=><div key={p.name} className="flex items-center justify-between text-xs text-neutral-600"><span>{p.name}</span><strong>{numberText(p.score)}</strong></div>)}</div>
          </div>)}
        </div>}
      <p className="mt-4 text-xs leading-5 text-neutral-500">Elige un solo desglose por campaña. La configuración permanece fija después de abrir la encuesta. No se muestran comentarios abiertos ni cruces de grupos potencialmente identificables.</p>
    </section>}
  </div>;
}
