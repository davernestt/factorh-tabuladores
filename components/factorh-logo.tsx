/**
 * Única marca visual usada en las pantallas de FactoRH.
 * Renderizar texto, no un SVG, evita que cachés o URLs de despliegues
 * antiguos vuelvan a mostrar el isotipo circular.
 */
export default function FactoRHLogo({
  className = "h-10 w-auto",
}: {
  className?: string;
  full?: boolean;
  priority?: boolean;
}) {
  return (
    <span
      role="img"
      aria-label="FactoRH"
      className={`inline-flex select-none items-center justify-center whitespace-nowrap
        text-[36px] font-extrabold leading-none tracking-tight ${className}`}
    >
      <span aria-hidden="true" className="text-neutral-500">Facto</span>
      <span aria-hidden="true" className="text-orange-600">RH</span>
    </span>
  );
}
