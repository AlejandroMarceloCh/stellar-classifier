// Grid-bucket en coords-mundo para hit-testing O(1): dado un punto (α,δ) devuelve
// el índice del objeto más cercano sin recorrer los N. Se usa para detectar clicks
// sobre los 240 objetos-misión (y, si hiciera falta, hover sobre puntos visibles).
import { useMemo } from "react";

export class SpatialHash {
  private cell: number;
  private buckets = new Map<string, number[]>();
  private xs: ArrayLike<number>;
  private ys: ArrayLike<number>;

  constructor(xs: ArrayLike<number>, ys: ArrayLike<number>, cell: number) {
    this.xs = xs;
    this.ys = ys;
    this.cell = cell > 0 ? cell : 1;
    for (let i = 0; i < xs.length; i++) {
      const k = this.key(xs[i], ys[i]);
      const b = this.buckets.get(k);
      if (b) b.push(i);
      else this.buckets.set(k, [i]);
    }
  }

  private key(a: number, d: number): string {
    return `${Math.floor(a / this.cell)}:${Math.floor(d / this.cell)}`;
  }

  // Índice del más cercano a (a,d) dentro de maxDist (coords-mundo), o -1.
  nearest(a: number, d: number, maxDist: number): number {
    const cx = Math.floor(a / this.cell);
    const cy = Math.floor(d / this.cell);
    // Radio de celdas a barrer según maxDist (normalmente 1).
    const r = Math.max(1, Math.ceil(maxDist / this.cell));
    let best = -1;
    let bestSq = maxDist * maxDist;
    for (let gx = cx - r; gx <= cx + r; gx++) {
      for (let gy = cy - r; gy <= cy + r; gy++) {
        const b = this.buckets.get(`${gx}:${gy}`);
        if (!b) continue;
        for (const i of b) {
          const dx = this.xs[i] - a;
          const dy = this.ys[i] - d;
          const sq = dx * dx + dy * dy;
          if (sq < bestSq) {
            bestSq = sq;
            best = i;
          }
        }
      }
    }
    return best;
  }
}

// Construye el hash una sola vez por dataset. `cell` en grados-mundo: para 240
// objetos repartidos en ~360×100 grados, ~8 grados deja pocos por celda.
export function useSpatialHash(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  cell = 8,
): SpatialHash {
  return useMemo(() => new SpatialHash(xs, ys, cell), [xs, ys, cell]);
}
