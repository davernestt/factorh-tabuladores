"use client";
import {useState} from "react";
type Item={code:string;instrument_code:string;dimension_name:string|null;pillar:string|null;prompt:string;response_type:string;position:number;shared_with:string|null};
type Answer={score?:number;text?:string;na?:boolean};
export default function C3ParticipantForm({token,items}:{token:string;items:Item[]}){
 const [values,setValues]=useState<Record<string,Answer>>({}),[page,setPage]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(""),[done,setDone]=useState(false);
 const pageSize=8, pages=Math.ceil(items.length/pageSize),part=items.slice(page*pageSize,(page+1)*pageSize);
 const update=(key:string,value:Answer)=>setValues(p=>({...p,[key]:value}));
 const complete=(it:Item)=>{const v=values[it.code];return !!v&&(v.na===true||(it.response_type==="open"?true:typeof v.score==="number"));};
 const missing=part.filter(it=>!complete(it)&&it.response_type!=="open");
 async function submit(){
   if(items.some(it=>!complete(it)&&it.response_type!=="open")){setError("Completa las preguntas de opción múltiple para continuar.");return;}
   setBusy(true);setError("");
   try{
     const answers=items.map(it=>({code:it.code,...values[it.code]})).filter(x=>x.score!==undefined||x.na||x.text!==undefined);
     const res=await fetch("/api/c3/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,answers})});
     const result=await res.json();if(!res.ok)throw new Error(result.error||"No se guardaron tus respuestas.");
     setDone(true);setValues({});
   }catch(e){setError(e instanceof Error?e.message:"Ocurrió un error.");}finally{setBusy(false)}
 }
 if(done)return <section className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm"><h2 className="text-2xl font-black text-neutral-800">¡Gracias por participar!</h2><p className="mt-3 text-neutral-600">Tus respuestas se registraron correctamente. Puedes cerrar esta ventana.</p></section>;
 return <section className="mt-6 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
 <div className="flex items-center justify-between gap-3 text-sm font-bold text-neutral-700"><span>Sección {page+1} de {pages}</span><span>{Math.round((page/pages)*100)}% recorrido</span></div>
 <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full bg-orange-500" style={{width:(page/pages)*100+"%"}} /></div>
 <div className="mt-7 space-y-8">{part.map((it,index)=><fieldset key={it.code} className="border-b border-neutral-100 pb-7 last:border-0">
 <legend className="text-base font-semibold leading-7 text-neutral-800">{page*pageSize+index+1}. {it.prompt}</legend>
 <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-orange-600">{it.pillar&&it.pillar!=="Complementario"?it.pillar+" · ":""}{it.dimension_name&&it.dimension_name!=="Pregunta abierta"?it.dimension_name:""}</p>
 {it.response_type==="open"?<textarea maxLength={3000} value={values[it.code]?.text||""} onChange={e=>update(it.code,{text:e.target.value})} rows={4} className="mt-4 w-full rounded-xl border border-neutral-300 p-3 text-sm" placeholder="Respuesta opcional. Evita nombres o información que identifique a alguien."/>:
 <div className="mt-4 grid gap-2">{(it.response_type==="enps"?Array.from({length:11},(_,i)=>({value:i,label:String(i)})):[{value:1,label:"Totalmente en desacuerdo"},{value:2,label:"En desacuerdo"},{value:3,label:"Ni de acuerdo ni en desacuerdo"},{value:4,label:"De acuerdo"},{value:5,label:"Totalmente de acuerdo"}]).map(opt=><label key={opt.value} className={"flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm "+(values[it.code]?.score===opt.value?"border-orange-400 bg-orange-50":"border-neutral-200 hover:bg-neutral-50")}><input type="radio" name={it.code} checked={values[it.code]?.score===opt.value} onChange={()=>update(it.code,{score:opt.value})}/>{opt.label}</label>)}
 <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 p-3 text-sm"><input type="radio" name={it.code} checked={!!values[it.code]?.na} onChange={()=>update(it.code,{na:true})}/>No aplica / No tengo información suficiente</label>
 </div>}</fieldset>)}</div>
 {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
 <div className="mt-6 flex flex-wrap justify-between gap-3"><button type="button" onClick={()=>{setError("");setPage(x=>Math.max(0,x-1));window.scrollTo(0,0)}} disabled={page===0||busy} className="rounded-xl border border-neutral-300 px-5 py-3 font-bold text-neutral-700 disabled:opacity-40">Anterior</button>
 {page<pages-1?<button type="button" onClick={()=>{if(missing.length){setError("Contesta todas las preguntas de opción múltiple de esta sección.");return;}setError("");setPage(x=>x+1);window.scrollTo(0,0)}} className="rounded-xl bg-orange-600 px-6 py-3 font-bold text-white">Siguiente →</button>:
 <button type="button" disabled={busy} onClick={submit} className="rounded-xl bg-orange-600 px-6 py-3 font-bold text-white disabled:opacity-50">{busy?"Enviando...":"Enviar respuestas"}</button>}</div>
 </section>;
}
