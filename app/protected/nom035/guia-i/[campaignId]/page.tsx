import Link from "next/link";
import {Suspense} from "react";
import {notFound,redirect} from "next/navigation";
import {ClipboardCheck,Users,LockKeyhole} from "lucide-react";
import {getCurrentAppUser} from "@/lib/app-auth";
import {hasNom035Subscription,requireNom035Organization} from "@/lib/nom035/access";
import {createAdminClient} from "@/lib/supabase/admin";
import {isGuide1Uuid} from "@/lib/nom035/guide1-invitations";
import {updateGuide1CampaignStatus} from "../actions";
import Guide1InviteManager from "./invite-manager";

type Props={params:Promise<{campaignId:string}>};
export default function Nom035Guide1Campaign(props:Props){
 return <Suspense fallback={<div className="rounded-3xl bg-white p-8">Preparando campaña de Guía I...</div>}>
  <Content {...props}/>
 </Suspense>;
}
async function Content({params}:Props){
 const user=await getCurrentAppUser();
 if(!user||!["super_admin","client"].includes(user.role))redirect("/auth/login");
 if(!await hasNom035Subscription(user))redirect("/protected/psicometrias");
 const {campaignId}=await params;
 if(!isGuide1Uuid(campaignId))notFound();
 const db=createAdminClient();
 const [campaignR,linksR]=await Promise.all([
  db.from("nom035_guide1_campaigns").select(
   "id,center_id,name,eligible_population,coverage_mode,identification_basis,status,referral_contact,referral_instructions,coordinator_confirmed,completed_count,exposure_count,referral_count,created_at"
  ).eq("id",campaignId).maybeSingle(),
  db.from("nom035_guide1_invites").select("id",{head:true,count:"exact"}).eq("campaign_id",campaignId)
 ]);
 if(campaignR.error||!campaignR.data)notFound();
 if(linksR.error)return <p className="p-8 text-red-700">No se pudo consultar la campaña: {linksR.error.message}</p>;
 const c=campaignR.data;
 const {data:center,error:centerError}=await db.from("nom035_work_centers")
  .select("id,name,organization_id,worker_count").eq("id",c.center_id).maybeSingle();
 if(centerError||!center)notFound();
 requireNom035Organization(user,center.organization_id);
 const {data:organization}=await db.from("organizations")
  .select("name").eq("id",center.organization_id).maybeSingle();
 const invites=linksR.count||0;
 const privacyReady=c.status==="closed"&&c.completed_count>=10;
 const coverage=c.coverage_mode==="all"?"Toda la plantilla":"Trabajadores previamente identificados";
 return <div className="space-y-7">
  <Link href={"/protected/nom035/"+center.id+"/guia-i"}
   className="text-sm font-bold text-orange-600 hover:text-orange-700">← Campañas de Guía I del centro</Link>
  <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <p className="text-xs font-black uppercase tracking-[.17em] text-orange-600">
    {organization?.name||"Empresa"} · {center.name}
   </p>
   <h1 className="mt-3 text-3xl font-black text-neutral-800">{c.name}</h1>
   <p className="mt-3 text-sm leading-7 text-neutral-600">
    Guía de Referencia I · Tamizaje inicial de acontecimientos traumáticos severos.
    No equivale a evaluación clínica ni acredita por sí solo el cumplimiento del numeral 5.5.
   </p>
   <div className="mt-5 flex flex-wrap items-center gap-3">
    <span className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-700">
     {c.status==="draft"?"Borrador":c.status==="open"?"Aplicación abierta":c.status==="closed"?"Campaña cerrada":"Cancelada"}
    </span>
    {user.role==="super_admin"&&(c.status==="draft"||c.status==="open")&&<form action={updateGuide1CampaignStatus}>
      <input type="hidden" name="campaign_id" value={c.id}/>
      <input type="hidden" name="next" value={c.status==="draft"?"open":"closed"}/>
      <button type="submit" className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700">
       {c.status==="draft"?"Abrir aplicación":"Cerrar aplicación"}
      </button>
     </form>}
   </div>
  </header>
  <section className="grid gap-4 sm:grid-cols-3">
   {[
    {label:"Población objetivo",value:c.eligible_population,Icon:Users},
    {label:"Ligas generadas",value:invites,Icon:ClipboardCheck},
    {label:"Cuestionarios completos",value:c.completed_count,Icon:LockKeyhole}
   ].map(a=><div key={a.label} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
    <a.Icon className="h-5 w-5 text-orange-600"/>
    <p className="mt-3 text-3xl font-black tabular-nums text-neutral-800">{a.value}</p>
    <p className="mt-1 text-sm text-neutral-600">{a.label}</p>
   </div>)}
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-xl font-black text-neutral-800">Modalidad y servicio responsable</h2>
   <p className="mt-3 text-sm leading-6 text-neutral-700"><strong>Aplicación:</strong> {coverage}</p>
   {c.identification_basis&&<p className="mt-2 text-sm leading-6 text-neutral-600">
    <strong>Antecedente documental:</strong> {c.identification_basis}</p>}
   <p className="mt-3 text-sm leading-6 text-neutral-700">
    <strong>Servicio de canalización:</strong> {c.referral_contact}
   </p>
   <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-600">
    {c.referral_instructions}
   </p>
   <p className="mt-4 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-900">
    El registro individual de canalizaciones y la comprobación de atención clínica deben
    llevarse por los canales confidenciales correspondientes, fuera de este tablero.
    No subas nombres, diagnósticos ni respuestas de personas al expediente general.
   </p>
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <div className="flex items-center gap-2">
    <LockKeyhole className="h-5 w-5 text-orange-600"/>
    <h2 className="text-xl font-black text-neutral-800">Indicadores protegidos</h2>
   </div>
   {!privacyReady?<p className="mt-3 rounded-xl bg-neutral-50 p-5 text-sm leading-7 text-neutral-600">
    Los indicadores de exposición y recomendación de valoración clínica estarán ocultos
    hasta cerrar la campaña y tener por lo menos 10 respuestas. Este umbral es una
    medida adicional de privacidad de FactoRH, no un requisito de la NOM-035.
   </p>:
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
     <div className="rounded-2xl bg-neutral-50 p-5">
      <p className="text-xs font-black uppercase text-neutral-600">Acontecimientos reportados</p>
      <p className="mt-2 text-3xl font-black text-neutral-800">{c.exposure_count}</p>
     </div>
     <div className="rounded-2xl bg-neutral-50 p-5">
      <p className="text-xs font-black uppercase text-neutral-600">Recomendaciones de valoración</p>
      <p className="mt-2 text-3xl font-black text-neutral-800">{c.referral_count}</p>
     </div>
     <p className="text-xs leading-6 text-neutral-500 sm:col-span-2">
      Conteos agrupados, sin identidades, síntomas, diagnóstico ni resultados por persona.
      Estos indicadores no prueban que la canalización nominal se haya realizado.
     </p>
    </div>}
  </section>
  {user.role==="super_admin"&&<Guide1InviteManager campaignId={campaignId} open={c.status==="open"}/>}
 </div>;
}
