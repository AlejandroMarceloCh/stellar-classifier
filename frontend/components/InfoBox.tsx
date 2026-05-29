"use client";

import { useState } from "react";

interface InfoBoxProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/** Caja colapsable estilo "saber más" para explicar conceptos técnicos
 *  (qué es un quadtree, cómo leer una matriz de confusión, etc.). */
export function InfoBox({ title, children, defaultOpen = false }: InfoBoxProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card-flat overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-gray-100 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-nasa-blue-bg text-nasa-blue text-[10px] font-bold"
          >
            ?
          </span>
          <span className="text-[12.5px] font-medium text-gray-900">{title}</span>
        </span>
        <span
          aria-hidden
          className={"text-gray-400 text-[10px] transition-transform " + (open ? "rotate-90" : "")}
        >
          ▶
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-[12.5px] text-gray-600 leading-relaxed space-y-2 border-t border-gray-200 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}
