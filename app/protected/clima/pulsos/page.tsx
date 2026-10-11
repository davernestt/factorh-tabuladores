import {Suspense} from "react";
import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {createPulse} from "./actions";
import PulseThemePicker from "./pulse-theme-picker";

export default function PulseIndex(){return <Suspense fallback={<p className="p-8">Cargando Pulsos...</p>}><Content/></Suspense>}
async function Content(){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")redirect("/auth/login");
 const db=createAdminClient();
 const [orgs,campaigns,questions]=await Promise.all([
  db.from("organizations").select("id,name").eq("active",true).order("name"),
  db.from("pulse_campaigns").select("id,name,focus,status,organization_id,planned_population,created_at").order("created_at",{ascending:false}),
  db.from("c3_items").select("code,dimension_code,dimension_name,prompt,position").eq("instrument_code","C3").eq("response_type","likert").eq("active",true).order("position")
 ]);
 const error=orgs.error||campaigns.error||questions.error;
 if(error)return <p className="rounded-xl bg-red-50 p-5 text-red-700">{error.message}</p>;
 const orgMap=new Map((orgs.data||[]).map(o=>[o.id,o.name]));

 return <div className="space-y-7">
  <Link href="/protected/clima" className="text-sm font-bold text-orange-600">← Catálogo de clima laboral</Link>
  <section className="rounded-3xl bg-white p-7 shadow-sm">
   <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">FactoRH · Medición de seguimiento</p>
   <h1 className="mt-2 text-3xl font-black text-neutral-800">Pulso FactoRH</h1>
   <p className="mt-3 text-sm leading-7 text-neutral-600">Encuestas breves y confidenciales de 8 a 12 reactivos. Permiten explorar un tema específico y seguir compromisos sin repetir el diagnóstico integral C3 PRO.</p>
   <p className="mt-2 text-xs font-semibold text-neutral-500">Versión piloto · Reactivos de banco C3 · Sin equivalencia directa con el índice global C3 PRO</p>
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <h2 className="text-xl font-black text-neutral-800">Crear una campaña de pulso</h2>
   <p className="mt-2 text-sm text-neutral-600">Elige un tema de interés. FactoRH seleccionará de 8 a 12 preguntas automáticamente y conservará el cuestionario de la campaña.</p>
   <form action={createPulse} className="mt-5 space-y-5">
    <div className="grid gap-4 md:grid-cols-2">
     <label className="text-sm font-bold text-neutral-700">Empresa<select name="organization_id" required defaultValue="" className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3"><option value="" disabled>Selecciona empresa</option>{(orgs.data||[]).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
     <label className="text-sm font-bold text-neutral-700">Población elegible<input name="population" required type="number" min={1} max={100000} className="mt-2 w-full rounded-xl border border-neutral-300 p-3" placeholder="Número de participantes elegibles"/></label>
     <label className="text-sm font-bold text-neutral-700">Nombre de campaña<input name="name" required minLength={4} maxLength={150} className="mt-2 w-full rounded-xl border border-neutral-300 p-3" placeholder="Pulso de comunicación · Octubre"/></label>
     <label className="text-sm font-bold text-neutral-700">Tema u objetivo<input name="focus" minLength={4} maxLength={150} className="mt-2 w-full rounded-xl border border-neutral-300 p-3" placeholder="Opcional: explica qué cambio quieres verificar"/></label>
    </div>
    <PulseThemePicker questions={questions.data||[]}/>
   </form>
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-xl font-black text-neutral-800">Campañas de pulso</h2>
   {!(campaigns.data||[]).length?<p className="mt-4 text-sm text-neutral-500">Todavía no has creado pulsos. Puedes crear uno de prueba sin abrirlo al personal.</p>:
    <div className="mt-4 divide-y divide-neutral-100">{(campaigns.data||[]).map(c=><Link href={"/protected/clima/pulsos/"+c.id} key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-neutral-50"><div><p className="font-bold text-neutral-800">{c.name}</p><p className="mt-1 text-xs text-neutral-500">{orgMap.get(c.organization_id)||"Empresa"} · {c.focus}</p></div><span className="rounded-lg bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-700">{c.status==="open"?"Abierta":c.status==="closed"?"Cerrada":"Borrador"}</span></Link>)}</div>}
  </section>
 </div>;
}
