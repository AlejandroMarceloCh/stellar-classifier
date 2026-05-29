"use client";

import { useMemo, useState } from "react";
import type { StellarClass } from "@/lib/types";

const LABEL: Record<StellarClass, string> = {
  GALAXY: "Galaxia",
  STAR: "Estrella",
  QSO: "Quásar",
};

interface ConfusionMatrixProps {
  matrix: number[][];
  classes: StellarClass[];
}

export function ConfusionMatrix({ matrix, classes }: ConfusionMatrixProps) {
  const [mode, setMode] = useState<"abs" | "pct">("pct");
  const rowSums = useMemo(() => matrix.map((row) => row.reduce((a, b) => a + b, 0)), [matrix]);

  const valueAt = (i: number, j: number) => {
    if (mode === "abs") return matrix[i][j];
    return rowSums[i] === 0 ? 0 : matrix[i][j] / rowSums[i];
  };
  const formatCell = (i: number, j: number) => {
    const v = valueAt(i, j);
    return mode === "abs" ? v.toLocaleString("es-PE") : `${(v * 100).toFixed(1)}%`;
  };
  const intensity = (i: number, j: number) => {
    if (mode === "pct") return valueAt(i, j);
    const rowMax = Math.max(...matrix[i]);
    return rowMax === 0 ? 0 : matrix[i][j] / rowMax;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-gray-500">
          Filas = clase real · columnas = predicción · {rowSums.reduce((a, b) => a + b, 0).toLocaleString("es-PE")} muestras
        </p>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: "auto repeat(3, minmax(0,1fr)) auto", gap: 4 }}>
        <div />
        {classes.map((c) => (
          <div key={c} className="label-uppercase text-center pb-1.5">
            {LABEL[c]}
          </div>
        ))}
        <div className="label-uppercase text-right pb-1.5 pl-3">Soporte</div>

        {classes.map((rowClass, i) => (
          <RowFragment key={rowClass}>
            <div className="text-[11px] text-gray-600 font-medium self-center pr-3 text-right">{LABEL[rowClass]}</div>
            {classes.map((_colClass, j) => {
              const isDiag = i === j;
              const intens = intensity(i, j);
              // Diagonal: verde sutil. Off-diagonal con error: rojo NASA proporcional.
              const bg = isDiag
                ? `rgba(0, 131, 61, ${0.06 + intens * 0.32})`
                : intens > 0
                  ? `rgba(252, 61, 33, ${0.05 + intens * 0.3})`
                  : "#fafafa";
              const border = isDiag
                ? "1px solid rgba(0, 131, 61, 0.4)"
                : intens > 0
                  ? "1px solid rgba(252, 61, 33, 0.25)"
                  : "1px solid #e5e5e5";
              return (
                <div
                  key={j}
                  className="rounded-md py-3 px-2 flex flex-col items-center justify-center min-h-[64px] transition-colors"
                  style={{ background: bg, border }}
                >
                  <div className="font-mono text-[16px] font-semibold text-gray-900 tabular-nums">
                    {formatCell(i, j)}
                  </div>
                  <div className="font-mono text-[10px] text-gray-500 mt-0.5 tabular-nums">
                    {mode === "pct" ? matrix[i][j].toLocaleString("es-PE") : `${(intens * 100).toFixed(1)}%`}
                  </div>
                </div>
              );
            })}
            <div className="self-center pl-3 text-right font-mono text-[11px] text-gray-500 tabular-nums">
              {rowSums[i].toLocaleString("es-PE")}
            </div>
          </RowFragment>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ background: "rgba(0, 131, 61, 0.35)", border: "1px solid rgba(0, 131, 61, 0.4)" }}
          />
          Aciertos · diagonal
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ background: "rgba(252, 61, 33, 0.3)", border: "1px solid rgba(252, 61, 33, 0.25)" }}
          />
          Errores · intensidad proporcional a la tasa
        </span>
      </div>
    </div>
  );
}

function RowFragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function ModeToggle({ mode, onChange }: { mode: "abs" | "pct"; onChange: (m: "abs" | "pct") => void }) {
  return (
    <div className="inline-flex p-0.5 rounded-md bg-gray-100 border border-gray-200 text-[11px]">
      <button
        onClick={() => onChange("abs")}
        className={
          "px-2.5 py-1 rounded transition-colors " +
          (mode === "abs"
            ? "bg-white text-gray-900 shadow-soft font-medium"
            : "text-gray-500 hover:text-gray-900")
        }
      >
        Absoluto
      </button>
      <button
        onClick={() => onChange("pct")}
        className={
          "px-2.5 py-1 rounded transition-colors " +
          (mode === "pct"
            ? "bg-white text-gray-900 shadow-soft font-medium"
            : "text-gray-500 hover:text-gray-900")
        }
      >
        % por fila
      </button>
    </div>
  );
}
