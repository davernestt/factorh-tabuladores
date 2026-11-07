import {Suspense} from "react";
import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";

export default function TasksPage(){
 return <Suspense fallback={<p className="rounded-xl bg-white p-6">Cargando estudios asignados...</p>}><Content/></Suspense>;
}
async function Content(){
 const user=await getCurrentAppUser();
 if(!user)redirect("/auth/login");
 if(user.role!=="ese_operator")redirect("/protected/mi-acceso");
 const db=createAdminClient();
 const {data:studies,error}=await db.from("ese_cases")
   .select("id,case_name,study_type,status,progress,due_date,is_demo,delivery_status")
   .eq("assigned_to",user.userId).order("created_at",{ascending:false}).limit(100);
 if(error)return <p className="rounded-xl bg-red-50 p-6 text-sm text-red-700">No fue posible cargar tus asignaciones.</p>;
 const liveEnabled=process.env.FACTORH_ESE_PERSONAL_REQUESTS_ENABLED==="true";
 return <div className="space-y-6">
  <header className="rounded-3xl border border-neutral-200 bg-white p-7">
   <p className="text-xs font-extrabold uppercase text-orange-600">FactoRH · Portal exclusivo de aplicadores</p>
   <h1 className="mt-2 text-3xl font-black">Mis estudios asignados</h1>
   <p className="mt-3 text-sm leading-7 text-neutral-600">
     Aquí solo aparecen expedientes asignados a tu cuenta. No tienes acceso al catálogo de empresas, precios o reportes de otros aplicadores.
   </p>
  </header>
  {!(studies||[]).length?<p className="rounded-2xl bg-white p-6 text-sm text-neutral-600">No tienes estudios asignados en este momento.</p>:
   <div className="grid gap-4 md:grid-cols-2">{(studies||[]).map(s=>{
    const open=s.delivery_status!=="released"&&!["review","report","delivered","cancelled"].includes(s.status)&&(s.is_demo||liveEnabled);
    return <article key={s.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap justify-between gap-3">
       <h2 className="font-black text-neutral-900">{s.case_name}</h2>
       <span className="rounded-lg bg-neutral-100 px-3 py-1 text-xs font-semibold">{s.status.replaceAll("_"," ")}</span>
      </div>
      <p className="mt-2 text-xs text-neutral-500">Tipo: {s.study_type}{s.is_demo?" · Piloto ficticio":""}</p>
      {s.due_date&&<p className="mt-2 text-xs text-neutral-500">Fecha compromiso: {s.due_date}</p>}
      <p className="mt-3 text-sm text-neutral-700">Avance: {s.progress||0}%</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full bg-orange-500" style={{width:`${Math.max(0,Math.min(100,s.progress||0))}%`}}/></div>
      {open?<Link href={`/protected/estudios/captura/${s.id}`}
       className="mt-5 inline-flex rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white">Capturar / continuar →</Link>:
       <p className="mt-4 text-xs text-neutral-500">Captura no disponible. Contacta al equipo de FactoRH.</p>}
    </article>;
   })}</div>}
 </div>;
}
