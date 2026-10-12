import {Suspense} from "react";
import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {hasNom035Subscription,requireNom035Organization} from "@/lib/nom035/access";
import {createAdminClient} from "@/lib/supabase/admin";
import {nom035Guide} from "@/lib/nom035/rules";
import {validRiskId} from "@/lib/nom035/risk-invitations";
import RiskCampaignForm from "./risk-campaign-form";
type Props={params:Promise<{id:string}>};
export default function Nom035RiskCenter(props:Props){
 return <Suspense fallback={<p className="p-8">Preparando Guías II y III...</p>}>
  <Content {...props}/>
 </Suspense>;
}
async function Content({params}:Props){
 const user=await getCurrentAppUser();
 if(!user||!["super_admin","client"].includes(user.role))redirect("/auth/login");
 if(!await hasNom035Subscription(user))redirect("/protected/psicometrias");
 const {id}=await params;
 if(!validRiskId(id))notFound();
 const db=createAdminClient();
 const [centerR,campaignR]=await Promise.all([
  db.from("nom035_work_centers").select("id,name,worker_count,organization_id,active")
   .eq("id",id).eq("active",true).maybeSingle(),
  db.from("nom035_risk_campaigns")
   .select("id,title,guide,status,coverage_mode,eligible_population,completed_count,created_at")
   .eq("center_id",id).order("created_at",{ascending:false})
 ]);
 if(!centerR.data||centerR.error)notFound();
 requireNom035Organization(user,centerR.data.organization_id);
 if(campaignR.error)return <p className="rounded-xl bg-red-50 p-6 text-red-700">{campaignR.error.message}</p>;
 const c=centerR.data,guide=nom035Guide(c.worker_count);
 const {data:org}=await db.from("organizations").select("name")
  .eq("id",c.organization_id).maybeSingle();
 return <div className="space-y-7">
  <Link href={"/protected/nom035/"+id} className="text-sm font-bold text-orange-600">
   ← Volver al expediente NOM-035
  </Link>
  <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">
    {org?.name||"Organización"} · {c.name}
   </p>
   <h1 className="mt-3 text-3xl font-black text-neutral-800">
    {guide==="none"?"Prevención NOM-035":"Diagnóstico normativo · Guía "+guide}
   </h1>
   <p className="mt-3 text-sm leading-7 text-neutral-600">
    Instrumentos de referencia de la NOM-035-STPS-2018 con preguntas originales,
    saltos condicionales y umbrales por categoría y dominio. El cuestionario
    está separado de las evaluaciones de Clima Laboral.
   </p>
   <p className="mt-3 text-xs font-bold text-neutral-500">
    {c.worker_count} trabajadores · {guide==="II"?"Guía II · 46 reactivos":
      guide==="III"?"Guía III · 72 reactivos":"No exige Guía II o III por tamaño"}
   </p>
  </header>
  {guide==="none"?
   <section className="rounded-2xl bg-neutral-50 p-6 text-sm leading-7 text-neutral-700">
    Este centro tiene hasta 15 trabajadores. La obligación general de identificación
    mediante Guía II o III no corresponde a su tamaño. Continúa con el
    expediente preventivo y la Guía I.
   </section>:
   user.role==="super_admin"?<section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
    <h2 className="text-xl font-black text-neutral-800">Nueva aplicación · Guía {guide}</h2>
    <p className="mt-2 text-sm text-neutral-600">
     Selecciona la cobertura y el número de personas antes de abrir la campaña.
     La aplicación se creará primero como borrador.
    </p>
    <div className="mt-6"><RiskCampaignForm centerId={id} workerCount={c.worker_count} guide={guide}/></div>
   </section>:<p className="rounded-xl bg-white p-5 text-sm text-neutral-600">FactoRH administra la creación y apertura de campañas del piloto. Puedes consultar las aplicaciones de tu empresa.</p>}
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-xl font-black text-neutral-800">Campañas registradas</h2>
   {!(campaignR.data||[]).length?<p className="mt-4 text-sm text-neutral-600">
    Aún no existen campañas de Guía II o III para este centro de trabajo.
   </p>:
   <div className="mt-4 divide-y divide-neutral-100">
    {(campaignR.data||[]).map(campaign=><Link key={campaign.id}
     href={"/protected/nom035/riesgos/"+campaign.id}
     className="flex flex-wrap items-center justify-between gap-4 py-4 hover:bg-neutral-50">
     <div>
      <p className="font-black text-neutral-800">{campaign.title}</p>
      <p className="mt-2 text-xs text-neutral-500">
       Guía {campaign.guide} · {campaign.coverage_mode==="census"?"Censo":"Muestra representativa"}
       {" · "+campaign.completed_count+" respuestas"}
       {" · "+campaign.eligible_population+" participantes objetivo"}
      </p>
     </div>
     <span className="rounded-xl bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-700">
      {campaign.status==="draft"?"Borrador":campaign.status==="open"?"Abierta":campaign.status==="closed"?"Cerrada":"Cancelada"}
     </span>
    </Link>)}
   </div>}
  </section>
  <p className="text-xs leading-6 text-neutral-500">
   La validación técnica del algoritmo no constituye una verificación de cumplimiento
   de la STPS. Antes de uso comercial se requiere revisión normativa y pruebas operativas.
  </p>
 </div>;
}
