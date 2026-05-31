"use client";

// Cromo glass flotante sobre el cielo: marca + breadcrumb (arriba-izq), coords vivas
// + chips de clase + contadores (arriba-der), leyenda (abajo-izq), minimapa (abajo-der)
// e instrucción contextual + "llévame a una luz" (abajo-centro). Nunca cubre el centro.
import { CLASS_META, CLASS_ORDER } from "@/lib/gameState";
import type { GamePhase } from "@/lib/gameState";
import type { GameObject, StellarClass } from "@/lib/types";
import type { Bounds, Camera } from "./useCamera";
import { useCamSnapshot } from "./useCamera";
import { Minimap } from "./Minimap";

interface HudProps {
  cam: Camera;
  bounds: Bounds;
  missions: GameObject[];
  discovered: Set<string>;
  enabled: Set<StellarClass>;
  onToggleClass: (cls: StellarClass) => void;
  progress: { discovered: number; playerHits: number; modelHits: number; rounds: number };
  phase: GamePhase;
  reducedMotion: boolean;
  onExit: () => void;
  onFindLight: () => void;
  onResetView: () => void;
}

function breadcrumb(ratio: number, cx: number, cy: number): string {
  if (ratio < 1.6) return "Vista amplia del cielo";
  if (ratio < 6) {
    const dsign = cy >= 0 ? "+" : "";
    return `Sector α ${Math.round(cx)}° · δ ${dsign}${Math.round(cy)}°`;
  }
  return "Acercándote a una luz";
}

export function Hud(props: HudProps) {
  const { cam, bounds, missions, discovered, enabled, onToggleClass, progress, phase } = props;
  const snap = useCamSnapshot(cam, 8);
  const ratio = snap.scale / snap.baseScale;
  const traveling = phase === "travel";

  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      {/* Arriba-izquierda: marca + breadcrumb */}
      <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
        <div
          className="pointer-events-auto rounded-xl border px-3.5 py-2"
          style={{ borderColor: "rgba(120,150,210,0.16)", background: "rgba(10,15,25,0.7)", backdropFilter: "blur(10px)" }}
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: "#39D3C3" }} aria-hidden />
            <span className="text-[12.5px] font-semibold tracking-wide text-[#E8EDF7]">Stellar Classifier</span>
          </div>
          <button
            type="button"
            onClick={props.onResetView}
            className="mt-1 block text-left font-mono text-[10.5px] text-[#8595B8] transition-colors hover:text-[#E8EDF7]"
          >
            {breadcrumb(ratio, snap.cx, snap.cy)} ↺
          </button>
        </div>
        <button
          type="button"
          onClick={props.onExit}
          className="pointer-events-auto mt-2 rounded-lg border px-2.5 py-1 text-[11px] text-[#8595B8] transition-colors hover:text-[#E8EDF7]"
          style={{ borderColor: "rgba(120,150,210,0.14)", background: "rgba(10,15,25,0.55)" }}
        >
          ← Salir del viaje
        </button>
      </div>

      {/* Arriba-derecha: coords + chips de clase + contadores */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2 sm:right-4 sm:top-4">
        <div
          className="pointer-events-auto rounded-xl border px-3 py-2"
          style={{ borderColor: "rgba(120,150,210,0.16)", background: "rgba(10,15,25,0.7)", backdropFilter: "blur(10px)" }}
        >
          <div className="font-mono text-[11px] tabular-nums text-[#A9B6D6]">
            α {snap.cx.toFixed(1)}° · δ {snap.cy >= 0 ? "+" : ""}
            {snap.cy.toFixed(1)}° · {ratio.toFixed(1)}×
          </div>
          <div className="mt-2 flex gap-1.5">
            {CLASS_ORDER.map((cls) => {
              const on = enabled.has(cls);
              const meta = CLASS_META[cls];
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => onToggleClass(cls)}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] transition-opacity"
                  style={{
                    background: on ? `${meta.color}1F` : "transparent",
                    border: `1px solid ${on ? meta.color + "66" : "rgba(120,150,210,0.16)"}`,
                    opacity: on ? 1 : 0.5,
                    color: "#E8EDF7",
                  }}
                  aria-pressed={on}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} aria-hidden />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
        <div
          className="pointer-events-auto flex gap-3 rounded-xl border px-3 py-1.5 font-mono text-[11px] tabular-nums"
          style={{ borderColor: "rgba(120,150,210,0.16)", background: "rgba(10,15,25,0.7)", backdropFilter: "blur(10px)" }}
        >
          <span className="text-[#A9B6D6]">
            Descubiertos <span className="text-[#E8EDF7]">{progress.discovered}</span>/{missions.length}
          </span>
          {progress.rounds > 0 && (
            <span className="text-[#A9B6D6]">
              Aciertos <span className="text-[#39D3C3]">{progress.playerHits}</span>/{progress.rounds}
            </span>
          )}
        </div>
      </div>

      {/* Abajo-izquierda: leyenda */}
      <div
        className="absolute bottom-3 left-3 hidden rounded-xl border px-3 py-2 sm:block sm:bottom-5 sm:left-4"
        style={{ borderColor: "rgba(120,150,210,0.16)", background: "rgba(10,15,25,0.62)", backdropFilter: "blur(8px)" }}
      >
        {CLASS_ORDER.map((cls) => (
          <div key={cls} className="flex items-center gap-2 py-0.5 text-[11px] text-[#A9B6D6]">
            <span className="h-2 w-2 rounded-full" style={{ background: CLASS_META[cls].color }} aria-hidden />
            <span className="text-[#E8EDF7]">{CLASS_META[cls].label}</span>
            <span className="text-[#8595B8]">· {CLASS_META[cls].word}</span>
          </div>
        ))}
      </div>

      {/* Abajo-derecha: minimapa */}
      <div className="absolute bottom-3 right-3 sm:bottom-5 sm:right-4">
        <Minimap
          cam={cam}
          bounds={bounds}
          missions={missions}
          discovered={discovered}
          reducedMotion={props.reducedMotion}
        />
      </div>

      {/* Abajo-centro: instrucción + acción (solo en viaje) */}
      {traveling && (
        <div className="absolute inset-x-0 bottom-3 flex flex-col items-center gap-2 sm:bottom-5">
          <button
            type="button"
            onClick={props.onFindLight}
            className="pointer-events-auto rounded-full px-4 py-2 text-[12.5px] font-semibold text-[#05070D] shadow-lg transition-transform hover:scale-[1.03]"
            style={{ background: "#39D3C3" }}
          >
            Llévame a una luz misteriosa
          </button>
          <p className="px-3 text-center text-[11px] text-[#8595B8]">
            Arrastra para explorar · rueda para acercar · toca una luz con anillo para investigarla
          </p>
        </div>
      )}
    </div>
  );
}
