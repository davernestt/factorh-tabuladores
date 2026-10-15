"use client";

import {useRef,useState} from "react";

type Fields=Record<string,string>;
type TaskStatus={task_type:string;status:string};
type Props={caseId:string;initial:Fields;tasks?:TaskStatus[]};

const outcomes=["","Recomendable","Recomendable con observaciones","No recomendable","No concluyente"];
const controlFields=[
 {key:"service.responsible",label:"Responsable del estudio",type:"text"},
 {key:"service.request_date",label:"Fecha de solicitud",type:"date"},
 {key:"service.visit_date",label:"Fecha de visita",type:"date"},
 {key:"service.close_date",label:"Fecha de cierre",type:"date"}
] as const;

function operationalStatus(tasks:TaskStatus[],type:string){
 const selected=tasks.filter(task=>task.task_type===type);
 if(!selected.length)return "Sin asignar";
 if(selected.every(task=>task.status==="aprobado"))return "Validada";
 if(selected.some(task=>task.status==="correcciones"))return "Requiere correcciones";
 if(selected.some(task=>task.status==="en_revision"))return "En revisión";
 if(selected.some(task=>task.status==="en_proceso"))return "En captura";
 return "Pendiente de iniciar";
}

function SectionHeading({number,title,reference,description}:{
 number:number;title:string;reference:string;description:string
}){
 return <div className="mb-5 flex items-start gap-3">
  <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm font-black text-orange-700">{number}</span>
  <div className="min-w-0">
   <h3 className="text-lg font-black text-neutral-900">{title}</h3>
   <p className="mt-1 text-xs font-medium text-neutral-500">{reference}</p>
   <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
  </div>
 </div>;
}

