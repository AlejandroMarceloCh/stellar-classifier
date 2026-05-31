"use client";

// Los 3 botones de apuesta. Color + icono + micro-descripción: nunca el color
// como único canal (a11y). Orden STAR → GALAXY → QSO (cerca → lejos → extremo).
import { CLASS_META, CLASS_ORDER } from "@/lib/gameState";
import type { StellarClass } from "@/lib/types";

// Iconos SVG mínimos por clase (estrella de 5 puntas, espiral, núcleo con haz).
function ClassIcon({ cls, color }: { cls: StellarClass; color: string }) {
  if (cls === "STAR") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={color} aria-hidden>
        <path d="M12 2l2.4 6.3L21 9l-5 4.4L17.6 21 12 17l-5.6 4 1.6-7.6L3 9l6.6-.7z" />
      </svg>
    );
  }
  if (cls === "GALAXY") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" aria-hidden>
        <ellipse cx="12" cy="12" rx="9" ry="4" />
        <ellipse cx="12" cy="12" rx="4" ry="9" transform="rotate(45 12 12)" opacity="0.5" />
        <circle cx="12" cy="12" r="1.6" fill={color} stroke="none" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="3.2" fill={color} stroke="none" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <circle cx="12" cy="12" r="7.5" opacity="0.4" />
    </svg>
  );
}

interface ClassButtonsProps {
  onPick: (cls: StellarClass) => void;
  disabled?: boolean;
  guess?: StellarClass | null;
}

export function ClassButtons({ onPick, disabled, guess }: ClassButtonsProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {CLASS_ORDER.map((cls) => {
        const meta = CLASS_META[cls];
        const selected = guess === cls;
        return (
          <button
            key={cls}
            type="button"
            disabled={disabled}
            onClick={() => onPick(cls)}
            className="group flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: selected ? meta.color : "rgba(120,150,210,0.16)",
              background: selected ? `${meta.color}1A` : "rgba(13,19,34,0.6)",
              boxShadow: selected ? `0 0 0 1px ${meta.color}` : "none",
            }}
          >
            <div className="flex w-full items-center gap-2">
              <ClassIcon cls={cls} color={meta.color} />
              <span className="text-[14px] font-semibold text-[#E8EDF7]">{meta.label}</span>
            </div>
            <span className="text-[11.5px] leading-snug text-[#8595B8]">{meta.blurb}</span>
          </button>
        );
      })}
    </div>
  );
}
