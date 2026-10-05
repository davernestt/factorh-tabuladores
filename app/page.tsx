import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-black tracking-tight text-neutral-900">
              Factor<span className="text-orange-500">RH</span>
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Evaluaciones
            </div>
          </div>
          <Link
            href="/protected"
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 shadow-sm hover:text-neutral-900"
          >
            Acceso administrativo
          </Link>
        </header>

        <section className="mt-12 overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-sm">
          <div className="bg-neutral-900 px-7 py-14 text-white md:px-12 md:py-20">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">
              Diagnóstico · Desarrollo · Resultados
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-6xl">
              Evaluaciones que convierten información en decisiones de desarrollo.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-neutral-300">
              Plataforma FactorRH para procesos de liderazgo, desempeño y talento.
            </p>
          </div>

          <div className="grid gap-6 p-7 md:grid-cols-3 md:p-12">
            <Feature
              number="01"
              title="Evaluaciones estructuradas"
              text="Instrumentos organizados por dimensiones y competencias."
            />
            <Feature
              number="02"
              title="Seguimiento"
              text="Avance, respuestas y resultados en un mismo proceso."
            />
            <Feature
              number="03"
              title="Desarrollo"
              text="Información útil para conversaciones y planes de acción."
            />
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-neutral-200 bg-white p-7 md:p-10">
          <h2 className="text-2xl font-bold text-neutral-900">
            ¿Tienes una evaluación asignada?
          </h2>
          <p className="mt-2 text-neutral-600">
            Abre el enlace único que recibiste de FactorRH o de tu organización.
          </p>
        </section>
      </div>
    </main>
  );
}

function Feature({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-5">
      <div className="text-sm font-black text-orange-500">{number}</div>
      <h2 className="mt-3 font-bold text-neutral-900">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">{text}</p>
    </div>
  );
}
