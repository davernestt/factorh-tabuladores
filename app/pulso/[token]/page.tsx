import {Suspense} from "react";
import {notFound} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import {pulseHash} from "@/lib/pulse/invitations";
import PulseSurveyForm from "./pulse-survey-form";
export default function PublicPulse(props:{params:Promise<{token:string}>}){
 return <Suspense fallback={<main className="p-8">Cargando Pulso FactoRH...</main>}><Content {...props}/></Suspense>;
}
async function Content({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))notFound();
 const db=createAdminClient();
 const {data:invite}=await db.from("pulse_invites").select("campaign_id,status").eq("token_hash",pulseHash(token)).maybeSingle();
 if(!invite)notFound();
 if(invite.status==="completed")return <main className="min-h-screen bg-neutral-100 p-8"><section className="mx-auto mt-14 max-w-xl rounded-3xl bg-white p-8 text-center"><h1 className="text-2xl font-black">Gracias por participar</h1><p className="mt-2 text-neutral-600">Tu encuesta ya fue enviada. Esta liga es de un solo uso.</p></section></main>;
 const {data:campaign}=await db.from("pulse_campaigns").select("id,name,focus,status,organization_id").eq("id",invite.campaign_id).maybeSingle();
 if(!campaign||campaign.status!=="open"||invite.status!=="pending")return <main className="min-h-screen bg-neutral-100 p-8 text-center">Este pulso ya no está disponible. Consulta a Recursos Humanos.</main>;
 const [questionR,orgR]=await Promise.all([
 db.from("pulse_questions").select("position,prompt,dimension_name").eq("campaign_id",campaign.id).order("position"),
 db.from("organizations").select("name").eq("id",campaign.organization_id).maybeSingle()
 ]);
 if(questionR.error||!questionR.data||questionR.data.length<8||questionR.data.length>12)return <main className="p-8">No se pudo cargar el pulso.</main>;
 return <main className="min-h-screen bg-neutral-100 px-4 py-8"><div className="mx-auto max-w-4xl">
  <header className="rounded-3xl bg-white p-7 shadow-sm">
   <p className="text-xs font-black uppercase tracking-wide text-orange-600">FactoRH · Pulso</p>
   <h1 className="mt-3 text-2xl font-black text-neutral-800">{campaign.name}</h1>
   <p className="mt-2 text-sm text-neutral-600">{orgR.data?.name||"Organización"} · {campaign.focus}</p>
   <p className="mt-4 text-sm leading-7 text-neutral-600">Tu participación es voluntaria y confidencial. Las respuestas se muestran únicamente de forma agrupada cuando hay al menos cinco participantes. No escribas datos personales.</p>
  </header>
  <PulseSurveyForm token={token} questions={questionR.data}/>
 </div></main>;
}
