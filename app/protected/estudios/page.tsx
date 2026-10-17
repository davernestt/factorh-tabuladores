import {Suspense} from "react";
import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import RequestForm from "./request-form";
const services=[
 {key:"express",name:"Estudio Express",desc:"Verificaciones esenciales para complementar procesos que requieren agilidad."},
 {key:"esencial",name:"Estudio Esencial",desc:"Revisión estructurada de datos, trayectoria y documentación según el alcance autorizado."},
 {key:"integral",name:"Estudio Integral",desc:"Visita y verificaciones ampliadas con evidencias, cuando estén autorizadas."},
 {key:"ejecutivo",name:"Estudio Ejecutivo",desc:"Profundidad documental y análisis complementario para necesidades especiales."},
 {key:"referencias_laborales",name:"Referencias laborales",desc:"Confirmación de antecedentes laborales por fuentes identificadas."},
 {key:"investigacion_laboral",name:"Investigación laboral",desc:"Verificación ampliada de trayectoria, formación y discrepancias documentables."}
];
const labels:Record<string,string>={requested:"Solicitado",unassigned:"Por asignar",pending_contact:"Contacto pendiente",scheduled:"Agendado",fieldwork:"Visita en proceso",waiting_info:"Información pendiente",verification:"Verificación",review:"Revisión FactoRH",report:"Informe en preparación",delivered:"Entregado",cancelled:"Cancelado"};
export default function EstudiosPage(){return <Suspense fallback={<p className="rounded-2xl bg-white p-7 text-sm">Cargando estudios...</p>}><Content/></Suspense>}
async function Content(){
 const user=await getCurrentAppUser();
 if(!user)redirect("/auth/login");
 if(!["super_admin","client","ese_operator"].includes(user.role))redirect("/protected/evaluaciones");
 if(user.role==="ese_operator")redirect("/protected/estudios/tareas");
 if(user.role==="client"&&user.clientAccessLevel==="collaborator")redirect("/protected/catalogo");
 const db=createAdminClient(), admin=user.role==="super_admin",client=user.role==="client";
 const [casesR,requestsR,orgsR]=await Promise.all([
  (client?db.from("ese_cases").select("id,organization_id,case_name,study_type,status,progress,created_at,delivery_status,client_visible,is_demo").eq("organization_id",user.organizationId!).eq("is_demo",false):
    db.from("ese_cases").select("id,organization_id,case_name,study_type,status,progress,created_at,delivery_status,client_visible,is_demo"))
   .order("created_at",{ascending:false}).limit(100),
  (client?db.from("ese_service_requests").select("id,organization_id,service_key,quantity,status,created_at,ese_request_subjects(full_name,position_name,person_relationship)").eq("organization_id",user.organizationId!):
    db.from("ese_service_requests").select("id,organization_id,service_key,quantity,status,created_at,ese_request_subjects(full_name,position_name,person_relationship)"))
   .order("created_at",{ascending:false}).limit(100),
  admin?db.from("organizations").select("id,name").order("name"):Promise.resolve({data:[],error:null})
 ]);
 if(casesR.error||requestsR.error||orgsR.error)return <div className="rounded-2xl bg-red-50 p-6 text-sm text-red-800">No fue posible consultar los expedientes y solicitudes.</div>;
 const cases=casesR.data||[],requests=requestsR.data||[];
 const orgMap=new Map((orgsR.data||[]).map(o=>[o.id,o.name]));
 const completed=cases.filter(c=>c.delivery_status==="released").length;
 return <div className="space-y-7">
  <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <p className="text-xs font-extrabold uppercase tracking-[.18em] text-orange-600">FactoRH · Estudios e Investigaciones</p>
   <h1 className="mt-3 text-3xl font-black text-neutral-900">{client?"Solicitudes y seguimiento":admin?"Centro de investigaciones":"Mis estudios asignados"}</h1>
   <p className="mt-3 max-w-4xl text-sm leading-7 text-neutral-600">{client?"Solicita el servicio adecuado, da seguimiento a los hitos de tu estudio y descarga los reportes que FactoRH autorice.":admin?"Gestiona solicitudes, estudios, revisión documental y liberación final. Ningún PDF se entrega sin tu autorización.":"Consulta los estudios que te asignen y documenta únicamente tus tareas."}</p>
  </header>
  {admin&&<section className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
    <p className="text-xs font-black uppercase tracking-widest text-orange-600">Exclusivo de superadministración</p>
    <h2 className="mt-2 text-xl font-black text-neutral-900">Vista por perfil · Recorrido de demostración</h2>
    <p className="mt-3 text-sm leading-7 text-neutral-600">Visualiza la experiencia de cliente, aplicador y referencista sin entrar a cuentas de terceros. Las acciones son simuladas, usan datos ficticios y no modifican estudios reales.</p>
    <div className="mt-5 flex flex-wrap gap-3">
      <Link href="/protected/estudios/vistas?perfil=cliente" className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700">Ver como cliente →</Link>
      <Link href="/protected/estudios/vistas?perfil=aplicador" className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50">Ver como aplicador →</Link>
      <Link href="/protected/estudios/vistas?perfil=referencias" className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50">Ver como referencista →</Link>
    </div>
  </section>}
  <section className="grid gap-4 md:grid-cols-2">
    <Link href="/protected/estudios/socioeconomicos"
      className="group flex flex-col justify-between rounded-3xl border border-orange-200 bg-white p-6 shadow-sm transition-colors hover:border-orange-400 hover:bg-orange-50">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Módulo independiente</p>
        <h2 className="mt-2 text-xl font-black text-neutral-900">Estudios Socioeconómicos</h2>
        <p className="mt-3 text-sm leading-7 text-neutral-600">Tablero exclusivo para Express, Esencial, Integral y Ejecutivo. Control de expedientes, avances y entrega autorizada.</p>
      </div>
      <span className="mt-4 text-sm font-bold text-orange-700 group-hover:underline">Abrir módulo de socioeconómicos →</span>
    </Link>
    <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Servicios complementarios</p>
      <h2 className="mt-2 text-xl font-black text-neutral-900">Referencias e Investigaciones Laborales</h2>
      <p className="mt-3 text-sm leading-7 text-neutral-600">Solicitudes y seguimiento de referencias e investigaciones de trayectoria. La verificación crediticia permanece deshabilitada hasta su validación jurídica.</p>
      <a href="#servicios" className="mt-4 inline-flex text-sm font-bold text-orange-700 hover:underline">Ver catálogo y solicitudes →</a>
    </div>
  </section>
  <div className="grid gap-3 sm:grid-cols-3">
   {([["Estudios",cases.length],["En proceso",cases.length-completed],["Entregados",completed]] as const).map(([title,count])=><div key={title} className="rounded-2xl border border-neutral-200 bg-white p-5"><p className="text-xs font-bold uppercase text-neutral-500">{title}</p><p className="mt-2 text-3xl font-black">{count}</p></div>)}
  </div>
  {(admin||client)&&<section id="servicios" className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-xl font-black">Catálogo de servicios</h2>
   <p className="mt-2 text-sm leading-6 text-neutral-600">Las solicitudes requieren confirmación del alcance. La verificación crediticia está deshabilitada hasta concluir su revisión legal.</p>
   <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{services.map(service=><article key={service.key} className="flex flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
    <h3 className="font-black">{service.name}</h3><p className="mt-2 flex-1 text-sm leading-6 text-neutral-600">{service.desc}</p>
    {(client||admin)&&<RequestForm serviceKey={service.key} serviceName={service.name}
      isAdmin={admin} organizations={orgsR.data||[]} liveEnabled={process.env.FACTORH_ESE_PERSONAL_REQUESTS_ENABLED==="true"}/>} 
   </article>)}</div>
   <div className="mt-4 rounded-xl border border-neutral-200 p-4 text-sm text-neutral-500">Consulta de Buró de Crédito — no disponible. Su activación dependerá de revisión jurídica, contratos y autorizaciones específicas.</div>
  </section>}
  {(admin||client)&&<section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-xl font-black">{client?"Mis solicitudes":"Solicitudes recibidas"}</h2>
   {requests.length===0?<p className="mt-4 text-sm text-neutral-500">Todavía no hay solicitudes.</p>:<div className="mt-4 divide-y divide-neutral-100">{requests.map(req=><div key={req.id} className="flex flex-wrap justify-between gap-3 py-4 text-sm"><div><p className="font-bold">{services.find(s=>s.key===req.service_key)?.name||req.service_key} · {req.quantity} servicio(s)</p>
   {req.ese_request_subjects?.length>0&&<p className="mt-2 text-sm font-semibold text-neutral-800">{req.ese_request_subjects[0]?.full_name} · {req.ese_request_subjects[0]?.position_name}</p>}
   {req.ese_request_subjects?.length>0&&<p className="mt-1 text-xs text-neutral-500">{req.ese_request_subjects[0]?.person_relationship==="employee"?"Colaborador actual":"Candidato a ingreso"}</p>}
   <p className="mt-1 text-xs text-neutral-500">{new Date(req.created_at).toLocaleDateString("es-MX")}{admin?` · ${orgMap.get(req.organization_id)||"Empresa"}`:""}</p></div><span className="font-semibold text-neutral-600">{req.status==="requested"?"Por confirmar":req.status}</span></div>)}</div>}
  </section>}
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-xl font-black">{client?"Mis estudios":"Expedientes de estudios"}</h2>
   {cases.length===0?<p className="mt-4 text-sm text-neutral-500">No hay estudios registrados todavía.</p>:<div className="mt-4 space-y-3">{cases.map(c=><article key={c.id} className="rounded-2xl border border-neutral-200 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{c.case_name}</p><p className="mt-1 text-xs text-neutral-500">{c.study_type} · {admin?orgMap.get(c.organization_id)||"Empresa":""}{c.is_demo?" · PRUEBA INTERNA":""}</p></div><span className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-bold">{labels[c.status]||c.status}</span></div>
    <div className="mt-3 text-sm text-neutral-600">Avance operativo: {c.progress}%</div>
    {admin?<Link href={`/protected/estudios/${c.id}`} className="mt-3 inline-flex text-sm font-bold text-orange-700 hover:underline">Revisar expediente y entrega →</Link>:
     c.delivery_status==="released"&&c.client_visible?<Link href={`/protected/estudios/${c.id}`} className="mt-3 inline-flex text-sm font-bold text-orange-700 hover:underline">Ver archivos autorizados →</Link>:
     <p className="mt-3 text-xs text-neutral-500">El informe aparecerá aquí únicamente después de que FactoRH lo libere.</p>}
   </article>)}</div>}
  </section>
  {admin&&<div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-sm leading-6 text-orange-950">En esta fase se habilitaron solicitudes y controles de entrega. Los formularios para aplicadores, captura GPS, referencias compartidas y generación automática del reporte todavía requieren desarrollo y pruebas antes de utilizar datos reales.</div>}
 </div>
}