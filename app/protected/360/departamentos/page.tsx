import Link from "next/link";
import {redirect} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import {getCurrentAppUser} from "@/lib/app-auth";
import DepartmentsManager from "./departments-manager";
export default async function DepartmentsPage(){
 const user=await getCurrentAppUser();if(!user||!["super_admin","client"].includes(user.role))redirect("/protected/catalogo");
 const db=createAdminClient();
 const organizations=user.role==="client"?
 await db.from("organizations").select("id,name").eq("id",user.organizationId!):
 await db.from("organizations").select("id,name").eq("active",true).order("name");
 const allowed=organizations.data??[];
 const departments=allowed.length?await db.from("organization_departments").select("id,organization_id,name,active")
  .in("organization_id",allowed.map(x=>x.id)).order("name"):{data:[],error:null};
 if(organizations.error||departments.error)return <p className="rounded-2xl bg-red-50 p-5 text-red-700">No se pudieron cargar los departamentos. Comprueba que la migración SQL está aplicada.</p>;
 return <div className="space-y-6">
  <Link href="/protected/evaluaciones" className="text-sm font-bold text-orange-600">← Centro de evaluaciones</Link>
  <div><h1 className="text-3xl font-black text-neutral-800">Departamentos</h1>
   <p className="mt-2 text-sm text-neutral-600">Catálogo compartido para PDL, Psicometrías, Evaluación 360° y Clima Laboral. Cada empresa administra sus propios departamentos.</p></div>
  <DepartmentsManager organizations={allowed} initialDepartments={departments.data??[]}/>
  <p className="text-sm text-neutral-500">Los nombres de departamentos se conservan para los reportes históricos; no eliminamos departamentos que tengan evaluaciones.</p>
 </div>;
}
