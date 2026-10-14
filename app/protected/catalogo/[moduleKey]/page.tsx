import {Suspense} from "react";
import {redirect,notFound} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import SolutionDetail from "../solution-detail";
import {solutionContent} from "../solution-content";

const names:Record<string,string>={
  psychometrics:"Psicometrías",
  pdl:"Programa de Desarrollo de Líderes",
  feedback360:"Evaluación 360°",
  studies:"Estudios e Investigaciones",
  nom035:"NOM-035",
  climate:"Clima Laboral"
};

type Params={params:Promise<{moduleKey:string}>};
export default function ClientSolutionPage({params}:Params){
  return <Suspense fallback={<div className="rounded-3xl bg-white p-7 text-sm text-neutral-500">Cargando solución...</div>}>
    <ClientSolutionContent params={params}/>
  </Suspense>;
}
async function ClientSolutionContent({params}:Params){
  const user=await getCurrentAppUser();
  if(!user)redirect("/auth/login");
  const {moduleKey}=await params;
  if(!Object.prototype.hasOwnProperty.call(solutionContent,moduleKey))notFound();
  if(user.role==="super_admin"){
    redirect(`/demo-cliente?seccion=solucion&modulo=${encodeURIComponent(moduleKey)}`);
  }
  if(user.role!=="client"||!user.organizationId)redirect("/protected/catalogo");
  return <SolutionDetail
    moduleKey={moduleKey} name={names[moduleKey]}
    organizationName={user.organizationName} mode="client"
  />;
}
