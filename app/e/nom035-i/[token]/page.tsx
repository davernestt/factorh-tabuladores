import {Suspense} from "react";
import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {ShieldCheck,LockKeyhole} from "lucide-react";
import {createAdminClient} from "@/lib/supabase/admin";
import {guide1TokenHash} from "@/lib/nom035/guide1-invitations";
import Guide1PrivateForm from "./guide1-private-form";

export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"Guía I · NOM-035 | FactoRH",
 robots:{index:false,follow:false,noarchive:true}
};
type Props={params:Promise<{token:string}>};
export default function Guide1Survey(props:Props){
 return <Suspense fallback={<main className="min-h-screen bg-neutral-100 p-8">Preparando cuestionario...</main>}>
  <SurveyContent {...props}/>
 </Suspense>;
}
async function SurveyContent({params}:Props){
 const {token}=await params;
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))notFound();
 const db=createAdminClient();
 const {data:invite,error:inviteError}=await db.from("nom035_guide1_invites")
  .select("campaign_id,status").eq("token_hash",guide1TokenHash(token)).maybeSingle();
 if(inviteError||!invite)notFound();
 if(invite.status==="completed")return <main className="min-h-screen bg-neutral-100 p-8">
  <section className="mx-auto mt-12 max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm">
   <h1 className="text-2xl font-black text-neutral-800">Cuestionario ya enviado</h1>
   <p className="mt-3 text-sm leading-7 text-neutral-600">
    Esta liga individual ya fue utilizada. Por confidencialidad, no es posible reabrir
    sus respuestas ni consultar el resultado desde ella.
   </p>
  </section>
 </main>;
 const {data:campaign}=await db.from("nom035_guide1_campaigns")
  .select("id,name,status,center_id,referral_contact,referral_instructions")
  .eq("id",invite.campaign_id).maybeSingle();
 if(!campaign||invite.status!=="pending"||campaign.status!=="open")
  return <main className="min-h-screen bg-neutral-100 p-8 text-center text-neutral-700">
   Esta aplicación ya no está disponible. Contacta al área responsable de tu centro de trabajo.
  </main>;
 const {data:center}=await db.from("nom035_work_centers")
  .select("name,organization_id").eq("id",campaign.center_id).maybeSingle();
 const {data:org}=center?.organization_id?
  await db.from("organizations").select("name").eq("id",center.organization_id).maybeSingle():
  {data:null};
 return <main className="min-h-screen bg-neutral-100 px-4 py-8 text-neutral-800 sm:py-12">
  <div className="mx-auto max-w-4xl">
   <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm sm:p-9">
    <div className="flex items-center gap-2">
     <ShieldCheck className="h-6 w-6 text-orange-600"/>
     <p className="text-xs font-black uppercase tracking-[.17em] text-orange-600">
      FactoRH · Seguridad y salud laboral
     </p>
    </div>
    <h1 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">
     Guía de Referencia I · NOM-035
    </h1>
    <p className="mt-3 text-sm font-bold text-neutral-700">
     {campaign.name} · {center?.name||"Centro de trabajo"}
    </p>
    <p className="mt-1 text-xs text-neutral-500">{org?.name||"Organización"}</p>
    <p className="mt-5 text-sm leading-7 text-neutral-600">
     Esta evaluación de referencia permite identificar si conviene solicitar una
     valoración profesional tras un acontecimiento traumático severo relacionado con
     el trabajo. No sustituye un diagnóstico médico o psicológico.
    </p>
    <div className="mt-5 flex items-start gap-3 rounded-2xl bg-neutral-50 p-4">
     <LockKeyhole className="mt-1 h-5 w-5 shrink-0 text-neutral-600"/>
     <p className="text-xs leading-6 text-neutral-600">
      No se solicitan nombres ni se almacenan respuestas individuales o síntomas.
      El sistema registra la participación y solo acumula indicadores generales.
      Si una liga es entregada de forma identificable, el distribuidor puede saber a
      quién se la entregó. La orientación y la canalización nominal deben gestionarse
      de forma reservada por el servicio autorizado.
     </p>
    </div>
    <p className="mt-4 text-xs font-medium text-neutral-600">
     Servicio designado para orientación: {campaign.referral_contact}
    </p>
   </header>
   <Guide1PrivateForm token={token} contact={campaign.referral_contact}
    instructions={campaign.referral_instructions}/>
  </div>
 </main>;
}
