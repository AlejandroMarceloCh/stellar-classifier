"use client";

import { useMemo } from "react";
import type { ModelEntry } from "@/lib/types";

interface ModelComparisonChartProps {
  models: ModelEntry[];
  winnerName: string;
  baselineAccuracy: number;
}

export function ModelComparisonChart({
  models,
  winnerName,
  baselineAccuracy,
}: ModelComparisonChartProps) {
  const data = useMemo(
    () => [...models].sort((a, b) => b.test_accuracy - a.test_accuracy),
    [models],
  );
  const minDomain = Math.min(baselineAccuracy, ...data.map((m) => m.test_accuracy));
  // ModelEntry usa `model` (no `name`) en el contrato del backend.
  const lo = Math.max(0, Math.floor(minDomain * 100 - 2) / 100);
  const hi = 1;
  const range = hi - lo;

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[140px_70px_60px_70px_1fr] gap-3 px-2 pb-2 border-b border-gray-200 text-[10px] tracking-[0.14em] uppercase text-gray-500 font-semibold">
        <span>Modelo</span>
        <span className="text-right">CV mean</span>
        <span className="text-right">± std</span>
        <span className="text-right">Test</span>
        <span className="pl-2">Distribución · {(lo * 100).toFixed(0)}% a 100%</span>
      </div>
      {data.map((m) => {
        const isWinner = m.model === winnerName;
        const xTest = ((m.test_accuracy - lo) / range) * 100;
        const xCv = ((m.cv_accuracy_mean - lo) / range) * 100;
        const xErrLo = ((m.cv_accuracy_mean - m.cv_accuracy_std - lo) / range) * 100;
        const xErrHi = ((m.cv_accuracy_mean + m.cv_accuracy_std - lo) / range) * 100;
        return (
          <div
            key={m.model}
            className="grid grid-cols-[140px_70px_60px_70px_1fr] gap-3 px-2 py-2.5 rounded-md transition-colors hover:bg-gray-50 items-center"
          >
            <span className="flex items-center gap-2 text-[13px]">
              <span
                aria-hidden
                className={
                  "inline-block w-1.5 h-1.5 rounded-full " +
                  (isWinner ? "bg-nasa-blue" : "bg-gray-300")
                }
              />
              <span className={isWinner ? "text-gray-900 font-semibold" : "text-gray-700"}>
                {m.model}
              </span>
            </span>
            <span className="font-mono text-[12px] text-gray-700 text-right tabular-nums">
              {(m.cv_accuracy_mean * 100).toFixed(2)}%
            </span>
            <span className="font-mono text-[11px] text-gray-400 text-right tabular-nums">
              ±{(m.cv_accuracy_std * 100).toFixed(2)}
            </span>
            <span
              className={
                "font-mono text-[13px] text-right tabular-nums " +
                (isWinner ? "text-nasa-blue font-semibold" : "text-gray-700")
              }
            >
              {(m.test_accuracy * 100).toFixed(2)}%
            </span>
            <div className="pl-2 relative h-5">
              <div className="absolute inset-y-1/2 left-0 right-0 h-px bg-gray-200" />
              {/* baseline marker */}
              {baselineAccuracy >= lo && baselineAccuracy <= hi && (
                <div
                  className="absolute top-1 bottom-1 w-px bg-gray-300"
                  style={{ left: `${((baselineAccuracy - lo) / range) * 100}%` }}
                  title={`Baseline ${(baselineAccuracy * 100).toFixed(2)}%`}
                />
              )}
              {/* CV error bar */}
              <div
                className="absolute top-1/2 h-px"
                style={{
                  left: `${Math.max(0, xErrLo)}%`,
                  width: `${Math.min(100, xErrHi - xErrLo)}%`,
                  background: "#a3a3a3",
                  transform: "translateY(-50%)",
                }}
              />
              {/* CV mean tick */}
              <div
                className="absolute"
                style={{
                  left: `${xCv}%`,
                  top: "30%",
                  height: "40%",
                  width: 1,
                  background: "#737373",
                }}
              />
              {/* test bar */}
              <div
                className="absolute top-1/2 h-[3px] rounded-r-sm"
                style={{
                  left: 0,
                  width: `${xTest}%`,
                  background: isWinner ? "#0B3D91" : "#737373",
                  transform: "translateY(-50%)",
                }}
              />
              {/* test endpoint marker */}
              <div
                className="absolute rounded-sm"
                style={{
                  left: `${xTest}%`,
                  top: "15%",
                  bottom: "15%",
                  width: 2,
                  background: isWinner ? "#0B3D91" : "#525252",
                  marginLeft: -1,
                }}
              />
            </div>
          </div>
        );
      })}
      <div className="px-2 pt-3 text-[11px] text-gray-500 flex flex-wrap items-center gap-x-5 gap-y-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-[3px] bg-nasa-blue" />
          Test accuracy (ganador)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-[3px] bg-gray-500" />
          Test accuracy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-px bg-gray-400" />
          CV ± std
        </span>
        <span className="flex items-center gap-1.5 ml-auto">
          <span className="inline-block w-px h-3 bg-gray-400" />
          Baseline {(baselineAccuracy * 100).toFixed(2)}%
        </span>
      </div>
    </div>
  );
}
