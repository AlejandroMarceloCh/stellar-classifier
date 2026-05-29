import type { StellarClass } from "./types";

const KEY = "stellar.lastPrediction.v1";

export interface StoredPrediction {
  alpha: number;
  delta: number;
  redshift: number;
  predicted_class: StellarClass;
  confidence: number;
  timestamp: number;
}

export function saveLastPrediction(p: StoredPrediction): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // localStorage puede fallar en modo privado/quota — silenciamos.
  }
}

export function readLastPrediction(): StoredPrediction | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredPrediction;
  } catch {
    return null;
  }
}

export function clearLastPrediction(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // noop
  }
}
