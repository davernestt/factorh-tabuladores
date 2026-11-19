import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/app-auth";
import { hasStaffPermission } from "@/lib/staff-permissions";
import QuizAdmin from "./quiz-admin";
import Link from "next/link";
export default async function PdlQuizzesPage(){
  const user=await getCurrentAppUser();
  if(!user)redirect("/auth/login");
  if(user.role!=="super_admin"&&!await hasStaffPermission(user,"pdl","view"))redirect("/protected/mi-acceso");
  return <main className="space-y-6">
    <Link href="/protected/pdl/plan" className="text-sm font-semibold text-orange-700 hover:underline">← Plan de capacitación PDL</Link>
    <header><p className="text-sm font-bold uppercase tracking-widest text-orange-600">FactoRH · PDL</p>
    <h1 className="mt-2 text-3xl font-black">Evaluaciones y quizzes</h1>
    <p className="mt-2 text-neutral-600">10 reactivos por tema, dificultad intermedia, aprobación desde 80 y dos intentos por participante. Las invitaciones se administran por empresa.</p></header>
    <QuizAdmin canOperate={user.role==="super_admin"||await hasStaffPermission(user,"pdl","operate")}/></main>;
}