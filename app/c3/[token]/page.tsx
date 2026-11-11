import { Suspense } from "react";
import {createHash} from "node:crypto";
import {notFound} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import C3ParticipantForm from "./participant-form";

export default function C3PublicSurvey(props:{params:Promise<{token:string}>}) {
  return <Suspense fallback={<main className="min-h-screen bg-neutral-100 p-8 text-center">Cargando encuesta C3 PRO...</main>}><C3PublicSurveyContent {...props}/></Suspense>;
}
async function C3PublicSurveyContent({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))notFound();
 const hash=createHash("sha256").update(token).digest("hex");
 const db=createAdminClient();
 const {data:invite}=await db.from("c3_invites").select("id,status,segment,campaign_id").eq("token_hash",hash).maybeSingle();
 if(!invite)notFound();
 if(invite.status==="completed")return <main className="min-h-screen bg-neutral-100 p-6"><section className="mx-auto mt-16 max-w-xl rounded-3xl bg-white p-8 text-center shadow"><h1 className="text-2xl font-black text-neutral-800">Gracias por participar</h1><p className="mt-3 text-neutral-600">Tu respuesta ya fue registrada. Este enlace es de un solo uso.</p></section></main>;
 const {data:campaign}=await db.from("c3_campaigns").select("id,status,name,organization_id").eq("id",invite.campaign_id).maybeSingle();
 if(!campaign||campaign.status!=="open"||invite.status!=="pending")return <main className="min-h-screen bg-neutral-100 p-6"><section className="mx-auto mt-16 max-w-xl rounded-3xl bg-white p-8 text-center"><h1 className="text-xl font-bold">La encuesta no está disponible</h1><p className="mt-2 text-neutral-600">Consulta con Recursos Humanos si la campaña continúa abierta.</p></section></main>;
 const {data:org}=await db.from("organizations").select("name").eq("id",campaign.organization_id).maybeSingle();
 const {data:items,error}=await db.from("c3_campaign_questions")
   .select("item_code,instrument_code,dimension_name,pillar,prompt,response_type,position")
   .eq("campaign_id",campaign.id).order("position");
 if(error||!items||items.length===0)return <main className="p-6">No se pudo cargar el cuestionario.</main>;
 // Snapshot guarantees identical item wording, ordering and scales throughout the campaign.
 const visible=items.map(item=>({
   code:item.item_code,instrument_code:item.instrument_code,
   dimension_name:item.dimension_name,pillar:item.pillar,prompt:item.prompt,
   response_type:item.response_type,position:item.position
 }));
 return <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:py-12"><div className="mx-auto max-w-3xl">
 <header className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"><div className="text-xs font-black uppercase tracking-[.2em] text-orange-600">FactoRH · C3 PRO</div><h1 className="mt-3 text-2xl font-black text-neutral-800">Encuesta de Clima, Cultura y Compromiso</h1><p className="mt-2 text-neutral-600">{org?.name||"Organización"} · {campaign.name}</p><p className="mt-4 text-sm leading-6 text-neutral-600">Tu participación es voluntaria. Los resultados se analizan en conjunto y no se mostrarán respuestas individuales a la empresa. No incluyas nombres ni datos que identifiquen a personas en las preguntas abiertas.</p></header>
 <C3ParticipantForm token={token} items={visible} />
 </div></main>;
}
