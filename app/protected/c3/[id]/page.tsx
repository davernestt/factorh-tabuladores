import Link from "next/link";
import { notFound,redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { changeC3CampaignStatus } from "../actions";
import InviteGenerator from "./invite-generator";

export const dynamic = "force-dynamic";

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
const numberText=(n:number|null|undefined,decimals=1)=>typeof n==="number"?n.toFixed(decimals):"—";

export default async function C3CampaignDetail({params}:{params:Promise<{id:string}>}) {
  const user=await getCurrentAppUser();
  if(!user||user.role!=="super_admin")redirect("/auth/login");
  const {id}=await params;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))notFound();
  const db=createAdminClient();
  const [campaignResult,statsResult]=await Promise.all([
    db.from("c3_campaigns").select("id,name,status,organization_id,planned_population,scope,bank_version,created_at").eq("id",id).maybeSingle(),
    db.rpc("c3_campaign_aggregate",{p_campaign_id:id}),
  ]);
  if(campaignResult.error||!campaignResult.data)notFound();
  if(statsResult.error)return <div className="rounded-2xl bg-red-50 p-6 text-red-700">No se pudo generar el dashboard: {statsResult.error.message}</div>;
  const campaign=campaignResult.data;
  const summary=statsResult.data as C3Aggregate;
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
      <p className="mt-3 text-sm text-neutral-600">Las preguntas se congelan al abrir la campaña. Una vez cerrada, los enlaces dejan de aceptar respuestas.</p>
      {(campaign.status==="draft"||campaign.status==="open")&&<form action={changeC3CampaignStatus} className="mt-4">
        <input type="hidden" name="id" value={id}/><input type="hidden" name="status" value={campaign.status==="draft"?"open":"closed"}/>
        <button className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white hover:bg-neutral-700">{campaign.status==="draft"?"Abrir campaña":"Cerrar campaña"}</button>
      </form>}
    </section>
    <InviteGenerator campaignId={id} disabled={campaign.status!=="open"}/>
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">Dashboard ejecutivo</p><h2 className="mt-2 text-2xl font-black text-neutral-800">Clima, Cultura y Compromiso</h2></div>
        <span className="rounded-full bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-600">Instrumento en validación</span>
      </div>
      {summary.suppressed?
        <p className="mt-5 rounded-2xl bg-neutral-50 p-5 text-sm leading-6 text-neutral-700">Los indicadores todavía están protegidos. Se necesitan por lo menos <strong>5 cuestionarios completos</strong> y datos suficientes en cada dimensión para mostrar resultados. No se habilitan desgloses por departamento o tipo de personal en esta etapa.</p>:
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
      <p className="mt-6 text-xs leading-5 text-neutral-500">Resultados descriptivos del piloto. No constituyen una validación científica ni equivalen a una evaluación NOM-035. Se exige supresión complementaria antes de activar segmentaciones o exportaciones.</p>
    </section>
  </div>;
}
