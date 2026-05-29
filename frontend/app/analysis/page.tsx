"use client";

import { useEffect, useState } from "react";
import { api, StellarApiError } from "@/lib/api";
import type { ModelMetadata, ModelingSummary, StellarClass } from "@/lib/types";
import { ConfusionMatrix } from "@/components/ConfusionMatrix";
import { ModelComparisonChart } from "@/components/ModelComparisonChart";
import { FeatureImportanceChart } from "@/components/FeatureImportanceChart";
import { IntroBanner } from "@/components/IntroBanner";
import { InfoBox } from "@/components/InfoBox";
import { NextStep } from "@/components/NextStep";

const CLASS_META: Record<StellarClass, { label: string; color: string }> = {
  GALAXY: { label: "Galaxia", color: "#0B3D91" },
  STAR: { label: "Estrella", color: "#D97706" },
  QSO: { label: "Quásar", color: "#7B2D8E" },
};

export default function AnalysisPage() {
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const [summary, setSummary] = useState<ModelingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([api.version(), api.modelingSummary()])
      .then(([m, s]) => {
        if (!mounted) return;
        setMetadata(m);
        setSummary(s);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(
          e instanceof StellarApiError ? `Backend respondió ${e.status}` : "Backend no responde",
        );
      });
    return () => { mounted = false; };
  }, []);

  if (error) {
    return (
      <div className="card border-danger/40 bg-nasa-red-bg p-6">
        <h2 className="text-[17px] font-semibold text-gray-900">No se pudo cargar el análisis</h2>
        <p className="mt-2 text-[13px] text-gray-700">{error}</p>
      </div>
    );
  }
  if (!metadata || !summary) {
    return (
      <div className="card-flat p-6 text-[13px] text-gray-600 font-mono">
        Cargando métricas del modelo…
      </div>
    );
  }

  const winnerPct = (summary.winner.test_accuracy * 100).toFixed(2);
  const baselinePct = (summary.baseline.accuracy * 100).toFixed(2);
  const cvPct = (summary.winner.cv_accuracy_mean * 100).toFixed(2);
  const cvStdPct = (summary.winner.cv_accuracy_std * 100).toFixed(2);
  const f1Pct = (summary.winner.test_f1_macro * 100).toFixed(2);
  const gapPp = Math.abs(summary.winner.test_accuracy - summary.winner.cv_accuracy_mean) * 100;

  return (
    <div className="space-y-8">
      <IntroBanner
        eyebrow="04 / Análisis"
        title="Cómo se comporta el modelo"
        description={`Esta pantalla expone la transparencia del clasificador: qué tan bueno es, dónde se equivoca, cuáles features usa más y cómo se comparó contra otros 9 candidatos antes de elegirlo. Lo que ves acá es lo que defiendes ante el profesor.`}
        flow={[
          { label: "Predicción", href: "/" },
          { label: "Universo 3D", href: "/universe" },
          { label: "Análisis", href: "/analysis" },
        ]}
      />

      <InfoBox title="Cómo leer las métricas de esta pantalla">
        <p>
          <strong>Accuracy</strong> es el % de aciertos sobre el holdout (20 000 muestras nunca
          vistas durante entrenamiento). <strong>CV mean ± std</strong> es el promedio de 5 splits
          internos del training set; si CV y test son similares, el modelo generaliza bien (no hay
          overfit).
        </p>
        <p>
          <strong>F1 macro</strong> promedia el F1 de cada clase sin ponderar por tamaño — es más
          honesto cuando las clases están desbalanceadas (Galaxia 59% / Estrella 22% / Quásar 19%).
          La <strong>matriz de confusión</strong> muestra dónde falla: diagonal verde = acierta,
          fuera de la diagonal rojo = confunde una clase con otra.
        </p>
        <p>
          La <strong>importancia de features</strong> revela qué variables usa el modelo para decidir.
          Si una sola domina (caso de redshift acá), significa que esa variable es muy informativa
          para el problema.
        </p>
      </InfoBox>

      {/* Hero: identidad del modelo + KPI principal */}
      <header className="card p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
        <div>
          <div className="label-uppercase text-nasa-blue">Modelo en producción</div>
          <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight-ish text-gray-900">
            Análisis del modelo
          </h1>
          <p className="mt-2 text-[13px] text-gray-600 max-w-xl">
            Random Forest entrenado sobre {metadata.dataset_rows.toLocaleString("es-PE")} objetos del SDSS17,
            evaluado con StratifiedKFold({summary.cv_folds}) y holdout 20%.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-gray-500">
            <span>versión <span className="text-gray-900">{metadata.version}</span></span>
            <span aria-hidden>·</span>
            <span>random_state <span className="text-gray-900">42</span></span>
            <span aria-hidden>·</span>
            <span>holdout <span className="text-gray-900">{metadata.test_rows.toLocaleString("es-PE")}</span></span>
          </div>
        </div>
        <div className="lg:text-right border-l-0 lg:border-l border-gray-200 lg:pl-8">
          <div className="label-uppercase">Test accuracy</div>
          <div className="mt-1 flex items-baseline gap-2 lg:justify-end">
            <span className="font-mono text-[64px] leading-none font-bold text-nasa-blue tabular-nums tracking-tight-ish">
              {winnerPct}
            </span>
            <span className="font-mono text-[20px] text-gray-400 font-semibold">%</span>
          </div>
          <div className="mt-2 font-mono text-[11px] text-gray-500">
            <span className="text-success font-semibold">+{summary.winner.margin_over_baseline_pts.toFixed(2)} pts</span>{" "}
            vs baseline {baselinePct}%
          </div>
        </div>
      </header>

      {/* KPI strip secundarios */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="F1 macro" value={`${f1Pct}%`} sub="promedio por clase, no por soporte" />
        <Kpi label="CV mean ± std" value={`${cvPct}% ± ${cvStdPct}%`} sub={`${summary.cv_folds}-fold stratified`} />
        <Kpi
          label="Gap CV vs test"
          value={`${gapPp.toFixed(2)} pp`}
          sub={gapPp < 0.5 ? "sin overfit aparente" : "revisar variance"}
        />
        <Kpi
          label="Solo redshift"
          value={`${(summary.feature_ablation_rf.accuracy_redshift_only * 100).toFixed(2)}%`}
          sub={`combinar 8 features aporta +${summary.feature_ablation_rf.diff_pts.toFixed(2)} pp`}
        />
      </section>

      {/* Matriz de confusión + métricas por clase */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-5">
        <div className="card p-6">
          <div className="mb-4">
            <h2 className="section-h2">Matriz de confusión</h2>
            <p className="section-sub">Identifica qué clases confunde el modelo entre sí.</p>
          </div>
          <ConfusionMatrix matrix={summary.confusion_matrix} classes={metadata.classes} />
          <Insight>{confusionInsight(summary.confusion_matrix, metadata.classes)}</Insight>
        </div>

        <div className="card p-6">
          <div className="mb-4">
            <h2 className="section-h2">Métricas por clase</h2>
            <p className="section-sub">Precision, recall y F1 desglosados para detectar desbalance.</p>
          </div>
          <div className="space-y-3">
            {metadata.classes.map((cls) => {
              const m = metadata.metrics.per_class[cls];
              const meta = CLASS_META[cls];
              return (
                <div key={cls} className="rounded-md border border-gray-200 bg-gray-50 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[13px] text-gray-900 font-medium">
                      <span
                        aria-hidden
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      {meta.label}
                    </span>
                    <span className="font-mono text-[10px] text-gray-500 tabular-nums">
                      n = {m.support.toLocaleString("es-PE")}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <MetricCell label="Precision" value={m.precision} hue={meta.color} />
                    <MetricCell label="Recall" value={m.recall} hue={meta.color} />
                    <MetricCell label="F1" value={m.f1_score} hue={meta.color} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparativa de modelos */}
      <section className="card p-6">
        <div className="mb-5 flex items-baseline justify-between">
          <div>
            <h2 className="section-h2">Comparativa entre {summary.all_models.length} modelos</h2>
            <p className="section-sub">CV en error bar fino · test accuracy en barra principal · ganador en azul NASA.</p>
          </div>
        </div>
        <ModelComparisonChart
          models={summary.all_models}
          winnerName={summary.winner.name}
          baselineAccuracy={summary.baseline.accuracy}
        />
        <Insight>
          Los modelos de árboles (Random Forest, Bagging, Gradient Boosting) dominan porque capturan
          relaciones no lineales entre las features. Un baseline trivial que siempre predice la clase
          mayoritaria solo llega a {baselinePct}% — el modelo lo supera por{" "}
          <strong>{summary.winner.margin_over_baseline_pts.toFixed(1)} puntos</strong>, lo que confirma
          que está aprendiendo señal real, no memorizando la clase más común.
        </Insight>
      </section>

      {/* Feature importance + decisiones */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-5">
        <div className="card p-6">
          <div className="mb-4">
            <h2 className="section-h2">Importancia de features</h2>
            <p className="section-sub">Gini importance del Random Forest. Suma = 100%.</p>
          </div>
          {metadata.feature_importance && (
            <FeatureImportanceChart
              importance={metadata.feature_importance}
              ablation={summary.feature_ablation_rf}
            />
          )}
          <Insight>
            Que una sola feature (redshift) domine no es un defecto: refleja la física. El redshift mide
            la distancia cosmológica, y la distancia separa naturalmente estrellas locales de galaxias
            y quásares lejanos. Las bandas fotométricas afinan los casos límite.
          </Insight>
        </div>

        <div className="card p-6">
          <div className="mb-4">
            <h2 className="section-h2">Decisiones de modelado</h2>
            <p className="section-sub">Por qué este modelo y no otros.</p>
          </div>
          <ol className="space-y-2.5">
            {summary.decisions.map((d, i) => (
              <li key={i} className="flex gap-3 text-[12.5px] text-gray-700 leading-relaxed">
                <span className="font-mono text-[10px] text-nasa-blue mt-1 tabular-nums shrink-0 font-semibold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{d}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <NextStep
        href="/"
        label="Vuelve a clasificar con lo que aprendiste"
        reason="Ahora que sabes cómo se evalúa el modelo y por qué redshift manda, prueba un objeto y predice su clase."
      />
    </div>
  );
}

function Insight({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex gap-2.5 rounded-md bg-nasa-blue-bg border border-nasa-blue/20 px-3.5 py-3">
      <span
        aria-hidden
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-nasa-blue text-white text-[10px] font-bold shrink-0 mt-0.5"
      >
        i
      </span>
      <p className="text-[12.5px] text-gray-700 leading-relaxed">{children}</p>
    </div>
  );
}

/** Genera el insight de la matriz: clase con mejor recall + mayor error off-diagonal. */
function confusionInsight(matrix: number[][], classes: StellarClass[]): React.ReactNode {
  const labels = classes.map((c) => CLASS_META[c].label);
  // Mejor recall (diagonal / suma de fila)
  let bestRecallIdx = 0;
  let bestRecall = -1;
  matrix.forEach((row, i) => {
    const sum = row.reduce((a, b) => a + b, 0);
    const recall = sum === 0 ? 0 : row[i] / sum;
    if (recall > bestRecall) {
      bestRecall = recall;
      bestRecallIdx = i;
    }
  });
  // Mayor error off-diagonal
  let errI = 0, errJ = 1, errVal = -1, errRate = 0;
  matrix.forEach((row, i) => {
    const sum = row.reduce((a, b) => a + b, 0);
    row.forEach((v, j) => {
      if (i !== j && v > errVal) {
        errVal = v;
        errI = i;
        errJ = j;
        errRate = sum === 0 ? 0 : v / sum;
      }
    });
  });
  return (
    <>
      El modelo casi nunca falla con <strong>{labels[bestRecallIdx]}</strong> (recall{" "}
      {(bestRecall * 100).toFixed(1)}%). Su error más frecuente es predecir{" "}
      <strong>{labels[errJ]}</strong> cuando en realidad era <strong>{labels[errI]}</strong> —
      ocurre en el {(errRate * 100).toFixed(1)}% de esos casos, porque comparten rangos de redshift
      similares.
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="label-uppercase">{label}</div>
      <div className="mt-1.5 font-mono text-[22px] text-gray-900 leading-none tabular-nums font-semibold">
        {value}
      </div>
      {sub && <div className="mt-2 text-[11px] text-gray-500">{sub}</div>}
    </div>
  );
}

function MetricCell({ label, value, hue }: { label: string; value: number; hue: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{label}</div>
      <div className="font-mono text-[13px] text-gray-900 tabular-nums font-semibold">
        {(value * 100).toFixed(2)}%
      </div>
      <div className="h-px bg-gray-200">
        <div
          className="h-px transition-all"
          style={{ width: `${value * 100}%`, background: hue, opacity: 0.85 }}
        />
      </div>
    </div>
  );
}
