import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentAppUser } from '@/lib/app-auth';
import { hasStaffPermission } from '@/lib/staff-permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { quizCatalog } from '@/lib/pdl-quizzes/catalog';
import type { Result } from '@/lib/pdl-quizzes/types';
import InviteForm,{RevokeButton} from './invite-form';
type Row={id:string;organization_id:string;participant_name:string;participant_email:string|null;quiz_id:string;created_at:string;expires_at:string;active:boolean;pdl_quiz_attempts:{attempt_number:number;submitted_at:string;result:Result}[]};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
 const user=await getCurrentAppUser();if(!user)redirect('/auth/login');
 const [view,operate,reports]=await Promise.all(['view','operate','reports'].map(p=>hasStaffPermission(user,'pdl',p as 'view'|'operate'|'reports')));
 if(!view)redirect('/protected/mi-acceso');
 const params=await searchParams;
 const page=Math.max(1,Math.min(10000,Number.parseInt(params.page??'1',10)||1));
 const db=createAdminClient();
 const {data:organizations,error:orgError}=await db.from('organizations').select('id,name').eq('active',true).order('name');
 if(orgError)throw new Error('No se pudieron consultar las empresas.');
 const orgMap=new Map((organizations??[]).map(o=>[o.id,o.name]));
 let rows:Row[]=[],count=0;
 if(reports){
  let query=db.from('pdl_quiz_invites').select('id,organization_id,participant_name,participant_email,quiz_id,created_at,expires_at,active,pdl_quiz_attempts(attempt_number,submitted_at,result)',{count:'exact'}).order('created_at',{ascending:false});
  if(params.organization)query=query.eq('organization_id',params.organization);
  if(params.quiz)query=query.eq('quiz_id',params.quiz);
  const response=await query.range((page-1)*50,page*50-1);
  if(response.error)throw new Error('No se pudieron consultar los quizzes. Intenta nuevamente.');
  rows=(response.data??[]) as Row[];count=response.count??0;
 }
 const topics=quizCatalog.map(({id,title})=>({id,title}));
 const pageUrl=(p:number)=>`?${new URLSearchParams({organization:params.organization??'',quiz:params.quiz??'',page:String(p)})}`;
 return <div className="space-y-6"><Link href="/protected" className="text-orange-700 underline">Volver al PDL</Link><header><p className="font-bold text-orange-700">Programa de Desarrollo de Líderes</p><h1 className="text-3xl font-bold">Quizzes de aprendizaje</h1><p className="mt-2">Cuatro temas · 10 preguntas por tema · Calificación automática · Aprobación con 80</p></header>
  <div className="grid gap-3 md:grid-cols-2">{topics.map(q=><article key={q.id} className="rounded-xl border bg-white p-4"><h2 className="font-bold">{q.title}</h2><p className="text-sm text-neutral-600">Conceptos y situaciones prácticas · 8–12 minutos</p><details className="mt-2"><summary className="cursor-pointer text-orange-700">Revisar preguntas y clave</summary><ol className="mt-3 space-y-4">{quizCatalog.find(x=>x.id===q.id)!.questions.map((item,i)=><li key={item.id}><p className="font-semibold">{i+1}. {item.prompt}</p><ol className="list-[upper-alpha] pl-6">{item.options.map((o,j)=><li key={j}>{o}{j===item.answer?' ✓':''}</li>)}</ol><p className="mt-1 text-sm">{item.explanation}</p></li>)}</ol></details></article>)}</div>
  {operate?<InviteForm organizations={organizations??[]} quizzes={topics}/>:null}
  {reports?<section className="space-y-4"><h2 className="text-2xl font-bold">Asignaciones y resultados</h2><form className="flex flex-wrap items-end gap-3"><label>Empresa<select name="organization" defaultValue={params.organization??''} className="block rounded border p-2"><option value="">Todas</option>{organizations?.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label><label>Tema<select name="quiz" defaultValue={params.quiz??''} className="block rounded border p-2"><option value="">Todos</option>{topics.map(q=><option key={q.id} value={q.id}>{q.title}</option>)}</select></label><button className="rounded border px-4 py-2">Filtrar</button></form>
   <p>{count} asignaciones · Página {page}</p>
   {rows.length===0?<p className="rounded-xl border p-6">Aún no hay asignaciones con estos filtros.</p>:null}
   {rows.map(row=>{const attempts=[...row.pdl_quiz_attempts].sort((a,b)=>a.attempt_number-b.attempt_number);const expired=Date.parse(row.expires_at)<Date.now();return <article key={row.id} className="space-y-3 rounded-xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold">{row.participant_name}</h3><p>{orgMap.get(row.organization_id)??'Empresa'} · {topics.find(q=>q.id===row.quiz_id)?.title}</p>{row.participant_email?<p className="text-sm">{row.participant_email}</p>:null}</div><span>{!row.active?'Liga desactivada':expired?'Liga vencida':attempts.length?'Respondido':'Pendiente'}</span></div>
    <p className="text-sm">Vence: {new Date(row.expires_at).toLocaleDateString('es-MX',{timeZone:'America/Mexico_City'})}</p>
    {attempts.map(a=><details key={a.attempt_number} className="rounded bg-neutral-50 p-3"><summary className="cursor-pointer font-bold">Intento {a.attempt_number}: {a.result.score}/100 · {a.result.passed?'Aprobado':'Requiere repaso'}</summary><p className="my-2 text-sm">{new Date(a.submitted_at).toLocaleString('es-MX',{timeZone:'America/Mexico_City'})}</p>{a.result.feedback.map(f=><div key={f.id} className="my-3 border-t pt-2"><p className="font-semibold">{f.prompt}</p><p>{f.isCorrect?'✓':'✗'} {f.selected}</p>{!f.isCorrect?<p>Correcta: {f.correct}</p>:null}</div>)}{a.result.reflection?<p className="mt-3">Compromiso: {a.result.reflection}</p>:null}</details>)}
    {operate&&row.active?<RevokeButton id={row.id}/>:null}
   </article>;})}
   <nav className="flex gap-5" aria-label="Paginación">{page>1?<Link href={pageUrl(page-1)}>Anterior</Link>:null}{page*50<count?<Link href={pageUrl(page+1)}>Siguiente</Link>:null}</nav>
  </section>:<p>Tu perfil no tiene permiso para consultar resultados.</p>}
 </div>;
}
