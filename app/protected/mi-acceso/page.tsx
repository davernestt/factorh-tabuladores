import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {getCoordinatorAccess,operationLabels,type OperationModule} from "@/lib/staff-permissions";
const paths:Record<OperationModule,string>={
 psychometrics:"/protected/psicometrias",feedback360:"/protected/360",
 pdl:"/protected/evaluaciones",nom035:"/protected/nom035",
 climate:"/protected/clima",studies:"/protected/estudios",candidates:"/protected/candidatos"
};
export default async function StaffPortal(){
 const user=await getCurrentAppUser();
 if(!user)redirect("/auth/login");
 if(user.role==="client")redirect("/protected/catalogo");
 if(user.role==="super_admin")redirect("/protected/empresas");
 const access=await getCoordinatorAccess(user);
 return <div className="mx-auto max-w-6xl space-y-6">
  <header className="rounded-3xl bg-neutral-800 p-8 text-white">
   <p className="text-xs font-black uppercase tracking-[.17em] text-orange-300">Equipo FactoRH · Acceso personal</p>
   <h1 className="mt-3 text-3xl font-black">Hola, {user.displayName||"integrante del equipo"}</h1>
   <p className="mt-2 text-sm text-neutral-200">Panel de Coordinación Operativa. Tus permisos se asignan desde la administración de FactoRH.</p>
  </header>
  {!access.activated?
   <section className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
    <h2 className="text-lg font-black">Acceso operativo pendiente de autorización</h2>
    <p className="mt-2 text-sm leading-7">Tu cuenta está activa, pero los permisos adicionales todavía están pendientes de validación. Contacta al administrador general.</p>
   </section>
   :<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {access.grants.filter(g=>g.can_view).map(g=><article key={g.module_key} className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
     <h2 className="text-lg font-black">{operationLabels[g.module_key]}</h2>
     <div className="mt-3 flex flex-wrap gap-2 text-xs">
      <span className="rounded-md bg-neutral-100 px-2 py-1">Consultar</span>
      {g.can_operate&&<span className="rounded-md bg-orange-50 px-2 py-1 text-orange-700">Operar</span>}
      {g.can_reports&&<span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">Reportes</span>}
     </div>
     <div className="mt-auto pt-6"><Link href={paths[g.module_key]} className="inline-flex rounded-xl bg-neutral-800 px-4 py-2 text-sm font-bold text-white">Abrir módulo →</Link></div>
    </article>)}
   </section>}
  <p className="text-sm text-neutral-600">La creación de usuarios, licencias, créditos, precios, configuración, edición de instrumentos y eliminación de expedientes están reservadas al superadministrador.</p>
 </div>;
}
