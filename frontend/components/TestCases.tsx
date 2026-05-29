"use client";

import type { StellarClass } from "@/lib/types";
import { TEST_CASES, type TestCase } from "@/lib/testCases";

const META: Record<StellarClass, { label: string; color: string; bg: string }> = {
  GALAXY: { label: "Galaxia", color: "#0B3D91", bg: "#eef3fc" },
  STAR: { label: "Estrella", color: "#D97706", bg: "#fef3c7" },
  QSO: { label: "Quásar", color: "#7B2D8E", bg: "#f3e8ff" },
};

interface TestCasesProps {
  onRun: (tc: TestCase) => void;
  disabled?: boolean;
  activeId?: string | null;
}

export function TestCases({ onRun, disabled, activeId }: TestCasesProps) {
  return (
    <div className="card divide-y divide-gray-200 overflow-hidden">
      {TEST_CASES.map((tc) => {
        const m = META[tc.expectedClass];
        const active = activeId === tc.id;
        return (
          <button
            key={tc.id}
            type="button"
            disabled={disabled}
            onClick={() => onRun(tc)}
            className={
              "w-full flex items-center gap-4 px-4 py-3 text-left transition-colors " +
              "hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed " +
              (active ? "bg-nasa-blue-bg/60" : "")
            }
          >
            <span
              aria-hidden
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: m.color }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13.5px] font-medium text-gray-900">{tc.label}</span>
                <span
                  className="px-1.5 py-0.5 rounded font-mono text-[10px] tabular-nums shrink-0"
                  style={{ background: m.bg, color: m.color }}
                >
                  {m.label} {(tc.expectedConfidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-gray-500 truncate">{tc.note}</p>
            </div>
            <span className="font-mono text-[11px] text-gray-400 tabular-nums hidden sm:block shrink-0">
              z̃ {tc.values.redshift.toFixed(3)}
            </span>
            <span
              className={
                "text-[12px] shrink-0 transition-colors " +
                (active ? "text-nasa-blue font-medium" : "text-gray-400")
              }
            >
              {disabled ? "…" : active ? "✓" : "Probar"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
