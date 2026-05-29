"use client";

import Link from "next/link";
import type { PredictResponse, StellarClass } from "@/lib/types";

const META: Record<StellarClass, { label: string; color: string; bg: string }> = {
  GALAXY: { label: "Galaxia", color: "#0B3D91", bg: "#eef3fc" },
  STAR: { label: "Estrella", color: "#D97706", bg: "#fef3c7" },
  QSO: { label: "Quásar", color: "#7B2D8E", bg: "#f3e8ff" },
};

export function ResultCard({ result }: { result: PredictResponse }) {
  const m = META[result.prediction];
  const conf = result.confidence ?? 0;
  const confPct = conf * 100;

  return (
    <section
      className="card overflow-hidden animate-slide-up"
      style={{ boxShadow: `0 0 0 1px ${m.color}33, 0 8px 24px rgba(15,23,42,0.06)` }}
    >
      <div className="h-1" style={{ background: m.color }} />
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <span className="label-uppercase">Predicción</span>
          <span className="font-mono text-[10px] text-gray-400 truncate max-w-[180px]">
            {result.model_version}
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-4">
          <h2 className="text-[40px] leading-none font-semibold tracking-tight-ish text-gray-900">
            {m.label}
          </h2>
          <span
            className="font-mono text-[28px] leading-none tabular-nums font-semibold"
            style={{ color: m.color }}
          >
            {confPct.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-2.5">
        <div className="label-uppercase">Top-3 probabilidades</div>
        {result.top3.map(([cls, prob]) => {
          const mm = META[cls];
          const pct = prob * 100;
          return (
            <div key={cls} className="flex items-center gap-3">
              <span
                aria-hidden
                className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: mm.color }}
              />
              <span className="text-[12px] text-gray-700 w-16">{mm.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: mm.color }}
                />
              </div>
              <span className="font-mono text-[11px] text-gray-700 w-12 text-right tabular-nums">
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <span className="text-[11px] text-gray-500">Marcador guardado para Universo 3D</span>
        <Link
          href="/universe"
          className="text-[12px] font-medium text-nasa-blue hover:text-nasa-blue-light transition-colors"
        >
          Ver en 3D
        </Link>
      </div>
    </section>
  );
}
