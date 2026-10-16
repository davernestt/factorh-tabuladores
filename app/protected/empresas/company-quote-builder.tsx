"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {commercialPackages,calculateQuote,type QuoteRequestItem} from "@/lib/company-commercial-pricing";

const mxn=(n:number)=>n.toLocaleString("es-MX",{style:"currency",currency:"MXN"});
const defaultItem=():QuoteRequestItem=>({packageId:"360-15",quantity:15,negotiatedPrice:6990});

export default function CompanyQuoteBuilder({organizationId}:{organizationId:string}){
 const router=useRouter();
 const [items,setItems]=useState<QuoteRequestItem[]>([defaultItem()]);
 const [promo,setPromo]=useState(false);
 const [notes,setNotes]=useState("");
 const [expiresOn,setExpiresOn]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const today=new Date().toISOString().slice(0,10);
 let estimate:ReturnType<typeof calculateQuote>|null=null;
 let error="";
 try{estimate=calculateQuote(items,promo,today)}catch(e){error=e instanceof Error?e.message:"Error de cotización";}
 const change=(index:number,update:Partial<QuoteRequestItem>)=>setItems(rows=>rows.map((r,i)=>i===index?{...r,...update}:r));
 const eligibleTypes=new Set(items.map(i=>commercialPackages.find(p=>p.id===i.packageId)).filter(p=>p?.promoEligible).map(p=>p!.moduleKey));
 async function save(){
  if(!estimate)return;
  setBusy(true);setMessage("");
  try{
   const r=await fetch(`/api/admin/empresas/${organizationId}/cotizaciones`,{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({items,applyPromo:promo,notes,expiresOn})
   });
   const data=await r.json();
   if(!r.ok)throw Error(data.error||"No se pudo guardar");
   setMessage("Cotización guardada en el historial comercial. No modifica licencias ni créditos.");
   router.refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"Error inesperado");}
  finally{setBusy(false);}
 }
 return <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div>
    <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Comercial · FactoRH</p>
    <h2 className="mt-2 text-2xl font-black text-neutral-900">Configurador de paquetes</h2>
    <p className="mt-2 max-w-3xl text-sm leading-7 text-neutral-600">Usa los paquetes del brochure como referencia, modifica cantidades y precios según lo negociado y guarda la propuesta. Las cotizaciones no activan servicios ni representan pagos cobrados.</p>
   </div>
   <button type="button" disabled={items.length>=12} onClick={()=>setItems(old=>[...old,defaultItem()])} className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700 disabled:opacity-50">+ Agregar servicio</button>
  </div>
  <div className="mt-5 space-y-4">
   {items.map((item,index)=>{
    const pack=commercialPackages.find(p=>p.id===item.packageId)!;
    const base=Math.round(pack.price*item.quantity/pack.quantity*100)/100;
    return <div key={index} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
     <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-bold text-neutral-800">Servicio {index+1}</p>
      <button type="button" disabled={items.length===1} onClick={()=>setItems(rows=>rows.filter((_,i)=>i!==index))} className="text-xs font-bold text-red-600 disabled:opacity-30">Quitar</button>
     </div>
     <div className="mt-3 grid gap-3 lg:grid-cols-[1.7fr_.65fr_1fr_1fr]">
      <label className="text-xs font-bold text-neutral-600">Paquete
       <select value={item.packageId} onChange={e=>{const p=commercialPackages.find(p=>p.id===e.target.value)!;change(index,{packageId:p.id,quantity:p.quantity,negotiatedPrice:p.price});}} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm">
        {commercialPackages.map(p=><option value={p.id} key={p.id}>{p.moduleName} · {p.label}</option>)}
       </select>
      </label>
      <label className="text-xs font-bold text-neutral-600">Cantidad
       <input type="number" min="1" max="10000" value={item.quantity} onChange={e=>change(index,{quantity:Number(e.target.value)})} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm"/>
      </label>
      <div className="text-xs font-bold text-neutral-600">Referencia prorrateada
       <div className="mt-2 rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm font-semibold text-neutral-700">{mxn(base)}</div>
      </div>
      <label className="text-xs font-bold text-neutral-600">Precio negociado
       <input type="number" min="0" max="10000000" step="0.01" value={item.negotiatedPrice} onChange={e=>change(index,{negotiatedPrice:Number(e.target.value)})} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm"/>
      </label>
     </div>
     <p className="mt-2 text-xs text-neutral-500">{pack.unit} · {item.quantity!==pack.quantity?"Cantidad personalizada: la referencia es proporcional, no una tarifa de lista publicada.":"Paquete estándar del brochure."}</p>
    </div>;
   })}
  </div>
  <div className="mt-5 grid gap-4 sm:grid-cols-2">
   <label className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
    <input type="checkbox" checked={promo} onChange={e=>setPromo(e.target.checked)} className="mt-1 h-4 w-4 accent-orange-600"/>
    <span className="text-sm leading-6 text-orange-900"><strong>Promoción 50% (oct.–dic. 2026)</strong><span className="block text-xs">Mínimo dos módulos diferentes elegibles. Estudios Socioeconómicos no se descuentan ni cuentan para el mínimo. Módulos elegibles seleccionados: {eligibleTypes.size}.</span></span>
   </label>
   <label className="block text-xs font-bold text-neutral-600">Vigencia de la cotización (opcional)
    <input type="date" min={today} value={expiresOn} onChange={e=>setExpiresOn(e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm"/>
   </label>
  </div>
  <label className="mt-4 block text-xs font-bold text-neutral-600">Condiciones negociadas (opcional)
   <textarea maxLength={1500} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Ej. 17 evaluaciones 360°; activar al confirmar pago." className="mt-2 min-h-20 w-full rounded-xl border border-neutral-300 p-3 text-sm"/>
  </label>
  <div className="mt-5 rounded-2xl bg-neutral-800 p-5 text-white">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><p className="text-xs text-neutral-300">Subtotal negociado (sin IVA)</p><p className="mt-1 text-lg font-bold">{estimate?mxn(estimate.subtotal):"—"}</p></div>
    <div><p className="text-xs text-neutral-300">Descuento aplicable</p><p className="mt-1 text-lg font-bold">{estimate?mxn(estimate.discount):"—"}</p></div>
    <div><p className="text-xs text-neutral-300">Total de cotización · sin IVA</p><p className="mt-1 text-2xl font-black">{estimate?mxn(estimate.total):"—"}</p></div>
   </div>
  </div>
  {error&&<p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  {message&&<p role="status" className="mt-3 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700">{message}</p>}
  <div className="mt-4 flex justify-end">
   <button type="button" disabled={!estimate||busy} onClick={()=>void save()} className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-black text-white disabled:opacity-40">{busy?"Guardando...":"Guardar cotización en expediente"}</button>
  </div>
 </section>;
}
