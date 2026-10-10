import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createC3Campaign } from "./actions";

export default function C3Index() {
  return <Suspense fallback={<p className="rounded-2xl bg-white p-8 text-neutral-600">Cargando C3 PRO...</p>}><C3IndexContent/></Suspense>;
}
async function C3IndexContent() {
  const user = await getCurrentAppUser();
  if (!user || user.role === "client") redirect("/auth/login");
  const db = createAdminClient();
  const [orgs, campaigns] = await Promise.all([
    db.from("organizations").select("id,name").eq("active", true).order("name"),
    db.from("c3_campaigns").select("id,name,status,organization_id,planned_population,created_at").order("created_at", {ascending:false})
  ]);
  if (orgs.error || campaigns.error) return <p className="rounded-2xl bg-red-50 p-6 text-red-700">Error al consultar C3 PRO: {orgs.error?.message || campaigns.error?.message}</p>;
  const orgById = new Map((orgs.data || []).map(o => [o.id, o.name]));
  return <div className="space-y-7">
    <Link href="/protected/evaluaciones" className="text-sm font-semibold text-orange-600">← Centro de evaluaciones</Link>
    <div><div className="text-xs font-bold uppercase tracking-[.2em] text-orange-600">FactoRH · Diagnóstico organizacional</div>
      <h1 className="mt-2 text-3xl font-black text-neutral-800">C3 PRO · Clima, Cultura y Compromiso</h1>
      <p className="mt-2 text-neutral-600">Administra campañas confidenciales y mide participación e indicadores agregados. Instrumento en fase piloto.</p>
      <Link href="/protected/c3/demo" className="mt-4 inline-flex rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-bold text-orange-700 hover:bg-orange-100">Ver ejemplo de dashboard con datos ficticios →</Link>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {[["56", "Preguntas C3 Base"],["8", "Módulos adicionales"],[String((campaigns.data || []).length),"Campañas"]].map(([n,label])=><div key={label} className="rounded-2xl border border-neutral-200 bg-white p-5"><div className="text-3xl font-black text-neutral-800">{n}</div><div className="mt-1 text-sm text-neutral-500">{label}</div></div>)}
    </div>
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-neutral-800">Crear campaña piloto</h2>
      <p className="mt-1 text-sm text-neutral-500">Define únicamente la población elegible. Para Colbert: personal operativo y administrativo; excluye líderes y directivos.</p>
      <form action={createC3Campaign} className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-neutral-700">Empresa<select required name="organization_id" defaultValue="" className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3"><option value="" disabled>Selecciona una empresa</option>{(orgs.data||[]).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label className="text-sm font-semibold text-neutral-700">Población elegible<input required name="planned_population" type="number" min={1} max={100000} className="mt-2 w-full rounded-xl border border-neutral-300 p-3" placeholder="Número de operativos y administrativos" /></label>
        <label className="text-sm font-semibold text-neutral-700 md:col-span-2">Nombre de campaña<input required name="name" maxLength={150} className="mt-2 w-full rounded-xl border border-neutral-300 p-3" placeholder="Diagnóstico organizacional · Colbert · Piloto 2026" /></label>
        <div className="md:col-span-2"><button type="submit" className="rounded-xl bg-orange-600 px-6 py-3 font-bold text-white hover:bg-orange-700">Crear campaña en borrador</button></div>
      </form>
    </section>
    <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm"><h2 className="p-6 text-xl font-black text-neutral-800">Campañas C3</h2>
      {!campaigns.data?.length ? <p className="border-t border-neutral-100 p-6 text-neutral-500">Todavía no hay campañas. Crea una en borrador para empezar.</p> :
      <div className="divide-y divide-neutral-100">{campaigns.data.map(c=><Link key={c.id} href={"/protected/c3/"+c.id} className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-neutral-50"><div><p className="font-bold text-neutral-800">{c.name}</p><p className="text-sm text-neutral-500">{orgById.get(c.organization_id)||"Empresa"} · {c.planned_population??"—"} elegibles</p></div><span className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-bold text-neutral-600">{c.status==="draft"?"Borrador":c.status==="open"?"Abierta":c.status==="closed"?"Cerrada":"Cancelada"} →</span></Link>)}</div>}
    </section>
  </div>;
}
