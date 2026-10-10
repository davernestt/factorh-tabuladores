import {createHash} from "node:crypto";
import {notFound} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import C3ParticipantForm from "./participant-form";

export const dynamic="force-dynamic";
export default async function C3PublicSurvey({params}:{params:Promise<{token:string}>}){
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
 const {data:selection}=await db.from("c3_campaign_instruments").select("instrument_code").eq("campaign_id",campaign.id);
 const included=(selection||[]).map(x=>x.instrument_code);
 const {data:items,error}=await db.from("c3_items").select("code,instrument_code,dimension_name,pillar,prompt,response_type,position,shared_with").in("instrument_code",included.length?included:["C3"]).eq("active",true).order("position");
 if(error||!items)return <main className="p-6">No se pudo cargar el cuestionario.</main>;
 const used=new Set<string>();
 const visible=items.filter(item=>{const canonical=item.shared_with||item.code;if(used.has(canonical))return false;used.add(canonical);return true;}).sort((a,b)=>a.instrument_code===b.instrument_code?a.position-b.position:a.instrument_code.localeCompare(b.instrument_code));
 return <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:py-12"><div className="mx-auto max-w-3xl">
 <header className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"><div className="text-xs font-black uppercase tracking-[.2em] text-orange-600">FactoRH · C3 PRO</div><h1 className="mt-3 text-2xl font-black text-neutral-800">Encuesta de Clima, Cultura y Compromiso</h1><p className="mt-2 text-neutral-600">{org?.name||"Organización"} · {campaign.name}</p><p className="mt-4 text-sm leading-6 text-neutral-600">Tu participación es voluntaria. Los resultados se analizan en conjunto y no se mostrarán respuestas individuales a la empresa. No incluyas nombres ni datos que identifiquen a personas en las preguntas abiertas.</p></header>
 <C3ParticipantForm token={token} items={visible} />
 </div></main>;
}
