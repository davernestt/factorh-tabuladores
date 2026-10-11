import Link from "next/link";
import {Suspense} from "react";
import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClimaCampaign} from "./actions";

type Params={searchParams:Promise<{variant?:string}>};
export default function ClimaSurveysIndex(props:Params){
 return <Suspense fallback={<p className="rounded-xl bg-white p-8">Cargando instrumentos...</p>}><Content {...props}/></Suspense>;
}
async function Content({searchParams}:Params){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")redirect("/auth/login");
 const query=await searchParams;
 const variant=query.variant==="module"?"module":"esencial";
 const db=createAdminClient();
 const [orgR,campaignsR,instrumentsR,itemsR]=await Promise.all([
  db.from("organizations").select("id,name").eq("active",true).order("name"),
  db.from("clima_campaigns").select("id,title,variant,module_code,status,organization_id,planned_population,created_at")
   .order("created_at",{ascending:false}),
  db.from("c3_instruments").select("code,name").eq("kind","module").eq("active",true).order("sort_order"),
  db.from("c3_items").select("code,instrument_code,dimension_code,dimension_name,prompt,position,response_type")
   .eq("active",true).order("position")
 ]);
 const error=orgR.error||campaignsR.error||instrumentsR.error||itemsR.error;
 if(error)return <p className="rounded-xl bg-red-50 p-6 text-red-700">Error al consultar el banco: {error.message}</p>;
 const orgMap=new Map((orgR.data||[]).map(o=>[o.id,o.name]));
 const modules=(instrumentsR.data||[]).filter(i=>/^M0[1-8]$/.test(i.code));
 const allItems=itemsR.data||[];
 const base=allItems.filter(i=>i.instrument_code==="C3");
 const dims=[...new Set(base.filter(i=>i.response_type==="likert").map(i=>i.dimension_code))];
 const essential=dims.flatMap(d=>{
  const q=base.filter(i=>i.dimension_code===d&&i.response_type==="likert");
  return [q[0],q[2]].filter(Boolean);
 }).concat(base.filter(i=>["C3-53","C3-54","C3-55"].includes(i.code)));
 const moduleItems=modules.map(m=>({code:m.code,name:m.name,count:allItems.filter(i=>i.instrument_code===m.code).length}));
 const valid=modules.length===8&&essential.length===29&&dims.length===13;
 return <div className="space-y-7">
  <Link href="/protected/clima" className="text-sm font-bold text-orange-600">← Catálogo Clima Laboral</Link>
  <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <p className="text-xs font-black uppercase tracking-[.18em] text-orange-600">FactoRH · Instrumentos independientes</p>
   <h1 className="mt-2 text-3xl font-black text-neutral-800">Encuestas Esencial y especializadas</h1>
   <p className="mt-3 text-sm leading-7 text-neutral-600">Crea una campaña, habilita sus ligas confidenciales y consulta los resultados agrupados al cerrar la medición. Elige un instrumento, no preguntas individuales.</p>
   <div className="mt-5 flex flex-wrap gap-3">
    <Link href="/protected/clima/encuestas?variant=esencial" className={"rounded-xl px-5 py-3 text-sm font-bold "+(variant==="esencial"?"bg-orange-600 text-white":"bg-neutral-100 text-neutral-700")}>C3 Esencial</Link>
    <Link href="/protected/clima/encuestas?variant=module" className={"rounded-xl px-5 py-3 text-sm font-bold "+(variant==="module"?"bg-orange-600 text-white":"bg-neutral-100 text-neutral-700")}>Módulos especializados</Link>
   </div>
  </header>
  <section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <h2 className="text-xl font-black text-neutral-800">{variant==="esencial"?"Crear diagnóstico C3 Esencial":"Crear campaña de módulo especializado"}</h2>
   <p className="mt-2 text-sm leading-6 text-neutral-600">{variant==="esencial"?
    "29 preguntas: 26 afirmaciones (dos por dimensión), eNPS y dos abiertas. Versión preliminar no equivalente al C3 PRO integral.":
    "Selecciona el tema especializado. Cada módulo conserva íntegro su banco de 8 a 16 reactivos."}</p>
   {!valid&&<p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">No se pudo verificar el banco maestro completo. La creación se ha deshabilitado para evitar cuestionarios incompletos.</p>}
   <form action={createClimaCampaign} className="mt-5 space-y-5">
    <input type="hidden" name="variant" value={variant}/>
    <div className="grid gap-4 md:grid-cols-2">
     <label className="text-sm font-bold text-neutral-700">Empresa
      <select name="organization_id" required defaultValue="" className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3">
       <option value="" disabled>Seleccionar empresa</option>
       {(orgR.data||[]).map(org=><option key={org.id} value={org.id}>{org.name}</option>)}
      </select>
     </label>
     <label className="text-sm font-bold text-neutral-700">Participantes elegibles
      <input name="planned_population" type="number" min={1} max={100000} required
       placeholder="Cantidad de colaboradores" className="mt-2 w-full rounded-xl border border-neutral-300 p-3"/>
     </label>
     <label className="text-sm font-bold text-neutral-700 md:col-span-2">Nombre de la campaña
      <input name="name" required minLength={4} maxLength={150}
       placeholder={variant==="esencial"?"Clima Esencial · Octubre":"Diagnóstico de Bienestar · Octubre"}
       className="mt-2 w-full rounded-xl border border-neutral-300 p-3"/>
     </label>
     {variant==="module"&&<label className="text-sm font-bold text-neutral-700 md:col-span-2">Tema especializado
      <select name="module_code" required defaultValue="" className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3">
       <option value="" disabled>Selecciona el módulo a aplicar</option>
       {moduleItems.map(m=><option key={m.code} value={m.code}>{m.name} · {m.count} preguntas</option>)}
      </select>
     </label>}
    </div>
    <p className="rounded-xl bg-neutral-50 p-4 text-xs leading-6 text-neutral-600">
     Las preguntas se copiarán al crear la campaña para mantener idéntica redacción durante toda la aplicación. Los reportes reales requieren el cierre y al menos cinco respuestas completas.
    </p>
    <button type="submit" disabled={!valid}
     className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-40">Crear campaña en borrador →</button>
   </form>
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-xl font-black text-neutral-800">Vista metodológica y banco de preguntas</h2>
   <p className="mt-2 text-sm text-neutral-500">Puedes inspeccionar las afirmaciones antes de aplicar. La selección será automática.</p>
   {variant==="esencial"?
    <details className="mt-4 rounded-xl border border-neutral-200 p-4">
     <summary className="cursor-pointer font-bold text-neutral-800">Ver selección preliminar C3 Esencial ({essential.length} preguntas)</summary>
     <div className="mt-4 space-y-3">{essential.map((q,i)=><p key={q.code} className="border-b border-neutral-100 pb-3 text-sm leading-6"><strong className="text-orange-600">{i+1}. </strong>{q.prompt}</p>)}</div>
    </details>:
    <div className="mt-4 space-y-3">{moduleItems.map(m=><details key={m.code} className="rounded-xl border border-neutral-200 p-4">
     <summary className="cursor-pointer font-bold text-neutral-800">{m.name} ({m.count} reactivos)</summary>
     <div className="mt-4 space-y-3">{allItems.filter(q=>q.instrument_code===m.code).map((q,i)=><p key={q.code} className="border-b border-neutral-100 pb-3 text-sm leading-6"><strong className="text-orange-600">{i+1}. </strong>{q.prompt}</p>)}</div>
    </details>)}</div>}
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-xl font-black text-neutral-800">Campañas creadas</h2>
   {!(campaignsR.data||[]).length?<p className="mt-4 text-sm text-neutral-500">Aún no hay campañas de estos instrumentos.</p>:
    <div className="mt-4 divide-y divide-neutral-100">{(campaignsR.data||[]).map(c=><Link key={c.id} href={"/protected/clima/encuestas/"+c.id}
     className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-neutral-50">
     <div><p className="font-bold text-neutral-800">{c.title}</p>
      <p className="mt-1 text-xs text-neutral-500">{orgMap.get(c.organization_id)||"Empresa"} · {c.variant==="esencial"?"C3 Esencial":moduleItems.find(m=>m.code===c.module_code)?.name||"Módulo"}</p></div>
     <span className="rounded-lg bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-700">{c.status==="draft"?"Borrador":c.status==="open"?"Abierta":c.status==="closed"?"Cerrada":"Cancelada"}</span>
    </Link>)}</div>}
  </section>
 </div>;
}
