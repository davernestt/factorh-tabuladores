import Link from "next/link";

export default function Feedback360Page() {
  return (
    <div>
      <Link href="/protected" className="text-sm font-bold text-orange-600 hover:text-orange-700">
        ← Volver a Evaluaciones
      </Link>
      <div className="mt-5 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
          Evaluaciones
        </div>
        <h1 className="mt-2 text-3xl font-black text-neutral-900">Evaluación 360°</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Este espacio queda reservado para el módulo 360° con jefe, pares,
          colaboradores y autoevaluación. La estructura visual ya queda separada
          para conectar aquí la herramienta completa.
        </p>
      </div>
    </div>
  );
}
