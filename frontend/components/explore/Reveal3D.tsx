"use client";

// S6 — el clímax. Mete el objeto revelado en el universo 3D (octree + 10K puntos)
// donde Z = redshift = profundidad. Reusa UniverseScene con la prop revealObject:
// diamante en su clase real + plomada vertical a z=0. Plan B del spec: corte directo
// a la vista 3/4 con fade (sin tween de cámara) para evitar saltos entre motores.
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { GameObject, OctreePayload, SamplePointsPayload } from "@/lib/types";
import { UniverseScene } from "@/components/UniverseScene";
import { CLASS_META, redshiftCausalPhrase } from "@/lib/gameState";

interface PlotlyModule {
  react: (el: HTMLDivElement, data: unknown[], layout: unknown, config: unknown) => Promise<unknown>;
  purge: (el: HTMLDivElement) => void;
  Plots?: { resize: (el: HTMLDivElement) => void };
}

interface Reveal3DProps {
  obj: GameObject;
  sample: SamplePointsPayload;
  redshiftImportance: number | null; // de /api/version, leído en runtime (no hardcode)
  reducedMotion: boolean;
  onBack: () => void;
}

export function Reveal3D({ obj, sample, redshiftImportance, reducedMotion, onBack }: Reveal3DProps) {
  const [octree, setOctree] = useState<OctreePayload | null>(null);
  const [plotly, setPlotly] = useState<PlotlyModule | null>(null);
  const [veil, setVeil] = useState(!reducedMotion);

  useEffect(() => {
    let mounted = true;
    api.octree().then((o) => mounted && setOctree(o)).catch(() => {});
    import("plotly.js-dist-min").then((mod) => {
      if (!mounted) return;
      const exported = (mod as unknown as { default?: PlotlyModule }).default ?? (mod as unknown as PlotlyModule);
      setPlotly(exported);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Levanta el velo negro una vez montado el motor 3D.
  useEffect(() => {
    if (reducedMotion || !octree || !plotly) return;
    const t = setTimeout(() => setVeil(false), 220);
    return () => clearTimeout(t);
  }, [octree, plotly, reducedMotion]);

  const meta = CLASS_META[obj.true_class];
  const ready = octree && plotly;

  return (
    <div className="fixed inset-0 z-30" style={{ background: "#05070D" }}>
      {/* Velo de transición Canvas → Plotly */}
      {veil && (
        <div className="absolute inset-0 z-40 transition-opacity duration-300" style={{ background: "#05070D" }} />
      )}

      {/* Escena 3D */}
      <div className="absolute inset-0">
        {ready ? (
          <UniverseScene
            octree={octree}
            sample={sample}
            enabledClasses={new Set(["GALAXY", "STAR", "QSO"])}
            showPoints
            showWireframe
            octreeMaxDepth={Math.min(3, octree.stats.max_depth_real)}
            prediction={null}
            revealObject={{
              obj_id: obj.obj_id,
              alpha: obj.alpha,
              delta: obj.delta,
              redshift: obj.redshift,
              true_class: obj.true_class,
            }}
            plotly={plotly}
          />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-[12px] text-[#8595B8]">
            Cargando el universo 3D…
          </div>
        )}
      </div>

      {/* Encabezado */}
      <div className="pointer-events-none absolute left-4 top-4 z-50">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8595B8]">profundidad ≈ redshift ≈ distancia</p>
        <p className="text-[15px] font-semibold text-[#E8EDF7]">
          Dónde está <span style={{ color: meta.color }}>{meta.label.toLowerCase()}</span> en el universo
        </p>
      </div>

      {/* Panel causal lateral */}
      <div
        className="absolute right-4 top-4 z-50 max-w-[300px] rounded-2xl border p-4"
        style={{ borderColor: "rgba(120,150,210,0.18)", background: "rgba(10,15,25,0.82)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} aria-hidden />
          <span className="text-[14px] font-semibold" style={{ color: meta.color }}>
            {meta.label}
          </span>
        </div>
        <div className="mt-2 font-mono text-[11px] tabular-nums text-[#8595B8]">
          redshift {obj.redshift.toFixed(4)}
        </div>
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-[#A9B6D6]">{redshiftCausalPhrase(obj.redshift)}</p>
        <div className="mt-3 flex justify-between font-mono text-[10px] text-[#8595B8]">
          <span>Z abajo = CERCA</span>
          <span>Z arriba = LEJOS</span>
        </div>
      </div>

      {/* Barra inferior: conexión con el modelo (feature_importance real) */}
      <div className="absolute inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2.5 p-4">
        {redshiftImportance != null && (
          <div
            className="w-full max-w-[460px] rounded-xl border px-4 py-2.5"
            style={{ borderColor: "rgba(120,150,210,0.16)", background: "rgba(10,15,25,0.8)", backdropFilter: "blur(10px)" }}
          >
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[#A9B6D6]">El redshift pesa en la decisión del modelo</span>
              <span className="font-mono font-semibold text-[#39D3C3]">{(redshiftImportance * 100).toFixed(1)}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full" style={{ width: `${redshiftImportance * 100}%`, background: "#39D3C3" }} />
            </div>
            <p className="mt-1.5 text-[10.5px] text-[#8595B8]">
              Por eso adivinar sin ver la distancia era difícil: es la pista más fuerte.
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onBack}
          className="pointer-events-auto rounded-full border px-5 py-2 text-[12.5px] font-medium text-[#E8EDF7] transition-colors hover:bg-white/5"
          style={{ borderColor: "rgba(120,150,210,0.22)", background: "rgba(10,15,25,0.7)" }}
        >
          Volver al mapa del cielo
        </button>
      </div>
    </div>
  );
}
