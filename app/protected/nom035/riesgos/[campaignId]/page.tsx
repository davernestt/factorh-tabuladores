import {Suspense} from "react";
import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {ShieldCheck,Users,ClipboardCheck,BarChart3} from "lucide-react";
import {getCurrentAppUser} from "@/lib/app-auth";
import {hasNom035Subscription,requireNom035Organization} from "@/lib/nom035/access";
import {createAdminClient} from "@/lib/supabase/admin";
import {validRiskId} from "@/lib/nom035/risk-invitations";
import {changeRiskCampaignStatus} from "../actions";
import RiskInviteManager from "./invite-manager";

type Props={params:Promise<{campaignId:string}>};
type Group={
 metric_kind:"total"|"category"|"domain";metric_name:string;
 sum_score:number;count_scored:number;risk_nulo:number;risk_bajo:number;
 risk_medio:number;risk_alto:number;risk_muy_alto:number;
};
const levels=[
 {key:"risk_nulo",label:"Nulo o despreciable"},
 {key:"risk_bajo",label:"Bajo"},
 {key:"risk_medio",label:"Medio"},
 {key:"risk_alto",label:"Alto"},
 {key:"risk_muy_alto",label:"Muy alto"}
] as const;
export default function Nom035RiskCampaign(props:Props){
 return <Suspense fallback={<p className="p-8">Preparando reporte normativo...</p>}>
  <Content {...props}/>
 </Suspense>;
}
function MetricCard({group}:{group:Group}){
 const count=group.count_scored||1;
 const average=group.count_scored?(group.sum_score/count).toFixed(1):"—";
 return <div className="rounded-2xl border border-neutral-200 bg-white p-5">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <p className="max-w-xl text-sm font-black leading-6 text-neutral-800">{group.metric_name}</p>
   <span className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-black text-neutral-700">
    Media descriptiva: {average} pts
   </span>
  </div>
  <div className="mt-4 grid grid-cols-5 gap-2">
   {levels.map(l=>{
    const value=group[l.key];
    return <div key={l.key} className="text-center">
     <p className="text-lg font-black tabular-nums text-neutral-800">{value}</p>
     <p className="mt-1 text-[10px] leading-4 text-neutral-500">{l.label}</p>
    </div>;
   })}
  </div>
  <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-neutral-100">
   {levels.map((l,i)=><div key={l.key} title={l.label+": "+group[l.key]}
    className={["bg-emerald-400","bg-slate-300","bg-yellow-400","bg-orange-400","bg-red-500"][i]}
    style={{width:((group[l.key]/count)*100)+"%"}}/>)}
  </div>
 </div>;
}
async function Content({params}:Props){
 const user=await getCurrentAppUser();
 if(!user||!["super_admin","client"].includes(user.role))redirect("/auth/login");
 if(!await hasNom035Subscription(user))redirect("/protected/psicometrias");
 const {campaignId}=await params;
 if(!validRiskId(campaignId))notFound();
 const db=createAdminClient();
 const [campaignR,aggregateR,linksR,itemsR]=await Promise.all([
  db.from("nom035_risk_campaigns").select(
   "id,center_id,title,guide,coverage_mode,eligible_population,workforce_snapshot,sample_protocol_ref,sample_gender_protocol_confirmed,completed_count,status,bank_version"
  ).eq("id",campaignId).maybeSingle(),
  db.from("nom035_risk_aggregates")
   .select("metric_kind,metric_name,sum_score,count_scored,risk_nulo,risk_bajo,risk_medio,risk_alto,risk_muy_alto")
   .eq("campaign_id",campaignId).order("metric_kind").order("metric_name"),
  db.from("nom035_risk_invites").select("id",{count:"exact",head:true})
   .eq("campaign_id",campaignId),
  db.from("nom035_risk_items").select("position,prompt,conditional_on")
   .eq("campaign_id",campaignId).order("position")
 ]);
 if(!campaignR.data||campaignR.error)notFound();
 const err=aggregateR.error||linksR.error||itemsR.error;
 if(err)return <p className="rounded-xl bg-red-50 p-6 text-red-700">
  No fue posible leer los datos: {err.message}
 </p>;
 const campaign=campaignR.data;
 const {data:center}=await db.from("nom035_work_centers")
  .select("name,organization_id").eq("id",campaign.center_id).maybeSingle();
 if(!center)notFound();
 requireNom035Organization(user,center.organization_id);
 const {data:org}=center.organization_id?await db.from("organizations")
  .select("name").eq("id",center.organization_id).maybeSingle():{data:null};
 const aggregates=(aggregateR.data||[]) as Group[];
 const reportReady=campaign.status==="closed"&&campaign.completed_count>=10;
 const enoughResponses=campaign.completed_count>=campaign.eligible_population;
 const total=aggregates.find(a=>a.metric_kind==="total"&&a.metric_name==="C final");
 const domains=aggregates.filter(a=>a.metric_kind==="domain");
 const categories=aggregates.filter(a=>a.metric_kind==="category");
 const invited=linksR.count||0;
 const nQuestions=(itemsR.data||[]).length;
 return <div className="space-y-7">
  <Link href={"/protected/nom035/"+campaign.center_id+"/riesgos"}
   className="text-sm font-bold text-orange-600">← Aplicaciones NOM-035 del centro</Link>
  <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <p className="text-xs font-black uppercase tracking-[.15em] text-orange-600">
    {org?.name||"Organización"} · {center?.name||"Centro de trabajo"}
   </p>
   <h1 className="mt-3 text-3xl font-black text-neutral-800">{campaign.title}</h1>
   <p className="mt-3 text-sm leading-7 text-neutral-600">
    Guía {campaign.guide} · {nQuestions} preguntas del banco {campaign.bank_version} ·
    {" "+(campaign.coverage_mode==="census"?"Censo completo":"Muestra representativa documentada")}
   </p>
   <div className="mt-5 flex flex-wrap items-center gap-3">
    <span className="rounded-lg bg-neutral-100 px-4 py-2 text-xs font-bold text-neutral-700">
     {campaign.status==="draft"?"Borrador":campaign.status==="open"?"Abierta":"Cerrada"}
    </span>
    {user.role==="super_admin"&&(campaign.status==="draft"||campaign.status==="open")&&<form action={changeRiskCampaignStatus}>
     <input type="hidden" name="campaign_id" value={campaignId}/>
     <input type="hidden" name="next" value={campaign.status==="draft"?"open":"closed"}/>
     <button type="submit" className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white">
      {campaign.status==="draft"?"Abrir campaña":"Cerrar campaña"}
     </button>
    </form>}
   </div>
  </header>
  <section className="grid gap-4 sm:grid-cols-3">
   {[
    {label:"Población objetivo",number:campaign.eligible_population,Icon:Users},
    {label:"Ligas generadas",number:invited,Icon:ClipboardCheck},
    {label:"Cuestionarios terminados",number:campaign.completed_count,Icon:BarChart3}
   ].map(d=><div key={d.label} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
    <d.Icon className="h-5 w-5 text-orange-600"/>
    <p className="mt-3 text-3xl font-black text-neutral-800">{d.number}</p>
    <p className="mt-1 text-sm text-neutral-600">{d.label}</p>
   </div>)}
  </section>
  {campaign.coverage_mode==="sample"&&<section className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700">
   <p className="font-black">Protocolo de selección de muestra</p>
   <p className="mt-2 leading-6">{campaign.sample_protocol_ref}</p>
   <p className="mt-2 text-xs text-neutral-500">
    Confirmación administrativa de selección aleatoria y distribución por género:
    {" "+(campaign.sample_gender_protocol_confirmed?"Registrada":"No registrada")}.
    La plataforma no verifica por sí sola la selección realizada.
   </p>
  </section>}
  <section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-orange-600"/>
    <h2 className="text-xl font-black text-neutral-800">Informe agregado de riesgo psicosocial</h2>
   </div>
   {!reportReady?<div className="mt-5 rounded-xl bg-orange-50 p-5 text-sm leading-7 text-neutral-700">
    Los resultados permanecen ocultos hasta que la campaña esté cerrada y tenga al menos
    10 cuestionarios completos. El umbral de 10 es una regla de privacidad de FactoRH,
    no un requisito de la NOM-035.
   </div>:<>
    {!enoughResponses&&<p className="mt-5 rounded-xl bg-red-50 p-5 text-sm font-bold leading-7 text-red-800">
     La campaña no alcanzó su objetivo de {campaign.eligible_population} cuestionarios.
     Estas cifras son descriptivas e incompletas; no deben presentarse como
     evaluación normativa terminada ni como muestra representativa acreditada.
    </p>}
    <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-xs leading-6 text-neutral-700">
     Los niveles de riesgo que aparecen abajo se calcularon sobre cada cuestionario
     y se acumularon sin almacenar resultados individuales. La media aritmética se
     presenta solo como información descriptiva: no se reclasifica como si fuera un
     cuestionario individual ni sustituye un análisis de intervención.
    </div>
    {total&&<div className="mt-5"><h3 className="mb-3 font-black text-neutral-800">
     Distribución general de niveles de riesgo</h3><MetricCard group={total}/></div>}
    <div className="mt-7"><h3 className="text-lg font-black text-neutral-800">Categorías</h3>
     <div className="mt-4 grid gap-4 lg:grid-cols-2">
      {categories.map(g=><MetricCard key={g.metric_name} group={g}/>)}
     </div>
    </div>
    <div className="mt-7"><h3 className="text-lg font-black text-neutral-800">Dominios</h3>
     <div className="mt-4 grid gap-4 lg:grid-cols-2">
      {domains.map(g=><MetricCard key={g.metric_name} group={g}/>)}
     </div>
    </div>
   </>}
   <p className="mt-6 text-xs leading-6 text-neutral-500">
    El informe técnico final deberá incorporar metodología, características de la
    muestra o censo, hallazgos, análisis y medidas de intervención. Esta pantalla
    todavía no es una certificación ni una validación externa de cumplimiento.
   </p>
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <details><summary className="cursor-pointer text-lg font-black text-neutral-800">
    Ver banco aplicado ({nQuestions} preguntas)</summary>
    <div className="mt-5 divide-y divide-neutral-100">
     {(itemsR.data||[]).map(q=><div key={q.position} className="py-3 text-sm leading-6 text-neutral-700">
      <strong className="text-orange-600">{q.position}. </strong>{q.prompt}
      {q.conditional_on&&<span className="ml-2 text-xs text-neutral-500">
       ({q.conditional_on==="clients"?"Condicional: atención a clientes":"Condicional: supervisión"})
      </span>}
     </div>)}
    </div>
   </details>
  </section>
  <section className="rounded-2xl border border-neutral-200 bg-white p-6">
    <h2 className="text-lg font-black text-neutral-900">Informes y acciones de seguimiento</h2>
    <p className="mt-2 text-sm leading-6 text-neutral-600">
     Consulta el informe ejecutivo o técnico de la campaña y vincula medidas con responsables y fechas.
    </p>
    <div className="mt-4 flex flex-wrap gap-3">
     <Link href={"/protected/nom035/riesgos/"+campaignId+"/informe"}
      className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white">
      Informe ejecutivo / técnico · PDF y Word
     </Link>
     <Link href={"/protected/nom035/"+campaign.center_id+"/intervenciones"}
      className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-black text-neutral-800">
      Programa de intervención
     </Link>
    </div>
   </section>
  {user.role==="super_admin"&&<RiskInviteManager campaignId={campaignId} open={campaign.status==="open"}/>}
 </div>;
}
