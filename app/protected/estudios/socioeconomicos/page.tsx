import {Suspense} from "react";
import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {hasStaffPermission} from "@/lib/staff-permissions";
import {createAdminClient} from "@/lib/supabase/admin";
import PilotCreator from "./pilot-creator";
import AssignOperator from "./assign-operator";
import AcceptStudyRequest from "./accept-study-request";

const types:Record<string,{label:string;description:string}>={
 express:{label:"Express",description:"Verificación esencial de información del candidato."},
 esencial:{label:"Esencial",description:"Revisión estructurada de información y documentos."},
 integral:{label:"Integral",description:"Investigación ampliada, visita y evidencias cuando corresponda."},
 ejecutivo:{label:"Ejecutivo",description:"Análisis y validaciones complementarias según el alcance acordado."},
};
const states:Record<string,string>={
 requested:"Solicitud recibida",unassigned:"Por asignar",pending_contact:"Contacto pendiente",
 scheduled:"Agendado",fieldwork:"En aplicación",waiting_info:"Información pendiente",
 verification:"Verificación",review:"Revisión FactoRH",report:"Preparación de informe",
 delivered:"Entregado",cancelled:"Cancelado"
};

export default function SocioeconomicosPage(){
 return <Suspense fallback={<div className="rounded-3xl bg-white p-7 text-sm text-neutral-500">Cargando estudios socioeconómicos...</div>}>
  <SocioeconomicosContent/>
 </Suspense>;
}

