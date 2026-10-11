"use client";
import {useMemo,useRef,useState} from "react";
type Item={code:string;instrument_code:string;dimension_name:string|null;pillar:string|null;prompt:string;response_type:string;position:number};
type Answer={score?:number;text?:string;na?:boolean;na_reason?:"not_applicable"|"no_information"};
const choices=[{value:1,label:"Totalmente en desacuerdo"},{value:2,label:"En desacuerdo"},{value:3,label:"Ni de acuerdo ni en desacuerdo"},{value:4,label:"De acuerdo"},{value:5,label:"Totalmente de acuerdo"}];
export default function C3ParticipantForm({token,items}:{token:string;items:Item[]}){
 const [values,setValues]=useState<Record<string,Answer>>({});
 const [page,setPage]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(""),[done,setDone]=useState(false);
 const firstProblem=useRef<HTMLDivElement|null>(null);
 const pageSize=8,pages=Math.ceil(items.length/pageSize),part=items.slice(page*pageSize,(page+1)*pageSize);
 const update=(key:string,value:Answer)=>{setValues(prev=>({...prev,[key]:value}));setError("");};
 const complete=(it:Item)=>{const v=values[it.code];return !!v&&(
   it.response_type==="open" || v.na===true || typeof v.score==="number"
 );};
 const required=useMemo(()=>items.filter(it=>it.response_type!=="open"),[items]);
 const answered=required.filter(complete).length;
 const progress=required.length?Math.round(100*answered/required.length):100;
 const missing=part.filter(it=>!complete(it)&&it.response_type!=="open");
 function next(){
  if(missing.length){
   setError("Falta responder: "+missing.map(it=>it.code).join(", ")+". Revisa las preguntas señaladas.");
   firstProblem.current?.scrollIntoView({behavior:"smooth",block:"center"});return;
  }
  setPage(x=>Math.min(pages-1,x+1));setError("");window.scrollTo(0,0);
 }
 async function submit(){
  const notAnswered=required.filter(it=>!complete(it));
  if(notAnswered.length){
   const first=items.findIndex(it=>it.code===notAnswered[0].code);
   setPage(Math.floor(first/pageSize));
   setError("Faltan respuestas en "+notAnswered.map(x=>x.code).slice(0,8).join(", ")+".");
   window.scrollTo(0,0);return;
  }
  setBusy(true);setError("");
  try{
   const answers=items.map(it=>({code:it.code,...values[it.code]})).filter(x=>x.score!==undefined||x.na||x.text!==undefined);
   const res=await fetch("/api/c3/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,answers})});
   const result=await res.json();
   if(!res.ok)throw new Error(result.error||"No se guardaron tus respuestas.");
   setDone(true);setValues({});
  }catch(e){setError(e instanceof Error?e.message:"Ocurrió un error. No cierres la página.");}finally{setBusy(false);}
 }
 if(done)return <section className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm"><h2 className="text-2xl font-black text-neutral-800">¡Gracias por participar!</h2><p className="mt-3 text-neutral-600">Tus respuestas se registraron correctamente. Puedes cerrar esta ventana.</p></section>;
 return <section className="mt-6 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
  <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-neutral-700"><span>Sección {page+1} de {pages}</span><span>{answered} de {required.length} preguntas contestadas · {progress}%</span></div>
  <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full bg-orange-500 transition-all" style={{width:progress+"%"}} /></div>
  <p className="mt-3 text-xs leading-5 text-neutral-500">Tu avance se guarda en esta página mientras permanezca abierta. No se envían resultados hasta que presiones «Enviar respuestas» al final.</p>
  <div className="mt-7 space-y-8">{part.map((it,index)=>{
   const incomplete=it.response_type!=="open"&&!complete(it);
   const relevant=missing.length>0&&missing[0].code===it.code;
   const active=values[it.code];
   const options=it.response_type==="enps"?Array.from({length:11},(_,i)=>({value:i,label:String(i)})):choices;
   return <div key={it.code} ref={relevant?firstProblem:undefined} className={"border-b pb-7 last:border-0 "+(error&&incomplete?"border-orange-300":"border-neutral-100")}>
     <p className="text-base font-semibold leading-7 text-neutral-800"><span className="text-orange-600">{it.code}</span> · {it.prompt}</p>
     <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-orange-600">{it.pillar&&it.pillar!=="Complementario"?it.pillar+" · ":""}{it.dimension_name&&it.dimension_name!=="Pregunta abierta"?it.dimension_name:""}</p>
     {it.response_type==="open"?
      <textarea aria-label={"Respuesta a "+it.code} maxLength={3000} value={active?.text||""} onChange={e=>update(it.code,{text:e.target.value})} rows={4} className="mt-4 w-full rounded-xl border border-neutral-300 p-3 text-sm" placeholder="Respuesta opcional. Evita nombres o información identificable."/>:
      <div role="group" aria-label={"Opciones de "+it.code} className="mt-4 grid gap-2">
       {options.map(opt=><button type="button" key={opt.value} aria-pressed={active?.score===opt.value}
         onClick={()=>update(it.code,{score:opt.value})}
         className={"flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm "+(active?.score===opt.value?"border-orange-500 bg-orange-50 font-semibold text-orange-800":"border-neutral-200 hover:bg-neutral-50")}>
          <span aria-hidden="true" className={"inline-flex h-4 w-4 flex-none rounded-full border-2 "+(active?.score===opt.value?"border-orange-600 bg-orange-600":"border-neutral-400")} />{opt.label}
        </button>)}
       {[{id:"not_applicable" as const,label:"No aplica a mis funciones o experiencia"},{id:"no_information" as const,label:"No tengo información suficiente"}].map(opt=>
        <button type="button" key={opt.id} aria-pressed={active?.na_reason===opt.id} onClick={()=>update(it.code,{na:true,na_reason:opt.id})}
        className={"flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm "+(active?.na_reason===opt.id?"border-orange-500 bg-orange-50 font-semibold text-orange-800":"border-neutral-200 hover:bg-neutral-50")}>
         <span aria-hidden="true" className={"inline-flex h-4 w-4 flex-none rounded-full border-2 "+(active?.na_reason===opt.id?"border-orange-600 bg-orange-600":"border-neutral-400")}/>{opt.label}
        </button>)}
      </div>}
   </div>;
  })}</div>
  {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
  <div className="mt-6 flex flex-wrap justify-between gap-3">
   <button type="button" onClick={()=>{setError("");setPage(x=>Math.max(0,x-1));window.scrollTo(0,0);}} disabled={page===0||busy} className="rounded-xl border border-neutral-300 px-5 py-3 font-bold text-neutral-700 disabled:opacity-40">Anterior</button>
   {page<pages-1?
    <button type="button" onClick={next} disabled={busy} className="rounded-xl bg-orange-600 px-6 py-3 font-bold text-white disabled:opacity-40">Siguiente →</button>:
    <button type="button" disabled={busy} onClick={submit} className="rounded-xl bg-orange-600 px-6 py-3 font-bold text-white disabled:opacity-40">{busy?"Guardando...":"Enviar respuestas"}</button>}
  </div>
 </section>;
}
