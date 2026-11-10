import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/app-auth";
import { hasStaffPermission } from "@/lib/staff-permissions";

const commonCourses = [
  ["Cultura organizacional y rol del líder", "Valores, ejemplo personal, responsabilidad y objetivos de la empresa."],
  ["Autoconocimiento y manejo de emociones", "Estilo de liderazgo, efectos en el equipo y respuesta ante presión o frustración."],
  ["Comunicación efectiva", "Escucha, instrucciones claras, verificación de entendimiento y acuerdos."],
  ["Conversaciones cruciales", "Preparación y conducción de conversaciones difíciles con respeto, claridad y firmeza."],
];

const focusedCourses = [
  ["Delegación y seguimiento", "Responsabilidades, autonomía y seguimiento de compromisos."],
  ["Retroalimentación y reconocimiento", "Corrección de conductas, reconocimiento de logros y acuerdos de mejora."],
  ["Manejo de conflictos y negociación", "Atención de diferencias y construcción de acuerdos."],
  ["Planeación, prioridades y administración del tiempo", "Organización, cargas de trabajo y cumplimiento."],
  ["Gestión del desempeño e indicadores", "Expectativas, revisión de resultados y acciones ante desviaciones."],
  ["Desarrollo y capacitación del equipo", "Enseñanza en el puesto y acompañamiento de colaboradores."],
  ["Trabajo en equipo y coordinación entre áreas", "Colaboración, responsabilidades y acuerdos entre departamentos."],
  ["Solución de problemas y toma de decisiones", "Análisis de causas, valoración de opciones y seguimiento a soluciones."],
];

export default async function PdlTrainingPlanPage() {
  const user = await getCurrentAppUser();
  if (!user) redirect("/auth/login");
  if (user.role !== "super_admin" && !await hasStaffPermission(user, "pdl", "view")) {
    redirect(user.role === "client" ? "/protected/catalogo" : "/protected/mi-acceso");
  }

  return (
    <div className="space-y-7">
      <Link href="/protected" className="font-semibold text-orange-700 hover:underline">Volver al PDL</Link>
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-orange-600">Referencia interna FactoRH</p>
        <h1 className="mt-2 text-3xl font-black text-neutral-900">Plan de capacitación PDL</h1>
        <p className="mt-3 max-w-3xl text-neutral-600">Guía informativa para diseñar programas por empresa. El diagnóstico orienta el desarrollo, el tronco común establece herramientas compartidas y las rutas atienden competencias específicas.</p>
        <p className="mt-3 rounded-xl bg-orange-50 p-4 text-sm text-orange-900">El alcance, los participantes, las horas y el calendario se acuerdan en cada contratación. Este catálogo sirve para consultar y recordar el modelo del programa.</p>
      </header>
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-bold">Etapas del programa</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-neutral-700">
          <li><strong>Diagnóstico inicial.</strong> Alinear competencias con Dirección e integrar autoevaluación, valoración del jefe y ejercicios prácticos.</li>
          <li><strong>Tronco común.</strong> Impartir los cuatro cursos base y observar su aplicación en casos y actividades.</li>
          <li><strong>Definición de rutas.</strong> Combinar evaluaciones y observación para establecer objetivos individuales y grupos con necesidades similares.</li>
          <li><strong>Sesiones focalizadas.</strong> Asignar cursos por competencia. Una persona puede participar en varias rutas. Las sesiones individuales se acuerdan según el caso.</li>
          <li><strong>Aplicación y cierre.</strong> Revisar evidencias del puesto, plan individual, valoración final de las mismas competencias y reporte ejecutivo.</li>
        </ol>
      </section>
      {[["Tronco común para todos", commonCourses], ["Cursos por necesidades de desarrollo", focusedCourses]].map(([title, courses]) => (
        <section key={String(title)} className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="text-xl font-bold">{String(title)}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(courses as string[][]).map(([name, description]) => (
              <article key={name} className="rounded-xl bg-neutral-50 p-4">
                <h3 className="font-bold text-neutral-900">{name}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-bold">Rutas orientativas</h2>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-neutral-700">
          <li><strong>Organización y resultados.</strong> Delegación, planeación y gestión del desempeño.</li>
          <li><strong>Relaciones y colaboración.</strong> Retroalimentación, conflictos y coordinación entre áreas.</li>
          <li><strong>Desarrollo y mejora del equipo.</strong> Capacitación del equipo y solución de problemas.</li>
        </ul>
        <p className="mt-4 text-sm text-neutral-600">Agrupar por necesidades de desarrollo y conductas observables. Definir objetivos con Dirección antes de evaluar y revisar avances con evidencias. El taller de cierre presenta un problema real, herramientas aplicadas y resultados obtenidos.</p>
      </section>
    </div>
  );
}
