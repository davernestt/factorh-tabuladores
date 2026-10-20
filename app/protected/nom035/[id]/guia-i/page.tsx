import Link from "next/link";
import {Suspense} from "react";
import {notFound,redirect} from "next/navigation";
import {ShieldCheck,ArrowLeft} from "lucide-react";
import {getCurrentAppUser} from "@/lib/app-auth";
import {hasStaffPermission} from "@/lib/staff-permissions";
import {hasNom035Subscription,requireNom035Organization} from "@/lib/nom035/access";
import {createAdminClient} from "@/lib/supabase/admin";
import {isGuide1Uuid} from "@/lib/nom035/guide1-invitations";
import Guide1CampaignCreateForm from "./campaign-form";

type Props={params:Promise<{id:string}>};
export default function Guide1ByCenter(props:Props){
 return <Suspense fallback={<div className="rounded-3xl bg-white p-8">Cargando Guía I...</div>}>
  <Content {...props}/>
 </Suspense>;
}
async function Content({params}:Props){
 const user=await getCurrentAppUser();
 if(!user||!(["super_admin","client"].includes(user.role)||await hasStaffPermission(user,"nom035","view")))redirect("/protected/mi-acceso");
 if(!await hasNom035Subscription(user))redirect("/protected/psicometrias");
 const {id}=await params;
 if(!isGuide1Uuid(id))notFound();
 const db=createAdminClient();
 const [centerR, campaignsR]=await Promise.all([
  db.from("nom035_work_centers").select("id,organization_id,name,worker_count,active").eq("id",id).eq("active",true).maybeSingle(),
  db.from("nom035_guide1_campaigns")
   .select("id,name,status,eligible_population,coverage_mode,completed_count,created_at")
   .eq("center_id",id).order("created_at",{ascending:false})
 ]);
 if(centerR.error||!centerR.data)notFound();
 requireNom035Organization(user,centerR.data.organization_id);
 if(campaignsR.error)return <div className="p-8 text-red-700">Error al cargar campañas: {campaignsR.error.message}</div>;
 const center=centerR.data;
 const {data:org}=await db.from("organizations").select("name")
  .eq("id",center.organization_id).maybeSingle();
 const campaigns=campaignsR.data||[];
 return <div className="space-y-7">
  <Link href={"/protected/nom035/"+id}
   className="inline-flex items-center gap-2 text-sm font-bold text-orange-600">
   <ArrowLeft className="h-4 w-4"/>Volver al expediente del centro
  </Link>
  <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <div className="flex items-center gap-3"><ShieldCheck className="h-7 w-7 text-orange-600"/>
    <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">
     NOM-035 · Guía de Referencia I
    </p>
   </div>
   <h1 className="mt-4 text-3xl font-black text-neutral-800">
    Identificación de acontecimientos traumáticos severos
   </h1>
   <p className="mt-3 text-sm font-bold text-neutral-800">
    {org?.name||"Empresa"} · {center.name}
   </p>
   <p className="mt-3 text-sm leading-7 text-neutral-600">
    Esta guía es un ejemplo de referencia de la NOM-035; su finalidad es apoyar la identificación
    de posibles necesidades de valoración clínica, no emitir diagnósticos. La aplicación y la
    eventual canalización deben realizarse con un protocolo de datos sensibles aprobado.
   </p>
   <div className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm text-neutral-700">
    Plantilla registrada del centro: <strong>{center.worker_count} trabajadores</strong>.
    La Guía I es relevante para todos los tamaños de centro de trabajo; su cobertura
    dependerá de la información confiable de exposición disponible.
   </div>
  </header>
  {user.role==="super_admin"&&<section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <h2 className="text-xl font-black text-neutral-800">Crear nueva aplicación</h2>
   <p className="mt-2 text-sm leading-6 text-neutral-600">
    Define la cobertura y un canal de atención antes de generar ligas.
    La campaña permanecerá en borrador hasta que tú la abras.
   </p>
   <div className="mt-6"><Guide1CampaignCreateForm centerId={id} workerCount={center.worker_count}/></div>
  </section>}
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-xl font-black text-neutral-800">Aplicaciones de este centro</h2>
   {!campaigns.length?<p className="mt-4 text-sm text-neutral-600">Todavía no hay campañas de Guía I.</p>:
    <div className="mt-4 divide-y divide-neutral-100">
     {campaigns.map(c=><Link key={c.id} href={"/protected/nom035/guia-i/"+c.id}
      className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-neutral-50">
      <div><p className="font-black text-neutral-800">{c.name}</p>
       <p className="mt-2 text-xs text-neutral-500">{c.eligible_population} invitados posibles · {c.completed_count} cuestionarios enviados · {c.coverage_mode==="all"?"Todo el centro":"Identificación previa"}</p></div>
      <span className="rounded-xl bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-700">
       {c.status==="open"?"Abierta":c.status==="closed"?"Cerrada":"Borrador"}
      </span>
     </Link>)}
    </div>}
  </section>
 </div>;
}
