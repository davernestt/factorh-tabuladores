"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import type {EseGroup} from "@/lib/ese/master-schema";

type Saved={section_key:string;data:Record<string,string>;completed:boolean};
export default function SectionCapture({caseId,groups,initial}:{
 caseId:string;groups:EseGroup[];initial:Saved[];
}){
 const router=useRouter();
 const [index,setIndex]=useState(0);
 const [data,setData]=useState<Record<string,Record<string,string>>>(()=>
   Object.fromEntries(initial.map(s=>[s.section_key,s.data||{}])));
 const [done,setDone]=useState<Record<string,boolean>>(()=>
   Object.fromEntries(initial.map(s=>[s.section_key,s.completed])));
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const group=groups[index];
 function change(key:string,value:string){
   setData(prev=>({...prev,[group.id]:{...(prev[group.id]||{}),[key]:value}}));
   setMessage("");
 }
 async function save(completed:boolean){
   if(busy)return;
   setBusy(true);setMessage("");
   try{
     const response=await fetch(`/api/estudios/captura/${encodeURIComponent(caseId)}`,{
       method:"PUT",headers:{"Content-Type":"application/json"},
       body:JSON.stringify({section_key:group.id,data:data[group.id]||{},completed})
     });
     const result=await response.json();
     if(!response.ok)throw Error(result.error||"No fue posible guardar la sección.");
     setDone(prev=>({...prev,[group.id]:completed}));
     setMessage(`Sección guardada. Avance registrado: ${result.progress}%.`);
     router.refresh();
   }catch(e){setMessage(e instanceof Error?e.message:"Error al guardar.");}
   finally{setBusy(false)}
 }
 const completedCount=groups.filter(g=>done[g.id]).length;
 return <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
   <nav aria-label="Secciones del estudio" className="space-y-1 rounded-2xl border border-neutral-200 bg-white p-3">
     <p className="px-3 py-3 text-xs font-bold text-neutral-500">Secciones terminadas: {completedCount} / {groups.length}</p>
     {groups.map((item,i)=><button type="button" key={item.id} onClick={()=>{setIndex(i);setMessage("");}}
       className={`w-full rounded-lg px-3 py-3 text-left text-xs font-semibold ${i===index?"bg-orange-50 text-orange-700":"text-neutral-700 hover:bg-neutral-50"}`}>
       {done[item.id]?"✓ ":"○ "}{item.title}
     </button>)}
   </nav>
   <section className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7">
     <p className="text-xs font-bold uppercase tracking-wide text-orange-700">Formato maestro FactoRH · Página {group.page}</p>
     <h2 className="mt-3 text-xl font-black text-neutral-900">{group.title}</h2>
     <p className="mt-2 text-xs leading-6 text-neutral-500">Guarda cada sección antes de cambiar de dispositivo. Una sección puede permanecer en borrador.</p>
     <div className="mt-6 grid gap-5 sm:grid-cols-2">
       {group.fields.map(f=><label key={f.key} className={`block text-sm font-semibold text-neutral-700 ${f.kind==="textarea"?"sm:col-span-2":""}`}>
         {f.label}
         {f.kind==="textarea"?<textarea rows={3} maxLength={f.max||180} value={data[group.id]?.[f.key]||""}
           onChange={e=>change(f.key,e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 p-3 text-sm"/>:
          f.kind==="select"?<select value={data[group.id]?.[f.key]||""} onChange={e=>change(f.key,e.target.value)}
           className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm">
           {(f.options||[]).map(o=><option key={o} value={o}>{o||"Seleccionar"}</option>)}
          </select>:
          <input type={f.kind==="date"?"date":f.kind==="money"||f.kind==="number"?"number":"text"}
           step={f.kind==="money"?"0.01":f.kind==="number"?"1":undefined}
           min={f.kind==="money"||f.kind==="number"?"0":undefined}
           maxLength={f.max||180} value={data[group.id]?.[f.key]||""}
           onChange={e=>change(f.key,e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm"/>}
       </label>)}
     </div>
     {message&&<p role="status" className="mt-5 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">{message}</p>}
     <div className="mt-8 flex flex-wrap gap-3 border-t border-neutral-100 pt-5">
       <button type="button" onClick={()=>save(false)} disabled={busy} className="rounded-xl border border-orange-300 px-5 py-3 text-sm font-bold text-orange-700 disabled:opacity-50">{busy?"Guardando...":"Guardar borrador"}</button>
       <button type="button" onClick={()=>save(true)} disabled={busy} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Guardar y terminar sección</button>
     </div>
   </section>
 </div>;
}
