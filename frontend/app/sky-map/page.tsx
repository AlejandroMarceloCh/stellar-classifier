"use client";

import { useEffect, useMemo, useState } from "react";
import { api, StellarApiError } from "@/lib/api";
import type { QuadtreeNode, QuadtreePayload, StellarClass } from "@/lib/types";
import { QuadtreeView, QuadtreeInspector } from "@/components/QuadtreeView";
import { IntroBanner } from "@/components/IntroBanner";
import { InfoBox } from "@/components/InfoBox";
import { NextStep } from "@/components/NextStep";

const CLASS_META: Record<StellarClass, { label: string; color: string; bg: string }> = {
  GALAXY: { label: "Galaxia", color: "#0B3D91", bg: "#eef3fc" },
  STAR: { label: "Estrella", color: "#D97706", bg: "#fef3c7" },
  QSO: { label: "Quásar", color: "#7B2D8E", bg: "#f3e8ff" },
};

export default function SkyMapPage() {
  const [payload, setPayload] = useState<QuadtreePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [enabledClasses, setEnabledClasses] = useState<Set<StellarClass>>(
    new Set(["GALAXY", "STAR", "QSO"]),
  );
  const [maxDepth, setMaxDepth] = useState(4);
  const [inspected, setInspected] = useState<QuadtreeNode | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .quadtree()
      .then((p) => {
        if (!mounted) return;
        setPayload(p);
        setMaxDepth(Math.min(4, p.stats.max_depth_real));
      })
      .catch((e) => {
        if (!mounted) return;
        setError(
          e instanceof StellarApiError ? `Backend respondió ${e.status}` : "Backend no responde",
        );
      });
    return () => { mounted = false; };
  }, []);

  function toggleClass(cls: StellarClass) {
    setEnabledClasses((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
  }

  const totals = useMemo(() => {
    if (!payload) return null;
    let g = 0, s = 0, q = 0;
    for (const n of payload.nodes) {
      if (!n.is_leaf) continue;
      g += n.class_distribution.GALAXY ?? 0;
      s += n.class_distribution.STAR ?? 0;
      q += n.class_distribution.QSO ?? 0;
    }
    return { GALAXY: g, STAR: s, QSO: q, total: g + s + q };
  }, [payload]);

  if (error) {
    return (
      <div className="card border-danger/40 bg-nasa-red-bg p-6">
        <h2 className="text-[17px] font-semibold text-gray-900">No se pudo cargar el quadtree</h2>
        <p className="mt-2 text-[13px] text-gray-700">{error}</p>
      </div>
    );
  }

  if (!payload || !totals) {
    return (
      <div className="card-flat p-6 text-[13px] text-gray-600 font-mono">
        Cargando quadtree del cielo (~500 KB)…
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <IntroBanner
        eyebrow="02 / Sky map"
        title="Mapa del cielo en 2D"
        description={`Quadtree adaptativo sobre ${totals.total.toLocaleString("es-PE")} objetos del SDSS17 proyectados en coordenadas ecuatoriales (ascensión recta y declinación). Cada cuadrante se colorea con la clase astronómica dominante y su opacidad refleja la densidad. Filtra clases, ajusta la profundidad del árbol y haz clic en un cuadrante para inspeccionar su distribución detallada.`}
        flow={[
          { label: "Predicción", href: "/" },
          { label: "Sky map", href: "/sky-map" },
          { label: "Universo 3D", href: "/universe" },
        ]}
      />

      <InfoBox title="Cómo leer este mapa y qué es un quadtree">
        <p>
          Un <strong>quadtree</strong> divide el cielo en cuadrantes y subdivide los cuadrantes con
          muchos objetos en 4 más pequeños, recursivamente. Así, zonas densas se ven con más detalle
          y zonas vacías se mantienen en un solo bloque grande.
        </p>
        <p>
          <strong>Color</strong> = clase mayoritaria del cuadrante (Galaxia azul, Estrella ámbar,
          Quásar morado). <strong>Opacidad</strong> = cuántos objetos contiene (más opaco = más
          denso). El slider de profundidad controla cuánto subdivide el árbol: nivel 1 son 4 grandes
          bloques, nivel 6 muestra el detalle máximo.
        </p>
      </InfoBox>

      {/* Distribución total como headline */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["GALAXY", "STAR", "QSO"] as const).map((cls) => {
          const meta = CLASS_META[cls];
          const v = totals[cls];
          const ratio = totals.total > 0 ? v / totals.total : 0;
          return (
            <div key={cls} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  <span className="label-uppercase">{meta.label}</span>
                </span>
                <span className="font-mono text-[11px] text-gray-500 tabular-nums">
                  {(ratio * 100).toFixed(2)}%
                </span>
              </div>
              <div className="mt-2 font-mono text-[22px] text-gray-900 leading-none tabular-nums font-semibold">
                {v.toLocaleString("es-PE")}
              </div>
              <div className="mt-2.5 h-1 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${ratio * 100}%`, background: meta.color, opacity: 0.85 }}
                />
              </div>
            </div>
          );
        })}
      </section>

      {/* Controles + mapa + inspector */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        <div className="space-y-4">
          <div className="card p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-3">
              <span className="label-uppercase">Filtrar clases</span>
              <div className="flex gap-1.5">
                {(["GALAXY", "STAR", "QSO"] as const).map((cls) => {
                  const meta = CLASS_META[cls];
                  const active = enabledClasses.has(cls);
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => toggleClass(cls)}
                      className={
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] transition-all border " +
                        (active
                          ? "border-gray-300 text-gray-900 bg-white shadow-soft"
                          : "border-gray-200 text-gray-400 bg-gray-50 hover:text-gray-600")
                      }
                      style={active ? { borderColor: meta.color, color: meta.color } : undefined}
                    >
                      <span
                        aria-hidden
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: active ? meta.color : "#a3a3a3" }}
                      />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-1 min-w-[220px]">
              <span className="label-uppercase shrink-0">Profundidad</span>
              <input
                type="range"
                min={1}
                max={payload.stats.max_depth_real}
                step={1}
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                className="flex-1"
              />
              <span className="font-mono text-[12px] text-gray-900 tabular-nums w-16 text-right">
                nivel {maxDepth} / {payload.stats.max_depth_real}
              </span>
            </div>
          </div>

          <QuadtreeView
            payload={payload}
            maxDepth={maxDepth}
            enabledClasses={enabledClasses}
            onInspect={(node) => {
              if (!pinnedId) setInspected(node);
            }}
            pinnedId={pinnedId}
            onPin={(id) => {
              setPinnedId(id);
              if (!id) setInspected(null);
            }}
          />

          <footer className="flex flex-wrap items-baseline gap-x-6 gap-y-1 font-mono text-[11px] text-gray-500">
            <span>nodos totales <span className="text-gray-900">{payload.stats.total_nodes.toLocaleString("es-PE")}</span></span>
            <span>hojas <span className="text-gray-900">{payload.stats.leaves.toLocaleString("es-PE")}</span></span>
            <span>hojas vacías <span className="text-gray-900">{payload.stats.empty_leaves.toLocaleString("es-PE")}</span></span>
            <span>profundidad máx <span className="text-gray-900">{payload.stats.max_depth_real}</span></span>
          </footer>
        </div>

        <aside className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="section-h2">Inspector</h3>
            <span className="font-mono text-[10px] text-gray-500">
              {pinnedId ? "fijado" : inspected ? "hover" : "sin selección"}
            </span>
          </div>
          <QuadtreeInspector
            node={inspected}
            pinned={!!pinnedId}
            onClear={() => {
              setPinnedId(null);
              setInspected(null);
            }}
          />
        </aside>
      </section>

      <div className="flex gap-2.5 rounded-md bg-nasa-blue-bg border border-nasa-blue/20 px-3.5 py-3">
        <span
          aria-hidden
          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-nasa-blue text-white text-[10px] font-bold shrink-0 mt-0.5"
        >
          i
        </span>
        <p className="text-[12.5px] text-gray-700 leading-relaxed">
          Fíjate que las galaxias (azul) dominan casi todo el cielo observado: son la clase más
          numerosa del SDSS17 ({((totals.GALAXY / totals.total) * 100).toFixed(0)}%). Las estrellas
          (ámbar) se concentran en bandas porque el survey apuntó zonas específicas de nuestra galaxia.
          Sube la profundidad del árbol para ver cómo aparecen bolsones de quásares (morado) en zonas
          densas.
        </p>
      </div>

      <NextStep
        href="/universe"
        label="Salta a la tercera dimensión"
        reason="Este mapa es plano (α × δ). Agrega el redshift como eje de profundidad y verás por qué cada clase ocupa una región distinta del espacio."
      />
    </div>
  );
}
