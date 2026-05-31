"use client";

// Minimapa abajo-derecha: el cielo completo (α 0-360 × δ) con los 240 objetos-misión
// y el rectángulo accent del viewport actual. Click/arrastre = teletransporte.
import { useEffect, useRef } from "react";
import type { GameObject, StellarClass } from "@/lib/types";
import type { Bounds, Camera } from "./useCamera";
import { useCamSnapshot } from "./useCamera";

const MW = 184;
const MH = 116;
const COLOR: Record<StellarClass, string> = {
  GALAXY: "#5B9BFF",
  STAR: "#FBBF24",
  QSO: "#C879F5",
};

interface MinimapProps {
  cam: Camera;
  bounds: Bounds;
  missions: GameObject[];
  discovered: Set<string>;
  reducedMotion: boolean;
}

export function Minimap({ cam, bounds, missions, discovered, reducedMotion }: MinimapProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const snap = useCamSnapshot(cam, 10);

  const fx = (a: number) => ((a - bounds.aMin) / (bounds.aMax - bounds.aMin)) * MW;
  const fy = (d: number) => MH - ((d - bounds.dMin) / (bounds.dMax - bounds.dMin)) * MH;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = MW * dpr;
    canvas.height = MH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#070B14";
    ctx.fillRect(0, 0, MW, MH);

    for (const m of missions) {
      const x = fx(m.alpha);
      const y = fy(m.delta);
      if (discovered.has(m.obj_id)) {
        ctx.fillStyle = COLOR[m.true_class];
        ctx.globalAlpha = 0.8;
      } else {
        ctx.fillStyle = "#39D3C3";
        ctx.globalAlpha = 0.4;
      }
      ctx.fillRect(x - 0.6, y - 0.6, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;

    // Rectángulo del viewport.
    const r = cam.viewportWorldRect();
    const rx = fx(r.aMin);
    const ry = fy(r.dMax);
    const rw = (Math.abs(r.aMax - r.aMin) / (bounds.aMax - bounds.aMin)) * MW;
    const rh = (Math.abs(r.dMax - r.dMin) / (bounds.dMax - bounds.dMin)) * MH;
    ctx.strokeStyle = "#39D3C3";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.max(0.5, rx),
      Math.max(0.5, ry),
      Math.min(MW - 1, rw),
      Math.min(MH - 1, rh),
    );
  }, [snap, missions, discovered, bounds, cam]);

  const teleport = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const a = bounds.aMin + (mx / MW) * (bounds.aMax - bounds.aMin);
    const d = bounds.dMin + (1 - my / MH) * (bounds.dMax - bounds.dMin);
    const target = Math.max(cam.baseScale * 3, cam.scale);
    if (reducedMotion) cam.jumpTo(a, d, target);
    else cam.flyTo(a, d, target, 420);
  };

  return (
    <div
      className="pointer-events-auto overflow-hidden rounded-lg border"
      style={{ borderColor: "rgba(120,150,210,0.18)", background: "rgba(10,15,25,0.7)", backdropFilter: "blur(8px)" }}
    >
      <canvas
        ref={ref}
        onClick={teleport}
        style={{ width: MW, height: MH, display: "block", cursor: "crosshair" }}
        aria-label="Minimapa del cielo: clic para teletransportarte"
      />
    </div>
  );
}
