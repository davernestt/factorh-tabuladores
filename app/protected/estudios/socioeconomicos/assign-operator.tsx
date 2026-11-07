"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

type Worker={user_id:string;display_name:string|null;email:string};
export default function AssignOperator({caseId,current,operators}:{
 caseId:string;current:string|null;operators:Worker[];
}){
 const router=useRouter();
 const [selected,setSelected]=useState(current||"");
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function assign(){
   if(!selected||busy)return;
   setBusy(true);setMessage("");
   try{
     const response=await fetch("/api/estudios/asignar",{
       method:"POST",headers:{"Content-Type":"application/json"},
       body:JSON.stringify({case_id:caseId,operator_id:selected})
     });
     const data=await response.json();
     if(!response.ok)throw new Error(data.error||"No se pudo asignar el estudio.");
     setMessage("Asignación guardada.");
     router.refresh();
   }catch(e){setMessage(e instanceof Error?e.message:"Error inesperado.");}
   finally{setBusy(false)}
 }
 return <div className="mt-4 flex flex-col gap-2 rounded-xl border border-orange-100 bg-orange-50/50 p-3 sm:flex-row sm:items-center">
  <label className="flex-1 text-xs font-semibold text-neutral-700">Aplicador asignado
   <select aria-label="Seleccionar aplicador" className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-2 text-sm"
    value={selected} onChange={e=>setSelected(e.target.value)}>
    <option value="">Sin asignar</option>
    {operators.map(person=><option key={person.user_id} value={person.user_id}>{person.display_name||person.email}</option>)}
   </select>
  </label>
  <button type="button" onClick={assign} disabled={busy||!selected||selected===current}
   className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
   {busy?"Asignando...":current?"Reasignar":"Asignar"}
  </button>
  {message&&<p role="status" className="text-xs text-neutral-700">{message}</p>}
 </div>;
}
