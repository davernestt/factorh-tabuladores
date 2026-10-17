import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
const titles:Record<string,string>={
 commercial:"Comercial FactoRH",
 recruiter:"Reclutamiento FactoRH",
 consultant:"Consultoría FactoRH",
 ese_operator:"Operación de Estudios"
};
export default async function StaffPortal(){
 const user=await getCurrentAppUser();
 if(!user)redirect("/auth/login");
 if(user.role==="client")redirect("/protected/catalogo");
 if(user.role==="super_admin")redirect("/protected/empresas");
 return <div className="mx-auto max-w-3xl space-y-5">
  <header className="rounded-3xl bg-neutral-800 p-8 text-white">
   <p className="text-xs font-black uppercase tracking-widest text-orange-300">Mi acceso · Equipo FactoRH</p>
   <h1 className="mt-3 text-3xl font-black">Bienvenido, {user.displayName||"integrante del equipo"}</h1>
   <p className="mt-2 text-neutral-200">Tu perfil asignado es <strong>{titles[user.role]||user.role}</strong>.</p>
  </header>
  <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
   <h2 className="text-lg font-black text-neutral-900">Acceso limitado al perfil autorizado</h2>
   <p className="mt-3 text-sm leading-7 text-neutral-700">Tu cuenta ya está registrada y verificada. Estamos habilitando gradualmente los permisos operativos de este perfil. Por seguridad, no puedes acceder al Centro de Clientes, cambiar licencias, gestionar usuarios ni consultar información de otras empresas.</p>
   {user.role==="ese_operator"&&<Link href="/protected/estudios/tareas" className="mt-4 inline-flex rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white">Abrir mis tareas asignadas →</Link>}
  </section>
  <p className="text-sm text-neutral-500">Para solicitar otra función o módulo, contacta al superadministrador de FactoRH.</p>
 </div>;
}
