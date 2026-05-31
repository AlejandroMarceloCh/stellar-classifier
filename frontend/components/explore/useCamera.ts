// Cámara estilo Google Earth para el cielo 2D: pan con inercia, zoom-to-cursor,
// fly-to con easing y zoom-to-fit. La cámara es la FUENTE DE VERDAD mutable (no
// React state) para que el render loop la lea sin causar re-renders por frame.
// Mundo = plano ecuatorial: α∈[aMin,aMax] eje X, δ∈[dMin,dMax] eje Y INVERTIDO
// (más declinación = arriba en pantalla, como el norte celeste).
import { useEffect, useRef, useState } from "react";

export interface Bounds {
  aMin: number;
  aMax: number;
  dMin: number;
  dMax: number;
}

// Rango nominal del SDSS17 (se sobrescribe con los min/max reales de la data).
export const DEFAULT_BOUNDS: Bounds = { aMin: 0, aMax: 360, dMin: -18.8, dMax: 83 };

export interface CamSnapshot {
  cx: number;
  cy: number;
  scale: number;
  baseScale: number;
}

const FRICTION = 0.92; // por frame de 16.67ms
const MIN_SPEED = 0.004; // grados-mundo/ms: por debajo, la inercia se detiene

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class Camera {
  cx: number;
  cy: number;
  scale: number;
  vw = 1;
  vh = 1;
  bounds: Bounds;
  baseScale = 1; // scale que encuadra todo el cielo (referencia para LOD/breadcrumb)
  minScale = 0.05;
  maxScale = 400;
  dirty = true;

  private vx = 0; // velocidad inercial (grados-mundo/ms)
  private vy = 0;
  private fly:
    | { fx: number; fy: number; fs: number; tx: number; ty: number; ts: number; t: number; dur: number }
    | null = null;
  private listeners = new Set<() => void>();

  constructor(bounds: Bounds) {
    this.bounds = bounds;
    this.cx = (bounds.aMin + bounds.aMax) / 2;
    this.cy = (bounds.dMin + bounds.dMax) / 2;
    this.scale = 1;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private notify(): void {
    this.dirty = true;
    this.listeners.forEach((f) => f());
  }

  snapshot(): CamSnapshot {
    return { cx: this.cx, cy: this.cy, scale: this.scale, baseScale: this.baseScale };
  }

  setViewport(vw: number, vh: number): void {
    if (vw === this.vw && vh === this.vh) return;
    this.vw = vw;
    this.vh = vh;
    this.baseScale = this.fitScale();
    this.minScale = this.baseScale * 0.85;
    this.dirty = true;
  }

  setBounds(b: Bounds): void {
    this.bounds = b;
    this.baseScale = this.fitScale();
  }

  fitScale(): number {
    const sx = this.vw / Math.max(1e-6, this.bounds.aMax - this.bounds.aMin);
    const sy = this.vh / Math.max(1e-6, this.bounds.dMax - this.bounds.dMin);
    return Math.min(sx, sy) * 0.94;
  }

  fitTo(): void {
    this.cx = (this.bounds.aMin + this.bounds.aMax) / 2;
    this.cy = (this.bounds.dMin + this.bounds.dMax) / 2;
    this.baseScale = this.fitScale();
    this.minScale = this.baseScale * 0.85;
    this.scale = this.baseScale;
    this.vx = 0;
    this.vy = 0;
    this.fly = null;
    this.notify();
  }

  worldToScreen(a: number, d: number): [number, number] {
    return [this.vw / 2 + (a - this.cx) * this.scale, this.vh / 2 - (d - this.cy) * this.scale];
  }
  screenToWorld(sx: number, sy: number): [number, number] {
    return [this.cx + (sx - this.vw / 2) / this.scale, this.cy - (sy - this.vh / 2) / this.scale];
  }

  clampScale(s: number): number {
    return Math.max(this.minScale, Math.min(this.maxScale, s));
  }

  // Rectángulo del viewport en coords-mundo (para el minimapa).
  viewportWorldRect(): { aMin: number; aMax: number; dMin: number; dMax: number } {
    const [a0, d1] = this.screenToWorld(0, 0); // esquina sup-izq: δ máximo
    const [a1, d0] = this.screenToWorld(this.vw, this.vh);
    return { aMin: a0, aMax: a1, dMin: d0, dMax: d1 };
  }

  panByScreen(dxPx: number, dyPx: number): void {
    this.cx -= dxPx / this.scale;
    this.cy += dyPx / this.scale;
    this.notify();
  }

  // px/ms en pantalla → grados-mundo/ms (Y invertido).
  setVelocityScreen(vxPx: number, vyPx: number): void {
    this.vx = -vxPx / this.scale;
    this.vy = vyPx / this.scale;
    this.fly = null;
  }

  stopInertia(): void {
    this.vx = 0;
    this.vy = 0;
  }

  // Zoom anclado al cursor: el punto-mundo bajo (sx,sy) no se mueve.
  zoomAt(sx: number, sy: number, factor: number): void {
    const [wa, wd] = this.screenToWorld(sx, sy);
    this.scale = this.clampScale(this.scale * factor);
    this.cx = wa - (sx - this.vw / 2) / this.scale;
    this.cy = wd + (sy - this.vh / 2) / this.scale;
    this.vx = 0;
    this.vy = 0;
    this.notify();
  }

  flyTo(tx: number, ty: number, ts: number, dur = 620): void {
    this.fly = {
      fx: this.cx,
      fy: this.cy,
      fs: this.scale,
      tx,
      ty,
      ts: this.clampScale(ts),
      t: 0,
      dur,
    };
    this.vx = 0;
    this.vy = 0;
    this.dirty = true;
  }

  // Salta sin animar (reduced-motion).
  jumpTo(tx: number, ty: number, ts: number): void {
    this.cx = tx;
    this.cy = ty;
    this.scale = this.clampScale(ts);
    this.fly = null;
    this.vx = 0;
    this.vy = 0;
    this.notify();
  }

  isAnimating(): boolean {
    return this.fly !== null || Math.abs(this.vx) > MIN_SPEED || Math.abs(this.vy) > MIN_SPEED;
  }

  // Avanza inercia / fly-to dt ms. Devuelve true si la cámara se movió.
  tick(dt: number): boolean {
    if (this.fly) {
      this.fly.t += dt;
      const k = Math.min(1, this.fly.t / this.fly.dur);
      const e = easeInOutCubic(k);
      this.cx = lerp(this.fly.fx, this.fly.tx, e);
      this.cy = lerp(this.fly.fy, this.fly.ty, e);
      // Scale en espacio log para un zoom perceptualmente uniforme.
      this.scale = Math.exp(lerp(Math.log(this.fly.fs), Math.log(this.fly.ts), e));
      if (k >= 1) this.fly = null;
      this.notify();
      return true;
    }
    if (Math.abs(this.vx) > MIN_SPEED || Math.abs(this.vy) > MIN_SPEED) {
      this.cx += this.vx * dt;
      this.cy += this.vy * dt;
      const f = Math.pow(FRICTION, dt / 16.67);
      this.vx *= f;
      this.vy *= f;
      this.notify();
      return true;
    }
    return false;
  }
}

// Crea una cámara estable durante la vida del componente.
export function useCamera(bounds: Bounds = DEFAULT_BOUNDS): Camera {
  const ref = useRef<Camera | null>(null);
  if (ref.current === null) ref.current = new Camera(bounds);
  return ref.current;
}

// Lee la cámara como React state, pero ESTRANGULADO a `fps` para no re-renderizar
// el HUD/minimapa 60 veces por segundo durante el pan.
export function useCamSnapshot(cam: Camera, fps = 8): CamSnapshot {
  const [snap, setSnap] = useState<CamSnapshot>(() => cam.snapshot());
  useEffect(() => {
    let last = 0;
    let raf = 0;
    const flush = () => setSnap(cam.snapshot());
    const unsub = cam.subscribe(() => {
      const now = performance.now();
      if (now - last >= 1000 / fps) {
        last = now;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(flush);
      }
    });
    return () => {
      unsub();
      cancelAnimationFrame(raf);
    };
  }, [cam, fps]);
  return snap;
}
