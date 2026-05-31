// Persistencia del progreso del juego en localStorage: objetos descubiertos, racha
// del jugador y del modelo, y selección del pool sin repetir hasta agotar los 240.
import type { GameObject } from "./types";

const KEY = "stellar.game.v1";

export interface GameProgress {
  discovered: string[]; // obj_id ya revelados
  playerHits: number;
  modelHits: number;
  rounds: number;
}

const EMPTY: GameProgress = { discovered: [], playerHits: 0, modelHits: 0, rounds: 0 };

export function readProgress(): GameProgress {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const p = JSON.parse(raw) as Partial<GameProgress>;
    return {
      discovered: Array.isArray(p.discovered) ? p.discovered : [],
      playerHits: p.playerHits ?? 0,
      modelHits: p.modelHits ?? 0,
      rounds: p.rounds ?? 0,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function writeProgress(p: GameProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // quota / modo privado — silencioso
  }
}

export function recordRound(
  prev: GameProgress,
  objId: string,
  playerCorrect: boolean,
  modelCorrect: boolean,
): GameProgress {
  const discovered = prev.discovered.includes(objId)
    ? prev.discovered
    : [...prev.discovered, objId];
  const next: GameProgress = {
    discovered,
    playerHits: prev.playerHits + (playerCorrect ? 1 : 0),
    modelHits: prev.modelHits + (modelCorrect ? 1 : 0),
    rounds: prev.rounds + 1,
  };
  writeProgress(next);
  return next;
}

export function resetProgress(): GameProgress {
  writeProgress(EMPTY);
  return { ...EMPTY };
}

// Elige el siguiente objeto misterioso: prioriza los no descubiertos; si ya se
// agotaron los 240, recicla aleatoriamente para no bloquear el juego.
export function pickNext(
  objects: GameObject[],
  discovered: string[],
  excludeId?: string,
): GameObject | null {
  if (objects.length === 0) return null;
  const seen = new Set(discovered);
  const fresh = objects.filter((o) => !seen.has(o.obj_id) && o.obj_id !== excludeId);
  const pool = fresh.length > 0 ? fresh : objects.filter((o) => o.obj_id !== excludeId);
  if (pool.length === 0) return objects[0];
  // Determinista por índice + tamaño del pool (sin Math.random para SSR-safety;
  // la variación viene de cuántos lleva descubiertos).
  const idx = (discovered.length * 7 + pool.length) % pool.length;
  return pool[idx];
}
