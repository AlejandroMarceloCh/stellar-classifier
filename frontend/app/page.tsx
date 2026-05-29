"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, StellarApiError } from "@/lib/api";
import type {
  DemoObject,
  FeatureName,
  FeatureRanges,
  PredictRequest,
  PredictResponse,
  StellarClass,
} from "@/lib/types";
import { DemoChips } from "@/components/DemoChips";
import { PredictionForm } from "@/components/PredictionForm";
import { ResultCard } from "@/components/ResultCard";
import { InputPreview } from "@/components/InputPreview";
import { IntroBanner } from "@/components/IntroBanner";
import { GuidedTour } from "@/components/GuidedTour";
import { NextStep } from "@/components/NextStep";
import { TestCases } from "@/components/TestCases";
import { saveLastPrediction } from "@/lib/predictionStore";

function emptyValues(): PredictRequest {
  return { alpha: NaN, delta: NaN, u: NaN, g: NaN, r: NaN, i: NaN, z: NaN, redshift: NaN };
}

function meanValues(ranges: FeatureRanges): PredictRequest {
  const k = (n: FeatureName) => ranges[n].mean;
  return {
    alpha: k("alpha"), delta: k("delta"),
    u: k("u"), g: k("g"), r: k("r"), i: k("i"), z: k("z"),
    redshift: k("redshift"),
  };
}

