"use client";
import {useState} from "react";
import Link from "next/link";
type Organization={id:string;name:string};
type Department={id:string;organization_id:string;name:string;active:boolean};
export default function DepartmentsManager({organizations,initialDepartments}:{organizations:Organization[];initialDepartments:Department[]}){
 const [org,setOrg]=useState(organizations.length===1?organizations[0].id:"");
 const [name,setName]=useState("");
 const [rows,setRows]=useState(initialDepartments);
 const [working,setWorking]=useState(false);
 const [error,setError]=useState("");
 async function add(event:React.FormEvent){
  event.preventDefault();setWorking(true);setError("");
  try{
   const res=await fetch("/api/360/departamentos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({organization_id:org,name})});
   const data=await res.json();
   if(!res.ok)throw Error(data.error||"No se pudo guardar.");
   setRows(old=>[...old,data.department].sort((a,b)=>a.name.localeCompare(b.name,"es")));
   setName("");
  }catch(e){setError(e instanceof Error?e.message:"Error inesperado.");}
  finally{setWorking(false);}
 }
 return <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
  <form onSubmit={add} className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-lg font-black text-neutral-800">Crear departamento</h2>
   <label className="mt-5 block text-sm font-bold text-neutral-700">Empresa
    <select value={org} onChange={e=>setOrg(e.target.value)} required className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3">
     <option value="">Seleccionar empresa</option>{organizations.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
    </select>
   </label>
   <label className="mt-4 block text-sm font-bold text-neutral-700">Nombre del departamento
    <input value={name} onChange={e=>setName(e.target.value)} required maxLength={100} placeholder="Ej. Operaciones" className="mt-2 w-full rounded-xl border border-neutral-300 p-3"/>
   </label>
   {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
   <button type="submit" disabled={working||!org||name.trim().length<2} className="mt-5 rounded-xl bg-orange-500 px-5 py-3 font-bold text-white disabled:opacity-50">{working?"Guardando...":"Guardar departamento"}</button>
  </form>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-lg font-black text-neutral-800">Departamentos de la empresa</h2>
   <p className="mt-2 text-sm text-neutral-500">Aparecerán al registrar o actualizar personas en el 360°.</p>
   <div className="mt-4 space-y-2">{rows.filter(x=>x.organization_id===org).map(d=><div key={d.id} className="rounded-xl bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-700">{d.name}</div>)}
   {!rows.some(x=>x.organization_id===org)&&<p className="text-sm text-neutral-500">Sin departamentos registrados.</p>}</div>
   <Link href="/protected/evaluaciones" className="mt-5 inline-block text-sm font-bold text-orange-600">Volver al centro de evaluaciones →</Link>
  </section>
 </div>;
}
