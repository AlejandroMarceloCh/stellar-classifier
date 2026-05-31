"use client";

// Cielo 2D full-bleed: dibuja los 10.000 puntos reales del SDSS17, las estrellas
// de ambiente (DECORADO declarado, no datos) y los objetos-misión con su anillo.
// Receta de perf: TypedArrays + culling + batch por clase (3 fillStyle) + fillRect
// + rAF con dirty-flag. Las posiciones reales NUNCA se animan (honestidad): solo
// parpadean las estrellas decorativas y respiran los anillos de misión.
import { useEffect, useRef } from "react";
import type { GameObject, StellarClass } from "@/lib/types";
import type { Camera } from "./useCamera";
import type { SpatialHash } from "./useSpatialHash";

const COLOR: Record<StellarClass, string> = {
  GALAXY: "#5B9BFF",
  STAR: "#FBBF24",
  QSO: "#C879F5",
};
const ACCENT = "#39D3C3";
const BG = "#05070D";

export interface ClassIndex {
  GALAXY: Uint32Array;
  STAR: Uint32Array;
  QSO: Uint32Array;
}

interface SkyCanvasProps {
  cam: Camera;
  alpha: Float32Array;
  delta: Float32Array;
  classIdx: ClassIndex;
  enabled: Set<StellarClass>;
  missions: GameObject[];
  missionHash: SpatialHash;
  discovered: Set<string>;
  activeId: string | null;
  revealActive: boolean; // el objeto activo ya mostró su clase real → pintar en su color
  dim: number; // 0..1 atenúa todo el cielo (interceptación)
  reducedMotion: boolean;
  interactive: boolean; // false mientras el panel del juego bloquea el cielo
  onMissionSelect: (obj: GameObject) => void;
}

interface AmbientStar {
  fx: number;
  fy: number;
  depth: number;
  phase: number;
  size: number;
}

