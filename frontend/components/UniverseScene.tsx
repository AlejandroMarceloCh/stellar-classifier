"use client";

import { useEffect, useMemo, useRef } from "react";
import type { OctreePayload, SamplePointsPayload, StellarClass } from "@/lib/types";
import type { StoredPrediction } from "@/lib/predictionStore";

// Colores oscuros (para UI sobre fondo claro)
const CLASS_COLOR: Record<StellarClass, string> = {
  GALAXY: "#0B3D91",
  STAR: "#D97706",
  QSO: "#7B2D8E",
};

// Colores brillantes (para los puntos dentro del visor 3D de fondo oscuro)
const CLASS_COLOR_BRIGHT: Record<StellarClass, string> = {
  GALAXY: "#5b9bff",
  STAR: "#fbbf24",
  QSO: "#c879f5",
};

const CLASS_LABEL: Record<StellarClass, string> = {
  GALAXY: "Galaxia",
  STAR: "Estrella",
  QSO: "Quásar",
};

interface UniverseSceneProps {
  octree: OctreePayload;
  sample: SamplePointsPayload;
  enabledClasses: Set<StellarClass>;
  showPoints: boolean;
  showWireframe: boolean;
  octreeMaxDepth: number;
  prediction: StoredPrediction | null;
  plotly: PlotlyModule;
}

interface PlotlyModule {
  react: (el: HTMLDivElement, data: unknown[], layout: unknown, config: unknown) => Promise<unknown>;
  purge: (el: HTMLDivElement) => void;
  Plots?: { resize: (el: HTMLDivElement) => void };
}

function normalize(
  octree: OctreePayload,
  axis: "alpha" | "delta" | "redshift",
  value: number,
): number {
  const r = octree.raw_ranges[axis];
  if (!r || r.max === r.min) return 0;
  return (value - r.min) / (r.max - r.min);
}

