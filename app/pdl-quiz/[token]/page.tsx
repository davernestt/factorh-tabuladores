import { Suspense } from 'react';
import { connection } from 'next/server';
import { loadInvite } from '@/lib/pdl-quizzes/server';
import QuizForm from './quiz-form';
export const metadata={title:'Quiz PDL | FactoRH',robots:{index:false,follow:false}};
export default function Page({params}:{params:Promise<{token:string}>}) {
 return <Suspense fallback={<p className="p-8">Cargando evaluación…</p>}><Content params={params}/></Suspense>;
}
async function Content({params}:{params:Promise<{token:string}>}) {
 await connection();const {token}=await params;
 const loaded=await loadInvite(token);
 if(!loaded)return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">Liga no disponible</h1><p>Solicita a tu facilitador una liga vigente.</p></main>;
 const {data,error}=await loaded.db.from('pdl_quiz_attempts').select('attempt_number,result').eq('invite_id',loaded.invite.id).order('attempt_number',{ascending:false});
 if(error)throw new Error('No se pudo consultar el avance. Intenta nuevamente.');
 return <QuizForm token={token} quiz={loaded.quiz} name={loaded.invite.participant_name} organization={loaded.organization} attempts={data??[]} maxAttempts={loaded.invite.max_attempts}/>;
}