async function SocioeconomicosContent(){
 const user=await getCurrentAppUser();
 if(!user)redirect("/auth/login");
 if(!["super_admin","client","ese_operator"].includes(user.role)&&!await hasStaffPermission(user,"studies","view"))redirect("/protected/mi-acceso");
 if(user.role==="ese_operator")redirect("/protected/estudios/tareas");
 const admin=user.role==="super_admin",client=user.role==="client";
 const staffCanView=!client&&await hasStaffPermission(user,"studies","view");
 const staffCanOperate=!client&&await hasStaffPermission(user,"studies","operate");
 const internal=admin||staffCanView;
 const canAssign=admin||staffCanOperate;
 const db=createAdminClient();
 const casesQuery=db.from("ese_cases")
   .select("id,case_name,organization_id,study_type,status,progress,created_at,assigned_to,delivery_status,client_visible,is_demo")
   .order("created_at",{ascending:false}).limit(100);
 const requestsQuery=db.from("ese_service_requests")
   .select("id,organization_id,service_key,quantity,status,created_at,ese_request_subjects(full_name,position_name)")
   .in("service_key",Object.keys(types)).order("created_at",{ascending:false}).limit(100);
 const [casesR,requestsR,organizationsR,workersR]=await Promise.all([
   client?casesQuery.eq("organization_id",user.organizationId!).eq("is_demo",false):
     casesQuery,
   client?requestsQuery.eq("organization_id",user.organizationId!):
     internal?requestsQuery:requestsQuery.limit(0),
   internal?db.from("organizations").select("id,name,active").order("name"):
     Promise.resolve({data:[] as Array<{id:string;name:string;active:boolean}>,error:null}),
   canAssign?db.from("app_users").select("user_id,display_name,email").eq("role","ese_operator").eq("active",true).order("display_name"):
     Promise.resolve({data:[] as Array<{user_id:string;display_name:string|null;email:string}>,error:null})
 ]);
 if(casesR.error||requestsR.error||organizationsR.error||workersR.error)
   return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
     No fue posible cargar los estudios. Verifica tus permisos e inténtalo de nuevo.
   </div>;

 const cases=casesR.data||[],requests=requestsR.data||[];
 const names=new Map((organizationsR.data||[]).map(o=>[o.id,o.name]));
 const conversionEnabled=process.env.FACTORH_ESE_PERSONAL_REQUESTS_ENABLED==="true"&&process.env.FACTORH_ESE_REQUEST_CONVERSION_ENABLED==="true";
 const waitingRequests=requests.filter(r=>r.status==="requested"||r.status==="reviewing");
 const released=cases.filter(c=>c.delivery_status==="released").length;
 const reviewing=cases.filter(c=>["verification","review","report"].includes(c.status)).length;
 return <div className="space-y-7">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <Link href="/protected/estudios" className="text-sm font-semibold text-neutral-500 hover:text-orange-700">← Estudios e Investigaciones</Link>
   {admin&&<span className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">Administración FactoRH</span>}
  </div>
  <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <p className="text-xs font-extrabold uppercase tracking-[.18em] text-orange-600">FactoRH · Módulo independiente</p>
   <h1 className="mt-3 text-3xl font-black text-neutral-900">Estudios Socioeconómicos</h1>
   <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">
    {admin?"Supervisa los estudios Express, Esencial, Integral y Ejecutivo, valida avances, revisa la documentación y controla la entrega de informes PDF y sus complementos.":
     client?"Consulta tus estudios, sigue las etapas de verificación y descarga únicamente los informes autorizados por FactoRH.":
     "Consulta los expedientes asignados a tu usuario y sus avances operativos."}
   </p>
   {admin&&<div className="mt-5 flex flex-wrap gap-2">
     <Link href="/protected/estudios/vistas?perfil=cliente" className="rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-xs font-bold text-orange-700 hover:bg-orange-50">Vista de cliente</Link>
     <Link href="/protected/estudios/vistas?perfil=aplicador" className="rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-xs font-bold text-orange-700 hover:bg-orange-50">Vista de aplicador</Link>
     <Link href="/protected/estudios/vistas?perfil=referencias" className="rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-xs font-bold text-orange-700 hover:bg-orange-50">Vista de referencista</Link>
   </div>}
  </header>
  {admin&&<PilotCreator organizations={(organizationsR.data||[]).filter(o=>o.active).map(o=>({id:o.id,name:o.name}))}/>}
  <div className="grid gap-3 sm:grid-cols-4">
   {([["Expedientes",cases.length],["En revisión",reviewing],["Entregados",released],["Solicitudes pendientes",requests.filter(r=>r.status==="requested").length]] as const)
    .map(([name,value])=><div key={name} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
       <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{name}</p>
       <p className="mt-2 text-3xl font-black tabular-nums text-neutral-900">{value}</p>
     </div>)}
  </div>
  {internal&&<section className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm" aria-label="Bandeja de solicitudes socioeconómicas">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <h2 className="text-xl font-black text-neutral-900">Bandeja de solicitudes recibidas</h2>
    <span className="rounded-lg bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
      {waitingRequests.length} pendiente(s) de atención
    </span>
   </div>
   <p className="mt-2 text-xs leading-6 text-neutral-500">
    Avisos internos persistentes para David y el personal FactoRH autorizado. Esta bandeja no envía todavía mensajes externos.
   </p>
   {waitingRequests.length===0?<p className="mt-5 text-sm text-neutral-500">No hay solicitudes pendientes de atender.</p>:
   <div className="mt-5 divide-y divide-neutral-100">
    {waitingRequests.map(r=><article key={r.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="space-y-1">
       <p className="font-bold text-neutral-900">{names.get(r.organization_id)||"Cliente"}</p>
       <p className="text-sm text-neutral-700">{types[r.service_key]?.label||r.service_key} · {r.ese_request_subjects?.[0]?.full_name||"Solicitud recibida"}</p>
       <p className="text-xs text-neutral-500">Recibida {new Date(r.created_at).toLocaleDateString("es-MX")} · {r.status==="requested"?"Nueva":"En revisión"}</p>
      </div>
      {canAssign?<AcceptStudyRequest requestId={r.id} enabled={conversionEnabled}/>:<span className="text-xs text-neutral-500">Solo consulta</span>}
    </article>)}
   </div>}
  </section>}
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-xl font-black text-neutral-900">Nuestros cuatro tipos de estudio</h2>
   <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    {Object.entries(types).map(([key,item])=><div key={key} className="rounded-2xl bg-neutral-50 p-5">
      <p className="font-black text-neutral-900">{item.label}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{item.description}</p>
      <p className="mt-3 text-xs text-neutral-500">
       {cases.filter(c=>c.study_type===key).length} expediente(s) registrado(s)
      </p>
    </div>)}
   </div>
   {client&&<Link href="/protected/estudios" className="mt-5 inline-flex rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white">
     Solicitar un estudio socioeconómico →
   </Link>}
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <h2 className="text-xl font-black text-neutral-900">Expedientes y seguimiento</h2>
    {admin&&<span className="text-xs text-neutral-500">La publicación requiere tu aprobación final</span>}
   </div>
   {cases.length===0?<p className="mt-5 rounded-xl bg-neutral-50 p-5 text-sm text-neutral-600">Todavía no hay estudios socioeconómicos registrados. Las solicitudes nuevas aparecerán primero en Estudios e Investigaciones.</p>:
    <div className="mt-5 space-y-3">
     {cases.map(c=><article key={c.id} className="rounded-2xl border border-neutral-200 p-5">
       <div className="flex flex-wrap justify-between gap-3">
        <div>
         <p className="font-bold text-neutral-900">{c.case_name}</p>
         <p className="mt-1 text-xs text-neutral-500">
          {types[c.study_type]?.label||c.study_type}{c.is_demo?" · PRUEBA INTERNA":""}
          {internal?` · ${names.get(c.organization_id)||"Empresa"}`:""}
         </p>
        </div>
        <span className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600">
         {states[c.status]||"En seguimiento"}
        </span>
       </div>
       <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">Avance registrado: {c.progress}%</p>
        {internal?<Link href={`/protected/estudios/${c.id}`} className="text-sm font-bold text-orange-700 hover:underline">
          {c.is_demo?"Abrir expediente piloto →":"Revisar y autorizar informe →"}
        </Link>:client&&c.delivery_status==="released"&&c.client_visible?
          <Link href={`/protected/estudios/${c.id}`} className="text-sm font-bold text-orange-700 hover:underline">Descargar informes autorizados →</Link>:
          <span className="text-xs text-neutral-500">Entrega pendiente de autorización</span>}
       </div>
       {canAssign&&c.delivery_status!=="released"&&!["cancelled","delivered"].includes(c.status)&&
        <AssignOperator caseId={c.id} current={c.assigned_to} operators={workersR.data||[]}/>}
      </article>)}
    </div>}
  </section>
  {admin&&<p className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-xs leading-6 text-orange-950">
    Fase piloto: este tablero ya permite visualizar los expedientes y acceder a la revisión y entrega de PDFs. La captura completa de aplicadores, referencias compartidas, GPS y generación automática del informe aún están en desarrollo.
  </p>}
 </div>;
}
