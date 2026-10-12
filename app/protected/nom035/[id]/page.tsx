import Link from "next/link";
import {Suspense} from "react";
import {notFound,redirect} from "next/navigation";
import {Building2,CalendarDays,ClipboardList,ExternalLink,LockKeyhole,ShieldCheck} from "lucide-react";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {
 nom035AssessmentScope,nom035Guide,nom035NextAssessment,nom035Requirements,
 nom035Tier,NOM035_TIER_LABELS,NOM035_SOURCE,type Nom035Center,type Nom035Progress
} from "@/lib/nom035/rules";
import Nom035CenterForm from "../center-form";
import Nom035EvidenceTracker,{type Nom035TaskProgress,type Nom035Document} from "../evidence-tracker";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default function Nom035CenterDetails(props:{params:Promise<{id:string}>}){
 return <Suspense fallback={<p className="rounded-3xl bg-white p-8 text-neutral-600">Preparando expediente NOM-035...</p>}>
  <Content {...props}/>
 </Suspense>;
}
async function Content({params}:{params:Promise<{id:string}>}){
 const user=await getCurrentAppUser();
 if(!user||!(user.role==="super_admin"||user.role==="client"&&user.organizationId))
  redirect("/auth/login");
 const {id}=await params;
 if(!uuid.test(id))notFound();
 const db=createAdminClient();
 const scopedCenter=db.from("nom035_work_centers").select("*")
  .eq("id",id).eq("active",true);
 const centerR=await (user.role==="client"?
  scopedCenter.eq("organization_id",user.organizationId!).maybeSingle():
  scopedCenter.maybeSingle());
 if(centerR.error||!centerR.data)notFound();
 const [evidenceR,tasksR,docsR,organizationsR]=await Promise.all([
  db.from("nom035_evidence_progress")
   .select("center_id,requirement_key,status,proof_reference,notes,responsible,next_review_on,internal_review,internal_reviewed_at,internal_reviewed_by,updated_at")
   .eq("center_id",id).order("requirement_key"),
  db.from("nom035_evidence_task_progress")
   .select("center_id,requirement_key,task_key,status,responsible,target_date,evidence_reference,notes,updated_at")
   .eq("center_id",id).order("requirement_key"),
  db.from("nom035_evidence_files")
   .select("id,requirement_key,title,original_file_name,size_bytes,created_at")
   .eq("center_id",id).order("created_at",{ascending:false}),
  user.role==="client"?
   db.from("organizations").select("id,name").eq("id",user.organizationId!).eq("active",true):
   db.from("organizations").select("id,name").eq("active",true).order("name")
 ]);
 const error=evidenceR.error||tasksR.error||docsR.error||organizationsR.error;
 if(error)return <section className="rounded-2xl bg-red-50 p-6 text-red-800">{error.message}</section>;
 const center=centerR.data as Nom035Center;
 const organizations=organizationsR.data||[];
 const org=organizations.find(o=>o.id===center.organization_id);
 const progress=(evidenceR.data||[]) as Nom035Progress[];
 const tasks=(tasksR.data||[]) as Nom035TaskProgress[];
 const docs=(docsR.data||[]) as Nom035Document[];
 const tier=nom035Tier(center.worker_count);
 const guide=nom035Guide(center.worker_count);
 const next=nom035NextAssessment(center.last_assessment_on,center.worker_count);
 const requirements=nom035Requirements(center.worker_count);
 const dateText=(value:string)=>value.split("-").reverse().join("/");
 const planned=guide==="none"?"No se exige Guía II/III por tamaño":
  guide==="II"?"Guía de Referencia II (opción oficial)":
  "Guía de Referencia III (opción oficial)";
 return <div className="space-y-7">
  <Link href="/protected/nom035" className="text-sm font-bold text-orange-600 hover:text-orange-700">
   ← Volver a centros NOM-035
  </Link>
  <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <p className="text-xs font-black uppercase tracking-[.17em] text-orange-600">
    {org?.name||"Empresa"} · Centro de trabajo
   </p>
   <h1 className="mt-2 text-3xl font-black text-neutral-800">{center.name}</h1>
   <p className="mt-3 text-sm text-neutral-600">
    {center.municipality}, {center.state}
    {center.street_address?" · "+center.street_address:""} · {center.main_activity}
   </p>
   <div className="mt-5 flex flex-wrap gap-2">
    <span className="rounded-xl bg-orange-50 px-4 py-2 text-xs font-black text-orange-700">{NOM035_TIER_LABELS[tier]}</span>
    <span className="rounded-xl bg-neutral-100 px-4 py-2 text-xs font-bold text-neutral-700">{planned}</span>
    <span className="rounded-xl bg-neutral-100 px-4 py-2 text-xs font-bold text-neutral-700">{center.worker_count} trabajadores</span>
   </div>
  </header>
  <section className="grid gap-4 lg:grid-cols-3">
   <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
    <Building2 className="h-5 w-5 text-orange-600"/>
    <p className="mt-3 text-xs font-bold uppercase text-neutral-500">Tramo normativo</p>
    <p className="mt-2 text-xl font-black text-neutral-800">{NOM035_TIER_LABELS[tier]}</p>
    <p className="mt-2 text-xs leading-5 text-neutral-600">Basado en el número registrado para este centro, no en la empresa completa.</p>
   </div>
   <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
    <ClipboardList className="h-5 w-5 text-orange-600"/>
    <p className="mt-3 text-xs font-bold uppercase text-neutral-500">Método previsto</p>
    <p className="mt-2 text-lg font-black text-neutral-800">
     {center.assessment_method==="official_guides"?
       planned:center.assessment_method==="validated_alternative"?
       "Método alternativo sujeto a validación":"Por definir"}
    </p>
    <p className="mt-2 text-xs text-neutral-600">La selección del método no acredita su validez o una evaluación aplicada.</p>
   </div>
   <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
    <CalendarDays className="h-5 w-5 text-orange-600"/>
    <p className="mt-3 text-xs font-bold uppercase text-neutral-500">Seguimiento de evaluación</p>
    <p className="mt-2 text-lg font-black text-neutral-800">{next?
      "Revisión: "+dateText(next):
      tier==="small"?"No aplica evaluación periódica general":"Fecha por definir"}</p>
    <p className="mt-2 text-xs leading-5 text-neutral-600">
     {center.last_assessment_on?"Última evaluación indicada: "+dateText(center.last_assessment_on)+". ":""}
     Periodicidad normativa: al menos cada dos años cuando aplica la evaluación.
    </p>
   </div>
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <div className="flex flex-wrap items-center gap-2">
    <ShieldCheck className="h-5 w-5 text-orange-600"/>
    <h2 className="text-xl font-black text-neutral-800">Alcance de NOM-035 para este centro</h2>
   </div>
   <p className="mt-4 text-sm leading-7 text-neutral-700">{nom035AssessmentScope(center.worker_count)}</p>
   {tier==="large"&&<p className="mt-3 rounded-xl bg-orange-50 p-4 text-sm leading-6 text-neutral-700">
    La opción de muestra representativa requiere cálculo y selección conforme a la Guía de Referencia III.
    Esta fase todavía no realiza ese cálculo; no debe usarse una cantidad arbitraria de participantes.
   </p>}
   {tier==="small"&&<p className="mt-3 rounded-xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">
    Aunque no se exige evaluar los factores de riesgo mediante las Guías II o III por tamaño,
    permanecen las obligaciones preventivas y de atención previstas en la norma.
   </p>}
   <div className="mt-4 flex flex-wrap gap-3">
    <a href={NOM035_SOURCE} target="_blank" rel="noopener noreferrer"
     className="inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700">
     Leer el texto normativo oficial <ExternalLink className="h-4 w-4"/>
    </a>
   </div>
  </section>

  <section className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">Guía de Referencia I · Fase 2</p>
    <h2 className="mt-2 text-xl font-black text-neutral-800">Identificación de acontecimientos traumáticos severos</h2>
    <p className="mt-3 text-sm leading-7 text-neutral-600">
      Prepara campañas independientes con preguntas condicionales, un servicio de canalización identificado y
      un manejo minimizado de información sensible. No se almacenan síntomas individuales en el expediente administrativo.
    </p>
    <Link href={"/protected/nom035/"+id+"/guia-i"}
      className="mt-5 inline-flex rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white hover:bg-orange-700">
      Configurar Guía I y sus campañas →
    </Link>
  </section>}}

  <section className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">Fase 3 · Riesgos psicosociales</p>
    <h2 className="mt-2 text-xl font-black text-neutral-800">Cuestionarios oficiales de Guía II y III</h2>
    <p className="mt-3 text-sm leading-7 text-neutral-600">
      Aplica el cuestionario que corresponde al tamaño de este centro.
      Guía II para 16–50 trabajadores; Guía III para más de 50, con
      opción de muestreo representativo documentado.
      Estas aplicaciones son independientes de C3 PRO y Pulso.
    </p>
    <Link href={"/protected/nom035/"+id+"/riesgos"}
      className="mt-5 inline-flex rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white hover:bg-orange-700">
      Gestionar Guía {guide==="none"?"II / III":guide} →
    </Link>
  </section>

  <Nom035EvidenceTracker centerId={id} requirements={requirements}
    progress={progress} tasks={tasks} documents={docs}/>
  <Nom035CenterForm organizations={organizations} center={center}/>

  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-xl font-black text-neutral-800">Próximas funciones del módulo</h2>
   <div className="mt-4 grid gap-4 sm:grid-cols-2">
    {[
     ["Cuestionarios oficiales","Guía I y, cuando corresponda, Guía II o III, con sus rutas condicionales. En diseño y verificación normativa."],
     ["Calificaciones normativas","Cálculos invertidos, categorías, dominios, niveles y metodología documentada. No disponible todavía."],
     ["Muestreo representativo","Herramienta de cálculo y selección de muestra para centros de más de 50 trabajadores."],
     ["Informe y plan de intervención","Expediente técnico, medidas de control, seguimiento y versiones para consulta autorizada."]
    ].map(([name,description])=><div key={name} className="rounded-2xl bg-neutral-50 p-5">
     <p className="font-black text-neutral-800">{name}</p>
     <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
     <p className="mt-3 text-xs font-bold text-orange-700">En desarrollo</p>
    </div>)}
   </div>
   <div className="mt-5 flex gap-2 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-900">
    <LockKeyhole className="mt-1 h-4 w-4 shrink-0"/>
    <p>Los acontecimientos traumáticos severos pueden implicar datos personales sensibles.
     El registro clínico o de canalizaciones individuales no forma parte del expediente
     administrativo actual y requerirá permisos, confidencialidad y protocolos específicos.</p>
   </div>
  </section>
  <p className="text-xs leading-6 text-neutral-500">Estado: configuración documental. Las marcas
   «documentado» son manifestaciones del usuario y no sustituyen una revisión jurídica,
   sanitaria ni una verificación oficial de cumplimiento.</p>
 </div>;
}
