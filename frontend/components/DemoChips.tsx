"use client";

import type { DemoObject, StellarClass } from "@/lib/types";
import { Tooltip } from "@/components/Tooltip";

const META: Record<StellarClass, { label: string; color: string; bg: string; tip: string }> = {
  GALAXY: {
    label: "Galaxia",
    color: "#0B3D91",
    bg: "#eef3fc",
    tip: "Sistema de millones de estrellas, gas y polvo. Visible a distancias intermedias (z entre 0.05 y 0.5 típicamente).",
  },
  STAR: {
    label: "Estrella",
    color: "#D97706",
    bg: "#fef3c7",
    tip: "Objeto local de nuestra galaxia. Redshift cercano a 0 porque se mueve con nosotros.",
  },
  QSO: {
    label: "Quásar",
    color: "#7B2D8E",
    bg: "#f3e8ff",
    tip: "Núcleo galáctico hiperactivo. Tan brillante que se ve a miles de millones de años luz (z alto, frecuentemente > 1).",
  },
};

interface DemoChipsProps {
  demoObjects: Record<StellarClass, DemoObject>;
  onLoad: (demo: DemoObject) => void;
  disabled?: boolean;
  activeId?: string | null;
}

export function DemoChips({ demoObjects, onLoad, disabled, activeId }: DemoChipsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {(["GALAXY", "STAR", "QSO"] as const).map((cls) => {
        const demo = demoObjects[cls];
        const meta = META[cls];
        if (!demo) return null;
        const active = activeId === demo.obj_id;
        return (
          <button
            key={cls}
            type="button"
            disabled={disabled}
            onClick={() => onLoad(demo)}
            className={
              "group text-left rounded-lg border bg-white px-4 py-3.5 transition-all shadow-soft " +
              "hover:shadow-elev hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed " +
              (active ? "border-nasa-blue ring-2 ring-nasa-blue/20" : "border-gray-200 hover:border-gray-300")
            }
            style={active ? { boxShadow: `inset 3px 0 0 ${meta.color}, 0 4px 12px rgba(15,23,42,0.06)` } : undefined}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                <Tooltip content={meta.tip} side="bottom">
                  <span className="text-[14px] font-medium text-gray-900 cursor-help border-b border-dotted border-gray-300">
                    {meta.label}
                  </span>
                </Tooltip>
              </span>
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[11px] tabular-nums"
                style={{ background: meta.bg, color: meta.color }}
              >
                {(demo.expected_confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-3">
              <span className="font-mono text-[11px] text-gray-500 truncate">
                obj {demo.obj_id.slice(0, 12)}…
              </span>
              <span className="font-mono text-[11px] text-gray-500 tabular-nums">
                z {demo.redshift.toFixed(3)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span
                className={
                  "text-[11px] transition-colors " +
                  (active ? "text-nasa-blue font-medium" : "text-gray-500 group-hover:text-nasa-blue")
                }
              >
                {disabled ? "Clasificando…" : active ? "Cargado" : "Clasificar este"}
              </span>
              {!active && !disabled && (
                <span aria-hidden className="text-gray-300 group-hover:text-nasa-blue transition-colors text-[12px]">
                  ›
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
