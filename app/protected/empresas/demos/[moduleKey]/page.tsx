import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {clientServiceDemos} from "@/lib/client-service-demos";
type Params={params:Promise<{moduleKey:string}>};
const mock:Record<string,{
 title:string,description:string,metrics:[string,string][],rows:[string,string,string][]
}>={
 pdl:{title:"Diagnóstico de liderazgo · Vista de muestra",description:"Cómo podría organizarse un programa de autopercepción, evaluación del jefe e interpretación consultiva. Esta vista no calcula diagnósticos reales.",
  metrics:[["Líderes de ejemplo","4"],["Competencias","12"],["Entrevistas realizadas","2"]],
  rows:[["Mariana Ejemplo","Operaciones","Autoevaluación completada"],["Carlos Demostración","Comercial","Retroalimentación del jefe pendiente"],["Sofía Muestra","Administración","Entrevista consultiva pendiente"]]
 },
 climate:{title:"Clima · Cultura · Compromiso · Vista de muestra",description:"Panel ilustrativo de resultados y comparativos departamentales. Los datos son ficticios y no representan conclusiones metodológicas reales.",
  metrics:[["Respuestas ficticias","80"],["Dimensiones ilustrativas","13"],["Departamentos","4"]],
  rows:[["Operaciones","30 participantes","Resultados agregados"],["Comercial","20 participantes","Resultados agregados"],["Administración","15 participantes","Resultados agregados"]]
 },
 studies:{title:"Estudios socioeconómicos · Vista de muestra",description:"Una ilustración del flujo de solicitud, captura documental, entrevistas y entrega de estudios. No registra solicitudes reales.",
  metrics:[["Solicitados","6"],["En investigación","2"],["Entregados","4"]],
  rows:[["Solicitud 001","Integral","Referencias por validar"],["Solicitud 002","Esencial","Investigación terminada"],["Solicitud 003","Ejecutivo","Reporte en revisión"]]
 }
};
export default async function ServiceDemoPreview({params}:Params){
 const user=await getCurrentAppUser();
 if(!user)redirect("/auth/login");
 if(user.role!=="super_admin")redirect("/protected/catalogo");
 const {moduleKey}=await params;
 const config=clientServiceDemos[moduleKey],data=mock[moduleKey];
 if(!config||!data||config.kind!=="preview")notFound();
 return <div className="space-y-6">
  <Link href="/protected/empresas" className="text-sm font-bold text-orange-700">← Volver al Centro de Clientes</Link>
  <header className="rounded-3xl bg-neutral-800 p-7 text-white">
   <p className="text-xs font-extrabold uppercase tracking-[.2em] text-orange-300">FactoRH · Demostración comercial</p>
   <h1 className="mt-3 text-3xl font-black">{data.title}</h1>
   <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-200">{data.description}</p>
  </header>
  <section className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
   <h2 className="font-black text-orange-900">Muestra ficticia — no es un portal cliente activo</h2>
   <p className="mt-2 text-sm leading-6 text-neutral-700">Esta vista está destinada a conversaciones comerciales. No genera ligas, no consume créditos, no procesa expedientes y no ofrece resultados verificables de una empresa real.</p>
  </section>
  <section className="grid gap-4 sm:grid-cols-3">{data.metrics.map(([k,v])=>
   <div key={k} className="rounded-2xl border border-neutral-200 bg-white p-5">
    <p className="text-sm text-neutral-500">{k}</p><p className="mt-2 text-3xl font-black text-neutral-900">{v}</p>
   </div>)}</section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6">
   <h2 className="text-xl font-black">Así podría verse el seguimiento</h2>
   <div className="mt-4 divide-y divide-neutral-100">
    {data.rows.map(([name,detail,status])=><div className="flex flex-wrap items-center justify-between gap-4 py-4" key={name}>
     <div><p className="font-semibold">{name}</p><p className="mt-1 text-xs text-neutral-500">{detail}</p></div>
     <span className="rounded-xl bg-neutral-100 px-3 py-2 text-xs text-neutral-600">{status}</span>
    </div>)}
   </div>
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6">
   <h2 className="text-lg font-black">Alcance ilustrativo de la solución</h2>
   <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-neutral-700">
    {config.includes.map((line,i)=><li key={i}>{line}</li>)}
   </ul>
   <p className="mt-4 text-xs text-neutral-500">El acceso autónomo para clientes de este módulo sigue pendiente de habilitación. La administración puede registrar solicitudes desde la ficha de la empresa.</p>
  </section>
 </div>;
}