export default function PilotMasterReview({caseId,initial,tasks=[]}:Props){
 const [data,setData]=useState<Fields>(initial||{});
 const [busy,setBusy]=useState(false);
 const [dirty,setDirty]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState(false);
 const edits=useRef(0);
 const cls="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200";
 const set=(key:string,value:string)=>{
  setData(previous=>({...previous,[key]:value}));
  edits.current++;
  setDirty(true);
  setMessage("");
 };
 async function save(){
  if(busy)return;
  setBusy(true);setMessage("");setError(false);
  const snapshot=edits.current;
  try{
   const response=await fetch("/api/estudios/piloto/"+caseId+"/dictamen",{
    method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error||"No se pudo guardar la revisión.");
   if(edits.current===snapshot){
    setDirty(false);
    setMessage("Los cambios quedaron guardados. Ahora puedes descargar el PDF o Word actualizado.");
   }else{
    setMessage("Se guardó la versión enviada, pero hiciste más cambios. Guarda nuevamente antes de descargar.");
   }
  }catch(cause){
   setError(true);
   setMessage(cause instanceof Error?cause.message:"Ocurrió un error al guardar la revisión.");
  }finally{setBusy(false)}
 }
 const canDownload=!dirty&&!busy;
 const pdf="/api/estudios/piloto/"+caseId+"/reporte?formato=pdf";
 const docx="/api/estudios/piloto/"+caseId+"/reporte?formato=docx";
 return <section aria-labelledby="ese-cierre-titulo" className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
  <header>
   <p className="text-xs font-extrabold uppercase tracking-widest text-orange-600">FactoRH · Exclusivo de superadministración</p>
   <h2 id="ese-cierre-titulo" className="mt-3 text-2xl font-black text-neutral-900">Cierre del estudio y dictamen final</h2>
   <p className="mt-3 max-w-4xl text-sm leading-7 text-neutral-600">
    Este espacio es para tu revisión final. El aplicador captura la entrevista y el domicilio,
    mientras que el referencista registra sus verificaciones. Aquí integras los hallazgos,
    redactas la conclusión y preparas los documentos del estudio.
   </p>
   <p className="mt-2 text-xs leading-6 text-neutral-500">
    Las referencias de página indican dónde aparecerá cada texto en el Word y el PDF;
    no son pasos ni pantallas que te falten por llenar.
   </p>
  </header>

  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
   <h3 className="text-sm font-black text-neutral-900">Antes de elaborar tu dictamen</h3>
   <p className="mt-2 text-xs leading-6 text-neutral-600">
    Revisa los dos frentes de trabajo. Puedes guardar un borrador aunque sigan pendientes,
    pero no debes considerar concluido el estudio sin validar las evidencias correspondientes.
   </p>
   <div className="mt-4 grid gap-3 sm:grid-cols-2">
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
     <p className="text-xs font-bold text-neutral-700">Visita y aplicación domiciliaria</p>
     <p className="mt-2 text-sm font-semibold text-neutral-900">{operationalStatus(tasks,"visita")}</p>
    </div>
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
     <p className="text-xs font-bold text-neutral-700">Investigación de referencias</p>
     <p className="mt-2 text-sm font-semibold text-neutral-900">{operationalStatus(tasks,"referencias")}</p>
    </div>
   </div>
   <p className="mt-4 text-xs leading-6 text-neutral-600">
    Tu secuencia de trabajo: <strong>revisar información</strong> → <strong>resumir hallazgos</strong> →
    <strong> fundamentar el dictamen</strong> → <strong>guardar y generar el borrador</strong>.
   </p>
  </div>

  <section aria-label="Datos de control del estudio" className="rounded-2xl border border-neutral-200 p-5 sm:p-6">
   <SectionHeading number={1} title="Datos de control del estudio"
    reference="Aparecerán en el control del servicio del informe"
    description="Registra quién supervisó el estudio y las fechas clave. La fecha de cierre debe reflejar cuándo terminaste la revisión."/>
   <div className="grid gap-4 md:grid-cols-2">
    {controlFields.map(field=><label key={field.key} className="block text-sm font-semibold text-neutral-700">
     {field.label}
     <input type={field.type} maxLength={field.type==="text"?180:undefined}
      value={data[field.key]||""} onChange={event=>set(field.key,event.target.value)} className={cls}/>
    </label>)}
   </div>
  </section>

  <section aria-label="Resumen ejecutivo" className="rounded-2xl border border-neutral-200 p-5 sm:p-6">
   <SectionHeading number={2} title="Resumen ejecutivo"
    reference="Ubicación en el informe final: página 1"
    description="Redacta una síntesis breve para la empresa solicitante: qué se verificó, principales coincidencias, inconsistencias relevantes, aclaraciones y asuntos pendientes. No repitas todas las respuestas del estudio."/>
   <label htmlFor="ese-resumen" className="block text-sm font-semibold text-neutral-700">
    Síntesis ejecutiva de los hallazgos
   </label>
   <textarea id="ese-resumen" maxLength={2500} rows={6}
    value={data["executive.summary"]||""} onChange={event=>set("executive.summary",event.target.value)}
    className={cls} placeholder="Ejemplo: Se realizó la visita de acuerdo con el alcance autorizado. La información documental y laboral presenta las siguientes coincidencias... Queda pendiente corroborar..."/>
  </section>

  <section aria-label="Reporte de investigación" className="rounded-2xl border border-neutral-200 p-5 sm:p-6">
   <SectionHeading number={3} title="Reporte de investigación"
    reference="Ubicación en el informe final: página 12"
    description="Integra el análisis completo. Distingue qué declaró la persona, qué observó el aplicador y qué confirmaron las fuentes laborales o personales. Explica cualquier diferencia con evidencias o indicando que no pudo corroborarse."/>
   <label htmlFor="ese-investigacion" className="block text-sm font-semibold text-neutral-700">
    Análisis de los resultados de la investigación
   </label>
   <textarea id="ese-investigacion" maxLength={5000} rows={8}
    value={data["research.report"]||""} onChange={event=>set("research.report",event.target.value)}
    className={cls} placeholder="Integra hallazgos documentales, visita domiciliaria, trayectoria laboral, referencias verificadas y aclaraciones, señalando las fuentes y limitaciones del estudio."/>
  </section>

  <section aria-label="Dictamen final" className="rounded-2xl border border-neutral-200 p-5 sm:p-6">
   <SectionHeading number={4} title="Dictamen final y fundamento"
    reference="Ubicación en el informe final: página 13"
    description="Selecciona tu conclusión profesional y explica por qué. El sistema no decide automáticamente: el resultado debe sostenerse en información pertinente y verificable, sin utilizar características personales protegidas."/>
   <div className="space-y-4">
    <label htmlFor="ese-dictamen" className="block text-sm font-semibold text-neutral-700">Resultado del estudio
     <select id="ese-dictamen" value={data["verdict.result"]||""}
      onChange={event=>set("verdict.result",event.target.value)} className={cls}>
      {outcomes.map(option=><option key={option} value={option}>{option||"Pendiente de determinar"}</option>)}
     </select>
    </label>
    <div>
     <label htmlFor="ese-fundamento" className="block text-sm font-semibold text-neutral-700">Fundamento del dictamen</label>
     <p className="mt-1 text-xs leading-6 text-neutral-500">Describe los hallazgos que respaldan tu elección, las limitaciones y las observaciones que la empresa debe conocer.</p>
     <textarea id="ese-fundamento" maxLength={2500} rows={6}
      value={data["verdict.rationale"]||""} onChange={event=>set("verdict.rationale",event.target.value)}
      className={cls} placeholder="El dictamen se fundamenta en la información corroborada mediante... Se identificó... No fue posible verificar..."/>
    </div>
   </div>
  </section>

  <section aria-label="Guardar y descargar informe de prueba" className="rounded-2xl border border-orange-200 bg-orange-50 p-5 sm:p-6">
   <SectionHeading number={5} title="Guardar y generar tu informe"
    reference="Word editable y PDF · Expediente piloto"
    description="Primero guarda tus textos; después descarga ambos documentos. Se completarán con lo capturado por el aplicador, las referencias y tu revisión. Lo que falte aparecerá como pendiente."/>
   <div className="flex flex-wrap items-center gap-3">
    <button type="button" onClick={save} disabled={busy}
     className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50">
     {busy?"Guardando...":dirty?"Guardar cambios del cierre":"Guardar resumen y dictamen"}
    </button>
    <p role="status" className="text-xs font-semibold text-neutral-700">
     {dirty?"Tienes cambios sin guardar.":"Puedes descargar el último borrador guardado."}
    </p>
   </div>
   {message&&<p role="status" className={"mt-3 rounded-xl p-3 text-sm "+(error?"border border-red-200 bg-red-50 text-red-700":"border border-neutral-200 bg-white text-neutral-700")}>{message}</p>}
   <div className="mt-5 border-t border-orange-200 pt-5">
    <p className="text-sm font-black text-neutral-900">Descargar documentos del estudio</p>
    <div className="mt-3 flex flex-wrap gap-3">
     {canDownload?<>
      <a href={pdf} className="inline-flex rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white hover:bg-neutral-700">Descargar PDF</a>
      <a href={docx} className="inline-flex rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-800 hover:bg-neutral-50">Descargar Word editable</a>
     </>:<>
      <button type="button" disabled className="rounded-xl bg-neutral-300 px-5 py-3 text-sm font-bold text-neutral-600">Descargar PDF</button>
      <button type="button" disabled className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-500">Descargar Word editable</button>
     </>}
    </div>
    {dirty&&<p className="mt-3 text-xs text-orange-900">Guarda los cambios antes de descargar para que el informe contenga tu versión más reciente.</p>}
    <p className="mt-4 text-xs leading-6 text-neutral-700">
     <strong>Modo piloto:</strong> la descarga es solo para revisión interna; no autoriza ni publica el estudio para clientes. Todavía no se insertan automáticamente fotografías, croquis ni ubicación GPS.
    </p>
   </div>
  </section>
 </section>;
}
