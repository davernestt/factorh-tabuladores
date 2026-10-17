import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import {getCurrentAppUser} from "@/lib/app-auth";
import CompanyManager from "../company-manager";
import CompanyAccessPanel from "../company-access-panel";
import CompanyUserRequests from "../company-user-requests";
import {type CreditPlan} from "../company-credit-manager";
import {type ModuleSubscription,type PlatformModule} from "../company-module-manager";
import CompanyServiceOperations from "../company-service-operations";
import CompanyTestSettings from "../company-test-settings";
import CompanyQuoteBuilder from "../company-quote-builder";
import CompanyDetailTabs from "../company-detail-tabs";
type RouteProps={params:Promise<{id:string}>};
const mxn=(amount:number)=>Number(amount).toLocaleString("es-MX",{style:"currency",currency:"MXN"});
const date=(value:string|null|undefined)=>value?new Date(value.includes("T")?value:value+"T12:00:00").toLocaleDateString("es-MX"):"Sin fecha";
const box="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm";
export default async function CompanyDetailPage({params}:RouteProps){
 const user=await getCurrentAppUser();
 if(!user)redirect("/auth/login");
 if(user.role!=="super_admin")redirect("/protected/catalogo");
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))notFound();
 const db=createAdminClient();
 const [orgR,usersR,creditR,modulesR,subsR,remindersR,processesR,accessR,
  templatesR,quotesR,auditR,cyclesR,climateR,c3R,userRequestsR]=await Promise.all([
  db.from("organizations").select("id,name,slug,active,lifecycle_stage,website,phone,commercial_email,notes").eq("id",id).maybeSingle(),
  db.from("app_users").select("user_id,email,display_name,role,client_access_level,active").eq("organization_id",id).order("created_at"),
  db.from("organization_psychometric_credits").select("organization_id,plan_type,plan_name,credits_total,credits_used,valid_from,valid_until,active,trial_single_test_only").eq("organization_id",id).maybeSingle(),
  db.from("platform_modules").select("module_key,name,description,route,client_available").eq("active",true).order("sort_order"),
  db.from("organization_module_subscriptions").select("id,organization_id,module_key,status,plan_name,starts_on,ends_on,requested_on,requested_notes,reminder_days,client_notice,evaluation_limit").eq("organization_id",id),
  db.from("module_expiry_reminders").select("module_key,ends_on,days_remaining").eq("organization_id",id),
  db.from("assessment_processes").select("id,person_id,name,status,created_at").eq("organization_id",id).order("created_at",{ascending:false}).limit(100),
  db.from("organization_assessment_templates").select("organization_id,template_id,enabled,participant_sendable").eq("organization_id",id),
  db.from("assessment_templates").select("id,name,description,organization_id,assessment_type").eq("active",true).order("name"),
  db.from("company_commercial_quotes").select("id,created_at,items,total_amount,discount_amount,subtotal,promo_50,status,notes,expires_on").eq("organization_id",id).order("created_at",{ascending:false}).limit(40),
  db.from("company_service_audit").select("id,occurred_at,module_key,event_type,old_state,new_state").eq("organization_id",id).order("occurred_at",{ascending:false}).limit(100),
  db.from("feedback360_cycles").select("id,status,created_at").eq("organization_id",id),
  db.from("clima_campaigns").select("id,status").eq("organization_id",id),
  db.from("c3_campaigns").select("id,status").eq("organization_id",id),
  db.from("client_user_requests").select("id,requested_count,notes,status,created_at").eq("organization_id",id).order("created_at",{ascending:false}).limit(50)
 ]);
 const firstError=orgR.error||usersR.error||creditR.error||modulesR.error||subsR.error||
  remindersR.error||processesR.error||accessR.error||templatesR.error||
  quotesR.error||auditR.error||cyclesR.error||climateR.error||c3R.error||userRequestsR.error;
 if(firstError)return <div className="rounded-3xl border border-red-200 bg-red-50 p-7 text-red-700">No se pudo cargar el expediente: {firstError.message}. Comprueba que la migración del Centro de Clientes esté aplicada.</div>;
 const org=orgR.data;
 if(!org)notFound();
 const users=usersR.data??[];
 const credit=(creditR.data??null) as CreditPlan|null;
 const modules=(modulesR.data??[]) as PlatformModule[];
 const subscriptions=(subsR.data??[]) as ModuleSubscription[];
 const subMap=new Map(subscriptions.map(s=>[s.module_key,s]));
 const reminder=remindersR.data??[];
 const processes=processesR.data??[];
 const quotes=quotesR.data??[];
 const audit=auditR.data??[];
 const access=accessR.data??[];
 const templates=templatesR.data??[];
 const psych=templates.filter(t=>t.assessment_type?.startsWith("psychometric_")&&access.some(a=>a.template_id===t.id&&a.enabled));
 const group=Array.from(templates.reduce((acc,t)=>{
  const prev=acc.get(t.name)??[];
  prev.push({id:t.id,organization_id:t.organization_id});
  acc.set(t.name,prev);return acc;
 },new Map<string,Array<{id:string;organization_id:string|null}>>())).map(([name,variants])=>({
  name,description:templates.find(t=>t.name===name)?.description??null,variants
 }));
 const processIds=processes.map(p=>p.id);
 const [assignmentsR,peopleR]=await Promise.all([
  processIds.length?db.from("assessment_assignments").select("id,process_id,status").in("process_id",processIds):Promise.resolve({data:[],error:null}),
  processes.length?db.from("people").select("id,first_name,last_name").in("id",[...new Set(processes.map(p=>p.person_id))]):Promise.resolve({data:[],error:null})
 ]);
 if(assignmentsR.error||peopleR.error)return <div className="rounded-2xl bg-red-50 p-6 text-red-700">No se pudo cargar el seguimiento de aplicaciones.</div>;
 const assignments=assignmentsR.data??[];
 const names=new Map((peopleR.data??[]).map(p=>[p.id,`${p.first_name} ${p.last_name??""}`.trim()]));
 const done=assignments.filter(a=>a.status==="completed").length;
 const creditsRemaining=credit?Math.max(0,credit.credits_total-credit.credits_used):0;
 const current=subscriptions.filter(s=>s.status==="active");
 return <div className="space-y-6">
  <Link href="/protected/empresas" className="text-sm font-bold text-orange-600">← Centro de Clientes</Link>
  <header className="rounded-3xl bg-neutral-800 p-7 text-white shadow-sm sm:p-9">
   <p className="text-xs font-bold uppercase tracking-widest text-orange-300">FactoRH · Expediente comercial y operativo</p>
   <h1 className="mt-2 text-3xl font-black sm:text-4xl">{org.name}</h1>
   <div className="mt-4 flex flex-wrap gap-2 text-xs">
    <span className="rounded-lg bg-white/10 px-3 py-2">{org.lifecycle_stage==="prospect"?"Prospecto":org.lifecycle_stage==="inactive"?"Inactiva":"Cliente"}</span>
    <span className="rounded-lg bg-white/10 px-3 py-2">{users.length} usuarios</span>
    <span className="rounded-lg bg-white/10 px-3 py-2">{current.length} licencias activas</span>
    <span className="rounded-lg bg-white/10 px-3 py-2">{subscriptions.filter(s=>s.status==="trial").length} módulos en demo</span>
   </div>
  </header>
  <CompanyDetailTabs
   overview={<div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-4">
     {([["Usuarios",users.length],["Módulos activos",current.length],["Aplicaciones terminadas",done],["Créditos disponibles",creditsRemaining]] as const).map(([k,v])=>
      <div className={box} key={k}><p className="text-xs font-bold text-neutral-500">{k}</p><p className="mt-2 text-3xl font-black text-neutral-900">{v}</p></div>)}
    </div>
    {reminder.length>0&&<section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
     <h2 className="font-black text-amber-900">Seguimiento de renovaciones</h2>
     <div className="mt-3 space-y-2">{reminder.map(r=><div key={r.module_key} className="text-sm text-amber-900">{modules.find(m=>m.module_key===r.module_key)?.name??r.module_key}: {r.days_remaining>=0?`vence en ${r.days_remaining} días`:"vencido"} · {date(r.ends_on)}</div>)}</div>
    </section>}
    <section className={box}>
     <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-black text-neutral-900">Datos de la empresa</h2>
      <CompanyManager organization={org}/>
     </div>
     <div className="mt-4 grid gap-3 text-sm text-neutral-700 md:grid-cols-2">
      <div><strong>Correo:</strong> {org.commercial_email||"Sin registrar"}</div>
      <div><strong>Teléfono:</strong> {org.phone||"Sin registrar"}</div>
      <div><strong>Sitio:</strong> {org.website||"Sin registrar"}</div>
      <div><strong>Etapa:</strong> {org.lifecycle_stage}</div>
      {org.notes&&<div className="md:col-span-2"><strong>Notas comerciales:</strong> {org.notes}</div>}
     </div>
    </section>
    <section className={box}>
     <h2 className="text-xl font-black text-neutral-900">Servicios contratados y en seguimiento</h2>
     <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {modules.map(m=>{const s=subMap.get(m.module_key);return <div key={m.module_key} className="rounded-xl border border-neutral-200 p-4">
       <p className="font-bold text-neutral-800">{m.name}</p>
       <p className="mt-1 text-xs text-neutral-500">{s?`${s.status} · ${s.plan_name||"Sin plan"} · vence ${date(s.ends_on)}`:"No contratado"}</p>
      </div>})}
     </div>
    </section>
   </div>}
   users={<div className="space-y-5"><CompanyAccessPanel organizationId={org.id} organizationName={org.name} organizationSlug={org.slug} users={users}/><CompanyUserRequests organizationId={org.id} requests={userRequestsR.data??[]}/></div>}
   services={<div className="space-y-5">
    <CompanyServiceOperations organizationId={org.id} modules={modules} subscriptions={subscriptions} credit={credit} cycleCount={cyclesR.data?.length??0}/>
    <details className={box}>
     <summary className="cursor-pointer text-lg font-black text-neutral-900">Opciones avanzadas · Psicometrías habilitadas ({psych.length})</summary>
     <p className="mt-2 text-sm text-neutral-600">Selecciona cuáles instrumentos psicométricos podrán aplicar los usuarios de esta empresa.</p>
     <div className="mt-5"><CompanyTestSettings organizationId={org.id} catalog={group} access={access}/></div>
    </details>
   </div>}
   usage={<div className="space-y-5">
    <section className="grid gap-3 sm:grid-cols-4">
     {([
      ["Procesos de evaluación",processes.length],
      ["Pruebas terminadas",done],
      ["Ciclos 360°",cyclesR.data?.length??0],
      ["Campañas de clima",(climateR.data?.length??0)+(c3R.data?.length??0)]
     ] as const).map(([k,v])=><div className={box} key={k}><p className="text-xs font-bold text-neutral-500">{k}</p><p className="mt-2 text-2xl font-black text-neutral-900">{v}</p></div>)}
    </section>
    <section className={box}>
     <div className="flex flex-wrap justify-between gap-2"><h2 className="text-xl font-black">Aplicaciones recientes</h2><Link href={`/protected/psicometrias?organization=${org.id}`} className="text-sm font-bold text-orange-600">Abrir psicometrías →</Link></div>
     <div className="mt-4 divide-y divide-neutral-100">{processes.slice(0,20).map(p=>{
      const related=assignments.filter(a=>a.process_id===p.id);
      return <div key={p.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
       <div><strong>{names.get(p.person_id)||"Persona"}</strong><p className="text-xs text-neutral-500">{p.name}</p></div>
       <div className="text-neutral-600">{related.filter(a=>a.status==="completed").length} / {related.length} instrumentos · {date(p.created_at)}</div>
      </div>})}
      {processes.length===0&&<p className="py-5 text-sm text-neutral-500">Sin evaluaciones registradas.</p>}
     </div>
    </section>
   </div>}
   history={<div className="space-y-5">
    <details className={box}>
     <summary className="cursor-pointer text-lg font-black text-neutral-900">Opcional · Cotizaciones y precios</summary>
     <p className="mt-2 text-sm text-neutral-600">Puedes seguir llevando precios por fuera. Esta herramienta se conserva para una etapa comercial posterior.</p>
     <div className="mt-5"><CompanyQuoteBuilder organizationId={org.id}/></div>
    </details>
    <section className={box}>
     <h2 className="text-xl font-black text-neutral-900">Cotizaciones registradas</h2>
     <p className="mt-2 text-xs text-neutral-500">Son propuestas, no pagos cobrados. Las cantidades negociadas y el descuento se conservan para seguimiento.</p>
     <div className="mt-4 space-y-3">{quotes.map(q=><article key={q.id} className="rounded-2xl border border-neutral-200 p-4">
      <div className="flex flex-wrap justify-between gap-3">
       <div><strong>{date(q.created_at)}</strong><p className="mt-1 text-xs text-neutral-500">{Array.isArray(q.items)?q.items.map((x:{moduleName?:string;quantity?:number})=>`${x.moduleName||"Módulo"}: ${x.quantity??0}`).join(" · "):"Cotización"}</p></div>
       <div className="text-right"><p className="text-lg font-black">{mxn(q.total_amount)}</p><p className="text-xs text-neutral-500">{q.promo_50?"Promo 50% elegible":"Precio negociado"} · {q.status}</p></div>
      </div>
      {q.notes&&<p className="mt-2 text-sm text-neutral-600">{q.notes}</p>}
     </article>)}
     {quotes.length===0&&<p className="text-sm text-neutral-500">Sin cotizaciones guardadas.</p>}
     </div>
    </section>
    <section className={box}>
     <h2 className="text-xl font-black text-neutral-900">Bitácora de licencias y créditos</h2>
     <p className="mt-2 text-xs text-neutral-500">Los cambios se registran automáticamente desde la instalación de esta mejora; no se reconstruye un historial anterior inexistente.</p>
     <div className="mt-4 divide-y divide-neutral-100">{audit.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
      <div><strong>{modules.find(m=>m.module_key===a.module_key)?.name||a.module_key}</strong><p className="text-xs text-neutral-500">{a.event_type}</p></div>
      <span className="text-xs text-neutral-500">{date(a.occurred_at)}</span>
     </div>)}
     {audit.length===0&&<p className="py-3 text-sm text-neutral-500">La bitácora se llenará conforme se efectúen nuevas activaciones, renovaciones y cambios.</p>}</div>
    </section>
   </div>}
  />
 </div>;
}
