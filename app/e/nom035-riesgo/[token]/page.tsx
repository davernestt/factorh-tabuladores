import {Suspense} from "react";
import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {ShieldCheck,LockKeyhole} from "lucide-react";
import {createAdminClient} from "@/lib/supabase/admin";
import {nom035RiskHash} from "@/lib/nom035/risk-invitations";
import type {Nom035Guide,Nom035Question} from "@/lib/nom035/official-bank";
import Nom035RiskSurvey from "./risk-survey-form";

// Session and route params already make this page request-scoped.
export const metadata:Metadata={title:"Evaluación NOM-035 · FactoRH",
 robots:{index:false,follow:false,noarchive:true}};
type Props={params:Promise<{token:string}>};
export default function RiskQuestionnaire(props:Props){
 return <Suspense fallback={<main className="min-h-screen bg-neutral-100 p-8">Cargando evaluación NOM-035...</main>}>
  <Content {...props}/>
 </Suspense>;
}
async function Content({params}:Props){
 const {token}=await params;
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))notFound();
 const db=createAdminClient();
 const {data:invite}=await db.from("nom035_risk_invites")
  .select("campaign_id,status").eq("token_hash",nom035RiskHash(token)).maybeSingle();
 if(!invite)notFound();
 if(invite.status==="completed")return <main className="min-h-screen bg-neutral-100 p-8">
  <section className="mx-auto mt-12 max-w-xl rounded-3xl bg-white p-8 text-center">
   <h1 className="text-2xl font-black text-neutral-800">Esta evaluación ya fue enviada</h1>
   <p className="mt-3 text-sm leading-7 text-neutral-600">
    Gracias por participar. Cada liga se puede utilizar una sola vez.
   </p>
  </section>
 </main>;
 const {data:campaign}=await db.from("nom035_risk_campaigns")
  .select("id,center_id,guide,title,status,bank_version").eq("id",invite.campaign_id).maybeSingle();
 if(invite.status!=="pending"||!campaign||campaign.status!=="open")
  return <main className="min-h-screen bg-neutral-100 p-8 text-center">
   Esta encuesta ya no está disponible. Consulta al responsable del centro de trabajo.
  </main>;
 const [itemsR,centerR]=await Promise.all([
  db.from("nom035_risk_items").select("position,prompt,conditional_on")
   .eq("campaign_id",campaign.id).order("position"),
  db.from("nom035_work_centers").select("name,organization_id")
   .eq("id",campaign.center_id).maybeSingle()
 ]);
 const items=(itemsR.data||[]) as Array<{position:number;prompt:string;conditional_on:string|null}>;
 if(itemsR.error||items.length!==(campaign.guide==="II"?46:72))
  return <main className="p-8">No fue posible cargar el cuestionario completo.</main>;
 const {data:org}=centerR.data?await db.from("organizations").select("name")
  .eq("id",centerR.data.organization_id).maybeSingle():{data:null};
 const questions=items.map(i=>({
  position:i.position,prompt:i.prompt,conditional:i.conditional_on as Nom035Question["conditional"]
 }));
 return <main className="min-h-screen bg-neutral-100 px-4 py-8 text-neutral-800 sm:py-12">
  <div className="mx-auto max-w-4xl">
   <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm sm:p-9">
    <div className="flex items-center gap-2">
     <ShieldCheck className="h-6 w-6 text-orange-600"/>
     <p className="text-xs font-black uppercase tracking-[.17em] text-orange-600">
      FactoRH · NOM-035-STPS-2018
     </p>
    </div>
    <h1 className="mt-4 text-2xl font-black text-neutral-800 sm:text-3xl">
     Guía de Referencia {campaign.guide as Nom035Guide}
    </h1>
    <p className="mt-3 text-sm font-bold text-neutral-700">
     {campaign.title} · {centerR.data?.name||"Centro de trabajo"}
    </p>
    <p className="mt-1 text-xs text-neutral-500">{org?.name||"Organización"}</p>
    <p className="mt-5 text-sm leading-7 text-neutral-600">
     Tu participación permite identificar factores de riesgo psicosocial y, cuando
     corresponde, evaluar el entorno organizacional para promover mejoras.
     Responde considerando las condiciones de tu trabajo durante los últimos dos meses.
    </p>
    <div className="mt-5 flex items-start gap-3 rounded-2xl bg-neutral-50 p-4">
     <LockKeyhole className="mt-1 h-5 w-5 shrink-0 text-neutral-600"/>
     <p className="text-xs leading-6 text-neutral-600">
      La plataforma no solicita tu nombre en este cuestionario ni guarda un
      expediente individual de respuestas. Los administradores únicamente verán
      resultados agrupados después de cerrar la campaña y alcanzar el umbral
      de privacidad. Si la distribución identifica a quién recibió cada liga,
      quien la entregó podría conocer esa asociación, aunque no sus respuestas.
     </p>
    </div>
   </header>
   <Nom035RiskSurvey token={token} guide={campaign.guide as Nom035Guide} questions={questions}/>
  </div>
 </main>;
}
