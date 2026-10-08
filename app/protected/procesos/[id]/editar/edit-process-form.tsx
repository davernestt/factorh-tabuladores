"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

type Organization={id:string;name:string};
type Person={id:string;organization_id:string;first_name:string;last_name:string|null;email:string|null;phone:string|null;job_title:string|null;area:string|null};
type Template={id:string;name:string};
type Access={organization_id:string;template_id:string;enabled:boolean;participant_sendable:boolean};
type Assignment={id:string;template_id:string;status:string};
type Reused={id:string;template_id:string};
type Process={id:string;organization_id:string;person_id:string;name:string;status:string;target_date:string|null;public_token:string};

export default function EditProcessForm({process,person,organizations,people,templates,access,assignments,reused}:{process:Process;person:Person;organizations:Organization[];people:Person[];templates:Template[];access:Access[];assignments:Assignment[];reused:Reused[]}){
  const identityLocked=assignments.some(a=>["in_progress","completed"].includes(a.status))||reused.length>0;
  const processCompleted=process.status==="completed";
  const [organizationId,setOrganizationId]=useState(process.organization_id);
  const [personId,setPersonId]=useState(process.person_id);
  const [firstName,setFirstName]=useState(person.first_name);
  const [lastName,setLastName]=useState(person.last_name??"");
  const [email,setEmail]=useState(person.email??"");
  const [phone,setPhone]=useState(person.phone??"");
  const [jobTitle,setJobTitle]=useState(person.job_title??"");
  const [area,setArea]=useState(person.area??"");
  const [processName,setProcessName]=useState(process.name);
  const [dueDate,setDueDate]=useState(process.target_date??"");
  const [selected,setSelected]=useState<string[]>(Array.from(new Set([...assignments.map(a=>a.template_id),...reused.map(r=>r.template_id)])));
  const [saving,setSaving]=useState(false); const [message,setMessage]=useState<string|null>(null); const [error,setError]=useState<string|null>(null);

  const availablePeople=useMemo(()=>people.filter(p=>p.organization_id===organizationId),[people,organizationId]);
  const allowedIds=useMemo(()=>new Set(access.filter(a=>a.organization_id===organizationId&&a.enabled&&a.participant_sendable).map(a=>a.template_id)),[access,organizationId]);
  const availableTemplates=templates.filter(t=>allowedIds.has(t.id));
  const statusByTemplate=new Map(assignments.map(a=>[a.template_id,a.status]));
  const reusedIds=new Set(reused.map(r=>r.template_id));

  function changeOrg(id:string){setOrganizationId(id);setSelected([]);const first=people.find(p=>p.organization_id===id);if(first){setPersonId(first.id);loadPerson(first)}else setPersonId("");}
  function loadPerson(p:Person){setFirstName(p.first_name);setLastName(p.last_name??"");setEmail(p.email??"");setPhone(p.phone??"");setJobTitle(p.job_title??"");setArea(p.area??"");}
  function changePerson(id:string){setPersonId(id);const p=people.find(x=>x.id===id);if(p)loadPerson(p);}
  function toggle(id:string){const status=statusByTemplate.get(id);if(processCompleted||status==="in_progress"||status==="completed")return;setSelected(cur=>cur.includes(id)?cur.filter(x=>x!==id):[...cur,id]);}

  async function submit(e:React.FormEvent){e.preventDefault();setSaving(true);setMessage(null);setError(null);try{
    const response=await fetch(`/api/admin/procesos/${process.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      organization_id:organizationId,person_id:personId,first_name:firstName,last_name:lastName,email,phone,job_title:jobTitle,area,
      process_name:processName,due_date:dueDate||null,template_ids:selected,
    })});
    const payload=await response.json(); if(!response.ok)throw new Error(payload.error||"No fue posible guardar los cambios.");
    setMessage("Cambios guardados. La liga del participante sigue siendo la misma."); window.setTimeout(()=>window.location.reload(),900);
  }catch(err){setError(err instanceof Error?err.message:"No fue posible guardar.");}finally{setSaving(false)}}

  return <form onSubmit={submit} className="space-y-6">
    {identityLocked&&<div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800"><strong>Empresa y colaborador bloqueados.</strong> Este proceso ya tiene avance o resultados reutilizados. Puedes corregir datos de la persona y administrar únicamente pruebas pendientes; las iniciadas o completadas conservan su trazabilidad.</div>}
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8"><div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Datos del proceso</div><h2 className="mt-2 text-xl font-black">Empresa y colaborador</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Field label="Empresa"><select className="input" value={organizationId} disabled={identityLocked} onChange={e=>changeOrg(e.target.value)}>{organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
        <Field label="Colaborador"><select className="input" value={personId} disabled={identityLocked} onChange={e=>changePerson(e.target.value)}>{availablePeople.map(p=><option key={p.id} value={p.id}>{p.first_name} {p.last_name??""}</option>)}</select></Field>
        <Field label="Nombre"><input className="input" value={firstName} onChange={e=>setFirstName(e.target.value)} required/></Field>
        <Field label="Apellidos"><input className="input" value={lastName} onChange={e=>setLastName(e.target.value)}/></Field>
        <Field label="Correo"><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)}/></Field>
        <Field label="Teléfono"><input className="input" value={phone} onChange={e=>setPhone(e.target.value)}/></Field>
        <Field label="Puesto"><input className="input" value={jobTitle} onChange={e=>setJobTitle(e.target.value)}/></Field>
        <Field label="Área"><input className="input" value={area} onChange={e=>setArea(e.target.value)}/></Field>
        <Field label="Nombre del proceso"><input className="input" value={processName} onChange={e=>setProcessName(e.target.value)}/></Field>
        <Field label="Fecha límite"><input className="input" type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></Field>
      </div>
    </section>
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8"><div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Batería</div><h2 className="mt-2 text-xl font-black">Pruebas asignadas</h2><p className="mt-2 text-sm text-neutral-500">Puedes agregar pruebas a la misma liga. Una prueba pendiente puede quitarse. Las que ya iniciaron o fueron completadas quedan bloqueadas.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">{availableTemplates.map(t=>{const status=statusByTemplate.get(t.id);const reusedResult=reusedIds.has(t.id);const locked=processCompleted||status==="in_progress"||status==="completed";const checked=selected.includes(t.id);return <label key={t.id} className={checked?"rounded-2xl border border-orange-300 bg-orange-50 p-4":"rounded-2xl border border-neutral-200 p-4"}><div className="flex items-start gap-3"><input type="checkbox" checked={checked} disabled={locked} onChange={()=>toggle(t.id)} className="mt-1 h-4 w-4 accent-orange-500"/><div><div className="font-bold text-neutral-900">{t.name}</div><div className="mt-1 text-xs text-neutral-500">{reusedResult?"Resultado vigente reutilizado":status==="completed"?"Completada":status==="in_progress"?"En proceso":status==="pending"?"Pendiente":checked?"Nueva":"Disponible"}{locked&&" · bloqueada"}</div></div></div></label>})}</div>
    </section>
    {error&&<div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}{message&&<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}
    <div className="flex flex-wrap justify-between gap-3"><Link href="/protected" className="rounded-xl border border-neutral-300 bg-white px-5 py-3 font-bold text-neutral-700">Cancelar</Link><button disabled={saving||!selected.length} className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white disabled:opacity-40">{saving?"Guardando...":"Guardar cambios"}</button></div>
    <style jsx global>{`.input{width:100%;border:1px solid rgb(212 212 212);border-radius:.75rem;background:white;padding:.75rem .875rem;color:rgb(23 23 23);outline:none}.input:focus{border-color:rgb(249 115 22);box-shadow:0 0 0 3px rgb(255 237 213)}.input:disabled{background:rgb(245 245 245);color:rgb(115 115 115)}`}</style>
  </form>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-2 block text-sm font-semibold text-neutral-800">{label}</span>{children}</label>}