export function UniverseScene({
  octree,
  sample,
  enabledClasses,
  showPoints,
  showWireframe,
  octreeMaxDepth,
  prediction,
  plotly,
}: UniverseSceneProps) {
  const plotRef = useRef<HTMLDivElement>(null);

  const pointBuckets = useMemo(() => {
    type B = { x: number[]; y: number[]; z: number[]; raw: number[][] };
    const buckets: Record<StellarClass, B> = {
      GALAXY: { x: [], y: [], z: [], raw: [] },
      STAR: { x: [], y: [], z: [], raw: [] },
      QSO: { x: [], y: [], z: [], raw: [] },
    };
    for (let i = 0; i < sample.alpha.length; i++) {
      const cls = sample.class[i];
      buckets[cls].x.push(normalize(octree, "alpha", sample.alpha[i]));
      buckets[cls].y.push(normalize(octree, "delta", sample.delta[i]));
      buckets[cls].z.push(normalize(octree, "redshift", sample.redshift[i]));
      buckets[cls].raw.push([sample.alpha[i], sample.delta[i], sample.redshift[i]]);
    }
    return buckets;
  }, [sample, octree]);

  const wireframeSegments = useMemo(() => {
    if (!showWireframe) return null;
    const xs: (number | null)[] = [];
    const ys: (number | null)[] = [];
    const zs: (number | null)[] = [];
    for (const node of octree.nodes) {
      if (node.count === 0) continue;
      if (node.depth > octreeMaxDepth) continue;
      if (!node.is_leaf && node.depth !== octreeMaxDepth) continue;
      const b = node.bounds_norm;
      const v = [
        [b.x_min, b.y_min, b.z_min],
        [b.x_max, b.y_min, b.z_min],
        [b.x_max, b.y_max, b.z_min],
        [b.x_min, b.y_max, b.z_min],
        [b.x_min, b.y_min, b.z_max],
        [b.x_max, b.y_min, b.z_max],
        [b.x_max, b.y_max, b.z_max],
        [b.x_min, b.y_max, b.z_max],
      ];
      const edges: [number, number][] = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7],
      ];
      for (const [a, c] of edges) {
        xs.push(v[a][0], v[c][0], null);
        ys.push(v[a][1], v[c][1], null);
        zs.push(v[a][2], v[c][2], null);
      }
    }
    return { xs, ys, zs };
  }, [octree, octreeMaxDepth, showWireframe]);

  useEffect(() => {
    if (!plotRef.current) return;

    const traces: unknown[] = [];

    if (showPoints) {
      (["GALAXY", "STAR", "QSO"] as const).forEach((cls) => {
        if (!enabledClasses.has(cls)) return;
        const b = pointBuckets[cls];
        if (b.x.length === 0) return;
        traces.push({
          type: "scatter3d",
          mode: "markers",
          name: CLASS_LABEL[cls],
          x: b.x,
          y: b.y,
          z: b.z,
          customdata: b.raw,
          marker: { size: 2.5, color: CLASS_COLOR_BRIGHT[cls], opacity: 0.82, line: { width: 0 } },
          hovertemplate:
            `<b>${CLASS_LABEL[cls]}</b><br>` +
            "α %{customdata[0]:.2f}°  ·  δ %{customdata[1]:.2f}°<br>" +
            "z̃ %{customdata[2]:.3f}<extra></extra>",
        });
      });
    }

    if (wireframeSegments) {
      traces.push({
        type: "scatter3d",
        mode: "lines",
        name: "Octree",
        x: wireframeSegments.xs,
        y: wireframeSegments.ys,
        z: wireframeSegments.zs,
        line: { color: "rgba(120, 160, 220, 0.22)", width: 1 },
        hoverinfo: "skip",
        showlegend: false,
      });
    }

    if (prediction) {
      const px = normalize(octree, "alpha", prediction.alpha);
      const py = normalize(octree, "delta", prediction.delta);
      const pz = normalize(octree, "redshift", prediction.redshift);
      const c = CLASS_COLOR_BRIGHT[prediction.predicted_class];
      traces.push({
        type: "scatter3d",
        mode: "markers",
        name: "Tu objeto",
        x: [px],
        y: [py],
        z: [pz],
        marker: {
          size: 10,
          color: c,
          line: { color: "#ffffff", width: 2.5 },
          symbol: "diamond",
        },
        hovertemplate:
          `<b>Tu objeto · ${CLASS_LABEL[prediction.predicted_class]}</b><br>` +
          `Confianza ${(prediction.confidence * 100).toFixed(1)}%<br>` +
          `α ${prediction.alpha.toFixed(2)}°  ·  δ ${prediction.delta.toFixed(2)}°  ·  z̃ ${prediction.redshift.toFixed(3)}<extra></extra>`,
        showlegend: false,
      });
    }

    // El visor 3D es un panel oscuro (el cosmos es negro) embebido en la app clara.
    const axisCommon = {
      gridcolor: "rgba(148, 163, 184, 0.14)",
      zerolinecolor: "rgba(148, 163, 184, 0.3)",
      showbackground: false,
      color: "#94a3b8",
      tickfont: { family: "var(--font-mono)", size: 10, color: "#64748b" },
      titlefont: { family: "var(--font-mono)", size: 11, color: "#94a3b8" },
    };
    const layout = {
      autosize: true,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      margin: { l: 0, r: 0, t: 0, b: 0 },
      font: { family: "var(--font-sans)", size: 11, color: "#94a3b8" },
      hoverlabel: {
        bgcolor: "#0f1729",
        bordercolor: "rgba(148, 163, 184, 0.4)",
        font: { family: "var(--font-mono)", size: 11, color: "#e2e8f0" },
      },
      showlegend: false,
      scene: {
        bgcolor: "rgba(0,0,0,0)",
        camera: { eye: { x: 1.6, y: 1.6, z: 1.15 } },
        xaxis: { ...axisCommon, title: { text: "α (normalizado)" }, range: [0, 1] },
        yaxis: { ...axisCommon, title: { text: "δ (normalizado)" }, range: [0, 1] },
        zaxis: { ...axisCommon, title: { text: "z̃ (normalizado)" }, range: [0, 1] },
        aspectmode: "cube",
      },
    };

    const config = {
      displaylogo: false,
      modeBarButtonsToRemove: [
        "toImage",
        "sendDataToCloud",
        "orbitRotation",
        "tableRotation",
        "resetCameraLastSave3d",
      ],
      responsive: true,
    };

    plotly.react(plotRef.current, traces, layout, config);

    const handleResize = () => {
      if (plotRef.current && plotly.Plots) plotly.Plots.resize(plotRef.current);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pointBuckets, wireframeSegments, enabledClasses, showPoints, prediction, octree, plotly]);

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-gray-300 shadow-elev"
      style={{
        minHeight: 620,
        background: "radial-gradient(ellipse at 50% 35%, #131c33 0%, #0a0f1e 70%, #070a14 100%)",
      }}
    >
      <div className="absolute top-3 left-4 z-10 font-mono text-[10px] tracking-widest uppercase text-slate-500 pointer-events-none">
        visor 3D · α × δ × redshift
      </div>
      <div ref={plotRef} className="absolute inset-0" />
    </div>
  );
}
