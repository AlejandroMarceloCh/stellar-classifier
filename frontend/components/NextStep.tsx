import Link from "next/link";

interface NextStepProps {
  href: string;
  label: string;
  reason: string;
}

/** Hilo conductor al pie de cada pantalla — guía al estudiante a la siguiente
 *  parada del recorrido, explicando por qué ir ahí. */
export function NextStep({ href, label, reason }: NextStepProps) {
  return (
    <Link
      href={href}
      className="group card flex items-center justify-between gap-4 px-5 py-4 hover:border-nasa-blue/40 hover:shadow-elev transition-all"
    >
      <div>
        <div className="label-uppercase text-gray-400">Siguiente paso</div>
        <div className="mt-1 text-[15px] font-semibold text-gray-900 group-hover:text-nasa-blue transition-colors">
          {label}
        </div>
        <div className="mt-0.5 text-[12.5px] text-gray-500">{reason}</div>
      </div>
      <span
        aria-hidden
        className="text-gray-300 group-hover:text-nasa-blue group-hover:translate-x-1 transition-all text-[20px]"
      >
        →
      </span>
    </Link>
  );
}
