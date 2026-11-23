import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAppUser } from "@/lib/app-auth";
import { hasStaffPermission } from "@/lib/staff-permissions";
import PrintButton from "./print-button";

type Filters = { empresa?: string; quiz?: string; invitacion?: string };
type Invite = { id:string; organization_id:string; quiz_id:string; quiz_version:number; participant_name:string; participant_email:string|null; created_at:string; max_attempts:number };
type Attempt = { invite_id:string; attempt_number:number; submitted_at:string; result:unknown };
type Feedback = { id?:string; prompt?:string; selected?:string; correct?:string; isCorrect?:boolean; explanation?:string };
const safeResult = (value:unknown):{score:number;passed:boolean;feedback:Feedback[]}=>{
  const v=(value&&typeof value==="object"&&!Array.isArray(value)?value:{}) as Record<string,unknown>;
  return {score:typeof v.score==="number"?v.score:0,passed:v.passed===true,feedback:Array.isArray(v.feedback)?v.feedback as Feedback[]:[]};
};
const fmt=(v:string)=>new Intl.DateTimeFormat("es-MX",{dateStyle:"medium",timeStyle:"short",timeZone:"America/Mexico_City"}).format(new Date(v));
const percent=(n:number,d:number)=>d?Math.round(n/d*100):0;
const isUuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export default function ReportPage(props:{searchParams:Promise<Filters>}) {
  return <Suspense fallback={<p className="p-10">Preparando reporte...</p>}><ReportContent {...props}/></Suspense>;
}

