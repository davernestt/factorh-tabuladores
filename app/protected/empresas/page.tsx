import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import CompanyManager from "./company-manager";
import CompanyDirectory from "./company-directory";
export default async function CompaniesPage(){
 const user=await getCurrentAppUser();
 if(!user)redirect("/auth/login");
 if(user.role!=="super_admin")redirect("/protected/evaluaciones");
 const db=createAdminClient();
 const [orgsR,usersR,subsR,creditR,expiryR]=await Promise.all([
  db.from("organizations").select("id,name,slug,active,lifecycle_stage,commercial_email").order("name"),
  db.from("app_users").select("organization_id,user_id,active"),
  db.from("organization_module_subscriptions").select("organization_id,status,ends_on"),
  db.from("organization_psychometric_credits").select("organization_id,credits_total,credits_used,plan_type,active"),
  db.from("module_expiry_reminders").select("organization_id,days_remaining")
 ]);
 const err=orgsR.error||usersR.error||subsR.error||creditR.error||expiryR.error;
 if(err)return <div className="rounded-2xl border border-red-200 bg-red-50 p-7 text-red-700">No se pudo cargar el Centro de Clientes: {err.message}</div>;
 const orgs=orgsR.data??[];
 const subs=subsR.data??[];
 const credits=creditR.data??[];
 const users=usersR.data??[];
 const expiring=expiryR.data??[];
 const summary=orgs.map(o=>({
  id:o.id,name:o.name,slug:o.slug,active:o.active,lifecycle_stage:o.lifecycle_stage,
  email:o.commercial_email,
  users:users.filter(u=>u.organization_id===o.id&&u.active).length,
  services:subs.filter(s=>s.organization_id===o.id&&s.status==="active").length,
  trials:subs.filter(s=>s.organization_id===o.id&&s.status==="trial").length,
  expiring:expiring.filter(e=>e.organization_id===o.id&&e.days_remaining<=30).length,
  creditsRemaining:credits.filter(c=>c.organization_id===o.id).reduce((sum,c)=>sum+Math.max(0,c.credits_total-c.credits_used),0)
 }));
 const totalActive=summary.reduce((sum,c)=>sum+c.services,0);
 const totalTrial=summary.reduce((sum,c)=>sum+c.trials,0);
 const totalExpiring=summary.reduce((sum,c)=>sum+c.expiring,0);
 return <div className="space-y-6">
  <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-neutral-800 p-7 text-white sm:p-9">
   <div>
    <p className="text-xs font-bold uppercase tracking-[.18em] text-orange-300">FactoRH · Administración</p>
    <h1 className="mt-2 text-3xl font-black sm:text-4xl">Centro de Clientes</h1>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-200">Empresas, usuarios, servicios, demos, licencias, propuestas y renovaciones desde un mismo lugar.</p>
   </div>
   <CompanyManager/>
  </header>
  <section className="grid gap-3 sm:grid-cols-4">
   {([
    ["Empresas",orgs.length],
    ["Licencias activas",totalActive],
    ["Servicios demo",totalTrial],
    ["Próximos a vencer",totalExpiring]
   ] as const).map(([label,total])=><div key={label} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{label}</p>
    <div className="mt-2 text-3xl font-black text-neutral-900">{total}</div>
   </div>)}
  </section>
  <CompanyDirectory companies={summary}/>
  <p className="text-xs text-neutral-500">Las propuestas comerciales son cotizaciones, no ingresos cobrados. Los consumos, usuarios y licencias existentes permanecen en sus tablas originales.</p>
 </div>;
}
