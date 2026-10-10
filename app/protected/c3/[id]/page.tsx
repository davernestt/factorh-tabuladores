import Link from "next/link";
import { notFound,redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { changeC3CampaignStatus } from "../actions";
import InviteGenerator from "./invite-generator";

export const dynamic = "force-dynamic";
export default async function C3CampaignDetail({params}:{params:Promise<{id:string}>}){
  const user=await getCurrentAppUser();if(!user||user.role==="client")redirect("/auth/login");
  const {id}=await params;const db=createAdminClient();
  const [c,invites,orgs,answers]=await Promise.all([
    db.from("c3_campaigns").select("*").eq("id",id).maybeSingle(),
    db.from("c3_invites").select("id,segment,status").eq("campaign_id",id),
    db.from("organizations").select("id,name"),
    db.from("c3_answers").select("item_code,score,not_applicable,invite_id").in("invite_id",(await db.from("c3_invites").select("id").eq("campaign_id",id)).data?.map(i=>i.id)??[])
  ]);
  if(c.error||!c.data)notFound();
  const campaign=c.data;
  const rows=invites.data||[],completed=rows.filter(r=>r.status==="completed");
  const organization=orgs.data?.find(o=>o.id===campaign.organization_id)?.name||"Empresa";
  // Strictly suppress all survey findings below 5 completed responses.
  const summary=completed.length>=5?(answers.data||[]).filter(a=>a.score!==null&&!a.not_applicable&&a.item_code.startsWith("C3-")&&Number(a.item_code.slice(3))<=52):[];
  const mean=summary.length?summary.reduce((s,r)=>s+Number(r.score),0)/summary.length:null;
  return <div className="space-y-6">
    <Link href="/protected/c3" className="text-sm font-bold text-orange-600">← Campañas C3 PRO</Link>
    <div><div className="text-xs font-bold uppercase tracking-widest text-orange-600">{organization} · Piloto prevalidación</div><h1 className="mt-2 text-3xl font-black text-neutral-800">{campaign.name}</h1><p className="mt-2 text-neutral-600">Solo personal operativo y administrativo. Las respuestas individuales nunca se muestran en el dashboard.</p></div>
    <div className="grid gap-3 sm:grid-cols-3">
      {[[String(campaign.planned_population??"—"),"Población elegible"],[String(rows.length),"Ligas generadas"],[String(completed.length),"Encuestas completadas"]].map(([num,label])=><div key={label} className="rounded-2xl border border-neutral-200 bg-white p-5"><div className="text-3xl font-black">{num}</div><div className="text-sm text-neutral-500">{label}</div></div>)}
    </div>
    <section className="rounded-3xl border border-neutral-200 bg-white p-6">
      <h2 className="text-lg font-black">Estado de campaña: {campaign.status==="draft"?"Borrador":campaign.status==="open"?"Abierta":campaign.status==="closed"?"Cerrada":"Cancelada"}</h2>
      <p className="mt-2 text-sm text-neutral-600">Los enlaces solo permiten contestar cuando la campaña esté abierta. Al cerrarla, se bloquean nuevas respuestas.</p>
      {(campaign.status==="draft"||campaign.status==="open")&&<form action={changeC3CampaignStatus} className="mt-4"><input type="hidden" name="id" value={id}/><input type="hidden" name="status" value={campaign.status==="draft"?"open":"closed"}/><button className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white">{campaign.status==="draft"?"Abrir campaña":"Cerrar campaña"}</button></form>}
    </section>
    <InviteGenerator campaignId={id} disabled={campaign.status!=="open"}/>
    <section className="rounded-3xl border border-neutral-200 bg-white p-6">
      <h2 className="text-xl font-black">Primer indicador agregado (piloto)</h2>
      {mean===null?<p className="mt-3 text-sm text-neutral-600">Los resultados se habilitan a partir de cinco cuestionarios completos. No se publican resultados individuales ni comentarios identificables.</p>:<><p className="mt-4 text-4xl font-black text-neutral-800">{((mean-1)*25).toFixed(1)} <span className="text-lg font-normal text-neutral-500">/100</span></p><p className="mt-2 text-sm text-neutral-500">Promedio descriptivo de respuestas Likert; no es todavía el índice ponderado C3 ni una conclusión psicométrica.</p></>}
    </section>
  </div>;
}
