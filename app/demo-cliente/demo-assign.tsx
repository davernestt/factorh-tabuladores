"use client";

import {useState} from "react";
import Link from "next/link";

const instruments = [
  {id:"bigfive",name:"Personalidad Laboral Big Five FactoRH",detail:"Tendencias de personalidad relacionadas con el trabajo"},
  {id:"reasoning",name:"Razonamiento Laboral General FactoRH",detail:"Razonamiento verbal, numérico y lógico"},
  {id:"integrity",name:"Integridad y Criterio Laboral FactoRH",detail:"Responsabilidad, apego a normas y criterio ético"},
];

export default function DemoAssign(){
  const [person,setPerson]=useState("Alex Rivera (ejemplo)");
  const [mail,setMail]=useState("participante@ejemplo.invalid");
  const [selected,setSelected]=useState<string[]>([instruments[0].id]);
  const [done,setDone]=useState(false);
  const chosen=instruments.filter(x=>selected.includes(x.id));
  function toggle(id:string){setDone(false);setSelected(old=>old.includes(id)?old.filter(v=>v!==id):[...old,id])}
  function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setDone(true)}
  return <div className="space-y-6">
    <div>
      <Link href="/demo-cliente?seccion=psicometrias" className="text-sm font-semibold text-neutral-500 hover:text-orange-600">← Volver a Mis psicometrías</Link>
      <p className="mt-5 text-xs font-black uppercase tracking-widest text-orange-600">Psicometrías · Prueba gratuita</p>
      <h1 className="mt-2 text-3xl font-black text-neutral-900">Asignar psicometría</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">Este formulario recrea los pasos de asignación de una empresa con dos aplicaciones demo. Puedes cambiar los datos y generar una simulación sin enviar correos ni usar créditos.</p>
    </div>
    <form onSubmit={submit} className="space-y-5">
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Paso 1 · Participante</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-neutral-700">Nombre de la persona
            <input required value={person} onChange={e=>{setPerson(e.target.value);setDone(false)}} className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm"/>
          </label>
          <label className="text-sm font-semibold text-neutral-700">Correo electrónico
            <input type="email" required value={mail} onChange={e=>{setMail(e.target.value);setDone(false)}} className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm"/>
          </label>
        </div>
      </section>
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Paso 2 · Elegir psicometrías</p>
        <h2 className="mt-2 text-xl font-black text-neutral-900">Selecciona una, varias o todas las pruebas</h2>
        <p className="mt-2 text-sm text-neutral-600">En la prueba gratuita real puedes asignar varias psicometrías a un candidato usando una sola liga. El consumo es una aplicación por candidato, no por instrumento.</p>
        <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={()=>{setSelected(instruments.map(i=>i.id));setDone(false)}} className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700">Seleccionar todas</button><button type="button" onClick={()=>{setSelected([]);setDone(false)}} className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-bold text-neutral-700">Limpiar</button></div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {instruments.map(i=><label key={i.id} className={"flex cursor-pointer gap-3 rounded-xl border p-4 "+(selected.includes(i.id)?"border-orange-400 bg-orange-50":"border-neutral-200")}>
            <input type="checkbox" name="instruments" checked={selected.includes(i.id)} onChange={()=>toggle(i.id)} className="mt-1 accent-orange-600"/>
            <span><strong className="block text-sm text-neutral-900">{i.name}</strong><span className="mt-1 block text-xs leading-5 text-neutral-600">{i.detail}</span></span>
          </label>)}
        </div>
      </section>
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Paso 3 · Generar invitación</p>
        <p className="mt-2 text-sm leading-6 text-neutral-600">En una asignación real se crea la invitación y se registra el consumo correspondiente. Aquí solo se mostrará el resultado del flujo sin guardar datos.</p>
        <button type="submit" disabled={selected.length===0} className="mt-5 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">Simular creación de liga →</button>
      </section>
    </form>
    {done&&<section role="status" className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Ejemplo de confirmación</p>
      <h2 className="mt-2 text-xl font-black text-neutral-900">Asignación simulada</h2>
      <p className="mt-3 text-sm text-neutral-700"><strong>Participante:</strong> {person}</p>
      <p className="mt-2 text-sm text-neutral-700"><strong>Correo de ejemplo:</strong> {mail}</p>
      <p className="mt-2 text-sm text-neutral-700"><strong>Psicometrías seleccionadas:</strong> {chosen.map(i=>i.name).join(", ")}</p>
      <p className="mt-2 text-sm font-bold text-orange-700">Consumo real equivalente: 1 aplicación de prueba para este candidato.</p>
      <p className="mt-4 rounded-xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">En la operación real, aquí se muestra la liga que compartirás con el participante y su estatus. Esta demo no genera liga, no envía mensajes y no consume créditos.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/demo-cliente?seccion=participante" className="rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white">Ver recorrido del participante →</Link>
        <Link href="/demo-cliente?seccion=resultados" className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold text-neutral-800">Ver reporte de ejemplo</Link>
      </div>
    </section>}
  </div>;
}
