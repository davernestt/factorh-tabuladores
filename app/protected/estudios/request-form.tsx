"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
export default function RequestForm({serviceKey,serviceName}:{serviceKey:string;serviceName:string}){
 const [open,setOpen]=useState(false),[quantity,setQuantity]=useState(1),[pending,setPending]=useState(false),[error,setError]=useState("");
 const router=useRouter();
 async function submit(e:React.FormEvent){e.preventDefault();setPending(true);setError("");try{
 const res=await fetch("/api/estudios/solicitudes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service_key:serviceKey,quantity})});const data=await res.json();
 if(!res.ok)throw Error(data.error||"No fue posible realizar la solicitud");
 setOpen(false);router.refresh();
 }catch(e){setError(e instanceof Error?e.message:"No se pudo solicitar");}finally{setPending(false)}}
 return <div className="mt-4">{!open?<button type="button" onClick={()=>setOpen(true)} className="rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-bold text-orange-700">Solicitar servicio →</button>:
 <form onSubmit={submit} className="space-y-3"><p className="text-xs font-semibold">Solicitar {serviceName}</p>
 <label className="block text-xs text-neutral-700">Cantidad
 <input className="mt-1 w-24 rounded-lg border border-neutral-300 p-2" type="number" min={1} max={100} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label>
 <p className="text-xs text-neutral-500">FactoRH confirmará el alcance antes de iniciar la investigación. No compartas datos personales de candidatos en esta solicitud.</p>
 {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
 <div className="flex gap-2"><button disabled={pending} className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Enviar solicitud</button><button type="button" onClick={()=>setOpen(false)} className="text-xs text-neutral-600">Cancelar</button></div></form>}</div>
}