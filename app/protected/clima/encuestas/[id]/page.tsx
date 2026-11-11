import {Suspense} from "react";
import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {isClimaUuid} from "@/lib/clima/invitations";
import {changeClimaStatus} from "../actions";
import ClimaInviteManager from "./invite-manager";

type Summary={
 suppressed:boolean;ready:boolean;invitations:number;completed:number;population:number;
 score?:number|null;enps?:number|null;
 groups?:Array<{name:string;score:number|null;favorable:number|null}>;
 items?:Array<{position:number;code:string;prompt:string;score:number|null;favorable:number|null;type:string;answered:number}>;
};
const fixed=(number:number|null|undefined)=>typeof number==="number"&&Number.isFinite(number)?number.toFixed(1):"—";
type Props={params:Promise<{id:string}>};
export default function ClimaCampaignPage(props:Props){
 return <Suspense fallback={<p className="rounded-xl bg-white p-8">Cargando encuesta...</p>}><Content {...props}/></Suspense>;
}
async function Content({params}:Props){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")redirect("/auth/login");
 const {id}=await params;
 if(!isClimaUuid(id))notFound();
 const db=createAdminClient();
 const [campaignR,questionsR,summaryR]=await Promise.all([
  db.from("clima_campaigns").select("id,organization_id,title,variant,module_code,status,bank_version,planned_population")
   .eq("id",id).maybeSingle(),
  db.from("clima_questions").select("position,source_code,dimension_name,subdimension,prompt,response_type").eq("campaign_id",id).order("position"),
  db.rpc("clima_aggregate",{p_campaign_id:id})
 ]);
 if(campaignR.error||!campaignR.data)notFound();
 if(questionsR.error||summaryR.error)return <p className="rounded-xl bg-red-50 p-6 text-red-700">No se pudo cargar la campaña: {questionsR.error?.message||summaryR.error?.message}</p>;
 const c=campaignR.data;
 const [orgR,instrumentR]=await Promise.all([
  db.from("organizations").select("name").eq("id",c.organization_id).maybeSingle(),
  c.module_code?db.from("c3_instruments").select("name").eq("code",c.module_code).maybeSingle():Promise.resolve({data:null,error:null})
 ]);
 const label=c.variant==="esencial"?"C3 Esencial":instrumentR.data?.name||"Módulo especializado";
 const summary=summaryR.data as Summary;
 const participation=c.planned_population>0?Math.round(summary.completed/c.planned_population*100):0;
 const showReport=c.status==="closed"&&!summary.suppressed&&summary.completed>=5;
 return <div className="space-y-7">
  <Link href="/protected/clima/encuestas" className="text-sm font-bold text-orange-600">← Encuestas Esencial y especializadas</Link>
  <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <p className="text-xs font-black uppercase tracking-[.17em] text-orange-600">{orgR.data?.name||"Organización"} · {label}</p>
   <h1 className="mt-3 text-3xl font-black text-neutral-800">{c.title}</h1>
   <p className="mt-3 text-sm text-neutral-600">Instrumento piloto · Banco {c.bank_version} · {(questionsR.data||[]).length} preguntas congeladas</p>
   <div className="mt-5 flex flex-wrap items-center gap-3">
    <span className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-700">
     {c.status==="draft"?"Borrador":c.status==="open"?"Aplicación abierta":c.status==="closed"?"Cerrada":"Cancelada"}
    </span>
    {(c.status==="draft"||c.status==="open")&&<form action={changeClimaStatus}>
     <input type="hidden" name="campaign_id" value={id}/>
     <input type="hidden" name="next" value={c.status==="draft"?"open":"closed"}/>
     <button type="submit" className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700">
      {c.status==="draft"?"Abrir campaña para participantes":"Cerrar campaña y verificar reporte"}
     </button>
    </form>}
   </div>
  </header>
  <section className="grid gap-4 sm:grid-cols-3">
   {[[String(summary.invitations),"Invitaciones creadas"],
     [String(summary.completed),"Cuestionarios completos"],
     [participation+"%","Participación sobre población"]].map(([value,label])=>
     <div key={label} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-3xl font-black tabular-nums text-neutral-800">{value}</p>
      <p className="mt-1 text-sm text-neutral-600">{label}</p>
     </div>)}
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <h2 className="text-xl font-black text-neutral-800">Reporte agregado · {label}</h2>
   {!showReport?<div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-5">
    <p className="font-bold text-neutral-800">Resultados protegidos hasta completar el cierre</p>
    <p className="mt-2 text-sm leading-7 text-neutral-600">Para liberar el reporte necesitas una campaña cerrada y al menos cinco cuestionarios completos. Mientras la campaña esté abierta solo verás el volumen de participación, no puntuaciones ni respuestas individuales.</p>
    <p className="mt-2 text-xs font-bold text-orange-700">Completados: {summary.completed} · Umbral mínimo: 5</p>
   </div>:
    <div className="mt-6 space-y-7">
     <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl bg-neutral-50 p-5">
       <p className="text-xs font-bold uppercase text-neutral-600">Promedio descriptivo de afirmaciones</p>
       <p className="mt-2 text-4xl font-black tabular-nums text-neutral-800">{fixed(summary.score)}<span className="ml-2 text-base font-normal text-neutral-500">/ 100</span></p>
      </div>
      {c.variant==="esencial"&&<div className="rounded-2xl bg-neutral-50 p-5">
       <p className="text-xs font-bold uppercase text-neutral-600">eNPS</p>
       <p className="mt-2 text-4xl font-black tabular-nums text-neutral-800">{fixed(summary.enps)}</p>
       <p className="mt-1 text-xs text-neutral-500">Promotores menos detractores, rango de −100 a +100.</p>
      </div>}
     </div>
     <div>
      <h3 className="text-lg font-black text-neutral-800">{c.variant==="esencial"?"Lectura por las 13 dimensiones":"Lectura por subdimensión"}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-600">Puntuaciones descriptivas en escala de 0 a 100, sin baremos ni afirmaciones de validación psicométrica.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
       {(summary.groups||[]).map(g=><div key={g.name} className="rounded-2xl border border-neutral-200 p-5">
        <div className="flex items-center justify-between gap-4"><p className="text-sm font-bold text-neutral-800">{g.name}</p>
         <p className="text-xl font-black text-neutral-800">{fixed(g.score)}</p></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
         <div className="h-2 rounded-full bg-orange-500" style={{width:Math.max(0,Math.min(100,g.score||0))+"%"}}/>
        </div>
        <p className="mt-2 text-xs text-neutral-500">Favorabilidad: {fixed(g.favorable)}%</p>
       </div>)}
      </div>
     </div>
     <div>
      <h3 className="text-lg font-black text-neutral-800">Detalle por afirmación</h3>
      <div className="mt-4 divide-y divide-neutral-100">{(summary.items||[]).filter(item=>item.type==="likert").map(item=>
       <div key={item.position} className="grid gap-2 py-4 md:grid-cols-[1fr_110px_120px]">
        <p className="text-sm leading-6 text-neutral-800">{item.position}. {item.prompt}</p>
        <p className="text-sm font-bold text-neutral-800">{fixed(item.score)} / 100</p>
        <p className="text-xs font-semibold text-neutral-600">{fixed(item.favorable)}% favorable</p>
       </div>)}</div>
     </div>
     {c.variant==="esencial"&&<p className="rounded-2xl bg-neutral-50 p-4 text-xs leading-6 text-neutral-600">
      Las preguntas abiertas no se incluyen como textos literales en este dashboard para evitar divulgar información identificable. Su análisis cualitativo requerirá una revisión específica de confidencialidad.
     </p>}
    </div>}
   <p className="mt-6 text-xs leading-6 text-neutral-500">Etapa piloto: los resultados orientan conversaciones y decisiones de mejora, pero no constituyen instrumentos psicométricos validados ni equivalen al diagnóstico C3 PRO integral o a la NOM-035.</p>
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <details>
    <summary className="cursor-pointer text-xl font-black text-neutral-800">Ver preguntas aplicadas ({(questionsR.data||[]).length})</summary>
    <div className="mt-4 divide-y divide-neutral-100">{(questionsR.data||[]).map(q=><div key={q.position} className="py-4">
     <p className="text-sm font-semibold leading-6 text-neutral-800"><span className="mr-2 text-orange-600">{q.position}.</span>{q.prompt}</p>
     <p className="mt-1 text-xs text-neutral-500">{q.dimension_name||q.subdimension||"General"} · {q.response_type==="likert"?"Escala 1–5":q.response_type==="enps"?"Escala 0–10":"Pregunta abierta"}</p>
    </div>)}</div>
   </details>
  </section>
  <ClimaInviteManager campaignId={id} open={c.status==="open"}/>
 </div>;
}
