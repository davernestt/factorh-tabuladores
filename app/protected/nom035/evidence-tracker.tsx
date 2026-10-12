"use client";
import {useMemo,useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {
 BookOpen,CheckCircle2,ClipboardCheck,ClipboardList,CalendarClock,
 FileText,Files,LockKeyhole,ChevronDown,Upload,ExternalLink,
 Search,ShieldCheck,AlertTriangle,Info,FolderOpen
} from "lucide-react";
import {updateNom035Evidence} from "./actions";
import {saveNom035Task,reviewNom035Requirement,uploadNom035Evidence} from "./evidence-actions";
import {nom035EvidenceGuide} from "@/lib/nom035/evidence-guides";
import type {Nom035Progress,Nom035Requirement,Nom035RequirementKey} from "@/lib/nom035/rules";

export type Nom035TaskProgress={
 center_id:string;requirement_key:Nom035RequirementKey;task_key:string;
 status:"pending"|"in_progress"|"completed";
 responsible:string;target_date:string|null;evidence_reference:string;
 notes:string;updated_at:string;
};
export type Nom035Document={
 id:string;requirement_key:Nom035RequirementKey;title:string;
 original_file_name:string;size_bytes:number;created_at:string;
};

const requirementsStatus={
 pending:"Pendiente",
 in_progress:"En proceso",
 documented:"Documentado"
} as const;
const taskLabels={pending:"Pendiente",in_progress:"En proceso",completed:"Realizada"} as const;
type RequirementStatus=keyof typeof requirementsStatus;
type TaskStatus=keyof typeof taskLabels;
const classInput="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm text-neutral-800 focus:border-orange-500 focus:outline-none";
const src="https://sidof.segob.gob.mx/notas/docFuente/5541828";
function formatDate(date:string|null){
 if(!date)return "Sin fecha";
 const parts=date.slice(0,10).split("-");
 return parts.length===3?parts.reverse().join("/"):date;
}
function statusStyle(status:RequirementStatus){
 return status==="documented"?"bg-emerald-50 text-emerald-800":
  status==="in_progress"?"bg-blue-50 text-blue-800":"bg-neutral-100 text-neutral-600";
}
function RevisionStatus({status}:{status:Nom035Progress["internal_review"]|undefined}){
 const styles=status==="verified"?"bg-emerald-50 text-emerald-700":
   status==="changes_requested"?"bg-amber-50 text-amber-800":"bg-neutral-100 text-neutral-600";
 const label=status==="verified"?"Revisado internamente":
  status==="changes_requested"?"Requiere ajustes":"Sin revisión interna";
 return <span className={"rounded-lg px-2.5 py-1.5 text-xs font-bold "+styles}>{label}</span>;
}

export default function Nom035EvidenceTracker({
 centerId,requirements,progress,tasks,documents
}:{
 centerId:string;
 requirements:Nom035Requirement[];
 progress:Nom035Progress[];
 tasks:Nom035TaskProgress[];
 documents:Nom035Document[];
}){
 const [search,setSearch]=useState("");
 const [filter,setFilter]=useState<"all"|"pending"|"review">("all");
 const stored=new Map(progress.map(row=>[row.requirement_key,row]));
 const documented=requirements.filter(item=>stored.get(item.key)?.status==="documented").length;
 const reviewed=requirements.filter(item=>stored.get(item.key)?.internal_review==="verified").length;
 const allTaskDefinitions=requirements.flatMap(req=>nom035EvidenceGuide(req.key).tasks.map(t=>({requirement:req.key,...t})));
 const completedTaskCount=tasks.filter(task=>task.status==="completed" &&
  allTaskDefinitions.some(d=>d.requirement===task.requirement_key&&d.id===task.task_key)).length;
 const visible=useMemo(()=>requirements.filter(req=>{
  const saved=stored.get(req.key);
  if(filter==="pending"&&saved?.status==="documented")return false;
  if(filter==="review"&&saved?.internal_review==="verified")return false;
  const query=search.trim().toLowerCase();
  if(!query)return true;
  const guide=nom035EvidenceGuide(req.key);
  return [req.label,req.description,req.norm,guide.meaning,guide.source]
   .some(value=>value.toLowerCase().includes(query));
 }),[requirements,search,filter,progress]);
 return <section className="space-y-5">
  <header className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
   <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">FactoRH NOM-035 · Biblioteca y expediente</p>
   <h2 className="mt-2 text-2xl font-black text-neutral-800">Compendio guiado para Recursos Humanos</h2>
   <p className="mt-3 max-w-4xl text-sm leading-7 text-neutral-600">
    Consulta lo que exige la norma, cómo organizar su implementación y ejemplos de evidencias.
    Registra responsables, fechas, avances y documentos por centro de trabajo.
    La documentación registrada no equivale a una verificación oficial.
   </p>
   <div className="mt-6 grid gap-3 sm:grid-cols-3">
    {[
     {value:documented,label:"Requisitos documentados",denominator:requirements.length},
     {value:completedTaskCount,label:"Actividades realizadas",denominator:allTaskDefinitions.length},
     {value:reviewed,label:"Revisados internamente",denominator:requirements.length}
    ].map(x=><div key={x.label} className="rounded-2xl bg-neutral-50 p-4">
     <p className="text-2xl font-black tabular-nums text-neutral-800">{x.value}<span className="ml-1 text-sm font-medium text-neutral-500">/{x.denominator}</span></p>
     <p className="mt-1 text-xs font-semibold text-neutral-600">{x.label}</p>
    </div>)}
   </div>
   <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
    <label className="relative">
     <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-400"/>
     <input value={search} onChange={e=>setSearch(e.target.value)}
      placeholder="Buscar requisito, numeral o tema..."
      className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-3 text-sm text-neutral-800"/>
    </label>
    <select aria-label="Filtrar expediente" value={filter}
     onChange={e=>setFilter(e.target.value as "all"|"pending"|"review")}
     className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm font-bold text-neutral-700">
     <option value="all">Todos los requisitos</option>
     <option value="pending">Sin documentar</option>
     <option value="review">Sin revisión aprobada</option>
    </select>
   </div>
   <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
    <p className="text-xs leading-6 text-neutral-500">
     Mostrando {visible.length} de {requirements.length} obligaciones según el tamaño de este centro.
     Abre una ficha para consultar la guía y registrar actividades.
    </p>
    <a href={"/protected/nom035/"+centerId+"/compendio"} target="_blank" rel="noopener noreferrer"
     className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs font-black text-orange-700">
     <FileText className="h-4 w-4"/>Ver compendio e imprimir a PDF
    </a>
   </div>
  </header>
  <div className="space-y-3">
   {visible.map(req=><RequirementCard key={req.key}
    centerId={centerId} requirement={req} saved={stored.get(req.key)||null}
    tasks={tasks.filter(task=>task.requirement_key===req.key)}
    docs={documents.filter(doc=>doc.requirement_key===req.key)}/>)}
   {!visible.length&&<div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
    No hay requisitos que coincidan con tu búsqueda.
   </div>}
  </div>
  <p className="text-xs leading-6 text-neutral-500">
   Fuente normativa: <a href={src} target="_blank" rel="noopener noreferrer"
   className="font-bold text-orange-700 underline">NOM-035-STPS-2018, Diario Oficial de la Federación</a>.
   La columna de evidencias sugeridas contiene ejemplos de organización documental,
   no requisitos formales adicionales. Conservación mínima de registros conforme al
   numeral 10.4: un año desde su elaboración.
  </p>
 </section>;
}

function RequirementCard({centerId,requirement,saved,tasks,docs}:{
 centerId:string;requirement:Nom035Requirement;saved:Nom035Progress|null;
 tasks:Nom035TaskProgress[];docs:Nom035Document[];
}){
 const guide=nom035EvidenceGuide(requirement.key);
 const done=guide.tasks.filter(t=>tasks.some(x=>x.task_key===t.id&&x.status==="completed")).length;
 const status=saved?.status||"pending";
 return <details className="group overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 p-5 marker:hidden sm:p-6">
   <div className="min-w-0 flex-1">
    <p className="text-xs font-black uppercase tracking-[.13em] text-orange-600">Numerales {requirement.norm}</p>
    <h3 className="mt-2 text-lg font-black leading-7 text-neutral-800">{requirement.label}</h3>
    <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-600">{requirement.description}</p>
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
     <span className={"rounded-lg px-3 py-1.5 font-bold "+statusStyle(status)}>{requirementsStatus[status]}</span>
     <span className="rounded-lg bg-neutral-100 px-3 py-1.5 font-semibold text-neutral-600">{done} / {guide.tasks.length} actividades</span>
     <RevisionStatus status={saved?.internal_review}/>
    </div>
   </div>
   <ChevronDown className="h-5 w-5 shrink-0 text-neutral-500 transition-transform group-open:rotate-180"/>
  </summary>
  <div className="space-y-7 border-t border-neutral-100 px-5 py-6 sm:px-7">
   <section className="grid gap-5 lg:grid-cols-2">
    <div className="space-y-3">
     <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-orange-600"/>
      <h4 className="font-black text-neutral-800">¿Qué significa para RH?</h4>
     </div>
     <p className="text-sm leading-7 text-neutral-700">{guide.meaning}</p>
    </div>
    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
     <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-orange-700"/>
      <h4 className="font-black text-neutral-800">Lo que establece la norma</h4>
     </div>
     <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-neutral-700">
      {guide.normative.map((line,i)=><li key={i}>{line}</li>)}
     </ul>
     <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-orange-700">Fundamento: {guide.source}</span>
      <a href={src} target="_blank" rel="noopener noreferrer"
       className="inline-flex items-center gap-1 text-xs font-bold text-orange-700 underline">
       Texto oficial <ExternalLink className="h-3.5 w-3.5"/>
      </a>
     </div>
    </div>
   </section>
   {guide.warnings?.map((line,i)=><div key={i}
    className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
    <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0"/>{line}
   </div>)}
   {requirement.conditional&&<p className="rounded-xl bg-neutral-50 p-4 text-xs leading-6 text-neutral-600">
    <Info className="mr-2 inline h-4 w-4"/>La necesidad de implementar medidas
    específicas depende de los resultados de la evaluación, según el método aplicado.
   </p>}
   <section className="rounded-2xl bg-neutral-50 p-5">
    <h4 className="flex items-center gap-2 font-black text-neutral-800">
     <ClipboardList className="h-5 w-5 text-orange-600"/>Cómo implementarlo paso a paso</h4>
    <ol className="mt-4 space-y-3">
     {guide.steps.map((line,i)=><li key={i} className="flex gap-3 text-sm leading-7 text-neutral-700">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-orange-700">
       {i+1}</span><span>{line}</span>
     </li>)}
    </ol>
   </section>
   <section>
    <div className="flex flex-wrap items-start justify-between gap-3">
     <div><h4 className="flex items-center gap-2 font-black text-neutral-800">
      <ClipboardCheck className="h-5 w-5 text-orange-600"/>Actividades para dar seguimiento
     </h4><p className="mt-2 text-xs text-neutral-500">
      Abre cada actividad para asignar responsable, fecha y referencia. Una actividad
      solo puede marcarse realizada si cuenta con referencia documental.
     </p></div>
     <span className="rounded-xl bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-700">{done} de {guide.tasks.length} realizadas</span>
    </div>
    <div className="mt-4 space-y-2">
     {guide.tasks.map((task,i)=><TaskEditor key={task.id} centerId={centerId}
      requirementKey={requirement.key} index={i+1} task={task}
      saved={tasks.find(x=>x.task_key===task.id)||null}/>)}
    </div>
   </section>
   <section className="grid gap-5 lg:grid-cols-2">
    <div className="rounded-2xl border border-neutral-200 p-5">
     <h4 className="flex items-center gap-2 font-black text-neutral-800">
      <Files className="h-5 w-5 text-orange-600"/>Evidencias sugeridas por FactoRH</h4>
     <p className="mt-2 text-xs leading-5 text-neutral-500">
      Son ejemplos de organización; el requisito legal se encuentra en el bloque anterior.
     </p>
     <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-neutral-700">
      {guide.evidence.map((line,i)=><li key={i}>{line}</li>)}
     </ul>
    </div>
    <div className="rounded-2xl border border-neutral-200 p-5">
     <h4 className="flex items-center gap-2 font-black text-neutral-800">
      <CalendarClock className="h-5 w-5 text-orange-600"/>Cómo dar seguimiento</h4>
     <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-neutral-700">
      {guide.monitoring.map((line,i)=><li key={i}>{line}</li>)}
     </ul>
    </div>
   </section>
   <EvidenceFilesEditor centerId={centerId}
    requirementKey={requirement.key} docs={docs}/>
   <RequirementEditor centerId={centerId} requirement={requirement} saved={saved}/>
  </div>
 </details>;
}

function TaskEditor({centerId,requirementKey,index,task,saved}:{
 centerId:string;requirementKey:Nom035RequirementKey;index:number;
 task:{id:string;title:string;help:string};saved:Nom035TaskProgress|null;
}){
 const router=useRouter();
 const [status,setStatus]=useState<TaskStatus>(saved?.status||"pending");
 const [responsible,setResponsible]=useState(saved?.responsible||"");
 const [targetDate,setTargetDate]=useState(saved?.target_date||"");
 const [reference,setReference]=useState(saved?.evidence_reference||"");
 const [notes,setNotes]=useState(saved?.notes||"");
 const [busy,start]=useTransition();
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 function submit(form:FormData){
  setMessage("");setError("");
  start(async()=>{
   try{await saveNom035Task(form);setMessage("Actividad actualizada.");router.refresh();}
   catch(e){setError(e instanceof Error?e.message:"No se pudo guardar.");}
  });
 }
 return <details className="rounded-xl border border-neutral-200 bg-white">
  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 marker:hidden">
   <div className="min-w-0 flex-1">
    <p className="text-sm font-bold text-neutral-800">{index}. {task.title}</p>
    <p className="mt-1 text-xs leading-5 text-neutral-500">{task.help}</p>
   </div>
   <span className={"rounded-lg px-3 py-1.5 text-xs font-bold "+
    (saved?.status==="completed"?"bg-emerald-50 text-emerald-800":
      saved?.status==="in_progress"?"bg-blue-50 text-blue-800":"bg-neutral-100 text-neutral-600")}>
    {taskLabels[saved?.status||"pending"]}
   </span>
  </summary>
  <form action={submit} className="grid gap-3 border-t border-neutral-100 p-4 md:grid-cols-2">
   <input type="hidden" name="center_id" value={centerId}/>
   <input type="hidden" name="requirement_key" value={requirementKey}/>
   <input type="hidden" name="task_key" value={task.id}/>
   <label className="text-xs font-bold text-neutral-600">Estado
    <select name="status" value={status} onChange={e=>setStatus(e.target.value as TaskStatus)}
     className={classInput}>
     {Object.entries(taskLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
    </select>
   </label>
   <label className="text-xs font-bold text-neutral-600">Responsable
    <input className={classInput} name="responsible" maxLength={140}
     value={responsible} onChange={e=>setResponsible(e.target.value)}
     placeholder="Ej. Gerencia de RH"/>
   </label>
   <label className="text-xs font-bold text-neutral-600">Fecha compromiso
    <input className={classInput} type="date" name="target_date" value={targetDate}
     onChange={e=>setTargetDate(e.target.value)}/>
   </label>
   <label className="text-xs font-bold text-neutral-600">Referencia de evidencia {status==="completed"?"(obligatoria)":""}
    <input className={classInput} name="evidence_reference" maxLength={350}
     value={reference} onChange={e=>setReference(e.target.value)}
     placeholder="Ej. Acta, archivo, política o ruta privada"/>
   </label>
   <label className="text-xs font-bold text-neutral-600 md:col-span-2">Notas de avance (sin datos personales)
    <textarea className={classInput} name="notes" rows={2} maxLength={700}
     value={notes} onChange={e=>setNotes(e.target.value)}/>
   </label>
   <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
    <div>{error&&<p role="alert" className="text-xs font-bold text-red-700">{error}</p>}
     {message&&<p role="status" className="text-xs font-bold text-emerald-700">{message}</p>}</div>
    <button type="submit" disabled={busy||(status==="completed"&&!reference.trim())}
     className="rounded-xl bg-neutral-800 px-5 py-2.5 text-xs font-black text-white disabled:opacity-40">
     {busy?"Guardando...":"Guardar actividad"}
    </button>
   </div>
  </form>
 </details>;
}

function EvidenceFilesEditor({centerId,requirementKey,docs}:{
 centerId:string;requirementKey:Nom035RequirementKey;docs:Nom035Document[];
}){
 const router=useRouter();
 const [busy,start]=useTransition();
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const sensitive=requirementKey==="complaints"||requirementKey==="severe_events";
 function submit(form:FormData){
  setError("");setMessage("");
  start(async()=>{
   try{await uploadNom035Evidence(form);setMessage("Documento guardado en almacenamiento privado.");router.refresh();}
   catch(e){setError(e instanceof Error?e.message:"No se pudo cargar el documento.");}
  });
 }
 return <section className="rounded-2xl border border-neutral-200 p-5">
  <h4 className="flex items-center gap-2 font-black text-neutral-800">
   <FolderOpen className="h-5 w-5 text-orange-600"/>Carpeta de documentos y evidencias
  </h4>
  {docs.length?
   <div className="mt-4 divide-y divide-neutral-100">
    {docs.map(doc=><div key={doc.id}
     className="flex flex-wrap items-center justify-between gap-3 py-3">
     <div><p className="text-sm font-bold text-neutral-800">{doc.title}</p>
      <p className="mt-1 text-xs text-neutral-500">
       {doc.original_file_name} · {(doc.size_bytes/1024/1024).toFixed(2)} MB ·
       {" "+formatDate(doc.created_at)}
      </p></div>
     <a href={"/api/nom035/evidence/"+doc.id} target="_blank" rel="noopener noreferrer"
      className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-black text-orange-700">
      Abrir documento <ExternalLink className="ml-1 inline h-3.5 w-3.5"/>
     </a>
    </div>)}
   </div>:
   <p className="mt-3 text-sm text-neutral-500">Aún no hay archivos adjuntos a este requisito.</p>}
  {sensitive?<p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-900">
   <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0"/>
   Los expedientes de quejas y acontecimientos traumáticos pueden contener
   datos personales sensibles. No se admiten adjuntos aquí; utiliza solamente
   referencias administrativas a un repositorio restringido.
  </p>:
   <form action={submit} className="mt-5 grid gap-3 rounded-xl bg-neutral-50 p-4 sm:grid-cols-2">
    <input type="hidden" name="center_id" value={centerId}/>
    <input type="hidden" name="requirement_key" value={requirementKey}/>
    <label className="text-xs font-bold text-neutral-600">Título de la evidencia
     <input name="title" minLength={4} maxLength={140} required className={classInput}
      placeholder="Ej. Política preventiva aprobada"/>
    </label>
    <label className="text-xs font-bold text-neutral-600">Documento PDF o imagen
     <input name="document" type="file" required accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
      className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-2 text-xs text-neutral-700"/>
    </label>
    <p className="text-xs leading-5 text-neutral-500 sm:col-span-2">
     Hasta 10 MB; no adjuntar listas con datos personales, expedientes de salud,
     firmas de trabajadores ni denuncias. Otros formatos pueden registrarse mediante
     una referencia documental.
    </p>
    <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
     <div>{error&&<p role="alert" className="text-xs font-bold text-red-700">{error}</p>}
      {message&&<p role="status" className="text-xs font-bold text-emerald-700">{message}</p>}</div>
     <button type="submit" disabled={busy}
      className="inline-flex items-center gap-2 rounded-xl bg-neutral-800 px-5 py-2.5 text-xs font-black text-white disabled:opacity-40">
      <Upload className="h-4 w-4"/>{busy?"Cargando...":"Subir evidencia"}
     </button>
    </div>
   </form>}
 </section>;
}

function RequirementEditor({centerId,requirement,saved}:{
 centerId:string;requirement:Nom035Requirement;saved:Nom035Progress|null
}){
 const router=useRouter();
 const [status,setStatus]=useState<RequirementStatus>(saved?.status||"pending");
 const [reference,setReference]=useState(saved?.proof_reference||"");
 const [notes,setNotes]=useState(saved?.notes||"");
 const [responsible,setResponsible]=useState(saved?.responsible||"");
 const [nextReview,setNextReview]=useState(saved?.next_review_on||"");
 const [busy,start]=useTransition();
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [reviewMessage,setReviewMessage]=useState("");
 const [reviewError,setReviewError]=useState("");
 function submit(form:FormData){
  setError("");setMessage("");
  start(async()=>{
   try{await updateNom035Evidence(form);setMessage("Seguimiento del requisito actualizado.");router.refresh();}
   catch(e){setError(e instanceof Error?e.message:"No fue posible guardar.");}
  });
 }
 function review(decision:"verified"|"changes_requested"){
  setReviewError("");setReviewMessage("");
  const form=new FormData();
  form.set("center_id",centerId);form.set("requirement_key",requirement.key);
  form.set("decision",decision);
  start(async()=>{
   try{await reviewNom035Requirement(form);
    setReviewMessage(decision==="verified"?"Verificado internamente.":"Marcado para revisión.");
    router.refresh();}
   catch(e){setReviewError(e instanceof Error?e.message:"Error de revisión.");}
  });
 }
 return <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <h4 className="font-black text-neutral-800">Concentrado y revisión del requisito</h4>
   <RevisionStatus status={saved?.internal_review}/>
  </div>
  <p className="mt-2 text-xs leading-6 text-neutral-600">
   El estado documentado refleja la declaración del responsable. La revisión interna
   es un control administrativo y no una certificación de cumplimiento.
  </p>
  <form action={submit} className="mt-4 grid gap-3 md:grid-cols-2">
   <input type="hidden" name="center_id" value={centerId}/>
   <input type="hidden" name="requirement_key" value={requirement.key}/>
   <label className="text-xs font-bold text-neutral-600">Estado de documentación
    <select name="status" value={status}
     onChange={e=>setStatus(e.target.value as RequirementStatus)}
     className={classInput}>
     {Object.entries(requirementsStatus).map(([value,label])=><option key={value} value={value}>{label}</option>)}
    </select>
   </label>
   <label className="text-xs font-bold text-neutral-600">Responsable
    <input name="responsible" value={responsible} onChange={e=>setResponsible(e.target.value)}
     maxLength={140} className={classInput} placeholder="Ej. Coordinación de RH"/>
   </label>
   <label className="text-xs font-bold text-neutral-600">Referencia documental {status==="documented"?"(obligatoria)":""}
    <input name="proof_reference" value={reference} onChange={e=>setReference(e.target.value)}
     maxLength={350} className={classInput} placeholder="Ej. Documento interno y versión"/>
   </label>
   <label className="text-xs font-bold text-neutral-600">Próxima revisión interna
    <input type="date" name="next_review_on" value={nextReview}
     onChange={e=>setNextReview(e.target.value)} className={classInput}/>
   </label>
   <label className="text-xs font-bold text-neutral-600 md:col-span-2">Observaciones administrativas
    <textarea name="notes" value={notes} onChange={e=>setNotes(e.target.value)}
     maxLength={700} rows={2} className={classInput}
     placeholder="Anota acuerdos, impedimentos o próximos pasos sin datos personales"/>
   </label>
   <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
    <div>{error&&<p role="alert" className="text-xs font-bold text-red-700">{error}</p>}
     {message&&<p role="status" className="text-xs font-bold text-emerald-700">{message}</p>}</div>
    <button type="submit" disabled={busy||(status==="documented"&&!reference.trim())}
     className="inline-flex items-center gap-2 rounded-xl bg-neutral-800 px-5 py-3 text-xs font-black text-white disabled:opacity-40">
     <FileText className="h-4 w-4"/>{busy?"Guardando...":"Guardar seguimiento"}
    </button>
   </div>
  </form>
  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-5">
   <span className="mr-2 text-xs font-bold text-neutral-600">Revisión interna:</span>
   <button type="button" disabled={busy||saved?.status!=="documented"||
     !saved?.proof_reference||saved?.internal_review==="verified"}
    onClick={()=>review("verified")}
    className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-xs font-black text-emerald-700 disabled:opacity-40">
    <CheckCircle2 className="h-4 w-4"/>Marcar revisado internamente
   </button>
   <button type="button" disabled={busy||!saved}
    onClick={()=>review("changes_requested")}
    className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-xs font-black text-amber-800 disabled:opacity-40">
    <AlertTriangle className="h-4 w-4"/>Solicitar ajustes
   </button>
   {reviewMessage&&<p role="status" className="text-xs font-bold text-emerald-700">{reviewMessage}</p>}
   {reviewError&&<p role="alert" className="text-xs font-bold text-red-700">{reviewError}</p>}
  </div>
 </section>;
}
