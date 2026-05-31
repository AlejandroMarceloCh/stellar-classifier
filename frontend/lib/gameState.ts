// Lógica pura del juego de /explore: metadata de clase, frase causal del redshift
// (umbrales VALIDADOS contra los 240 game-objects reales) y la máquina de estados.
// Sin React acá — solo tipos, constantes y funciones puras.
import type { GameObject, PredictResponse, StellarClass } from "./types";

// Colores brillantes para fondo oscuro — IDÉNTICOS a CLASS_COLOR_BRIGHT de
// UniverseScene.tsx para mantener honestidad cromática entre el cielo 2D y el reveal 3D.
export const CLASS_META: Record<
  StellarClass,
  { label: string; color: string; word: string; blurb: string }
> = {
  GALAXY: {
    label: "Galaxia",
    color: "#5B9BFF",
    word: "lejos",
    blurb: "Miles de millones de estrellas, muy lejos de aquí.",
  },
  STAR: {
    label: "Estrella",
    color: "#FBBF24",
    word: "cerca",
    blurb: "Vive cerca, en nuestra propia galaxia.",
  },
  QSO: {
    label: "Quásar",
    color: "#C879F5",
    word: "extremo",
    blurb: "El corazón brillante de una galaxia lejana.",
  },
};

export const CLASS_ORDER: StellarClass[] = ["STAR", "GALAXY", "QSO"];

// --- Frase causal del redshift -------------------------------------------------
// Umbrales derivados de los 240 objetos reales del test set:
//   STAR   redshift ~0      (−0.0038 → 0.00034)
//   GALAXY 0.0 → 1.13       (mediana 0.47)
//   QSO    0.29 → 3.73      (mediana 1.64, ninguno < 0.29)
// VALIDADO contra los 240: ninguna frase afirma una clase de forma absoluta, porque
// hay overlap REAL. En el tier 'near' (<0.01) caen 80 STAR + 1 GALAXY (redshift=0.0,
// por debajo de varias estrellas → ningún umbral las separa); en 'extreme' 61 QSO +
// 1 GALAXY. Por eso TODO el lenguaje es PROBABILÍSTICO ("casi siempre"): así ninguna
// frase contradice el true_class, ni siquiera en esos casos frontera.
export type RedshiftTier = "near" | "low" | "high" | "extreme";

export function redshiftTier(redshift: number): RedshiftTier {
  if (redshift < 0.01) return "near";
  if (redshift < 0.4) return "low";
  if (redshift < 1.1) return "high";
  return "extreme";
}

export function redshiftCausalPhrase(redshift: number): string {
  switch (redshiftTier(redshift)) {
    case "near":
      return "Casi sin corrimiento al rojo: está prácticamente en reposo respecto a nosotros, muy cerca. A esta distancia casi siempre vemos estrellas de nuestra galaxia.";
    case "low":
      return "Corrimiento al rojo bajo: está lejos, pero no en el extremo. A esta distancia casi siempre vemos galaxias.";
    case "high":
      return "Corrimiento al rojo alto: muy lejos. A esta distancia conviven galaxias lejanas y quásares, así que su brillo en cada color ayuda a desempatar.";
    case "extreme":
      return "Corrimiento al rojo extremo: a miles de millones de años luz. A esta distancia casi siempre son quásares, los objetos más luminosos del cosmos.";
  }
}

// --- Máquina de estados (S0–S6) ------------------------------------------------
export type GamePhase =
  | "travel" // S0 — navega el cielo libre
  | "contact" // S1 — un objeto-misión entró al viewport
  | "intercept" // S2 — panel abierto, ve pistas (bandas), redshift con candado
  | "bet" // S3 — eligiendo clase
  | "predict" // S4 — modelo consultando / mostró su apuesta
  | "reveal" // S5 — verdad revelada (3 columnas + redshift)
  | "depth"; // S6 — reveal octree 3D

export interface GameState {
  phase: GamePhase;
  active: GameObject | null; // objeto misterioso actual
  guess: StellarClass | null; // apuesta del jugador
  prediction: PredictResponse | null; // respuesta real del modelo
}

export type GameAction =
  | { type: "CONTACT"; object: GameObject }
  | { type: "INTERCEPT" }
  | { type: "GUESS"; guess: StellarClass }
  | { type: "MODEL_REPLIED"; prediction: PredictResponse }
  | { type: "REVEAL" }
  | { type: "ENTER_DEPTH" }
  | { type: "BACK_TO_MAP" }
  | { type: "RESET" };

export const INITIAL_GAME_STATE: GameState = {
  phase: "travel",
  active: null,
  guess: null,
  prediction: null,
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "CONTACT":
      // Solo entra a contacto si venimos de viaje (no interrumpir un juego en curso).
      if (state.phase !== "travel") return state;
      return { ...state, phase: "contact", active: action.object };
    case "INTERCEPT":
      if (!state.active) return state;
      return { ...state, phase: "intercept", guess: null, prediction: null };
    case "GUESS":
      return { ...state, phase: "bet", guess: action.guess };
    case "MODEL_REPLIED":
      return { ...state, phase: "predict", prediction: action.prediction };
    case "REVEAL":
      return { ...state, phase: "reveal" };
    case "ENTER_DEPTH":
      return { ...state, phase: "depth" };
    case "BACK_TO_MAP":
    case "RESET":
      return INITIAL_GAME_STATE;
    default:
      return state;
  }
}

// ¿El jugador acertó? ¿El modelo acertó?
export function evaluate(state: GameState): {
  playerCorrect: boolean | null;
  modelCorrect: boolean | null;
} {
  const truth = state.active?.true_class ?? null;
  return {
    playerCorrect: truth && state.guess ? state.guess === truth : null,
    modelCorrect:
      truth && state.prediction ? state.prediction.prediction === truth : null,
  };
}
