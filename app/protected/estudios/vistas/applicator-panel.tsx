"use client";
import {useState} from "react";
import {Camera,CheckCircle2,ClipboardCheck,FileText,MapPin,Upload,ShieldCheck,Clock3} from "lucide-react";

type Step="asignados"|"entrevista"|"evidencias";
const queue=[
 {id:"ESE-DEMO-001",name:"María Ejemplo",type:"Integral",visit:"Visita pendiente de concluir"},
 {id:"ESE-DEMO-003",name:"Jorge Ilustrativo",type:"Ejecutivo",visit:"Programado"},
];
export default function ApplicatorPanel(){
 const [step,setStep]=useState<Step>("asignados");
 const [caseId,setCaseId]=useState(queue[0].id);
 const [address,setAddress]=useState("Domicilio declarado (ejemplo)");
 const [housing,setHousing]=useState("Propia");
 const [notes,setNotes]=useState("");
 const [photo,setPhoto]=useState("");
 const [sketch,setSketch]=useState("");
 const [location,setLocation]=useState(false);
 const [saved,setSaved]=useState(false);
 const [sent,setSent]=useState(false);
 const [notice,setNotice]=useState("");
 const selected=queue.find(c=>c.id===caseId)||queue[0];
 function chooseFile(e:React.ChangeEvent<HTMLInputElement>,kind:"photo"|"sketch"){
  const name=e.target.files?.[0]?.name||"";
  if(kind==="photo")setPhoto(name);else setSketch(name);
  setSaved(false);setNotice(name?"Archivo seleccionado para ilustración; no se subió a ningún servidor.":"");
 }
 return <div className="space-y-6">
  <header className="rounded-3xl border border-neutral-200 bg-white p-7">
    <p className="text-xs font-black uppercase tracking-widest text-orange-600">FactoRH · Portal del aplicador</p>
    <h1 className="mt-2 text-3xl font-black text-neutral-900">Mis estudios asignados</h1>
    <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">Acceso de campo para entrevistas, evidencias y observaciones de visita. El aplicador solo vería los expedientes y apartados que tenga asignados.</p>
  </header>
  <nav className="flex flex-wrap gap-2 rounded-2xl border border-neutral-200 bg-white p-2">
   {([{id:"asignados",label:"Mis visitas"},{id:"entrevista",label:"Llenar estudio"},{id:"evidencias",label:"Fotos y ubicación"}] as const).map(t=>
    <button type="button" key={t.id} onClick={()=>{setStep(t.id);setNotice("")}}
     className={"rounded-xl px-5 py-3 text-sm font-bold "+(step===t.id?"bg-orange-600 text-white":"text-neutral-700 hover:bg-neutral-100")}>{t.label}</button>)}
  </nav>
  {notice&&<p role="status" className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">{notice}</p>}
  {step==="asignados"&&<>
   <div className="grid gap-3 sm:grid-cols-3">{([["Asignados","2"],["En captura",sent?"0":"1"],["En revisión",sent?"1":"0"]] as const).map(([label,n])=>
    <div key={label} className="rounded-2xl border border-neutral-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{label}</p><p className="mt-2 text-3xl font-black">{n}</p></div>)}</div>
   <section className="rounded-3xl border border-neutral-200 bg-white p-6">
    <h2 className="text-xl font-black">Visitas a realizar</h2>
    <div className="mt-5 space-y-3">{queue.map(c=><div key={c.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 p-5">
     <div><p className="font-bold">{c.name}</p><p className="mt-1 text-xs text-neutral-600">{c.type} · {c.visit} · {c.id}</p></div>
     <button type="button" onClick={()=>{setCaseId(c.id);setStep("entrevista")}} className="rounded-xl bg-orange-600 px-4 py-3 text-xs font-bold text-white">Abrir captura →</button>
    </div>)}</div>
   </section>
  </>}
  {step!=="asignados"&&<div className="rounded-2xl border border-neutral-200 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-4">
     <div><p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Expediente asignado</p><p className="mt-1 font-black text-neutral-900">{selected.name}</p><p className="text-xs text-neutral-500">{selected.id} · Estudio {selected.type}</p></div>
     <div className="text-right"><p className="text-xs text-neutral-500">Captura de ejemplo</p><p className="mt-1 text-lg font-black text-orange-700">{sent?"En revisión":saved?"Borrador guardado":"Pendiente"}</p></div>
    </div>
  </div>}
  {step==="entrevista"&&<>
   <section className="rounded-3xl border border-neutral-200 bg-white p-6">
    <p className="text-xs font-black uppercase tracking-widest text-orange-600">Paso 1 · Entrevista domiciliaria</p>
    <h2 className="mt-2 text-xl font-black">Datos observados y declarados</h2>
    <p className="mt-3 text-sm leading-7 text-neutral-600">En la captura real las secciones dependen del tipo de estudio y del consentimiento. Esta demostración usa información inventada y no incluye datos financieros ni de terceros.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="block text-sm font-semibold text-neutral-700">Domicilio declarado (ejemplo)
       <input value={address} onChange={e=>{setAddress(e.target.value);setSaved(false)}} className="mt-2 w-full rounded-xl border border-neutral-300 p-3 text-sm"/></label>
      <label className="block text-sm font-semibold text-neutral-700">Condición de vivienda declarada
       <select value={housing} onChange={e=>{setHousing(e.target.value);setSaved(false)}} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm">
        <option>Propia</option><option>Rentada</option><option>Familiar</option><option>Otra</option>
       </select></label>
      <label className="block md:col-span-2 text-sm font-semibold text-neutral-700">Observaciones verificables del aplicador
       <textarea rows={4} value={notes} onChange={e=>{setNotes(e.target.value);setSaved(false)}}
        placeholder="Describe datos observados, documentos cotejados o aclaraciones necesarias, sin juicios subjetivos."
        className="mt-2 w-full rounded-xl border border-neutral-300 p-3 text-sm"/></label>
    </div>
    <div className="mt-6 flex flex-wrap gap-3">
     <button type="button" onClick={()=>{setSaved(true);setNotice("Borrador simulado: los datos solo existen en esta pantalla y se perderán al actualizar.")}}
       className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold"><FileText size={16}/> Guardar borrador (demo)</button>
     <button type="button" onClick={()=>{setStep("evidencias");setNotice("")}} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white">Continuar con evidencias →</button>
    </div>
   </section>
  </>}
  {step==="evidencias"&&<>
   <section className="rounded-3xl border border-neutral-200 bg-white p-6">
    <p className="text-xs font-black uppercase tracking-widest text-orange-600">Paso 2 · Evidencias</p>
    <h2 className="mt-2 text-xl font-black">Fotografías, croquis y ubicación</h2>
    <p className="mt-3 text-sm leading-7 text-neutral-600">En la versión operativa, cada archivo tendrá autor, fecha y controles de privacidad. Aquí los archivos se seleccionan solamente para mostrar cómo se verá la experiencia.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
       <Camera className="text-orange-600" size={24}/>
       <span className="mt-3 block text-sm font-black">Tomar o subir foto</span>
       <span className="mt-1 block text-xs leading-5 text-neutral-600">Desde celular se podrá abrir la cámara o seleccionar una imagen.</span>
       <input type="file" accept="image/*" capture="environment" onChange={e=>chooseFile(e,"photo")} className="mt-4 w-full text-xs"/>
       {photo&&<span className="mt-3 block break-all text-xs font-semibold text-orange-700">Seleccionado: {photo}</span>}
      </label>
      <label className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
       <Upload className="text-orange-600" size={24}/>
       <span className="mt-3 block text-sm font-black">Adjuntar croquis o documento</span>
       <span className="mt-1 block text-xs leading-5 text-neutral-600">Imagen o PDF como complemento de la visita.</span>
       <input type="file" accept="image/*,application/pdf" onChange={e=>chooseFile(e,"sketch")} className="mt-4 w-full text-xs"/>
       {sketch&&<span className="mt-3 block break-all text-xs font-semibold text-orange-700">Seleccionado: {sketch}</span>}
      </label>
    </div>
    <div className="mt-5 rounded-2xl border border-neutral-200 p-5">
      <div className="flex items-start gap-3"><MapPin className="shrink-0 text-orange-600" size={22}/><div>
       <h3 className="font-black">Ubicación fija de la visita</h3>
       <p className="mt-2 text-xs leading-6 text-neutral-600">En producción solicitará permiso de geolocalización, registrará precisión, fecha y coordenadas, y conservará ese punto para el PDF. Esta vista demo no consulta el GPS del equipo.</p>
      </div></div>
      {location&&<p className="mt-3 rounded-xl bg-neutral-50 p-3 text-xs font-semibold text-neutral-700">Ejemplo de ubicación: captura ilustrativa sin coordenadas reales.</p>}
      <button type="button" onClick={()=>{setLocation(true);setNotice("Captura de ubicación simulada: no se consultó el GPS ni se guardaron coordenadas.")}}
       className="mt-4 rounded-xl border border-orange-200 px-4 py-3 text-sm font-bold text-orange-700">Simular fijar ubicación</button>
    </div>
    <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" onClick={()=>{setSent(true);setNotice("Envío simulado a revisión FactoRH. No se enviaron datos ni archivos.")}}
       className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white"><ClipboardCheck size={16}/> Enviar a revisión (demo)</button>
      <button type="button" onClick={()=>setStep("entrevista")} className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold">Regresar a entrevista</button>
    </div>
   </section>
  </>}
  <p className="flex items-start gap-2 text-xs leading-6 text-neutral-500"><ShieldCheck size={15} className="mt-1 shrink-0"/> Toda la información es ilustrativa y se conserva únicamente mientras esta demostración permanece abierta. No se realiza captura real de GPS ni carga de fotos.</p>
 </div>;
}