async function ReportContent({searchParams}:{searchParams:Promise<Filters>}) {
  await connection();
  const user=await getCurrentAppUser();
  if(!user) redirect("/auth/login");
  if(user.role!=="super_admin" && !await hasStaffPermission(user,"pdl","reports")) redirect("/protected/mi-acceso");
  const filters=await searchParams;
  const organizationId=isUuid(filters.empresa??"")?filters.empresa!:"";
  const quizId=["cultura","comunicacion","conversaciones","emociones"].includes(filters.quiz??"")?filters.quiz!:"";
  const inviteId=isUuid(filters.invitacion??"")?filters.invitacion!:"";
  const db=createAdminClient();
  const [orgs,quizzes]=await Promise.all([
    db.from("organizations").select("id,name").order("name"),
    db.from("pdl_quiz_catalog").select("quiz_id,version,title,passing_score").order("title")
  ]);
  if(orgs.error||quizzes.error) throw new Error("No se pudo preparar el reporte de PDL");
  let invitesQuery=db.from("pdl_quiz_invites").select("id,organization_id,quiz_id,quiz_version,participant_name,participant_email,created_at,max_attempts").order("created_at",{ascending:true}).limit(1000);
  if(organizationId) invitesQuery=invitesQuery.eq("organization_id",organizationId);
  if(quizId) invitesQuery=invitesQuery.eq("quiz_id",quizId);
  if(inviteId) invitesQuery=invitesQuery.eq("id",inviteId);
  const invitesResult=await invitesQuery;
  if(invitesResult.error) throw new Error("No se pudieron recuperar las invitaciones");
  const invites=(invitesResult.data??[]) as Invite[];
  const ids=invites.map(x=>x.id);
  const attempts:Attempt[]=[];
  // Chunk reads so filtering 1000 invitations does not exceed Supabase URL limits.
  for(let i=0;i<ids.length;i+=75){
    const part=await db.from("pdl_quiz_attempts").select("invite_id,attempt_number,submitted_at,result").in("invite_id",ids.slice(i,i+75)).order("attempt_number",{ascending:true}).limit(1000);
    if(part.error)throw new Error("No se pudieron consultar los resultados");
    attempts.push(...((part.data??[]) as Attempt[]));
  }
  const orgMap=new Map((orgs.data??[]).map(x=>[x.id,x.name]));
  const quizMap=new Map((quizzes.data??[]).map(x=>[x.quiz_id+"_"+x.version,x]));
  const attemptMap=new Map<string,Attempt[]>();
  for(const attempt of attempts) attemptMap.set(attempt.invite_id,[...(attemptMap.get(attempt.invite_id)??[]),attempt]);
  const answered=invites.filter(i=>(attemptMap.get(i.id)??[]).length>0);
  const pending=invites.filter(i=>(attemptMap.get(i.id)??[]).length===0);
  const passed=answered.filter(i=>(attemptMap.get(i.id)??[]).some(a=>safeResult(a.result).passed));
  const bestScores=answered.map(i=>Math.max(...(attemptMap.get(i.id)??[]).map(a=>safeResult(a.result).score)));
  const average=bestScores.length?Math.round(bestScores.reduce((a,b)=>a+b,0)/bestScores.length):0;
  const companyLabel=inviteId&&invites[0]?orgMap.get(invites[0].organization_id)??"Empresa":organizationId?orgMap.get(organizationId)??"Empresa":"Todas las empresas";
  const quizLabel=inviteId&&invites[0]?quizMap.get(invites[0].quiz_id+"_"+invites[0].quiz_version)?.title??invites[0].quiz_id:quizId?(quizzes.data??[]).find(q=>q.quiz_id===quizId)?.title??quizId:"Todos los cuestionarios";
  let itemOptions=new Map<string,Record<string,string>>();
  if(inviteId&&invites.length){
    const inv=invites[0];
    const items=await db.from("pdl_quiz_items").select("position,options").eq("quiz_id",inv.quiz_id).eq("version",inv.quiz_version);
    if(items.error)throw new Error("No se pudo consultar el desglose de respuestas");
    itemOptions=new Map((items.data??[]).map(i=>[String(i.position),Object.fromEntries((Array.isArray(i.options)?i.options:[]).map((o:{value?:string;label?:string})=>[o.value??"",o.label??""]))]));
  }
  const issuedAt=new Intl.DateTimeFormat("es-MX",{dateStyle:"long",timeStyle:"short",timeZone:"America/Mexico_City"}).format(new Date());
  const backUrl="/protected/pdl/quizzes";
  return <main className="mx-auto max-w-6xl space-y-7 bg-white px-5 py-8 text-neutral-900 print:max-w-none print:p-0">
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link href={backUrl} className="font-semibold text-orange-700">← Regresar a quizzes</Link>
      <PrintButton/>
    </div>
    <div className={inviteId?"print:break-after-page print:page-break-after-always space-y-6":"space-y-6"}>
    <header className="border-b-2 border-orange-500 pb-5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-2xl font-black text-neutral-700">Facto<span className="text-orange-600">RH</span> <span className="text-sm font-medium text-neutral-500">Evaluaciones</span></div>
        <span className="text-xs text-neutral-500">CONFIDENCIAL · RECURSOS HUMANOS</span>
      </div>
      <h1 className="mt-5 text-3xl font-black">{inviteId?"Resultado individual del PDL":"Reporte de resultados del PDL"}</h1>
      <p className="mt-2 text-sm text-neutral-600">Empresa: <strong>{companyLabel}</strong> · Cuestionario: <strong>{quizLabel}</strong></p>
      <p className="mt-1 text-xs text-neutral-500">Fecha de emisión: {issuedAt} · Corte de información al momento de generar el reporte</p>
    </header>
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4 print:grid-cols-4">
      {[
        ["Invitaciones",invites.length],
        ["Respondieron",answered.length],
        ["Aprobaron",passed.length],
        ["Promedio mejor intento",average+"/100"]
      ].map(([label,value])=><div key={String(label)} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 print:break-inside-avoid"><p className="text-xs text-neutral-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}
    </section>
    <p className="text-sm text-neutral-700">Participación: <strong>{percent(answered.length,invites.length)}%</strong> · Aprobación entre quienes respondieron: <strong>{percent(passed.length,answered.length)}%</strong> · Pendientes: <strong>{pending.length}</strong>.</p>
    <section className="break-inside-auto">
      <h2 className="mb-3 text-xl font-bold">Resultados por participante</h2>
      <table className="w-full border-collapse text-left text-xs">
        <thead><tr className="border-b-2 border-neutral-300 bg-neutral-100">
          <th className="p-2">Participante</th><th className="p-2">Empresa</th><th className="p-2">Cuestionario</th><th className="p-2">Intentos</th><th className="p-2">Último</th><th className="p-2">Mejor</th><th className="p-2">Estado</th>
        </tr></thead>
        <tbody>{invites.map(inv=>{
          const att=attemptMap.get(inv.id)??[];
          const best=att.length?Math.max(...att.map(a=>safeResult(a.result).score)):null;
          const last=att.length?safeResult(att[att.length-1].result).score:null;
          const ok=att.some(a=>safeResult(a.result).passed);
          return <tr key={inv.id} className="break-inside-avoid border-b border-neutral-200">
            <td className="p-2 font-semibold">{inv.participant_name}</td>
            <td className="p-2">{orgMap.get(inv.organization_id)??"—"}</td>
            <td className="p-2">{quizMap.get(inv.quiz_id+"_"+inv.quiz_version)?.title??inv.quiz_id}</td>
            <td className="p-2">{att.length}/{inv.max_attempts}</td>
            <td className="p-2">{last===null?"—":last+"/100"}</td>
            <td className="p-2">{best===null?"—":best+"/100"}</td>
            <td className="p-2">{!att.length?"Pendiente":ok?"Aprobado":"No aprobado"}</td>
          </tr>;
        })}</tbody>
      </table>
      {!invites.length&&<p className="p-4 text-sm">No hay invitaciones para los filtros seleccionados.</p>}
    </section>
    </div>
    {!inviteId&&<section className="break-inside-avoid">
      <h2 className="mb-3 text-xl font-bold">Resultados por cuestionario</h2>
      <table className="w-full border-collapse text-left text-sm"><thead><tr className="border-b bg-neutral-100"><th className="p-2">Tema</th><th className="p-2">Asignados</th><th className="p-2">Respondieron</th><th className="p-2">Aprobaron</th><th className="p-2">Promedio</th></tr></thead>
      <tbody>{Array.from(new Set(invites.map(i=>i.quiz_id))).map(qid=>{
        const rows=invites.filter(i=>i.quiz_id===qid),done=rows.filter(i=>(attemptMap.get(i.id)??[]).length>0);
        const ok=done.filter(i=>(attemptMap.get(i.id)??[]).some(a=>safeResult(a.result).passed));
        const avg=done.length?Math.round(done.reduce((sum,i)=>sum+Math.max(...(attemptMap.get(i.id)??[]).map(a=>safeResult(a.result).score)),0)/done.length):0;
        return <tr key={qid} className="border-b"><td className="p-2">{quizMap.get(qid+"_1")?.title??qid}</td><td className="p-2">{rows.length}</td><td className="p-2">{done.length}</td><td className="p-2">{ok.length}</td><td className="p-2">{done.length?avg+"/100":"—"}</td></tr>;
      })}</tbody></table>
    </section>}
    {inviteId&&invites.map(inv=><section key={inv.id} className="space-y-6">
      {(attemptMap.get(inv.id)??[]).map(att=>{
        const result=safeResult(att.result);
        const pages=[result.feedback.slice(0,5),result.feedback.slice(5,10)];
        return pages.map((questions,pageNumber)=><article key={att.attempt_number+"-"+pageNumber} className="space-y-4 print:break-before-page print:page-break-before-always print:break-inside-auto">
          <div className="border-b-2 border-orange-500 pb-3 print:break-after-avoid">
            <div className="flex items-center justify-between">
              <strong className="text-lg text-neutral-800">Facto<span className="text-orange-600">RH</span> · Detalle de respuestas</strong>
              <span className="text-xs text-neutral-500">CONFIDENCIAL · PDL</span>
            </div>
            <h2 className="mt-3 text-xl font-bold">{inv.participant_name}</h2>
            <p className="mt-1 text-sm">{orgMap.get(inv.organization_id)??"Empresa"} · {quizMap.get(inv.quiz_id+"_"+inv.quiz_version)?.title??inv.quiz_id}</p>
            <p className="mt-2 text-sm"><strong>Intento {att.attempt_number} · {result.score}/100 · {result.passed?"Aprobado":"No aprobado"}</strong> · {fmt(att.submitted_at)}</p>
            <p className="mt-1 text-xs text-neutral-500">Preguntas {pageNumber*5+1}–{pageNumber*5+questions.length} de {result.feedback.length} · Página {pageNumber+1} de 2 del intento</p>
          </div>
          <div className="space-y-2">
          {questions.map((f,index)=>{
            const position=String(pageNumber*5+index+1);
            const options=itemOptions.get(position)??{};
            return <div key={f.id??position} className="break-inside-avoid rounded-lg border border-neutral-200 p-3 text-sm print:break-inside-avoid print:page-break-inside-avoid">
              <p className="font-semibold">{position}. {f.prompt??"Pregunta"}</p>
              <p className="mt-1">Respuesta del participante: {options[f.selected??""]??f.selected??"—"} <span className={f.isCorrect?"font-semibold text-emerald-700":"font-semibold text-red-700"}>({f.isCorrect?"Correcta":"Incorrecta"})</span></p>
              {!f.isCorrect&&<p className="mt-1">Respuesta correcta: {options[f.correct??""]??f.correct??"—"}</p>}
              {f.explanation&&<p className="mt-1 text-xs text-neutral-600">Explicación: {f.explanation}</p>}
            </div>;
          })}
          </div>
        </article>);
      })}
    </section>)}
    <footer className="mt-8 border-t pt-3 text-xs text-neutral-500">
      Documento generado desde FactoRH Evaluaciones. Los promedios se calculan utilizando la mejor calificación registrada por invitación. El estado «Aprobado» indica que al menos un intento superó el umbral configurado. Uso interno y confidencial.
    </footer>
    <style>{`@page { size: A4 portrait; margin: 15mm; } @media print { html,body { background: white !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; } main { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; } section, article { max-width: 100%; } table { table-layout: auto; width: 100%; } th,td { overflow-wrap: anywhere; } thead { display: table-header-group; } tr { break-inside: avoid; page-break-inside: avoid; } .print\\:break-after-page { break-after: page !important; page-break-after: always !important; } .print\\:break-before-page { break-before: page !important; page-break-before: always !important; } }`}</style>
  </main>;
}
