"use client";

interface IntroBannerProps {
  eyebrow?: string;
  title: string;
  description: string;
  flow?: { label: string; href: string }[];
}

/** Banner introductorio que aparece arriba de cada pantalla principal.
 *  Explica qué se hace, cómo se conecta con las otras 3 pantallas. */
export function IntroBanner({ eyebrow, title, description, flow }: IntroBannerProps) {
  return (
    <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <div className="label-uppercase text-nasa-blue mb-1.5">{eyebrow}</div>
        )}
        <h1 className="text-[28px] font-semibold tracking-tight-ish text-gray-900">{title}</h1>
        <p className="mt-2 text-[13.5px] text-gray-600 leading-relaxed">{description}</p>
      </div>
      {flow && flow.length > 0 && (
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-500 lg:flex-col lg:items-end">
          <span className="label-uppercase">Flujo del producto</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {flow.map((step, i) => (
              <span key={step.label} className="flex items-center gap-1.5">
                <a
                  href={step.href}
                  className="hover:text-nasa-blue transition-colors"
                >
                  {step.label}
                </a>
                {i < flow.length - 1 && <span className="text-gray-300">›</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
