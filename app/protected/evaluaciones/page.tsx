import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BookOpenCheck, ChartNoAxesCombined, CircleHelp, HeartHandshake, ListChecks, MessagesSquare, MoveUpRight } from 'lucide-react';

const modules = [
  { name: 'PDL · Desarrollo de Líderes', description: 'Autoevaluaciones, liderazgo, casos y reportes individuales del programa.', icon: BookOpenCheck, href: '/protected', active: true, tag: 'Disponible' },
  { name: 'Evaluación 360°', description: 'Una persona evaluada; múltiples perspectivas. 12 competencias, 60 reactivos y un reporte consolidado.', icon: ChartNoAxesCombined, href: '/protected/360', active: true, tag: 'Módulo independiente' },
  { name: 'Psicometrías', description: 'Instrumentos y reportes psicométricos por tipo de prueba.', icon: ListChecks, href: null, active: false, tag: 'Próximamente' },
  { name: 'NOM-035', description: 'Evaluación de riesgos psicosociales y reportes organizacionales.', icon: HeartHandshake, href: null, active: false, tag: 'Próximamente' },
  { name: 'Clima laboral', description: 'Encuestas, campañas, participación y análisis por grupos.', icon: MessagesSquare, href: null, active: false, tag: 'Próximamente' },
  { name: 'Próximas herramientas', description: 'Desempeño, DNC y People Review, entre otras soluciones.', icon: CircleHelp, href: null, active: false, tag: 'Planeación' },
];

export default async function EvaluationModulesPage() {
  const auth = await createClient();
  const { data, error } = await auth.auth.getClaims();
  if (error || !data?.claims) redirect('/auth/login');
  return <div className="space-y-8">
    <div><div className="text-sm font-bold uppercase tracking-[.2em] text-orange-600">FactorRH · Administración</div>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-800">Centro de evaluaciones</h1>
      <p className="mt-3 max-w-3xl text-neutral-600">Cada herramienta funciona de manera independiente. Cuando sea pertinente, sus resultados se podrán integrar en un expediente o reporte global.</p>
    </div>
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {modules.map(m => <div key={m.name} className="flex min-h-64 flex-col rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3"><span className="inline-flex rounded-2xl bg-neutral-100 p-3 text-neutral-700"><m.icon className="h-7 w-7" /></span>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${m.active ? 'bg-orange-50 text-orange-700' : 'bg-neutral-100 text-neutral-500'}`}>{m.tag}</span>
        </div>
        <h2 className="mt-5 text-xl font-black text-neutral-800">{m.name}</h2>
        <p className="mt-2 flex-1 text-sm leading-6 text-neutral-600">{m.description}</p>
        {m.href ? <Link href={m.href} className="mt-5 inline-flex items-center gap-2 font-bold text-orange-600 hover:text-orange-700">Entrar al módulo <MoveUpRight className="h-4 w-4" /></Link>
          : <span className="mt-5 text-sm font-semibold text-neutral-400">Disponible en una próxima etapa</span>}
      </div>)}
    </div>
  </div>;
}
