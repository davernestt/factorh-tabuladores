"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import UserManager from "./user-manager";

type Organization={id:string;name:string;active:boolean;slug:string};
type AppUser={
  user_id:string;email:string;display_name:string|null;role:string;
  organization_id:string|null;active:boolean;created_at:string;client_access_level:string;
};

export default function ClientAccessDirectory({users,organizations}:{
  users:AppUser[];organizations:Organization[]
}){
  const [search,setSearch]=useState("");
  const [company,setCompany]=useState("");
  const [state,setState]=useState("all");
  const [processing,setProcessing]=useState<string|null>(null);
  const [recovery,setRecovery]=useState<{email:string;url:string}|null>(null);
  const [error,setError]=useState("");
  const [copied,setCopied]=useState(false);
  const orgs=new Map(organizations.map(org=>[org.id,org]));
  const clientUsers=users.filter(user=>user.role==="client");
  const filtered=useMemo(()=>clientUsers.filter(user=>{
    const companyName=orgs.get(user.organization_id||"")?.name||"";
    const searchable=`${user.display_name||""} ${user.email} ${companyName}`.toLocaleLowerCase("es");
    return searchable.includes(search.trim().toLocaleLowerCase("es"))&&
      (!company||user.organization_id===company)&&
      (state==="all"||(state==="active"&&user.active)||(state==="inactive"&&!user.active));
  }),[users,search,company,state]);
  async function newRecovery(user:AppUser){
    setProcessing(user.user_id);setRecovery(null);setError("");setCopied(false);
    try{
      const result=await fetch(`/api/admin/usuarios/${user.user_id}/recuperar`,{method:"POST",cache:"no-store"});
      const payload=await result.json();
      if(!result.ok||!payload.recovery_url)throw Error(payload.error||"No se pudo emitir un enlace.");
      setRecovery({email:payload.email,url:payload.recovery_url});
    }catch(e){setError(e instanceof Error?e.message:"No se pudo generar el enlace.");}
    finally{setProcessing(null);}
  }
  async function copyRecovery(){
    if(!recovery)return;
    try{await navigator.clipboard.writeText(recovery.url);setCopied(true);}
    catch{setError("No se pudo copiar. Selecciona y copia el enlace manualmente.");}
  }
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3">
      {[
        ["Cuentas de empresa",clientUsers.length],
        ["Accesos activos",clientUsers.filter(user=>user.active).length],
        ["Empresas con usuario",new Set(clientUsers.map(user=>user.organization_id).filter(Boolean)).size],
      ].map(([title,value])=><div key={title} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{title}</p>
        <p className="mt-2 text-3xl font-black text-neutral-900">{value}</p>
      </div>)}
    </div>
    <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-neutral-900">Directorio seguro de accesos</h2>
      <p className="mt-2 text-sm leading-7 text-neutral-600">
        Consulta quién tiene acceso y a qué empresa pertenece. Puedes editar su cuenta,
        desactivarla o generar un enlace temporal para que la persona establezca una nueva contraseña.
        Por seguridad no se almacenan contraseñas en este directorio.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <label className="text-xs font-semibold text-neutral-600">Buscar usuario
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nombre, correo o empresa"
            className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm"/>
        </label>
        <label className="text-xs font-semibold text-neutral-600">Empresa
          <select value={company} onChange={e=>setCompany(e.target.value)}
            className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm">
            <option value="">Todas las empresas</option>
            {organizations.map(org=><option value={org.id} key={org.id}>{org.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-neutral-600">Estatus
          <select value={state} onChange={e=>setState(e.target.value)}
            className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm">
            <option value="all">Todos</option><option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </label>
      </div>
    </section>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="space-y-3">
      {filtered.length===0&&<p className="rounded-2xl bg-white p-7 text-sm text-neutral-500">No hay usuarios con estos filtros.</p>}
      {filtered.map(user=>{
        const org=orgs.get(user.organization_id||"");
        return <article key={user.user_id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-base font-black text-neutral-900">{user.display_name||"Usuario de empresa"}</p>
              <p className="mt-1 break-all text-sm text-neutral-600">{user.email}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-lg bg-neutral-100 px-3 py-1.5 font-bold text-neutral-700">{org?.name||"Empresa sin asignar"}</span>
                <span className="rounded-lg bg-neutral-100 px-3 py-1.5 font-semibold text-neutral-600">{user.active?"Activo":"Suspendido"}</span>
                <span className="rounded-lg bg-neutral-100 px-3 py-1.5 font-semibold text-neutral-600">{user.client_access_level==="administrator"?"Administrador de empresa":"Colaborador"}</span>
                <span className="text-neutral-400">Creado: {new Date(user.created_at).toLocaleDateString("es-MX")}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {org&&<Link href={`/protected/empresas/${org.id}`}
                className="rounded-xl border border-neutral-300 px-4 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50">Empresa</Link>}
              <UserManager organizations={organizations.filter(o=>o.active)} user={user}/>
              <button type="button" disabled={processing!==null||!user.active}
                onClick={()=>void newRecovery(user)}
                className="rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">
                {processing===user.user_id?"Generando...":"Recuperar acceso"}
              </button>
            </div>
          </div>
        </article>;
      })}
    </div>
    {recovery&&<section className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[.15em] text-orange-700">Recuperación segura</p>
      <h3 className="mt-2 text-lg font-black text-neutral-900">Nuevo enlace para {recovery.email}</h3>
      <p className="mt-3 text-sm leading-7 text-neutral-600">
        Copia y envía este enlace <strong>únicamente al titular</strong> por un canal privado.
        El cliente establece su propia contraseña. El enlace es sensible, temporal y no se guarda como contraseña.
      </p>
      <p className="mt-3 break-all rounded-xl bg-neutral-50 p-4 text-xs text-neutral-700">{recovery.url}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={()=>void copyRecovery()}
          className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white">{copied?"Copiado":"Copiar enlace"}</button>
        <button type="button" onClick={()=>{setRecovery(null);setCopied(false);}}
          className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-bold text-neutral-700">Ocultar enlace</button>
      </div>
    </section>}
  </div>;
}
