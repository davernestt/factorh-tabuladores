"use client";
import {useMemo,useState} from "react";
import {PULSE_TOPICS,PULSE_DIMENSIONS} from "@/lib/pulse/topics";
type Question={code:string;dimension_code:string|null;prompt:string;position:number};
export default function PulseThemePicker({questions}:{questions:Question[]}){
 const [topic,setTopic]=useState("comunicacion");
 const [custom,setCustom]=useState<string[]>([]);
 const [show,setShow]=useState(false);
 const selected=PULSE_TOPICS.find(x=>x.id===topic);
 const dimensions=selected?[...selected.dimensionCodes]:custom;
 const matched=useMemo(()=>dimensions.flatMap(d=>questions.filter(q=>q.dimension_code===d)),[dimensions,questions]);
 const valid=dimensions.length>=2&&dimensions.length<=3&&dimensions.every(d=>questions.filter(q=>q.dimension_code===d).length===4);
 function toggle(d:string){
  setCustom(current=>current.includes(d)?current.filter(x=>x!==d):current.length<3?[...current,d]:current);
 }
 return <section className="space-y-5 rounded-2xl border border-neutral-200 p-5">
  <div><h3 className="text-xl font-black text-neutral-800">¿Qué tema quieres medir?</h3>
   <p className="mt-2 text-sm text-neutral-600">Selecciona un tema y FactoRH preparará automáticamente la encuesta. No es necesario elegir preguntas una por una.</p></div>
  <div className="grid gap-3 md:grid-cols-2">
   {PULSE_TOPICS.map(item=><label key={item.id} className={"cursor-pointer rounded-2xl border p-4 transition-colors "+(topic===item.id?"border-orange-500 bg-orange-50":"border-neutral-200 hover:border-orange-200")}>
    <div className="flex items-start gap-3">
     <input type="radio" name="topic" value={item.id} checked={topic===item.id} onChange={()=>{setTopic(item.id);setShow(false)}} className="mt-1 accent-orange-600"/>
     <div><p className="font-black text-neutral-800">{item.name}</p><p className="mt-2 text-sm leading-6 text-neutral-600">{item.description}</p><p className="mt-3 text-xs font-bold text-orange-700">{item.dimensionCodes.length*4} preguntas automáticas</p></div>
    </div>
   </label>)}
   <label className={"cursor-pointer rounded-2xl border p-4 "+(topic==="custom"?"border-orange-500 bg-orange-50":"border-neutral-200 hover:border-orange-200")}>
    <div className="flex items-start gap-3">
     <input type="radio" name="topic" value="custom" checked={topic==="custom"} onChange={()=>{setTopic("custom");setShow(false)}} className="mt-1 accent-orange-600"/>
     <div><p className="font-black text-neutral-800">Tema personalizado</p><p className="mt-2 text-sm leading-6 text-neutral-600">Selecciona dos o tres dimensiones relacionadas. El sistema formará las preguntas automáticamente.</p></div>
    </div>
   </label>
  </div>
  {topic==="custom"&&<div className="rounded-2xl bg-neutral-50 p-4">
   <p className="text-sm font-bold text-neutral-800">Elige 2 o 3 dimensiones</p>
   <p className="mt-1 text-xs text-neutral-600">Dos dimensiones = 8 preguntas; tres dimensiones = 12.</p>
   <div className="mt-3 grid gap-2 md:grid-cols-2">
    {PULSE_DIMENSIONS.map(d=><label key={d.code} className={"flex cursor-pointer gap-2 rounded-xl border p-3 text-sm "+(custom.includes(d.code)?"border-orange-300 bg-white":"border-neutral-200 bg-white")}>
     <input type="checkbox" name="dimensions" value={d.code} checked={custom.includes(d.code)} onChange={()=>toggle(d.code)}
      disabled={!custom.includes(d.code)&&custom.length>=3} className="mt-1 accent-orange-600"/>
     <span>{d.name}</span>
    </label>)}
   </div>
  </div>}
  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><p className="font-black text-neutral-800">{selected?.name||(valid?"Tema personalizado":"Selecciona al menos dos dimensiones")}</p>
     <p className="mt-1 text-sm text-neutral-600">{valid?matched.length+" preguntas · "+dimensions.length+" dimensiones":"Completa la selección para continuar"}</p></div>
    <button type="button" onClick={()=>setShow(v=>!v)} disabled={!valid}
     className="rounded-xl border border-orange-300 bg-white px-4 py-2 text-sm font-bold text-orange-700 disabled:opacity-40">
     {show?"Ocultar preguntas":"Vista previa del cuestionario"}
    </button>
   </div>
   {show&&valid&&<ol className="mt-4 space-y-3 border-t border-orange-200 pt-4">
    {matched.map((q,i)=><li key={q.code} className="text-sm leading-6 text-neutral-700"><strong className="text-orange-700">{i+1}.</strong> {q.prompt}</li>)}
   </ol>}
  </div>
  <p className="text-xs leading-5 text-neutral-500">Los reactivos se copian del banco C3 vigente al crear la campaña. Las mediciones Pulso son exploratorias y sus puntuaciones no equivalen al diagnóstico C3 PRO.</p>
  <button type="submit" disabled={!valid} className="rounded-xl bg-orange-600 px-6 py-3 font-bold text-white hover:bg-orange-700 disabled:opacity-40">Crear pulso con {valid?matched.length:"8–12"} preguntas</button>
 </section>;
}
