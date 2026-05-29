"use client";

import { useEffect, useMemo, useState } from "react";
import { api, StellarApiError } from "@/lib/api";
import type { OctreePayload, SamplePointsPayload, StellarClass } from "@/lib/types";
import { UniverseScene } from "@/components/UniverseScene";
import { IntroBanner } from "@/components/IntroBanner";
import { InfoBox } from "@/components/InfoBox";
import { NextStep } from "@/components/NextStep";
import { readLastPrediction, clearLastPrediction } from "@/lib/predictionStore";
import type { StoredPrediction } from "@/lib/predictionStore";

const CLASS_META: Record<StellarClass, { label: string; color: string; bg: string }> = {
  GALAXY: { label: "Galaxia", color: "#0B3D91", bg: "#eef3fc" },
  STAR: { label: "Estrella", color: "#D97706", bg: "#fef3c7" },
  QSO: { label: "Quásar", color: "#7B2D8E", bg: "#f3e8ff" },
};

interface PlotlyModule {
  react: (el: HTMLDivElement, data: unknown[], layout: unknown, config: unknown) => Promise<unknown>;
  purge: (el: HTMLDivElement) => void;
  Plots?: { resize: (el: HTMLDivElement) => void };
}

export default function UniversePage() {
  const [octree, setOctree] = useState<OctreePayload | null>(null);
  const [sample, setSample] = useState<SamplePointsPayload | null>(null);
  const [plotly, setPlotly] = useState<PlotlyModule | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [enabledClasses, setEnabledClasses] = useState<Set<StellarClass>>(
    new Set(["GALAXY", "STAR", "QSO"]),
  );
  const [showPoints, setShowPoints] = useState(true);
  const [showWireframe, setShowWireframe] = useState(false);
  const [octreeMaxDepth, setOctreeMaxDepth] = useState(3);
  const [prediction, setPrediction] = useState<StoredPrediction | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([api.octree(), api.samplePoints()])
      .then(([o, s]) => {
        if (!mounted) return;
        setOctree(o);
        setSample(s);
        setOctreeMaxDepth(Math.min(3, o.stats.max_depth_real));
      })
      .catch((e) => {
        if (!mounted) return;
        setError(
          e instanceof StellarApiError ? `Backend respondió ${e.status}` : "Backend no responde",
        );
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    import("plotly.js-dist-min").then((mod) => {
      if (!mounted) return;
      const exported = (mod as unknown as { default?: PlotlyModule }).default ?? (mod as unknown as PlotlyModule);
      setPlotly(exported);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setPrediction(readLastPrediction());
  }, []);

  function toggleClass(cls: StellarClass) {
    setEnabledClasses((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
  }

  const counts = useMemo(() => {
    if (!sample) return null;
    const n: Record<StellarClass, number> = { GALAXY: 0, STAR: 0, QSO: 0 };
    for (const c of sample.class) n[c]++;
    return n;
  }, [sample]);

  if (error) {
    return (
      <div className="card border-danger/40 bg-nasa-red-bg p-6">
        <h2 className="text-[17px] font-semibold text-gray-900">No se pudo cargar el universo 3D</h2>
        <p className="mt-2 text-[13px] text-gray-700">{error}</p>
      </div>
    );
  }
  if (!octree || !sample || !plotly || !counts) {
    return (
      <div className="card-flat p-6 text-[13px] text-gray-600 font-mono">
        Cargando octree, 10 000 puntos del SDSS17 y motor 3D…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <IntroBanner
        eyebrow="03 / Universo 3D"
        title="Tu objeto en el cosmos"
        description={`Scatter rotable con ${sample.metadata.count.toLocaleString("es-PE")} objetos del SDSS17 ubicados en 3 dimensiones: ascensión recta, declinación y redshift. Si predijiste algo en la pantalla de Predicción, aparece como un marcador especial en el espacio. Arrastra para rotar, scroll para zoom.`}
        flow={[
          { label: "Predicción", href: "/" },
          { label: "Universo 3D", href: "/universe" },
          { label: "Análisis", href: "/analysis" },
        ]}
      />

      <InfoBox title="Cómo leer este scatter 3D">
        <p>
          Cada punto es un objeto real del SDSS17. Los tres ejes están <strong>normalizados al rango
          [0,1]</strong> para que el scatter no se distorsione (los valores originales tienen escalas
          muy distintas: redshift va de -0.01 a 7, mientras α va de 0 a 360°).
        </p>
        <p>
          Notarás <strong>capas horizontales por clase</strong>: las estrellas (ámbar) se concentran
          en redshift ≈ 0 porque están en nuestra galaxia; las galaxias (azul) flotan en redshift
          intermedio; los quásares (morado) suben porque están a miles de millones de años luz.
          El <strong>wireframe del octree</strong> muestra cómo el modelo subdivide el espacio 3D
          para hacer búsquedas rápidas de vecinos.
        </p>
      </InfoBox>

      {prediction && (
        <div
          className="card flex items-center justify-between gap-4 px-4 py-3"
          style={{ borderColor: `${CLASS_META[prediction.predicted_class].color}55` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              aria-hidden
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: CLASS_META[prediction.predicted_class].color }}
            />
            <div className="text-[13px] text-gray-900 truncate">
              Mostrando tu última predicción ·{" "}
              <span className="font-semibold" style={{ color: CLASS_META[prediction.predicted_class].color }}>
                {CLASS_META[prediction.predicted_class].label}
              </span>{" "}
              <span className="text-gray-500">
                ({(prediction.confidence * 100).toFixed(1)}% de confianza)
              </span>
            </div>
            <div className="font-mono text-[11px] text-gray-500 tabular-nums hidden md:block">
              α {prediction.alpha.toFixed(2)}°  ·  δ {prediction.delta.toFixed(2)}°  ·  z̃ {prediction.redshift.toFixed(3)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              clearLastPrediction();
              setPrediction(null);
            }}
            className="btn-ghost py-1 px-2 text-[11px] shrink-0"
          >
            Quitar marcador
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 items-start">
        <aside className="space-y-4">
          <div className="card p-4">
            <div className="label-uppercase mb-3">Capas de clase</div>
            <div className="space-y-1.5">
              {(["GALAXY", "STAR", "QSO"] as const).map((cls) => {
                const meta = CLASS_META[cls];
                const active = enabledClasses.has(cls);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => toggleClass(cls)}
                    className={
                      "w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-[13px] text-left transition-colors " +
                      (active
                        ? "bg-gray-50 text-gray-900"
                        : "text-gray-400 hover:bg-gray-50 hover:text-gray-700")
                    }
                  >
                    <span
                      aria-hidden
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: active ? meta.color : "#d4d4d4" }}
                    />
                    <span className="flex-1 font-medium">{meta.label}</span>
                    <span className="font-mono text-[11px] text-gray-500 tabular-nums">
                      {counts[cls].toLocaleString("es-PE")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <div className="label-uppercase">Visualización</div>
            <Toggle label="Mostrar puntos" value={showPoints} onChange={setShowPoints} />
            <Toggle label="Wireframe octree" value={showWireframe} onChange={setShowWireframe} />
            {showWireframe && (
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="label-uppercase">Profundidad</span>
                  <span className="font-mono text-[11px] text-gray-700 tabular-nums">
                    nivel {octreeMaxDepth} / {octree.stats.max_depth_real}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={octree.stats.max_depth_real}
                  value={octreeMaxDepth}
                  onChange={(e) => setOctreeMaxDepth(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>

          <details className="card p-4 group">
            <summary className="cursor-pointer flex items-center justify-between text-[12px] text-gray-700 font-medium select-none">
              <span>Datos del octree</span>
              <span className="text-gray-400 group-open:rotate-90 transition-transform">▸</span>
            </summary>
            <div className="mt-3 grid gap-1.5 font-mono text-[11px] text-gray-500">
              <Row k="random_state" v={String(sample.metadata.random_state)} />
              <Row k="nodos octree" v={octree.stats.total_nodes.toLocaleString("es-PE")} />
              <Row k="hojas octree" v={octree.stats.leaves.toLocaleString("es-PE")} />
              <Row k="profundidad máx" v={String(octree.stats.max_depth_real)} />
              <Row k="puntos muestreados" v={sample.metadata.count.toLocaleString("es-PE")} />
            </div>
          </details>
        </aside>

        <UniverseScene
          octree={octree}
          sample={sample}
          enabledClasses={enabledClasses}
          showPoints={showPoints}
          showWireframe={showWireframe}
          octreeMaxDepth={octreeMaxDepth}
          prediction={prediction}
          plotly={plotly}
        />
      </section>

      <p className="text-center font-mono text-[11px] text-gray-500">
        arrastra para rotar  ·  scroll para zoom  ·  shift + arrastrar para pan
      </p>

      <div className="flex gap-2.5 rounded-md bg-nasa-blue-bg border border-nasa-blue/20 px-3.5 py-3">
        <span
          aria-hidden
          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-nasa-blue text-white text-[10px] font-bold shrink-0 mt-0.5"
        >
          i
        </span>
        <p className="text-[12.5px] text-gray-700 leading-relaxed">
          Apaga dos clases con los toggles de la izquierda y deja solo una: verás que cada clase ocupa
          una franja distinta del eje de redshift. Esa separación vertical es exactamente lo que el
          modelo aprovecha para clasificar. Activa el wireframe del octree para ver cómo el espacio se
          subdivide donde hay más objetos.
        </p>
      </div>

      <NextStep
        href="/analysis"
        label="Entiende qué tan bueno es el modelo"
        reason="Ya viste cómo se separan las clases. Ahora revisa las métricas: cuánto acierta, dónde se equivoca y por qué redshift es la variable clave."
      />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between text-[13px] py-1"
    >
      <span className={value ? "text-gray-900" : "text-gray-500"}>{label}</span>
      <span
        className={"relative inline-flex w-9 h-5 rounded-full transition-colors " + (value ? "bg-nasa-blue" : "bg-gray-300")}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-soft transition-all"
          style={{ left: value ? 18 : 2 }}
        />
      </span>
    </button>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{k}</span>
      <span className="text-gray-900 tabular-nums">{v}</span>
    </div>
  );
}
