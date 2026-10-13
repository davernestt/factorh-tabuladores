import {Suspense} from "react";
import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {setNom035Pilot} from "./actions";
import {ShieldCheck,CalendarClock,Building2} from "lucide-react";
export default function Nom035Pilots(){
 return <Suspense fallback={<p className="rounded-2xl bg-white p-8">Preparando clientes piloto...</p>}>
  <PilotList/>
 </Suspense>;
}
async function PilotList(){
 const user=await getCurrentAppUser();
 if(user?.role!=="super_admin")redirect("/protected/nom035");
 const db=createAdminClient();
 const [companiesR,subscriptionsR,usersR]=await Promise.all([
  db.from("organizations").select("id,name,active").eq("active",true).order("name"),
  db.from("organization_module_subscriptions")
   .select("organization_id,status,starts_on,ends_on")
   .eq("module_key","nom035"),
  db.from("app_users").select("organization_id").eq("role","client").eq("active",true)
 ]);
 if(companiesR.error||subscriptionsR.error||usersR.error)
  return <p className="rounded-2xl bg-red-50 p-6 text-sm text-red-700">
   No pudieron cargarse las organizaciones y suscripciones.
  </p>;
 const companies=companiesR.data||[];
 const subs=new Map((subscriptionsR.data||[]).map(s=>[s.organization_id,s]));
 const clientOrgs=new Set((usersR.data||[]).map(s=>s.organization_id));
 return <div className="space-y-6">
  <Link href="/protected/nom035" className="text-sm font-bold text-orange-700">
   ← Módulo NOM-035
  </Link>
  <header className="rounded-3xl border border-neutral-200 bg-white p-7">
   <div className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-orange-600"/>
    <p className="text-xs font-black uppercase tracking-[.15em] text-orange-600">
     Solo administración FactoRH
    </p></div>
   <h1 className="mt-3 text-3xl font-black text-neutral-900">Habilitación de clientes piloto</h1>
   <p className="mt-3 text-sm leading-7 text-neutral-600">
    Selecciona una empresa y autoriza el módulo NOM-035 por un plazo determinado.
    El cliente ingresará con su usuario existente y verá únicamente sus centros
    y expedientes. No se generarán campañas ni se copiará información de otras empresas.
   </p>
  </header>
  <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
   <strong>Requisito previo:</strong> la empresa debe tener un usuario cliente activo y
   un centro NOM-035 configurado. La suscripción habilita la navegación, pero no
   genera contraseñas, no envía invitaciones y no garantiza cumplimiento normativo.
   Si necesitas un usuario, créalo primero en el módulo Usuarios de FactoRH.
  </section>
  <div className="space-y-4">
   {companies.map(org=>{
    const sub=subs.get(org.id);
    const enabled=sub&&["trial","active"].includes(sub.status);
    return <article key={org.id} className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
     <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
       <Building2 className="mt-1 h-5 w-5 text-orange-600"/>
       <div><h2 className="text-base font-black text-neutral-900">{org.name}</h2>
        <p className="mt-2 text-xs text-neutral-500">
         {clientOrgs.has(org.id)?"Cuenta cliente registrada":"Sin usuario cliente activo"}
        </p></div>
      </div>
      <div className="text-right text-xs">
       <p className={"rounded-lg px-3 py-2 font-bold "+(enabled?
        "bg-emerald-50 text-emerald-800":"bg-neutral-100 text-neutral-700")}>
        {sub?.status==="trial"?"Piloto habilitado":
         sub?.status==="active"?"Activo":
         sub?.status==="paused"?"Pausado":"Sin autorización"}
       </p>
       {sub?.ends_on&&<p className="mt-2 text-neutral-500">Vigencia hasta {sub.ends_on}</p>}
      </div>
     </div>
     <form action={setNom035Pilot} className="mt-5 flex flex-wrap items-end gap-3 border-t border-neutral-100 pt-5">
      <input type="hidden" name="organization_id" value={org.id}/>
      <label className="text-xs font-bold text-neutral-700">Duración del acceso
       <select name="duration_days" defaultValue="30"
        className="mt-2 block rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm">
        <option value="15">15 días</option><option value="30">30 días</option>
        <option value="60">60 días</option><option value="90">90 días</option>
       </select>
      </label>
      <button type="submit" name="operation" value="enable"
       disabled={!clientOrgs.has(org.id)}
       className="rounded-xl bg-orange-600 px-5 py-3 text-xs font-black text-white disabled:opacity-40">
       {enabled?"Renovar piloto":"Habilitar piloto"}
      </button>
      {enabled&&<button type="submit" name="operation" value="pause"
       className="rounded-xl border border-neutral-300 px-5 py-3 text-xs font-bold text-neutral-700">
       Pausar acceso
      </button>}
     </form>
    </article>;
   })}
  </div>
  <p className="text-xs leading-6 text-neutral-500">
   Las empresas no autorizadas conservan su estado actual. Al pausar NOM-035 no
   se borra ninguna campaña, respuesta agregada ni evidencia documental.
  </p>
 </div>;
}