export function SkyCanvas(props: SkyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  // Cualquier cambio de props que afecte el dibujo marca la cámara como sucia.
  useEffect(() => {
    props.cam.dirty = true;
  }, [props.cam, props.enabled, props.missions, props.discovered, props.activeId, props.revealActive, props.dim, props.interactive]);

  const ambientRef = useRef<AmbientStar[] | null>(null);
  if (ambientRef.current === null) {
    const stars: AmbientStar[] = [];
    for (let i = 0; i < 320; i++) {
      const bright = Math.random() < 0.12; // unas pocas estrellas grandes
      stars.push({
        fx: Math.random(),
        fy: Math.random(),
        depth: 0.25 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        size: bright ? 1.4 + Math.random() * 1.2 : 0.5 + Math.random() * 0.9,
      });
    }
    ambientRef.current = stars;
  }

  // Bucle de render + interacción. Deps vacías: cam es estable, props vía ref.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const cam = propsRef.current.cam;

    let dpr = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      cam.setViewport(rect.width, rect.height);
      cam.dirty = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const pingRef = { id: null as string | null, start: 0 };

    const draw = (now: number) => {
      const p = propsRef.current;
      const vw = cam.vw;
      const vh = cam.vh;
      const reduced = p.reducedMotion;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Fondo con profundidad (nebulosa muy tenue, NO negro plano): da sensación
      // de espacio aunque la cobertura del SDSS deje zonas sin datos.
      const grad = ctx.createRadialGradient(vw * 0.5, vh * 0.46, 0, vw * 0.5, vh * 0.46, Math.max(vw, vh) * 0.8);
      grad.addColorStop(0, "#0b1226");
      grad.addColorStop(0.55, "#070b18");
      grad.addColorStop(1, BG);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, vw, vh);

      // --- Estrellas de ambiente (DECORADO declarado, no datos) ---
      const skyDim = 1 - p.dim * 0.78;
      const panX = (cam.cx % 360) * 0.04;
      const panY = cam.cy * 0.04;
      ctx.fillStyle = "#dbe3f7";
      for (const s of ambientRef.current!) {
        let x = s.fx * vw - panX * s.depth * 30;
        let y = s.fy * vh + panY * s.depth * 30;
        x = ((x % vw) + vw) % vw;
        y = ((y % vh) + vh) % vh;
        const tw = reduced ? 1 : 0.6 + 0.4 * Math.sin(now * 0.002 + s.phase);
        ctx.globalAlpha = 0.7 * s.depth * tw * skyDim;
        ctx.fillRect(x, y, s.size, s.size);
      }

      // --- Puntos reales (10K): batch por clase, culling, LOD, glow aditivo ---
      // Composición 'lighter': donde se amontonan puntos, el brillo se suma → las
      // regiones densas resplandecen como el núcleo de una galaxia.
      const ratio = cam.scale / cam.baseScale;
      const size = ratio < 2 ? 1.7 : ratio < 6 ? 2.3 : 3;
      const half = size / 2;
      const margin = Math.max(vw, vh) * 0.25;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.6 * skyDim;
      (["GALAXY", "STAR", "QSO"] as const).forEach((cls) => {
        if (!p.enabled.has(cls)) return;
        const idx = p.classIdx[cls];
        ctx.fillStyle = COLOR[cls];
        for (let k = 0; k < idx.length; k++) {
          const i = idx[k];
          const x = vw / 2 + (p.alpha[i] - cam.cx) * cam.scale;
          if (x < -margin || x > vw + margin) continue;
          const y = vh / 2 - (p.delta[i] - cam.cy) * cam.scale;
          if (y < -margin || y > vh + margin) continue;
          ctx.fillRect(x - half, y - half, size, size);
        }
      });
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      // --- Objetos-misión: anillos + ping + objeto activo ---
      const mDim = 1 - p.dim * 0.5;
      for (const m of p.missions) {
        const sx = vw / 2 + (m.alpha - cam.cx) * cam.scale;
        const sy = vh / 2 - (m.delta - cam.cy) * cam.scale;
        if (sx < -40 || sx > vw + 40 || sy < -40 || sy > vh + 40) continue;
        const isActive = m.obj_id === p.activeId;
        const isDiscovered = p.discovered.has(m.obj_id);

        if (isActive) continue; // el activo se dibuja al final, encima

        if (isDiscovered) {
          // Ya revelado: punto pequeño en su color real, tenue.
          ctx.globalAlpha = 0.6 * mDim;
          ctx.fillStyle = COLOR[m.true_class];
          ctx.beginPath();
          ctx.arc(sx, sy, 2.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Sin clasificar: marca DISCRETA (punto + anillo fino). Solo el objeto
          // bajo el cursor se agranda y brilla → sin "sopa de anillos".
          const hovered = m.obj_id === hoveredId;
          const breathe = reduced ? 0 : Math.sin(now * 0.0022 + m.alpha) * 0.5;
          // Punto central accent.
          ctx.globalAlpha = (hovered ? 1 : 0.85) * mDim;
          ctx.fillStyle = ACCENT;
          ctx.beginPath();
          ctx.arc(sx, sy, hovered ? 3 : 1.8, 0, Math.PI * 2);
          ctx.fill();
          // Anillo fino.
          ctx.globalAlpha = (hovered ? 0.9 : 0.3) * mDim;
          ctx.strokeStyle = ACCENT;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(sx, sy, (hovered ? 9 : 5) + breathe, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // --- Objeto activo (encima de todo) ---
      let pingAlive = false;
      const active = p.missions.find((m) => m.obj_id === p.activeId);
      if (active) {
        const sx = vw / 2 + (active.alpha - cam.cx) * cam.scale;
        const sy = vh / 2 - (active.delta - cam.cy) * cam.scale;
        const col = p.revealActive ? COLOR[active.true_class] : ACCENT;

        // Ping de radar: una expansión al entrar en contacto.
        if (pingRef.id !== p.activeId) {
          pingRef.id = p.activeId;
          pingRef.start = now;
        }
        const age = now - pingRef.start;
        if (!reduced && age < 1100) {
          pingAlive = true;
          const k = age / 1100;
          ctx.globalAlpha = (1 - k) * 0.55;
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx, sy, 12 + k * 80, 0, Math.PI * 2);
          ctx.stroke();
        }

        const breathe = reduced ? 0 : Math.sin(now * 0.004) * 2;
        ctx.globalAlpha = 1;
        if (p.revealActive) {
          // Diamante relleno en su clase real.
          ctx.fillStyle = col;
          ctx.beginPath();
          const r = 9;
          ctx.moveTo(sx, sy - r);
          ctx.lineTo(sx + r, sy);
          ctx.lineTo(sx, sy + r);
          ctx.lineTo(sx - r, sy);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.strokeStyle = col;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx, sy, 11 + breathe, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(sx, sy, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      return pingAlive;
    };

    let raf = 0;
    let lastTime = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(50, now - lastTime);
      lastTime = now;
      cam.tick(dt);
      const reduced = propsRef.current.reducedMotion;
      // Con motion: el cielo respira siempre (estrellas/anillos). Con reduced:
      // solo repinta cuando la cámara cambió → reposo real.
      const mustDraw = cam.dirty || !reduced;
      if (mustDraw) {
        draw(now);
        cam.dirty = false;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // --- Interacción ---
    let dragging = false;
    let moved = 0;
    let lx = 0;
    let ly = 0;
    let vSmoothX = 0;
    let vSmoothY = 0;
    let lastMoveT = 0;
    let hoveredId: string | null = null;

    const localXY = (e: PointerEvent | WheelEvent | MouseEvent): [number, number] => {
      const rect = canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!propsRef.current.interactive) return;
      dragging = true;
      moved = 0;
      const [x, y] = localXY(e);
      lx = x;
      ly = y;
      vSmoothX = 0;
      vSmoothY = 0;
      lastMoveT = performance.now();
      cam.stopInertia();
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      const [x, y] = localXY(e);
      if (dragging) {
        const dx = x - lx;
        const dy = y - ly;
        moved += Math.abs(dx) + Math.abs(dy);
        cam.panByScreen(dx, dy);
        const now = performance.now();
        const dt = Math.max(1, now - lastMoveT);
        vSmoothX = 0.75 * vSmoothX + 0.25 * (dx / dt);
        vSmoothY = 0.75 * vSmoothY + 0.25 * (dy / dt);
        lastMoveT = now;
        lx = x;
        ly = y;
      } else if (propsRef.current.interactive) {
        // Hover: ¿hay un objeto-misión cerca del cursor?
        const p = propsRef.current;
        const [wa, wd] = cam.screenToWorld(x, y);
        const i = p.missionHash.nearest(wa, wd, 16 / cam.scale);
        const newHover = i >= 0 ? p.missions[i].obj_id : null;
        if (newHover !== hoveredId) {
          hoveredId = newHover;
          cam.dirty = true;
        }
        canvas.style.cursor = i >= 0 ? "pointer" : "grab";
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      const p = propsRef.current;
      if (moved < 5) {
        // Click: seleccionar objeto-misión bajo el cursor.
        const [x, y] = localXY(e);
        const [wa, wd] = cam.screenToWorld(x, y);
        const i = p.missionHash.nearest(wa, wd, 16 / cam.scale);
        if (i >= 0) p.onMissionSelect(p.missions[i]);
      } else if (!p.reducedMotion) {
        cam.setVelocityScreen(vSmoothX, vSmoothY);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!propsRef.current.interactive) return;
      e.preventDefault();
      const [x, y] = localXY(e);
      let factor = Math.exp(-e.deltaY * 0.0016);
      factor = Math.max(0.3, Math.min(3, factor));
      cam.zoomAt(x, y, factor);
    };

    const onDblClick = (e: MouseEvent) => {
      if (!propsRef.current.interactive) return;
      const [x, y] = localXY(e);
      const [wa, wd] = cam.screenToWorld(x, y);
      const targetScale = cam.scale * 1.9;
      if (propsRef.current.reducedMotion) cam.jumpTo(wa, wd, targetScale);
      else cam.flyTo(wa, wd, targetScale, 420);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("dblclick", onDblClick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", onDblClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 h-full w-full touch-none select-none"
      style={{ cursor: "grab", background: BG }}
    />
  );
}
