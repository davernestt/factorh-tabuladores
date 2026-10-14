import Link from "next/link";

export type ClientCatalogModule = {
  module_key: string; name: string; description: string | null;
  route: string | null; client_available: boolean;
};
export type ClientCatalogInstrument = {
  id: string; name: string; description: string | null; assessment_type: string;
};
export type ClientCatalogCredits = {
  credits_total: number; credits_used: number; active: boolean;
  valid_until: string | null; plan_type: string; plan_name: string;
};
const descriptions: Record<string,string> = {
  psychometrics: "Pruebas para conocer aptitudes, personalidad, integridad, razonamiento y competencias. Genera reportes para apoyar decisiones de talento.",
  pdl: "Diagnóstico de liderazgo, autopercepción, análisis de competencias y ruta individual de desarrollo.",
  feedback360: "Retroalimentación de jefes, pares y colaboradores para fortalecer las competencias de liderazgo.",
  climate: "C3: Clima, Cultura y Compromiso. Resultados organizacionales y planes de mejora.",
  nom035: "Identificación de riesgos psicosociales, instrumentos de referencia, reportes y seguimiento de intervenciones.",
  studies: "Estudios socioeconómicos e investigaciones con seguimiento documental.",
};

export default function ClientCatalogView({
  modules, instruments, credits, organizationName, availablePsychometrics,
  allowedIds, accessibleKeys, mode="live"
}: {
  modules: ClientCatalogModule[];
  instruments: ClientCatalogInstrument[];
  credits: ClientCatalogCredits | null;
  organizationName: string | null;
  availablePsychometrics: boolean;
  allowedIds: string[];
  accessibleKeys: string[];
  mode?: "live" | "demo";
}){
  const remaining=credits?Math.max(0,credits.credits_total-credits.credits_used):0;
  const current=Boolean(credits?.active&&(!credits.valid_until||credits.valid_until>=new Date().toISOString().slice(0,10)));
  const requestAddress="David@factorh.com.mx";
  return <div className="space-y-7">
    <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm sm:p-9">
      <p className="text-xs font-black uppercase tracking-[.18em] text-orange-600">FactoRH · Soluciones para empresas</p>
      <h1 className="mt-3 text-3xl font-black text-neutral-900">Explora nuestro catálogo de evaluaciones</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-600">
        Conoce todo lo que FactoRH puede hacer por el talento de tu empresa.
        Puedes explorar nuestras soluciones sin consumir aplicaciones.
        La contratación y habilitación de nuevos módulos siempre requieren autorización de FactoRH.
      </p>
      <div className="mt-5 rounded-2xl bg-neutral-50 px-5 py-4 text-sm text-neutral-700">
        <strong>{organizationName||"Tu empresa"}</strong> ·
        {credits?.plan_type==="trial"?
          ` Demo psicométrica: ${remaining} de ${credits.credits_total} aplicaciones disponibles.`:
          credits&&current?` ${credits.plan_name}: ${remaining} aplicaciones restantes.`:
          " Solicita a FactoRH una demostración de psicometrías."}
      </div>
    </header>
    <div className="grid gap-5 md:grid-cols-2">
      {modules.map(module=>{
        const enabled=accessibleKeys.includes(module.module_key);
        const isPsych=module.module_key==="psychometrics";
        const href=mode==="demo"?`/demo-cliente?seccion=${module.module_key==="psychometrics"?"psicometrias":"nom035"}`:module.module_key==="psychometrics"?"/protected/psicometrias":"/protected/nom035";
        const subject=encodeURIComponent("Me interesa conocer "+module.name+" - "+(organizationName||"Mi empresa"));
        return <article key={module.module_key} className="flex flex-col rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="max-w-[75%] text-xl font-black text-neutral-900">{module.name}</h2>
            <span className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-700">
              {enabled?"Disponible en tu plan":"Conoce la solución"}
            </span>
          </div>
          <p className="mt-4 flex-1 text-sm leading-7 text-neutral-600">{descriptions[module.module_key]||module.description}</p>
          <div className="mt-6 border-t border-neutral-100 pt-5">
            {enabled?
              <Link href={href} className="inline-flex rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700">
                {isPsych?"Utilizar mis psicometrías":"Abrir módulo autorizado"} →
              </Link>:
              mode==="demo"?
              <Link href={`/demo-cliente?seccion=solucion&modulo=${encodeURIComponent(module.module_key)}`}
                className="inline-flex rounded-xl border border-orange-200 px-5 py-3 text-sm font-bold text-orange-700 hover:bg-orange-50">
                Conocer solución →
              </Link>:
              <a href={`mailto:${requestAddress}?subject=${subject}`}
                className="inline-flex rounded-xl border border-orange-200 px-5 py-3 text-sm font-bold text-orange-700 hover:bg-orange-50">
                Solicitar información o demostración →
              </a>}
          </div>
        </article>;
      })}
    </div>
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8">
      <p className="text-xs font-black uppercase tracking-[.14em] text-orange-600">Psicometrías FactoRH</p>
      <h2 className="mt-2 text-2xl font-black text-neutral-900">Conoce nuestros instrumentos</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">Esta vista describe las pruebas disponibles en nuestro catálogo general. Consultarlo no habilita nuevas aplicaciones: tú sólo puedes asignar los instrumentos aprobados para tu empresa y dentro de tus créditos vigentes.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {instruments.map(instrument=><div key={instrument.id} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
          <p className="font-bold text-neutral-900">{instrument.name}</p>
          <p className="mt-2 text-xs leading-6 text-neutral-600">{instrument.description||"Evaluación psicométrica para decisiones de talento."}</p>
          <p className="mt-3 text-xs font-semibold text-neutral-500">
            {availablePsychometrics&&allowedIds.includes(instrument.id)?"Habilitada en tu plan":"Consulta informativa"}
          </p>
        </div>)}
      </div>
    </section>
    <p className="text-xs leading-6 text-neutral-500">El catálogo es informativo: no muestra respuestas, expedientes ni información de otras empresas. Las demostraciones y nuevas licencias se activan únicamente desde administración FactoRH.</p>
  </div>;
}
