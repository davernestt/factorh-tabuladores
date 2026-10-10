"use client";

import { useState } from "react";
import { changeC3CampaignStatus } from "../actions";

export default function CampaignStatusControls({
  campaignId,status
}:{
  campaignId:string;
  status:"draft"|"open"|"closed"|"cancelled";
}){
  const [submitting,setSubmitting]=useState(false);
  if(status==="cancelled")return null;
  const next=status==="open"?"closed":"open";
  const closing=status==="open";
  const label=status==="draft"?"Abrir campaña":closing?"Cerrar campaña":"Reabrir campaña";
  function handleSubmit(e:React.FormEvent<HTMLFormElement>){
    if(closing && !window.confirm(
      "¿Seguro que quieres cerrar esta campaña? Las ligas dejarán de permitir nuevas respuestas. Podrás reabrirla sin perder ligas ni resultados."
    )){e.preventDefault();return;}
    setSubmitting(true);
  }
  return <div className="mt-4">
    <form action={changeC3CampaignStatus} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={campaignId}/>
      <input type="hidden" name="status" value={next}/>
      <button type="submit" disabled={submitting}
        className={"rounded-xl px-5 py-3 text-sm font-bold text-white disabled:opacity-50 "+(closing?"bg-neutral-800 hover:bg-neutral-700":"bg-orange-600 hover:bg-orange-700")}>
        {submitting?"Actualizando...":label}
      </button>
    </form>
    {status==="closed"&&<p className="mt-2 text-sm text-neutral-600">La reapertura conserva el cuestionario, las ligas individuales y las respuestas registradas. Los enlaces pendientes volverán a estar activos.</p>}
  </div>;
}
