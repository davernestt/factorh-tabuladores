import {Suspense} from "react";
import Link from "next/link";
import {redirect} from "next/navigation";
import {Building2,ClipboardList,FileCheck2,ShieldCheck,ExternalLink} from "lucide-react";
import {getCurrentAppUser} from "@/lib/app-auth";
import {hasNom035Subscription} from "@/lib/nom035/access";
import {createAdminClient} from "@/lib/supabase/admin";
import {
 NOM035_TIER_LABELS,NOM035_SOURCE,nom035Tier,nom035Guide,
 nom035NextAssessment,nom035Requirements
} from "@/lib/nom035/rules";
import Nom035CenterForm from "./center-form";
import Nom035PilotManager from "./pilot-manager";

export default function Nom035Page(){
 return <Suspense fallback={<p className="rounded-3xl bg-white p-8 text-neutral-600">Cargando módulo NOM-035...</p>}>
  <Nom035Dashboard/>
 </Suspense>;
}
async function Nom035Dashboard(){
 const user=await getCurrentAppUser();
 if(!user||!(user.role==="super_admin"||user.role==="client"&&user.organizationId))
  redirect("/auth/login");
 if(!await hasNom035Subscription(user))redirect("/protected/psicometrias");
 const db=createAdminClient();
 const orgQuery=db.from("organizations").select("id,name").eq("active",true);
 const centerQuery=db.from("nom035_work_centers")
  .select("id,organization_id,name,worker_count,state,municipality,assessment_method,last_assessment_on,active,created_at")
  .eq("active",true);
 const [organizationsR,centersR]=await Promise.all([
  user.role==="client"?orgQuery.eq("id",user.organizationId!):orgQuery.order("name"),
  user.role==="client"?centerQuery.eq("organization_id",user.organizationId!).order("created_at",{ascending:false}):
   centerQuery.order("created_at",{ascending:false})
 ]);
 const scopedIds=(centersR.data||[]).map(center=>center.id);
 const evidenceR=scopedIds.length?
  await db.from("nom035_evidence_progress").select("center_id,status")
   .in("center_id",scopedIds):
  {data:[] as Array<{center_id:string;status:string}>,error:null};
 const error=organizationsR.error||centersR.error||evidenceR.error;
 if(error)return <section className="rounded-3xl border border-red-100 bg-red-50 p-7 text-red-800">
  No se pudo consultar NOM-035: {error.message}
 </section>;
 const organizations=organizationsR.data||[],centers=centersR.data||[];
 const pilotsR=user.role==="super_admin"?
  await db.from("organization_module_subscriptions")
   .select("organization_id,status,starts_on,ends_on").eq("module_key","nom035"):
  {data:[] as Array<{organization_id:string;status:string;starts_on:string|null;ends_on:string|null}>,error:null};
 const orgMap=new Map(organizations.map(o=>[o.id,o.name]));
 const evidences=(evidenceR.data||[]).filter(e=>e.status==="documented");
 const documentedCount=new Map<string,number>();
 for(const e of evidences)documentedCount.set(e.center_id,(documentedCount.get(e.center_id)||0)+1);
 const count=(tier:"small"|"medium"|"large")=>centers.filter(c=>nom035Tier(c.worker_count)===tier).length;
 const dateString=(d:string|null)=>d?d.split("-").reverse().join("/"):"Sin registro";
 return <div className="space-y-7">
  <Link href="/protected/evaluaciones" className="text-sm font-bold text-orange-600 hover:text-orange-700">
   ← Centro de evaluaciones
  </Link>
  <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm sm:p-9">
   <p className="text-xs font-black uppercase tracking-[.2em] text-orange-600">FactoRH · Seguridad y salud laboral</p>
   <h1 className="mt-3 text-3xl font-black text-neutral-800 sm:text-4xl">NOM-035 · Centros de trabajo</h1>
   <p className="mt-4 max-w-4xl text-sm leading-7 text-neutral-600">
    Módulo independiente de Clima Laboral. Identifica el tramo normativo de cada centro, organiza
    obligaciones y registra referencias documentales para dar seguimiento a la implementación.
   </p>
   <div className="mt-5 flex flex-wrap gap-3">
    {user.role==="super_admin"&&<>
      <Link href="/protected/nom035/demo"
       className="inline-flex items-center rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white hover:bg-orange-700">
       Ver demostración con respuestas virtuales →
      </Link>
      <Link href="/protected/nom035/demo?view=cliente"
       className="inline-flex items-center rounded-xl border border-orange-200 bg-white px-5 py-3 text-sm font-bold text-orange-700">
       Previsualizar acceso de cliente
      </Link>
      <Link href="/protected/nom035/pilotos"
       className="inline-flex items-center rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-800">
       Administrar pilotos de clientes
      </Link>
    </>}
    <a href={NOM035_SOURCE} target="_blank" rel="noopener noreferrer"
     className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">
     Consultar NOM-035 en el Diario Oficial <ExternalLink className="h-4 w-4"/>
    </a>
    <span className="rounded-xl bg-neutral-100 px-4 py-3 text-xs font-bold text-neutral-600">
     Piloto controlado · Evaluación y expediente
    </span>
   </div>
  </header>

  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
   {[
    {number:centers.length,label:"Centros registrados",Icon:Building2},
    {number:count("small"),label:"Hasta 15 trabajadores",Icon:ShieldCheck},
    {number:count("medium"),label:"De 16 a 50",Icon:ClipboardList},
    {number:count("large"),label:"Más de 50",Icon:FileCheck2}
   ].map(c=><div key={c.label} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
    <c.Icon className="h-5 w-5 text-orange-600"/>
    <p className="mt-4 text-3xl font-black tabular-nums text-neutral-800">{c.number}</p>
    <p className="mt-1 text-sm text-neutral-600">{c.label}</p>
   </div>)}
  </section>

  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-xl font-black text-neutral-800">Clasificación normativa por plantilla</h2>
   <p className="mt-2 text-sm leading-7 text-neutral-600">
    El número de trabajadores se calcula por centro de trabajo, no sumando automáticamente todas
    las sucursales de la empresa. Las Guías II y III son instrumentos oficiales de referencia,
    no los únicos métodos permitidos por la norma.
   </p>
   <div className="mt-5 grid gap-3 md:grid-cols-3">
    {[
      ["Hasta 15","Prevención, política, información, atención de eventos traumáticos y mecanismos de quejas."],
      ["16–50","Además: identificación de factores de riesgo para todos los trabajadores (Guía II o método alternativo validado)."],
      ["Más de 50","Además: evaluación del entorno organizacional (Guía III o método alternativo validado); puede proceder muestra representativa."]
    ].map(([band,summary])=><div key={band} className="rounded-2xl bg-neutral-50 p-5">
     <p className="text-lg font-black text-neutral-800">{band}</p>
     <p className="mt-2 text-sm leading-6 text-neutral-600">{summary}</p>
    </div>)}
   </div>
  </section>

  {user.role==="super_admin"&&<Nom035PilotManager organizations={organizations}
    pilots={pilotsR.data||[]}/>}
  {user.role==="super_admin"&&<Nom035CenterForm organizations={organizations}/>}

  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h2 className="text-xl font-black text-neutral-800">Centros y expediente</h2>
     <p className="mt-2 text-sm text-neutral-500">Accede al compendio guiado, las actividades, evidencias y revisiones por centro.</p></div>
    <span className="rounded-xl bg-neutral-100 px-4 py-2 text-xs font-bold text-neutral-600">{centers.length} centros</span>
   </div>
   {!centers.length?<p className="mt-5 rounded-xl bg-neutral-50 p-5 text-sm text-neutral-600">
    Aún no se han registrado centros de trabajo. Empieza por agregar uno y se preparará su expediente administrativo.
   </p>:<div className="mt-5 divide-y divide-neutral-100">
    {centers.map(center=>{
     const t=nom035Tier(center.worker_count);
     const next=nom035NextAssessment(center.last_assessment_on,center.worker_count);
     const tracked=nom035Requirements(center.worker_count).length;
     return <Link key={center.id} href={"/protected/nom035/"+center.id}
      className="flex flex-wrap items-start justify-between gap-4 rounded-xl px-2 py-5 hover:bg-orange-50/50">
      <div className="min-w-0">
       <p className="text-xs font-black uppercase tracking-wide text-orange-600">{orgMap.get(center.organization_id)||"Empresa"}</p>
       <h3 className="mt-1 font-black text-neutral-800">{center.name}</h3>
       <p className="mt-2 text-sm text-neutral-600">{center.municipality}, {center.state} · {center.worker_count} trabajadores</p>
       <p className="mt-2 text-xs text-neutral-500">
        {next?"Próxima revisión orientativa: "+dateString(next):
         center.worker_count<=15?"Sin obligación de Guía II/III por tamaño":"Sin fecha de evaluación anterior registrada"}
       </p>
      </div>
      <div className="text-right">
       <span className="inline-block rounded-lg bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-700">
        {NOM035_TIER_LABELS[t]}
       </span>
       <p className="mt-2 text-xs text-neutral-500">Guía {nom035Guide(center.worker_count)==="none"?"no exigible por tamaño":nom035Guide(center.worker_count)}</p>
       <p className="mt-1 text-xs font-bold text-neutral-600">{documentedCount.get(center.id)||0} de {tracked} referencias registradas</p>
      </div>
     </Link>;
    })}
   </div>}
  </section>
  <p className="text-xs leading-6 text-neutral-500">
   Esta pantalla organiza la evaluación, el informe técnico, las medidas y el expediente documental,
   sin sustituir una evaluación de conformidad por la STPS. La canalización clínica se
   gestiona por medios confidenciales separados y la revisión normativa independiente
   es necesaria antes de emitir informes definitivos.
  </p>
 </div>;
}
