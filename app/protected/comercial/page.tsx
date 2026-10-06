import Link from "next/link";

const stages = [
  { name: "Nuevo", count: 0 },
  { name: "Contactado", count: 0 },
  { name: "Respondió", count: 0 },
  { name: "Necesidad detectada", count: 0 },
  { name: "Reunión", count: 0 },
  { name: "Cotización enviada", count: 0 },
  { name: "Seguimiento", count: 0 },
];

const services = [
  {
    name: "Reclutamiento y Headhunting",
    description: "Prospectos y oportunidades para cobertura de vacantes.",
  },
  {
    name: "Estudios Socioeconómicos",
    description: "Solicitudes de estudios y clientes con contratación recurrente.",
  },
  {
    name: "Consultoría RH",
    description: "Diagnósticos, proyectos e igualas de Recursos Humanos.",
  },
];

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </div>
      <div className="mt-3 text-3xl font-black tracking-tight text-neutral-900">
        {value}
      </div>
      <div className="mt-2 text-sm text-neutral-500">{note}</div>
    </div>
  );
}

export default function ComercialPage() {
  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Panel administrativo
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Comercial
          </h1>
          <p className="mt-2 max-w-3xl text-neutral-600">
            Controla prospectos, oportunidades, seguimientos y cierres de FactoRH.
            Ninguna oportunidad debe quedarse sin una próxima acción.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/protected/comercial"
            className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-700 shadow-sm"
          >
            Ver pipeline
          </Link>
          <button
            type="button"
            disabled
            title="Se habilitará al conectar el CRM con Supabase"
            className="cursor-not-allowed rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white opacity-60 shadow-sm"
          >
            + Nuevo prospecto
          </button>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Pipeline potencial" value="$0" note="Valor de oportunidades abiertas" />
        <Metric label="Prospectos" value="0" note="Oportunidades activas" />
        <Metric label="Seguimientos hoy" value="0" note="Actividades por atender" />
        <Metric label="Cotizaciones" value="0" note="Propuestas comerciales abiertas" />
        <Metric label="Clientes ganados" value="0" note="Cierres del periodo" />
      </div>

      <section className="mt-7 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-neutral-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-bold text-neutral-900">Pipeline comercial</h2>
            <p className="mt-1 text-sm text-neutral-500">
              V1 del embudo de ventas. En el siguiente paso conectaremos los datos reales.
            </p>
          </div>
          <div className="rounded-full bg-orange-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-orange-700">
            CRM FactoRH
          </div>
        </div>

        <div className="overflow-x-auto p-5">
          <div className="grid min-w-[1450px] grid-cols-7 gap-4">
            {stages.map((stage) => (
              <div
                key={stage.name}
                className="min-h-56 rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-neutral-800">
                    {stage.name}
                  </h3>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-neutral-500 shadow-sm">
                    {stage.count}
                  </span>
                </div>
                <div className="mt-8 rounded-xl border border-dashed border-neutral-300 bg-white p-4 text-center text-xs leading-5 text-neutral-400">
                  Aquí aparecerán las oportunidades de esta etapa.
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-bold text-neutral-900">Servicios comerciales</h2>
            <p className="mt-1 text-sm text-neutral-500">
              La venta se clasificará desde el inicio para medir resultados por línea de negocio.
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            {services.map((service, index) => (
              <div
                key={service.name}
                className="flex gap-4 rounded-2xl border border-neutral-200 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 font-black text-white">
                  {index + 1}
                </div>
                <div>
                  <div className="font-bold text-neutral-900">{service.name}</div>
                  <div className="mt-1 text-sm leading-6 text-neutral-500">
                    {service.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-neutral-800 p-6 text-white shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
            Regla comercial
          </div>
          <h2 className="mt-3 text-2xl font-black">
            Toda oportunidad debe tener una próxima acción.
          </h2>
          <p className="mt-3 text-sm leading-6 text-neutral-300">
            El CRM marcará como pendiente cualquier prospecto sin seguimiento,
            para evitar que una conversación comercial se pierda en WhatsApp,
            correo o LinkedIn.
          </p>

          <div className="mt-6 rounded-2xl bg-white/10 p-4">
            <div className="text-sm font-bold">Siguiente bloque a construir</div>
            <div className="mt-2 text-sm leading-6 text-neutral-300">
              Base de datos de prospectos, contactos, oportunidades y actividades en Supabase.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
