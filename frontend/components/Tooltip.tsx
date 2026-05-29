"use client";

import { useState, useRef, useEffect } from "react";

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

/** Tooltip ligero sin librería externa. Aparece al hover/focus. */
export function Tooltip({ content, children, side = "top", delay = 250 }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function show() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  }
  function hide() {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  }

  const placement = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
  }[side];

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={
            "absolute z-50 pointer-events-none px-2.5 py-1.5 rounded-md bg-gray-900 text-white text-[11px] leading-relaxed shadow-elev-lg w-max max-w-[260px] whitespace-normal " +
            placement
          }
        >
          {content}
        </span>
      )}
    </span>
  );
}

/** Botón de ayuda con icono "i" + tooltip. */
export function HelpHint({ content, side = "top" }: { content: string | React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Tooltip content={content} side={side}>
      <span
        tabIndex={0}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-gray-300 text-gray-400 text-[9px] font-mono cursor-help hover:border-nasa-blue hover:text-nasa-blue transition-colors"
        aria-label="Más información"
      >
        i
      </span>
    </Tooltip>
  );
}
