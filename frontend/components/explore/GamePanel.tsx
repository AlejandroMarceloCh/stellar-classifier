"use client";

// La hoja de juego (glass, abajo-centro en desktop / bottom-sheet en móvil).
// Renderiza según la fase S2..S5: ficha + bandas + candado → apuesta → pulso del
// modelo → reveal. El cielo siempre se ve detrás (backdrop-blur).
import { CLASS_META } from "@/lib/gameState";
import type { GameState } from "@/lib/gameState";
import type { StellarClass } from "@/lib/types";
import { PhotometricBars } from "./PhotometricBars";
import { ClassButtons } from "./ClassButtons";
import { RevealComparison } from "./RevealComparison";

interface GamePanelProps {
  state: GameState;
  reducedMotion: boolean;
  onGuess: (cls: StellarClass) => void;
  onSeeResult: () => void;
  onEnterDepth: () => void;
  onNextLight: () => void;
  onClose: () => void;
}

export function GamePanel({
  state,
  reducedMotion,
  onGuess,
  onSeeResult,
  onEnterDepth,
  onNextLight,
  onClose,
}: GamePanelProps) {
  const { phase, active, guess, prediction } = state;
  if (!active) return null;

  const predicting = phase === "bet" && !prediction;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-3 sm:px-4 sm:pb-5">
      <div
        className="pointer-events-auto w-full max-w-[580px] overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          borderColor: "rgba(120,150,210,0.18)",
          background: "rgba(10,15,25,0.86)",
          backdropFilter: "blur(14px)",
        }}
      >
        {/* Cabecera: ficha del objeto */}
        <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: "rgba(120,150,210,0.14)" }}>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8595B8]">objeto</span>
            <span className="font-mono text-[12px] text-[#E8EDF7]">{active.obj_id}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-[11px] text-[#8595B8] transition-colors hover:bg-white/5 hover:text-[#E8EDF7]"
          >
            Salir ✕
          </button>
        </div>

        <div className="max-h-[64vh] space-y-3.5 overflow-y-auto p-4">
          {/* Coordenadas */}
          <div className="flex gap-4 font-mono text-[11px] tabular-nums text-[#8595B8]">
            <span>α {active.alpha.toFixed(3)}°</span>
            <span>δ {active.delta.toFixed(3)}°</span>
          </div>

          {/* S2..S4: pistas (bandas + candado) salvo en reveal */}
          {phase !== "reveal" && (
            <>
              <PhotometricBars obj={active} />
              <div
                className="flex items-center justify-between rounded-xl border px-3.5 py-2.5"
                style={{ borderColor: "rgba(120,150,210,0.16)", background: "rgba(13,19,34,0.5)" }}
              >
                <span className="flex items-center gap-2 text-[12px] text-[#A9B6D6]">
                  <span aria-hidden>🔒</span> Distancia (redshift): oculta
                </span>
                <span className="text-[11px] text-[#8595B8]">la pista que el modelo más usa</span>
              </div>
            </>
          )}

          {/* S2/S3: apuesta */}
          {(phase === "intercept" || phase === "bet") && (
            <div className="space-y-2.5">
              <p className="text-[13.5px] font-medium text-[#E8EDF7]">¿Qué crees que es esta luz?</p>
              <ClassButtons onPick={onGuess} disabled={predicting} guess={guess} />
              {predicting ? (
                <p className="flex items-center gap-2 text-[12px] text-[#39D3C3]">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#39D3C3] border-t-transparent" />
                  Consultando al modelo…
                </p>
              ) : (
                <p className="text-[11px] text-[#8595B8]">No hay penalización. Es para aprender.</p>
              )}
            </div>
          )}

          {/* S4: el modelo respondió */}
          {phase === "predict" && prediction && (
            <div className="space-y-2.5">
              <div
                className="rounded-xl border px-3.5 py-3"
                style={{ borderColor: `${CLASS_META[prediction.prediction].color}55`, background: `${CLASS_META[prediction.prediction].color}12` }}
              >
                <p className="text-[12px] text-[#8595B8]">El modelo dice:</p>
                <p className="text-[16px] font-semibold" style={{ color: CLASS_META[prediction.prediction].color }}>
                  {CLASS_META[prediction.prediction].label}
                  {prediction.confidence != null && (
                    <span className="ml-2 font-mono text-[12px] text-[#A9B6D6]">
                      {(prediction.confidence * 100).toFixed(1)}%
                    </span>
                  )}
                </p>
                <Top3 top3={prediction.top3} />
              </div>
              {guess && (
                <p className="text-[12px] text-[#A9B6D6]">
                  Tú dijiste{" "}
                  <span style={{ color: CLASS_META[guess].color }} className="font-semibold">
                    {CLASS_META[guess].label}
                  </span>
                  . Veamos quién acertó.
                </p>
              )}
              <button
                type="button"
                onClick={onSeeResult}
                className="w-full rounded-xl py-2.5 text-[13px] font-semibold text-[#05070D] transition-opacity hover:opacity-90"
                style={{ background: "#39D3C3" }}
              >
                Ver el resultado
              </button>
            </div>
          )}

          {/* S5: reveal */}
          {phase === "reveal" && guess && prediction && (
            <div className="space-y-3">
              <RevealComparison
                guess={guess}
                prediction={prediction}
                trueClass={active.true_class}
                redshift={active.redshift}
                reducedMotion={reducedMotion}
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={onEnterDepth}
                  className="rounded-xl py-2.5 text-[13px] font-semibold text-[#05070D] transition-opacity hover:opacity-90"
                  style={{ background: "#39D3C3" }}
                >
                  Ver dónde está en el universo
                </button>
                <button
                  type="button"
                  onClick={onNextLight}
                  className="rounded-xl border py-2.5 text-[13px] font-medium text-[#E8EDF7] transition-colors hover:bg-white/5"
                  style={{ borderColor: "rgba(120,150,210,0.22)" }}
                >
                  Buscar otra luz
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Top3({ top3 }: { top3: [StellarClass, number][] }) {
  return (
    <div className="mt-2 space-y-1">
      {top3.map(([cls, p]) => (
        <div key={cls} className="flex items-center gap-2">
          <span className="w-14 text-[11px]" style={{ color: CLASS_META[cls].color }}>
            {CLASS_META[cls].label}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full" style={{ width: `${p * 100}%`, background: CLASS_META[cls].color, opacity: 0.8 }} />
          </div>
          <span className="w-11 text-right font-mono text-[10px] tabular-nums text-[#8595B8]">
            {(p * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}
