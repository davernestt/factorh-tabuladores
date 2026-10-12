import {Suspense} from "react";
import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {nom035Simulation} from "@/lib/nom035/demo-data";
import Nom035DemoDashboard from "./demo-dashboard";

type Props={searchParams:Promise<{view?:string}>};
export default function Nom035DemoPage(props:Props){
 return <Suspense fallback={
  <section className="rounded-3xl border border-neutral-200 bg-white p-10 text-center text-neutral-600">
   Preparando las tres guías y los paneles de demostración...
  </section>
 }>
  <ProtectedDemo {...props}/>
 </Suspense>;
}
async function ProtectedDemo({searchParams}:Props){
 const user=await getCurrentAppUser();
 if(!user)redirect("/auth/login");
 if(user.role!=="super_admin")redirect("/protected/nom035");
 const params=await searchParams;
 const data=nom035Simulation();
 return <Nom035DemoDashboard data={data}
  initialAudience={params.view==="cliente"?"client":"admin"}/>;
}
