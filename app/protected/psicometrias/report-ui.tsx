import { getPsychometricCatalogItem } from "@/lib/psychometric-catalog";

type ScoreItem = {
  label: string;
  value: number;
};

export function PsychometricTestInfo({ assessmentType }: { assessmentType: string }) {
  const meta = getPsychometricCatalogItem(assessmentType);
  if (!meta) return null;

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
      <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
        Acerca del instrumento
      </div>
      <h2 className="mt-2 text-2xl font-black text-neutral-900">
        Qué evalúa y cómo interpretar este reporte
      </h2>
      <p className="mt-4 max-w-5xl text-sm leading-7 text-neutral-700">
        {meta.publicDescription}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-neutral-50 p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">
            ¿Para qué aporta?
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {meta.useCases.map((item) => (
              <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700 shadow-sm">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-neutral-50 p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">
            Perfiles donde resulta útil
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {meta.recommendedFor.map((item) => (
              <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700 shadow-sm">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-neutral-50 p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">
            Lectura recomendada
          </div>
          <p className="mt-3 text-sm leading-6 text-neutral-700">
            El resultado debe leerse como un patrón: primero observa las dimensiones relativamente más altas y bajas, después revisa cómo se combinan y finalmente contrástalas con las exigencias reales del puesto y la evidencia obtenida en entrevista.
          </p>
        </div>
      </div>
    </section>
  );
}

export function ScoreRadarChart({
  items,
  title = "Mapa de perfil",
}: {
  items: ScoreItem[];
  title?: string;
}) {
  if (!items.length) return null;
  const size = 430;
  const center = size / 2;
  const radius = 135;
  const levels = [25, 50, 75, 100];
  const points = items.map((item, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / items.length;
    const r = radius * (Math.max(0, Math.min(100, item.value)) / 100);
    return {
      ...item,
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
      axisX: center + Math.cos(angle) * radius,
      axisY: center + Math.sin(angle) * radius,
      labelX: center + Math.cos(angle) * (radius + 48),
      labelY: center + Math.sin(angle) * (radius + 48),
    };
  });

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">{title}</div>
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto mt-3 h-auto w-full max-w-xl">
        {levels.map((level) => {
          const ring = items.map((_, index) => {
            const angle = -Math.PI / 2 + (Math.PI * 2 * index) / items.length;
            const r = radius * (level / 100);
            return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
          }).join(" ");
          return <polygon key={level} points={ring} fill="none" stroke="#e5e5e5" strokeWidth="1.5" />;
        })}
        {points.map((point) => (
          <line key={point.label} x1={center} y1={center} x2={point.axisX} y2={point.axisY} stroke="#e5e5e5" />
        ))}
        <polygon
          points={points.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="rgba(249,115,22,.16)"
          stroke="#f97316"
          strokeWidth="4"
        />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="5" fill="#f97316" />
            <text x={point.labelX} y={point.labelY} textAnchor="middle" className="fill-neutral-700 text-[11px] font-bold">
              {shortLabel(point.label)}
            </text>
            <text x={point.labelX} y={point.labelY + 14} textAnchor="middle" className="fill-neutral-400 text-[10px] font-semibold">
              {Math.round(point.value)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function ScoreColumnChart({
  items,
  title = "Comparativo por dimensión",
}: {
  items: ScoreItem[];
  title?: string;
}) {
  if (!items.length) return null;
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">{title}</div>
      <div className="mt-6 grid min-h-[290px] grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => {
          const value = Math.max(0, Math.min(100, item.value));
          return (
            <div key={item.label} className="flex h-[260px] min-w-0 flex-col items-center justify-end">
              <div className="mb-2 text-lg font-black text-neutral-900">{Math.round(value)}</div>
              <div className="flex h-[180px] w-full max-w-[58px] items-end overflow-hidden rounded-t-2xl bg-neutral-100">
                <div className="w-full rounded-t-2xl bg-orange-500" style={{ height: `${value}%` }} />
              </div>
              <div className="mt-3 line-clamp-2 min-h-[34px] text-center text-[11px] font-bold leading-4 text-neutral-600">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ScoreRing({
  value,
  label,
  caption,
}: {
  value: number;
  label: string;
  caption?: string;
}) {
  const safe = Math.max(0, Math.min(100, value));
  const r = 72;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * (safe / 100);

  return (
    <div className="text-center">
      <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">{label}</div>
      <svg viewBox="0 0 190 190" className="mx-auto mt-2 h-52 w-52">
        <circle cx="95" cy="95" r={r} fill="none" stroke="#f5f5f5" strokeWidth="18" />
        <circle
          cx="95"
          cy="95"
          r={r}
          fill="none"
          stroke="#f97316"
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform="rotate(-90 95 95)"
        />
        <text x="95" y="89" textAnchor="middle" className="fill-neutral-900 text-[32px] font-black">
          {Math.round(safe)}%
        </text>
        <text x="95" y="112" textAnchor="middle" className="fill-neutral-400 text-[11px] font-semibold">
          resultado
        </text>
      </svg>
      {caption && <p className="mx-auto max-w-xs text-sm leading-6 text-neutral-500">{caption}</p>}
    </div>
  );
}

export function ScoreDotPlot({
  items,
  title = "Perfil de exactitud",
}: {
  items: ScoreItem[];
  title?: string;
}) {
  if (!items.length) return null;
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">{title}</div>
      <div className="mt-6 space-y-5">
        {items.map((item) => {
          const value = Math.max(0, Math.min(100, item.value));
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-neutral-800">{item.label}</div>
                <div className="text-sm font-black text-neutral-900">{Math.round(value)}%</div>
              </div>
              <div className="relative mt-3 h-5">
                <div className="absolute left-0 right-0 top-2 h-px bg-neutral-200" />
                {[0, 25, 50, 75, 100].map((tick) => (
                  <div key={tick} className="absolute top-0 h-4 w-px bg-neutral-200" style={{ left: `${tick}%` }} />
                ))}
                <div className="absolute top-0 h-5 w-5 -translate-x-1/2 rounded-full border-4 border-white bg-orange-500 shadow" style={{ left: `${value}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function shortLabel(value: string) {
  if (value.length <= 16) return value;
  const words = value.split(" ");
  if (words.length <= 2) return value.slice(0, 15) + "…";
  return words.slice(0, 2).join(" ");
}
