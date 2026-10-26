import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {Suspense} from "react";
import {getCurrentAppUser} from "@/lib/app-auth";
import {hasStaffPermission} from "@/lib/staff-permissions";
import {createAdminClient} from "@/lib/supabase/admin";
import CaseRatingForm from "./case-rating-form";
import {adaptPdlCopy} from "@/lib/pdl-context-copy";
type Params={params:Promise<{id:string}>};
export default function GradeLeadershipCases(props:Params){
 return <Suspense fallback={<p className="p-8 text-sm text-neutral-500">Cargando rúbrica…</p>}><GradeContent {...props}/></Suspense>;
}
async function GradeContent({params}:Params){
 const user=await getCurrentAppUser();
 if(!user)redirect("/auth/login");
 if(!await hasStaffPermission(user,"pdl","operate"))redirect("/protected/mi-acceso");
 const {id}=await params;
 const db=createAdminClient();
 const {data:assignment,error}=await db.from("assessment_assignments")
  .select("id,status,template_id,process_id").eq("id",id).maybeSingle();
 if(error||!assignment)notFound();
 const [t,p,d,q,r,ratings]=await Promise.all([
  db.from("assessment_templates").select("name,assessment_type").eq("id",assignment.template_id).single(),
  db.from("assessment_processes").select("person_id,organization_id").eq("id",assignment.process_id).single(),
  db.from("assessment_dimensions").select("id,name,description,sort_order").eq("template_id",assignment.template_id).order("sort_order"),
  db.from("assessment_questions").select("id,dimension_id,prompt,question_type,sort_order").eq("template_id",assignment.template_id).order("sort_order"),
  db.from("assessment_responses").select("question_id,text_value").eq("assignment_id",id),
  db.from("leadership_case_ratings").select("question_id,score").eq("assignment_id",id)
 ]);
 if(t.error||p.error||d.error||q.error||r.error||ratings.error)return <p className="rounded-xl bg-red-50 p-6 text-red-700">No se pudo cargar el expediente de calificación. Verifica la migración de rúbricas.</p>;
 if(t.data?.assessment_type!=="leadership_cases"||!p.data)notFound();
 const [person,org]=await Promise.all([
  db.from("people").select("first_name,last_name").eq("id",p.data.person_id).single(),
  db.from("organizations").select("name").eq("id",p.data.organization_id).single()
 ]);
 return <main className="space-y-6">
  <Link href={`/protected/evaluaciones/${id}`} className="text-sm font-bold text-orange-600">← Volver al detalle</Link>
  <header className="rounded-3xl bg-neutral-800 p-7 text-white">
   <p className="text-xs font-bold uppercase tracking-widest text-orange-300">FactoRH · Evaluación profesional</p>
   <h1 className="mt-3 text-3xl font-black">Calificación de casos de liderazgo</h1>
   <p className="mt-2 text-neutral-200">{person.data?.first_name||""} {person.data?.last_name||""} · {org.data?.name||""}</p>
   <p className="mt-2 text-sm text-neutral-300">Las respuestas del participante son independientes de los criterios de valoración del consultor. Las calificaciones anteriores del propio participante no cuentan como evaluación profesional.</p>
  </header>
  <CaseRatingForm assignmentId={id} sections={d.data??[]} questions={(q.data??[]).map(question => ({...question, prompt:adaptPdlCopy(question.prompt,org.data?.name??"la empresa")??question.prompt}))}
   answers={r.data??[]} grades={(ratings.data??[]).map(x=>({question_id:x.question_id,score:Number(x.score)}))}
   completed={assignment.status==="completed"}/>
 </main>;
}
