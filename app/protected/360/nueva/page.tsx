import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { authorized360Admin } from '@/lib/feedback360-auth';
import New360Form from './new-360-form';

export default function New360Page() {
  return (
    <Suspense fallback={<LoadingNew360 />}>
      <New360PageContent />
    </Suspense>
  );
}

async function New360PageContent() {
  if(!await authorized360Admin()) redirect('/auth/login');
  const db=createAdminClient();
  const [organizations,people]=await Promise.all([
    db.from('organizations').select('id,name').eq('active',true).order('name'),
    db.from('people').select('id,first_name,last_name,email,job_title,organization_id').eq('active',true).order('first_name'),
  ]);
  if(organizations.error||people.error) return <p className="rounded-2xl bg-red-50 p-6 text-red-700">No fue posible cargar el catálogo. {organizations.error?.message??people.error?.message}</p>;
  return <div>
    <Link href="/protected/360" className="text-sm font-bold text-neutral-500 hover:text-orange-600">← Volver al 360°</Link>
    <h1 className="mt-5 text-3xl font-black text-neutral-800">Nueva evaluación 360°</h1>
    <p className="mt-2 max-w-3xl text-neutral-600">Selecciona a la persona evaluada e invita a sus evaluadores. El sistema crea una liga individual para cada uno y consolida los resultados en un mismo expediente.</p>
    <div className="mt-7"><New360Form organizations={organizations.data??[]} people={people.data??[]} /></div>
  </div>;
}

function LoadingNew360(){return <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500"/><p className="text-neutral-600">Cargando formulario 360°...</p></div>}
