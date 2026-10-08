import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import EditProcessForm from "./edit-process-form";

type Props={params:Promise<{id:string}>};
export default async function EditProcessPage({params}:Props){
  const auth=await createClient();const {data,error}=await auth.auth.getClaims();if(error||!data?.claims)redirect("/auth/login");
  const {id}=await params;const db=createAdminClient();
  const processR=await db.from("assessment_processes").select("id,organization_id,person_id,name,status,target_date,public_token").eq("id",id).maybeSingle();
  if(processR.error)return <ErrorCard message={processR.error.message}/>;if(!processR.data)notFound();
  const process=processR.data;
  const [personR,orgsR,peopleR,templatesR,accessR,assignmentsR,reusedR]=await Promise.all([
    db.from("people").select("id,organization_id,first_name,last_name,email,phone,job_title,area").eq("id",process.person_id).single(),
    db.from("organizations").select("id,name").eq("active",true).order("name"),
    db.from("people").select("id,organization_id,first_name,last_name,email,phone,job_title,area").eq("active",true).order("first_name"),
    db.from("assessment_templates").select("id,name").eq("active",true).order("name"),
    db.from("organization_assessment_templates").select("organization_id,template_id,enabled,participant_sendable"),
    db.from("assessment_assignments").select("id,template_id,status").eq("process_id",id),
    db.from("assessment_process_reused_results").select("id,template_id").eq("process_id",id),
  ]);
  const firstError=personR.error||orgsR.error||peopleR.error||templatesR.error||accessR.error||assignmentsR.error||reusedR.error;
  if(firstError)return <ErrorCard message={firstError.message}/>;
  return <div className="space-y-6"><div><Link href="/protected" className="text-sm font-bold text-neutral-500 hover:text-orange-600">← Volver a evaluaciones</Link><div className="mt-4 text-xs font-bold uppercase tracking-[.18em] text-orange-600">Administración</div><h1 className="mt-2 text-3xl font-black text-neutral-900">Editar proceso</h1><p className="mt-2 max-w-3xl text-neutral-600">Corrige datos y administra la batería sin cambiar la liga del participante, siempre que la trazabilidad del proceso lo permita.</p></div><EditProcessForm process={process} person={personR.data} organizations={orgsR.data??[]} people={peopleR.data??[]} templates={templatesR.data??[]} access={accessR.data??[]} assignments={assignmentsR.data??[]} reused={reusedR.data??[]}/></div>
}
function ErrorCard({message}:{message:string}){return <div className="rounded-3xl border border-red-200 bg-red-50 p-7"><h1 className="font-bold text-red-800">No fue posible abrir el editor</h1><p className="mt-2 text-sm text-red-700">{message}</p></div>}