export default function HomePage() {
  const [ranges, setRanges] = useState<FeatureRanges | null>(null);
  const [demos, setDemos] = useState<Record<StellarClass, DemoObject> | null>(null);
  const [values, setValues] = useState<PredictRequest>(emptyValues());
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [predictError, setPredictError] = useState<string | null>(null);
  const [customized, setCustomized] = useState(false);
  const [showHow, setShowHow] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([api.ranges(), api.demoObjects()])
      .then(([r, d]) => {
        if (!mounted) return;
        setRanges(r);
        setDemos(d);
        setValues(meanValues(r));
      })
      .catch((e) => {
        if (!mounted) return;
        setBootstrapError(
          e instanceof StellarApiError ? `Backend respondió ${e.status}` : "Backend no responde",
        );
      });
    return () => { mounted = false; };
  }, []);

  function onChange(name: FeatureName, value: number) {
    setValues((v) => ({ ...v, [name]: value }));
    setPredictError(null);
    if (activeDemoId) setCustomized(true);
  }

  async function runPredict(input: PredictRequest) {
    setIsLoading(true);
    setPredictError(null);
    try {
      const res = await api.predict(input);
      setResult(res);
      saveLastPrediction({
        alpha: input.alpha,
        delta: input.delta,
        redshift: input.redshift,
        predicted_class: res.prediction,
        confidence: res.confidence ?? 0,
        timestamp: Date.now(),
      });
      // Scroll suave al resultado (especialmente útil en móvil donde aside está abajo)
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 60);
    } catch (e) {
      const msg = e instanceof StellarApiError
        ? typeof e.detail === "string" ? e.detail : e.detail.message
        : "Error de red al llamar a /api/predict";
      setPredictError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAndPredict(input: PredictRequest, sourceId: string) {
    setValues(input);
    setActiveDemoId(sourceId);
    setCustomized(false);
    setResult(null);
    setPredictError(null);
    // Cargar = predicción instantánea (saca el paso extra)
    await runPredict(input);
  }

  async function onLoadDemo(demo: DemoObject) {
    await loadAndPredict(
      {
        alpha: demo.alpha, delta: demo.delta,
        u: demo.u, g: demo.g, r: demo.r, i: demo.i, z: demo.z,
        redshift: demo.redshift,
      },
      demo.obj_id,
    );
  }

  async function onSubmit() {
    await runPredict(values);
  }

  function onReset() {
    if (ranges) setValues(meanValues(ranges));
    setActiveDemoId(null);
    setCustomized(false);
    setResult(null);
    setPredictError(null);
  }

  // Determinar paso actual del flujo
  const invalidCount = useMemo(() => {
    if (!ranges) return 8;
    return (["alpha", "delta", "u", "g", "r", "i", "z", "redshift"] as FeatureName[]).filter(
      (k) => !Number.isFinite(values[k]) || values[k] < ranges[k].min || values[k] > ranges[k].max,
    ).length;
  }, [values, ranges]);

  if (bootstrapError) {
    return (
      <div className="card border-danger/40 bg-nasa-red-bg p-6">
        <h2 className="text-[17px] font-semibold text-gray-900">No se pudo cargar el backend</h2>
        <p className="mt-2 text-[13px] text-gray-700">{bootstrapError}</p>
        <p className="mt-3 font-mono text-[11px] text-gray-500">
          Asegúrate de que el backend esté corriendo en :8000 (o NEXT_PUBLIC_API_URL).
        </p>
      </div>
    );
  }

  if (!ranges || !demos) {
    return (
      <div className="card-flat p-6 text-[13px] text-gray-600 font-mono">
        Cargando metadata del modelo…
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-24 lg:pb-8">
      <IntroBanner
        eyebrow="Stellar Classifier · SDSS17"
        title="Clasifica objetos del cielo con machine learning"
        description="Carga un objeto real del SDSS17 o ingresa los valores a mano: el modelo lo clasifica como galaxia, estrella o quásar al instante, con su nivel de confianza. ¿Quieres entender cómo decide? Abre el recorrido guiado más abajo."
        flow={[
          { label: "Clasifica", href: "/" },
          { label: "Explora el cielo", href: "/sky-map" },
          { label: "Universo 3D", href: "/universe" },
          { label: "Entiende el modelo", href: "/analysis" },
        ]}
      />

      {/* WORKSPACE — el clasificador es el protagonista */}
      <section className="space-y-5">
        <div>
          <h2 className="text-[18px] font-semibold text-gray-900">Clasifica un objeto del SDSS17</h2>
          <p className="section-sub">
            Empieza con un objeto real, o ingresa los 8 valores a mano. El resultado aparece al costado.
          </p>
        </div>

        {/* Carga rápida: objetos reales */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="label-uppercase">Carga un objeto real</span>
            <span className="text-[11px] text-gray-500">clic para clasificar al instante</span>
          </div>
          <DemoChips
            demoObjects={demos}
            onLoad={onLoadDemo}
            disabled={isLoading}
            activeId={activeDemoId}
          />
          <TestCases onRun={(tc) => loadAndPredict(tc.values, tc.id)} disabled={isLoading} activeId={activeDemoId} />
        </div>

        {/* Form + resultado */}
        <div id="clasificador" className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start scroll-mt-24">
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="label-uppercase">O ingresa los valores</span>
              {activeDemoId && customized && (
                <span className="text-[11px] text-warning">Valores modificados respecto al objeto cargado</span>
              )}
            </div>
            <PredictionForm
              values={values}
              ranges={ranges}
              onChange={onChange}
              onSubmit={onSubmit}
              onReset={onReset}
              isLoading={isLoading}
            />
            {predictError && (
              <div className="card p-3 border-danger/40 bg-nasa-red-bg text-[13px] text-gray-800">
                {predictError}
              </div>
            )}
          </div>

          <aside ref={resultRef} className="space-y-4 lg:sticky lg:top-24">
            {result ? <ResultCard result={result} /> : <InputPreview values={values} />}
          </aside>
        </div>
      </section>

      {/* SECUNDARIO — cómo funciona (recorrido guiado, colapsado por defecto) */}
      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setShowHow((v) => !v)}
          className="card-flat w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-100 transition-colors"
          aria-expanded={showHow}
        >
          <span>
            <span className="section-h2 block">¿Cómo decide el modelo?</span>
            <span className="section-sub block">
              Recorrido guiado de 3 pasos · entiende por qué clasifica lo que clasifica
            </span>
          </span>
          <span className="text-[13px] font-medium text-nasa-blue shrink-0 ml-4">
            {showHow ? "Ocultar −" : "Ver recorrido +"}
          </span>
        </button>
        {showHow && <GuidedTour ranges={ranges} demos={demos} />}
      </section>

      <NextStep
        href="/sky-map"
        label="Explora el cielo completo"
        reason="Ya clasificaste un objeto. Ahora ve cómo se distribuyen los 100 mil objetos del SDSS17 en el mapa del cielo."
      />

      {/* Sticky CTA en mobile cuando hay 8/8 válidos y no está loading */}
      {invalidCount === 0 && !result && !isLoading && (
        <div className="lg:hidden fixed bottom-4 inset-x-4 z-40 animate-slide-up">
          <button
            type="button"
            onClick={onSubmit}
            className="btn-primary w-full justify-center shadow-elev-lg"
          >
            Clasificar objeto
          </button>
        </div>
      )}
    </div>
  );
}
