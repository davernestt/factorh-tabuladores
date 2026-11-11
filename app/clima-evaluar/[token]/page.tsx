import {Suspense} from "react";
import {notFound} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import {climaHash} from "@/lib/clima/invitations";
import ClimaPublicForm,{type ClimaQuestion} from "./clima-public-form";
export default function ClimaParticipantPage(props:{params:Promise<{token:string}>}){
 return <Suspense fallback={<main className="min-h-screen bg-neutral-100 p-8 text-center">Cargando cuestionario...</main>}><Content {...props}/></Suspense>;
}
async function Content({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))notFound();
 const db=createAdminClient();
 const {data:invite}=await db.from("clima_invites").select("campaign_id,status")
  .eq("token_hash",climaHash(token)).maybeSingle();
 if(!invite)notFound();
 if(invite.status==="completed")return <main className="min-h-screen bg-neutral-100 p-8">
  <section className="mx-auto mt-12 max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
   <h1 className="text-2xl font-black text-neutral-800">Gracias por participar</h1>
   <p className="mt-3 text-neutral-600">Tu cuestionario ya fue registrado. Este enlace es de un solo uso.</p>
  </section>
 </main>;
 const {data:campaign}=await db.from("clima_campaigns")
  .select("id,title,status,variant,module_code,organization_id").eq("id",invite.campaign_id).maybeSingle();
 if(!campaign||campaign.status!=="open"||invite.status!=="pending")return <main className="min-h-screen bg-neutral-100 p-8 text-center text-neutral-700">Esta encuesta ya no está disponible. Consulta a Recursos Humanos.</main>;
 const [questionsR,orgR,instrumentR]=await Promise.all([
  db.from("clima_questions").select("position,prompt,response_type,dimension_name")
   .eq("campaign_id",campaign.id).order("position"),
  db.from("organizations").select("name").eq("id",campaign.organization_id).maybeSingle(),
  campaign.module_code?db.from("c3_instruments").select("name")
   .eq("code",campaign.module_code).maybeSingle():Promise.resolve({data:null,error:null})
 ]);
 const questions=(questionsR.data||[]) as ClimaQuestion[];
 if(questionsR.error||questions.length<8)return <main className="p-8">No se pudo cargar el cuestionario completo.</main>;
 const label=campaign.variant==="esencial"?"C3 Esencial":instrumentR.data?.name||"Módulo especializado";
 return <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:py-12">
  <div className="mx-auto max-w-4xl">
   <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">FactoRH · {label}</p>
    <h1 className="mt-3 text-2xl font-black text-neutral-800">{campaign.title}</h1>
    <p className="mt-2 text-sm text-neutral-600">{orgR.data?.name||"Organización"} · {questions.length} preguntas</p>
    <p className="mt-4 text-sm leading-7 text-neutral-600">
     Tu participación es voluntaria y confidencial. Tus respuestas solo se publicarán como resultados agrupados cuando participen al menos cinco personas y se cierre la campaña. No incluyas nombres ni información que identifique a personas en los comentarios abiertos.
    </p>
   </header>
   <ClimaPublicForm token={token} questions={questions}/>
  </div>
 </main>;
}
