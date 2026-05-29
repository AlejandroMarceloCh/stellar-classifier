"use client";

import { useMemo, useState } from "react";
import type { QuadtreeNode, QuadtreePayload, StellarClass } from "@/lib/types";

const CLASS_COLOR: Record<StellarClass, string> = {
  GALAXY: "#0B3D91",
  STAR: "#D97706",
  QSO: "#7B2D8E",
};

const CLASS_LABEL: Record<StellarClass, string> = {
  GALAXY: "Galaxia",
  STAR: "Estrella",
  QSO: "Quásar",
};

interface QuadtreeViewProps {
  payload: QuadtreePayload;
  maxDepth: number;
  enabledClasses: Set<StellarClass>;
  onInspect: (node: QuadtreeNode | null) => void;
  pinnedId: string | null;
  onPin: (id: string | null) => void;
  width?: number;
  height?: number;
}

function selectVisibleNodes(payload: QuadtreePayload, maxDepth: number): QuadtreeNode[] {
  const result: QuadtreeNode[] = [];
  for (const node of payload.nodes) {
    if (node.depth > maxDepth) continue;
    if (node.is_leaf || node.depth === maxDepth) result.push(node);
  }
  return result;
}

export function QuadtreeView({
  payload,
  maxDepth,
  enabledClasses,
  onInspect,
  pinnedId,
  onPin,
  width = 1200,
  height = 540,
}: QuadtreeViewProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const visible = useMemo(() => selectVisibleNodes(payload, maxDepth), [payload, maxDepth]);

  const { alpha_min, alpha_max, delta_min, delta_max } = payload.bounds;
  const xScale = (a: number) => ((a - alpha_min) / (alpha_max - alpha_min)) * width;
  const yScale = (d: number) => height - ((d - delta_min) / (delta_max - delta_min)) * height;
  const maxCount = Math.max(1, ...visible.map((n) => n.count));

  return (
    <div className="card overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="block w-full bg-white"
        onMouseLeave={() => {
          if (!pinnedId) {
            setHoveredId(null);
            onInspect(null);
          }
        }}
      >
        <rect width={width} height={height} fill="#fafafa" />
        {/* equator */}
        <line
          x1={0}
          x2={width}
          y1={yScale(0)}
          y2={yScale(0)}
          stroke="#a3a3a3"
          strokeWidth={0.6}
          strokeDasharray="3 4"
        />

        {visible.map((node) => {
          const x = xScale(node.bounds.alpha_min);
          const y = yScale(node.bounds.delta_max);
          const w = xScale(node.bounds.alpha_max) - xScale(node.bounds.alpha_min);
          const h = yScale(node.bounds.delta_min) - yScale(node.bounds.delta_max);
          const cls = node.dominant_class;
          const visibleByFilter = cls !== null && enabledClasses.has(cls);
          const isActive = hoveredId === node.id || pinnedId === node.id;
          const opacity = node.count === 0 ? 0 : visibleByFilter ? 0.25 + 0.65 * (node.count / maxCount) : 0.06;
          const fill = visibleByFilter && cls ? CLASS_COLOR[cls] : "#d4d4d4";

          return (
            <rect
              key={node.id}
              x={x}
              y={y}
              width={w}
              height={h}
              fill={fill}
              opacity={opacity}
              stroke={isActive ? "#0B3D91" : "#ffffff"}
              strokeWidth={isActive ? 1.4 : 0.35}
              style={{ cursor: visibleByFilter ? "pointer" : "default", transition: "opacity 150ms" }}
              onMouseEnter={() => {
                if (!visibleByFilter || pinnedId) return;
                setHoveredId(node.id);
                onInspect(node);
              }}
              onClick={() => {
                if (!visibleByFilter) return;
                if (pinnedId === node.id) {
                  onPin(null);
                  setHoveredId(null);
                  onInspect(null);
                } else {
                  onPin(node.id);
                  setHoveredId(node.id);
                  onInspect(node);
                }
              }}
            />
          );
        })}

        {/* axis labels */}
        <g style={{ fontFamily: "var(--font-mono)" }}>
          <text x={8} y={height - 8} fill="#737373" fontSize={10}>α {alpha_min.toFixed(0)}°</text>
          <text x={width - 56} y={height - 8} fill="#737373" fontSize={10}>α {alpha_max.toFixed(0)}°</text>
          <text x={8} y={16} fill="#737373" fontSize={10}>δ {delta_max.toFixed(0)}°</text>
          <text x={8} y={yScale(0) - 4} fill="#737373" fontSize={10}>δ 0° · ecuador</text>
        </g>
      </svg>
    </div>
  );
}

