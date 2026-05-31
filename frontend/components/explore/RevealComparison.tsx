"use client";

// El reveal (S5): 3 columnas TÚ / MODELO / REAL con check/cruz, el candado del
// redshift que se abre con un count-up, y la frase causal honesta (umbral validado
// contra los 240 objetos reales). Nunca rojo de castigo: "Casi" en vez de error.
import { useEffect, useState } from "react";
import { CLASS_META, redshiftCausalPhrase } from "@/lib/gameState";
import type { PredictResponse, StellarClass } from "@/lib/types";

function useCountUp(target: number, reduced: boolean, ms = 950): number {
  const [val, setVal] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) {
      setVal(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const k = Math.min(1, (performance.now() - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setVal(target * e);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced, ms]);
  return val;
}

function Verdict({ ok }: { ok: boolean }) {
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-bold"
      style={{
        background: ok ? "rgba(57,211,195,0.18)" : "rgba(133,149,184,0.18)",
        color: ok ? "#39D3C3" : "#8595B8",
      }}
      aria-label={ok ? "acierto" : "no coincide"}
    >
      {ok ? "✓" : "·"}
    </span>
  );
}

function Column({
  kicker,
  cls,
  sub,
  verdict,
}: {
  kicker: string;
  cls: StellarClass;
  sub?: string;
  verdict?: boolean;
}) {
  const meta = CLASS_META[cls];
  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-xl border p-3"
      style={{ borderColor: "rgba(120,150,210,0.16)", background: "rgba(13,19,34,0.55)" }}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8595B8]">{kicker}</span>
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} aria-hidden />
      <span className="text-[14px] font-semibold" style={{ color: meta.color }}>
        {meta.label}
      </span>
      {sub && <span className="font-mono text-[10.5px] tabular-nums text-[#8595B8]">{sub}</span>}
      {verdict !== undefined && <Verdict ok={verdict} />}
    </div>
  );
}

interface RevealComparisonProps {
  guess: StellarClass;
  prediction: PredictResponse;
  trueClass: StellarClass;
  redshift: number;
  reducedMotion: boolean;
}

export function RevealComparison({
  guess,
  prediction,
  trueClass,
  redshift,
  reducedMotion,
}: RevealComparisonProps) {
  const z = useCountUp(redshift, reducedMotion);
  const playerOk = guess === trueClass;
  const modelOk = prediction.prediction === trueClass;
  const conf = prediction.confidence;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Column kicker="Tú" cls={guess} verdict={playerOk} />
        <Column
          kicker="Modelo"
          cls={prediction.prediction}
          sub={conf != null ? `${(conf * 100).toFixed(1)}%` : undefined}
          verdict={modelOk}
        />
        <Column kicker="Real" cls={trueClass} />
      </div>

      {/* Candado del redshift abierto + count-up */}
      <div
        className="flex items-center justify-between rounded-xl border px-3.5 py-2.5"
        style={{ borderColor: "rgba(57,211,195,0.3)", background: "rgba(57,211,195,0.06)" }}
      >
        <span className="flex items-center gap-2 text-[12.5px] text-[#E8EDF7]">
          <span aria-hidden>🔓</span> Distancia revelada · redshift
        </span>
        <span className="font-mono text-[15px] font-semibold tabular-nums text-[#39D3C3]">
          {z.toFixed(4)}
        </span>
      </div>

      <p className="text-[12.5px] leading-relaxed text-[#A9B6D6]">
        {redshiftCausalPhrase(redshift)}
      </p>

      <div className="flex items-center gap-2 pt-0.5">
        <span
          className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
          style={{
            background: playerOk ? "rgba(57,211,195,0.16)" : "rgba(251,191,36,0.14)",
            color: playerOk ? "#39D3C3" : "#FBBF24",
          }}
        >
          {playerOk ? "Acertaste" : "Casi — sigue practicando"}
        </span>
        <span className="text-[11.5px] text-[#8595B8]">
          El modelo {modelOk ? "también acertó" : "se equivocó en este"}.
        </span>
      </div>
    </div>
  );
}
