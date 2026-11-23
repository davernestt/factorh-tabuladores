import { Suspense } from "react";
import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePdlQuizInvite } from "@/lib/pdl/resolve-quiz-invite";
import QuizForm from "./quiz-form";

export default function QuizPage(props:{params:Promise<{token:string}>}){
  return <Suspense fallback={<main className="min-h-screen bg-neutral-100 p-10 text-center"><p className="text-neutral-600">Cargando cuestionario...</p></main>}><QuizPageContent {...props}/></Suspense>;
}

async function QuizPageContent({params}:{params:Promise<{token:string}>}){
  await connection();
  const {token}=await params;
  if(!/^[a-f0-9]{64}$/.test(token))return <ErrorPage />;
  const db=createAdminClient();
  const invite=await resolvePdlQuizInvite(token);
  if(!invite||!invite.active||new Date(invite.expires_at).getTime()<=Date.now())return <ErrorPage />;
  const [catalog,items,attempts]=await Promise.all([
    db.from("pdl_quiz_catalog").select("title,published,passing_score").eq("quiz_id",invite.quiz_id).eq("version",invite.quiz_version).maybeSingle(),
    db.from("pdl_quiz_items").select("position,question,options").eq("quiz_id",invite.quiz_id).eq("version",invite.quiz_version).order("position"),
    db.from("pdl_quiz_attempts").select("id").eq("invite_id",invite.id)
  ]);
  if(catalog.error||items.error||attempts.error||!catalog.data?.published||(items.data??[]).length!==10)return <ErrorPage />;
  const remaining=Math.max(0,invite.max_attempts-(attempts.data??[]).length);
  const questions=(items.data??[]).map(x=>({position:x.position,question:x.question,options:Array.isArray(x.options)?x.options:[]}));
  return <main className="min-h-screen bg-neutral-100 px-4 py-10"><div className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-10">
    <div className="text-2xl font-extrabold text-neutral-700">Facto<span className="text-orange-600">RH</span> <span className="text-sm text-neutral-400">Evaluaciones · PDL</span></div>
    <h1 className="mt-6 text-3xl font-black text-neutral-900">{catalog.data.title}</h1>
    <p className="mt-2 text-neutral-600">Participante: <strong>{invite.participant_name}</strong></p>
    <p className="mt-2 text-sm text-neutral-500">Nivel intermedio · Aprobación {catalog.data.passing_score}/100 · Intentos disponibles: {remaining}</p>
    {remaining>0?<QuizForm token={token} questions={questions} maxAttempts={invite.max_attempts} completedAttempts={(attempts.data??[]).length}/>:<p className="mt-8 rounded-xl bg-neutral-100 p-5">Ya utilizaste todos tus intentos. Contacta a Recursos Humanos para consultar tus resultados.</p>}
  </div></main>;
}
function ErrorPage(){return <main className="min-h-screen bg-neutral-100 p-10 text-center"><h1 className="text-xl font-bold">Evaluación no disponible</h1><p className="mt-3">La invitación no existe, venció o el cuestionario todavía no está publicado.</p></main>;}
