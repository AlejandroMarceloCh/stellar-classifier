"use client";

// Las 5 bandas fotométricas u,g,r,i,z como barras: "así brilla esta luz en 5
// colores, del ultravioleta al infrarrojo". En magnitudes SDSS, MENOR = más
// brillante, así que invertimos para que la barra larga = más brillo. La longitud
// se normaliza entre las 5 bandas del PROPIO objeto para que el contraste se vea.
import type { GameObject } from "@/lib/types";

const BANDS: { key: keyof GameObject; label: string; color: string; hint: string }[] = [
  { key: "u", label: "u", color: "#8B7BFF", hint: "ultravioleta" },
  { key: "g", label: "g", color: "#5BD37B", hint: "verde" },
  { key: "r", label: "r", color: "#FF8B6B", hint: "rojo" },
  { key: "i", label: "i", color: "#E0606B", hint: "infrarrojo cercano" },
  { key: "z", label: "z", color: "#C04F63", hint: "infrarrojo" },
];

export function PhotometricBars({ obj }: { obj: GameObject }) {
  const vals = BANDS.map((b) => obj[b.key] as number);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;

  return (
    <div className="space-y-1.5">
      {BANDS.map((b, idx) => {
        const v = vals[idx];
        // Invertido: la banda más brillante (menor magnitud) llega más a la derecha.
        const pct = 18 + (1 - (v - min) / span) * 82;
        return (
          <div key={b.label} className="flex items-center gap-2.5">
            <span className="w-3 font-mono text-[12px] font-semibold" style={{ color: b.color }}>
              {b.label}
            </span>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%`, background: b.color, opacity: 0.85 }}
              />
            </div>
            <span className="w-12 text-right font-mono text-[11px] tabular-nums text-[#8595B8]">
              {v.toFixed(2)}
            </span>
          </div>
        );
      })}
      <p className="pt-0.5 text-[11px] leading-snug text-[#8595B8]">
        Del ultravioleta (u) al infrarrojo (z). Esta es su huella de color: la única
        pista de brillo que tienes para adivinar.
      </p>
    </div>
  );
}
