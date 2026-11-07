"use client";
import {useRouter} from "next/navigation";
import {useState} from "react";

export default function AcceptStudyRequest({requestId,enabled}:{
 requestId:string;enabled:boolean;
}){
 const router=useRouter();
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function accept(){
  if(!enabled||busy)return;
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/estudios/solicitudes/aceptar",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({request_id:requestId})
   });
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"No se pudo aceptar la solicitud.");
   if(typeof result.case_id!=="string")throw new Error("Falta la referencia del expediente.");
   router.push(`/protected/estudios/socioeconomicos?abierto=${encodeURIComponent(result.case_id)}`);
   router.refresh();
  }catch(cause){setError(cause instanceof Error?cause.message:"No fue posible procesar la solicitud.");}
  finally{setBusy(false)}
 }
 return <div className="flex flex-col items-start gap-2">
  <button type="button" onClick={accept} disabled={!enabled||busy}
   title={!enabled?"Captura real inactiva; requiere verificación de seguridad y privacidad.":undefined}
   className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-600">
    {busy?"Procesando...":"Aceptar y crear expediente"}
  </button>
  {!enabled&&<span className="text-xs text-neutral-500">Pendiente de activación segura</span>}
  {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
 </div>;
}
