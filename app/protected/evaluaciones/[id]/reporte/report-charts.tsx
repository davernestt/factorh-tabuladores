type DimensionPoint = {
  name: string;
  score: number | null;
  tone?: "strong" | "functional" | "attention" | "priority";
};

export function RadarChart({ data }: { data: DimensionPoint[] }) {
  const valid = data.filter((item) => item.score !== null);

  if (valid.length < 3) {
    return (
      <div className="rounded-2xl bg-neutral-50 p-6 text-sm text-neutral-500">
        Se requieren al menos 3 dimensiones con puntuación para generar el radar.
      </div>
    );
  }

  const size = 440;
  const center = size / 2;
  const radius = 150;
  const levels = [1, 2, 3, 4, 5];

  const pointAt = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / valid.length;
    const r = radius * (value / 5);
    return {
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
    };
  };

  const polygon = valid
    .map((item, index) => {
      const point = pointAt(index, item.score ?? 0);
      return `${point.x},${point.y}`;
    })
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto h-auto w-full max-w-[440px]"
        role="img"
        aria-label="Radar de competencias"
      >
        {levels.map((level) => {
          const ring = valid
            .map((_, index) => {
              const point = pointAt(index, level);
              return `${point.x},${point.y}`;
            })
            .join(" ");

          return (
            <polygon
              key={level}
              points={ring}
              fill="none"
              stroke="currentColor"
              className="text-neutral-200"
              strokeWidth={1}
            />
          );
        })}

        {valid.map((item, index) => {
          const end = pointAt(index, 5);
          const label = pointAt(index, 5.8);
          const anchor =
            Math.abs(label.x - center) < 15
              ? "middle"
              : label.x > center
                ? "start"
                : "end";

          return (
            <g key={item.name}>
              <line
                x1={center}
                y1={center}
                x2={end.x}
                y2={end.y}
                stroke="currentColor"
                className="text-neutral-200"
                strokeWidth={1}
              />
              <text
                x={label.x}
                y={label.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                className="fill-neutral-500 text-[9px] font-semibold"
              >
                {truncate(item.name, 18)}
              </text>
            </g>
          );
        })}

        <polygon
          points={polygon}
          fill="rgba(249,115,22,0.16)"
          stroke="rgb(249,115,22)"
          strokeWidth={3}
        />

        {valid.map((item, index) => {
          const point = pointAt(index, item.score ?? 0);
          return (
            <g key={`dot-${item.name}`}>
              <circle cx={point.x} cy={point.y} r={5} fill="rgb(249,115,22)" />
              <circle cx={point.x} cy={point.y} r={2} fill="white" />
            </g>
          );
        })}

        <circle cx={center} cy={center} r={3} fill="rgb(23,23,23)" />
      </svg>
    </div>
  );
}

export function DimensionBars({ data }: { data: DimensionPoint[] }) {
  return (
    <div className="space-y-4">
      {data.map((item) => {
        const score = item.score ?? 0;
        return (
          <div key={item.name}>
            <div className="flex items-end justify-between gap-4">
              <div className="text-sm font-semibold text-neutral-800">
                {item.name}
              </div>
              <div className="text-sm font-black text-neutral-900">
                {item.score === null ? "—" : item.score.toFixed(2)}
                {item.score !== null && (
                  <span className="ml-1 text-xs font-medium text-neutral-400">
                    / 5
                  </span>
                )}
              </div>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-orange-500"
                style={{
                  width: `${Math.max(0, Math.min(100, (score / 5) * 100))}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Heatmap({ data }: { data: DimensionPoint[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((item) => (
        <div
          key={item.name}
          className={`rounded-2xl border p-4 ${toneClass(item.tone)}`}
        >
          <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
            {toneLabel(item.tone)}
          </div>
          <div className="mt-2 font-bold">{item.name}</div>
          <div className="mt-2 text-2xl font-black">
            {item.score === null ? "—" : item.score.toFixed(2)}
            {item.score !== null && (
              <span className="ml-1 text-xs font-medium opacity-60">/ 5</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function toneClass(tone: DimensionPoint["tone"]) {
  if (tone === "strong") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }
  if (tone === "priority") {
    return "border-red-200 bg-red-50 text-red-900";
  }
  if (tone === "attention") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  return "border-blue-200 bg-blue-50 text-blue-900";
}

function toneLabel(tone: DimensionPoint["tone"]) {
  if (tone === "strong") return "Fortaleza";
  if (tone === "priority") return "Prioridad";
  if (tone === "attention") return "Atención";
  return "Desarrollo";
}

function truncate(value: string, max: number) {
  const clean = value.trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}
