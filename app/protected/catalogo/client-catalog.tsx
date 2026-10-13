import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAppUser } from "@/lib/app-auth";

type Module = {
  module_key: string; name: string; description: string | null;
  route: string | null; client_available: boolean;
};
type Trial = { credits_total: number; credits_used: number; active: boolean; valid_until: string | null; plan_type: string; plan_name: string };
type Subscription = { module_key: string; status: string; starts_on: string | null; ends_on: string | null };
type Instrument = { id: string; name: string; description: string | null; assessment_type: string };

const descriptions: Record<string,string> = {
  psychometrics: "Pruebas para conocer aptitudes, personalidad, integridad, razonamiento y competencias. Genera reportes para apoyar decisiones de talento.",
  pdl: "Diagnóstico de liderazgo, autopercepción, análisis de competencias y ruta individual de desarrollo.",
  feedback360: "Retroalimentación de jefes, pares y colaboradores para fortalecer las competencias de liderazgo.",
  climate: "C3: Clima, Cultura y Compromiso. Resultados organizacionales y planes de mejora.",
  nom035: "Identificación de riesgos psicosociales, instrumentos de referencia, reportes y seguimiento de intervenciones.",
  studies: "Estudios socioeconómicos e investigaciones con seguimiento documental.",
};
function validSubscription(sub?:Subscription){
  if(!sub || !["trial","active"].includes(sub.status))return false;
  const today=new Date().toISOString().slice(0,10);
  return (!sub.starts_on||sub.starts_on<=today)&&(!sub.ends_on||sub.ends_on>=today);
}

export default async function ClientCatalog(){
  const user=await getCurrentAppUser();
  if(!user || user.role!=="client" || !user.organizationId) redirect("/auth/login");
  const db=createAdminClient();
  const [modulesR,templatesR,creditsR,subscriptionsR,accessR]=await Promise.all([
    db.from("platform_modules").select("module_key,name,description,route,client_available").eq("active",true).order("sort_order"),
    db.from("assessment_templates").select("id,name,description,assessment_type")
      .is("organization_id",null).eq("active",true).like("assessment_type","psychometric_%").order("name"),
    db.from("organization_psychometric_credits").select("plan_type,plan_name,credits_total,credits_used,valid_until,active")
      .eq("organization_id",user.organizationId).maybeSingle(),
    db.from("organization_module_subscriptions").select("module_key,status,starts_on,ends_on")
      .eq("organization_id",user.organizationId),
    db.from("organization_assessment_templates").select("template_id,enabled,participant_sendable")
      .eq("organization_id",user.organizationId).eq("enabled",true).eq("participant_sendable",true)
  ]);
  const error=modulesR.error||templatesR.error||creditsR.error||subscriptionsR.error||accessR.error;
  if(error)return <section className="rounded-3xl border border-red-200 bg-white p-7 text-sm text-red-700">No fue posible cargar el catálogo comercial. Inténtalo de nuevo.</section>;

  const modules=(modulesR.data||[]) as Module[];
  const instruments=(templatesR.data||[]) as Instrument[];
  const subs=new Map(((subscriptionsR.data||[]) as Subscription[]).map(sub=>[sub.module_key,sub]));
  const credits=creditsR.data as Trial | null;
  const allowed=new Set((accessR.data||[]).map(item=>item.template_id));
  const remaining=credits?Math.max(0,credits.credits_total-credits.credits_used):0;
  const current=Boolean(credits?.active&&(!credits.valid_until||credits.valid_until>=new Date().toISOString().slice(0,10)));
  const availablePsychometrics=current&&remaining>0&&allowed.size>0&&validSubscription(subs.get("psychometrics"));
  const accessible=(module:Module)=>module.client_available&&(
    module.module_key==="psychometrics"?availablePsychometrics:
    module.module_key==="nom035"?validSubscription(subs.get("nom035")):false
  );
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
        <strong>{user.organizationName||"Tu empresa"}</strong> ·
        {credits?.plan_type==="trial"?
          ` Demo psicométrica: ${remaining} de ${credits.credits_total} aplicaciones disponibles.`:
          credits&&current?` ${credits.plan_name}: ${remaining} aplicaciones restantes.`:
          " Solicita a FactoRH una demostración de psicometrías."}
      </div>
    </header>
    <div className="grid gap-5 md:grid-cols-2">
      {modules.map(module=>{
        const enabled=accessible(module);
        const isPsych=module.module_key==="psychometrics";
        const href=module.module_key==="psychometrics"?"/protected/psicometrias":"/protected/nom035";
        const subject=encodeURIComponent("Me interesa conocer "+module.name+" - "+(user.organizationName||"Mi empresa"));
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
            {availablePsychometrics&&allowed.has(instrument.id)?"Habilitada en tu plan":"Consulta informativa"}
          </p>
        </div>)}
      </div>
    </section>
    <p className="text-xs leading-6 text-neutral-500">El catálogo es informativo: no muestra respuestas, expedientes ni información de otras empresas. Las demostraciones y nuevas licencias se activan únicamente desde administración FactoRH.</p>
  </div>;
}