interface InspectorProps {
  node: QuadtreeNode | null;
  pinned: boolean;
  onClear: () => void;
}

export function QuadtreeInspector({ node, pinned, onClear }: InspectorProps) {
  if (!node) {
    return (
      <div className="card-flat p-5">
        <div className="label-uppercase">Inspector</div>
        <p className="mt-2 text-[12.5px] text-gray-600 leading-relaxed">
          Pasa el cursor sobre un cuadrante para verlo aquí. Haz clic para fijarlo y comparar.
        </p>
        <div className="mt-4 pt-4 border-t border-gray-200 text-[11px] text-gray-500 font-mono leading-relaxed">
          Color = clase dominante · opacidad = densidad relativa
        </div>
      </div>
    );
  }

  const dom = node.dominant_class;
  const domColor = dom ? CLASS_COLOR[dom] : "#737373";
  const counts = (["GALAXY", "STAR", "QSO"] as const).map((k) => ({
    cls: k,
    count: node.class_distribution[k] ?? 0,
  }));
  const max = Math.max(1, ...counts.map((c) => c.count));

  return (
    <div className="card overflow-hidden">
      <div className="h-1" style={{ background: domColor }} />
      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: domColor }}
            />
            <span className="text-[12px] text-gray-700 font-medium">
              {dom ? `Dominante · ${CLASS_LABEL[dom]}` : "Sin clase dominante"}
            </span>
          </div>
          {pinned && (
            <button onClick={onClear} className="btn-ghost py-1 px-2 text-[11px]">
              Despinear
            </button>
          )}
        </div>

        <div className="mt-3">
          <div className="label-uppercase">Objetos en cuadrante</div>
          <div className="mt-1 font-mono text-[32px] text-gray-900 leading-none tabular-nums font-semibold">
            {node.count.toLocaleString("es-PE")}
          </div>
        </div>

        <div className="mt-5">
          <div className="label-uppercase mb-2">Distribución</div>
          <div className="space-y-2">
            {counts.map((c) => {
              const pct = node.count > 0 ? c.count / node.count : 0;
              return (
                <div key={c.cls} className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: CLASS_COLOR[c.cls] }}
                  />
                  <span className="text-[12px] text-gray-700 w-16">{CLASS_LABEL[c.cls]}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(c.count / max) * 100}%`, background: CLASS_COLOR[c.cls], opacity: 0.85 }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-gray-700 w-12 text-right tabular-nums">
                    {(pct * 100).toFixed(1)}%
                  </span>
                  <span className="font-mono text-[10px] text-gray-400 w-10 text-right tabular-nums">
                    {c.count.toLocaleString("es-PE")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-200 grid grid-cols-2 gap-3 text-[11px]">
          <Detail k="α rango" v={`${node.bounds.alpha_min.toFixed(2)}° a ${node.bounds.alpha_max.toFixed(2)}°`} />
          <Detail k="δ rango" v={`${node.bounds.delta_min.toFixed(2)}° a ${node.bounds.delta_max.toFixed(2)}°`} />
          <Detail k="profundidad" v={`nivel ${node.depth}`} />
          <Detail k="id" v={node.id} />
        </div>
      </div>
    </div>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{k}</div>
      <div className="mt-0.5 text-[11.5px] text-gray-700 truncate font-mono tabular-nums">{v}</div>
    </div>
  );
}
