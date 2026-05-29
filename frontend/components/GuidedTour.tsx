"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type {
  DemoObject,
  FeatureRanges,
  PredictRequest,
  PredictResponse,
  StellarClass,
} from "@/lib/types";
import { saveLastPrediction } from "@/lib/predictionStore";

const META: Record<
  StellarClass,
  { label: string; color: string; bg: string; blurb: string }
> = {
  STAR: {
    label: "Estrella",
    color: "#D97706",
    bg: "#fef3c7",
    blurb: "una bola de gas de nuestra galaxia o de una vecina cercana",
  },
  GALAXY: {
    label: "Galaxia",
    color: "#0B3D91",
    bg: "#eef3fc",
    blurb: "miles de millones de estrellas juntas, a gran distancia de nosotros",
  },
  QSO: {
    label: "Quásar",
    color: "#7B2D8E",
    bg: "#f3e8ff",
    blurb: "el núcleo brillantísimo de una galaxia lejana, alimentado por un agujero negro",
  },
};

const BANDS: { k: "u" | "g" | "r" | "i" | "z"; label: string; color: string }[] = [
  { k: "u", label: "ultravioleta", color: "#7B2D8E" },
  { k: "g", label: "verde", color: "#16a34a" },
  { k: "r", label: "rojo", color: "#dc2626" },
  { k: "i", label: "IR cercano", color: "#ea580c" },
  { k: "z", label: "IR medio", color: "#991b1b" },
];

const STEPS = [
  { n: 1, title: "La distancia" },
  { n: 2, title: "El color de la luz" },
  { n: 3, title: "El veredicto" },
];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function useLivePrediction(values: PredictRequest) {
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqId = useRef(0);
  const key = JSON.stringify(values);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    setLoading(true);
    timer.current = setTimeout(async () => {
      const id = ++reqId.current;
      try {
        const res = await api.predict(values);
        if (id === reqId.current) setResult(res);
      } catch {
        /* exploratorio — silencioso */
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 280);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { result, loading };
}

export function GuidedTour({
  ranges,
  demos,
}: {
  ranges: FeatureRanges;
  demos: Record<StellarClass, DemoObject>;
}) {
  const [step, setStep] = useState(1);
  const seed = demos.GALAXY;
  const [values, setValues] = useState<PredictRequest>(() => ({
    alpha: seed.alpha,
    delta: seed.delta,
    u: seed.u,
    g: seed.g,
    r: seed.r,
    i: seed.i,
    z: seed.z,
    redshift: seed.redshift,
  }));

  const { result, loading } = useLivePrediction(values);
  const cls = result?.prediction ?? null;
  const meta = cls ? META[cls] : null;
  const conf = result?.confidence ?? 0;

  function setField(k: keyof PredictRequest, v: number) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  // Guarda el resultado para el visor 3D al llegar al veredicto
  useEffect(() => {
    if (step === 3 && result) {
      saveLastPrediction({
        alpha: values.alpha,
        delta: values.delta,
        redshift: values.redshift,
        predicted_class: result.prediction,
        confidence: result.confidence ?? 0,
        timestamp: Date.now(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, result]);

  return (
    <div className="card overflow-hidden">
      {/* Cabecera: stepper */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <span className="label-uppercase">Cómo el modelo clasifica el universo</span>
          <span className="font-mono text-[11px] text-gray-500">Paso {step} de 3</span>
        </div>
        <div className="flex items-center gap-2">
          {STEPS.map((s, idx) => {
            const done = step > s.n;
            const active = step === s.n;
            return (
              <Fragment key={s.n}>
                <button
                  type="button"
                  onClick={() => setStep(s.n)}
                  className="flex items-center gap-2 group"
                >
                  <span
                    className={
                      "inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-semibold transition-colors " +
                      (active
                        ? "bg-nasa-blue text-white"
                        : done
                          ? "bg-nasa-blue/15 text-nasa-blue"
                          : "bg-white border border-gray-300 text-gray-400 group-hover:border-gray-400")
                    }
                  >
                    {done ? "✓" : s.n}
                  </span>
                  <span
                    className={
                      "text-[12.5px] hidden sm:inline transition-colors " +
                      (active ? "text-gray-900 font-medium" : "text-gray-500 group-hover:text-gray-700")
                    }
                  >
                    {s.title}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 h-px bg-gray-200 min-w-[16px]" />
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Cuerpo del paso */}
      <div className="p-5">
        {step === 1 && (
          <StepDistance
            z={values.redshift}
            min={ranges.redshift.min}
            max={ranges.redshift.max}
            onChange={(v) => setField("redshift", v)}
            meta={meta}
            conf={conf}
            loading={loading}
          />
        )}
        {step === 2 && (
          <StepColor
            values={values}
            ranges={ranges}
            onChange={setField}
            meta={meta}
            conf={conf}
            loading={loading}
          />
        )}
        {step === 3 && (
          <StepVerdict result={result} values={values} meta={meta} conf={conf} />
        )}
      </div>

      {/* Navegación */}
      <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Anterior
        </button>
        {step < 3 ? (
          <button type="button" onClick={() => setStep((s) => s + 1)} className="btn-primary">
            Siguiente →
          </button>
        ) : (
          <button type="button" onClick={() => setStep(1)} className="btn-ghost">
            Empezar de nuevo
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Verdicto en vivo (compartido) ---------- */

function LiveVerdict({
  meta,
  conf,
  loading,
}: {
  meta: (typeof META)[StellarClass] | null;
  conf: number;
  loading: boolean;
}) {
  return (
    <div
      className="rounded-lg border p-4 transition-colors"
      style={{
        background: meta ? meta.bg : "#fafafa",
        borderColor: meta ? `${meta.color}40` : "#e5e5e5",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="label-uppercase">El modelo dice</span>
        {loading && <span className="text-[10px] text-gray-400 font-mono">pensando…</span>}
      </div>
      <div className="mt-1.5 flex items-baseline gap-3">
        <span
          className="text-[32px] font-semibold leading-none transition-colors"
          style={{ color: meta ? meta.color : "#737373" }}
        >
          {meta ? meta.label : "—"}
        </span>
        {meta && (
          <span className="font-mono text-[20px] tabular-nums" style={{ color: meta.color }}>
            {(conf * 100).toFixed(0)}%
          </span>
        )}
      </div>
      {meta && <p className="mt-2 text-[12.5px] text-gray-600 leading-relaxed">Es {meta.blurb}.</p>}
    </div>
  );
}

/* ---------- Paso 1: distancia / redshift ---------- */

function StepDistance({
  z,
  min,
  max,
  onChange,
  meta,
  conf,
  loading,
}: {
  z: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  meta: (typeof META)[StellarClass] | null;
  conf: number;
  loading: boolean;
}) {
  const lo = Math.max(0, min);
  const hi = Math.min(max, 4);
  const val = clamp(z, lo, hi);
  const pct = ((val - lo) / (hi - lo)) * 100;

  const zones: { cls: StellarClass; range: string; hint: string }[] = [
    { cls: "STAR", range: "z ≈ 0", hint: "no se aleja → está cerca" },
    { cls: "GALAXY", range: "z entre 0.05 y 0.5", hint: "se aleja → distancia media" },
    { cls: "QSO", range: "z mayor que 1", hint: "se aleja rapidísimo → lejísimos" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
      <div className="space-y-4">
        <div>
          <h3 className="text-[17px] font-semibold text-gray-900">¿Qué tan lejos está el objeto?</h3>
          <p className="mt-1 text-[13px] text-gray-600 leading-relaxed">
            Lo primero que mira el modelo es el <strong>redshift</strong>: cuánto se estira la luz del
            objeto a medida que se aleja por la expansión del universo. Cuanto más lejos, más grande.
            Arrastra el control y observa cómo el modelo cambia de opinión.
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[12px] text-gray-700 font-medium">Distancia (redshift)</span>
            <span className="font-mono text-[14px] text-gray-900 tabular-nums">z̃ = {val.toFixed(3)}</span>
          </div>
          <input
            type="range"
            min={lo}
            max={hi}
            step={0.01}
            value={val}
            onChange={(e) => onChange(Number(e.target.value))}
            className="slider-range w-full"
            style={{ "--track": "#FC3D21", "--pct": `${pct}%` } as React.CSSProperties}
            aria-label="redshift"
          />
          <div className="mt-1.5 flex justify-between text-[10px] font-mono text-gray-400">
            <span>cerca</span>
            <span>lejos →</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {zones.map((zone) => {
            const m = META[zone.cls];
            const isCurrent = meta?.label === m.label;
            return (
              <div
                key={zone.cls}
                className="rounded-md border px-2.5 py-2 transition-colors"
                style={{
                  borderColor: isCurrent ? m.color : "#e5e5e5",
                  background: isCurrent ? m.bg : "transparent",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
                  <span className="text-[12px] font-medium text-gray-900">{m.label}</span>
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-gray-500">{zone.range}</div>
                <div className="text-[10.5px] text-gray-500 leading-snug mt-0.5">{zone.hint}</div>
              </div>
            );
          })}
        </div>

        <p className="text-[12px] text-gray-500 leading-relaxed border-t border-gray-200 pt-3">
          Fíjate: moviendo <strong className="text-gray-700">solo esto</strong> ya pasa de estrella a
          galaxia a quásar. Por eso el redshift aporta el{" "}
          <span className="text-gray-900 font-medium">61.7%</span> de la decisión del modelo.
        </p>
      </div>

      <div className="lg:sticky lg:top-24">
        <LiveVerdict meta={meta} conf={conf} loading={loading} />
      </div>
    </div>
  );
}

/* ---------- Paso 2: color / bandas fotométricas ---------- */

function StepColor({
  values,
  ranges,
  onChange,
  meta,
  conf,
  loading,
}: {
  values: PredictRequest;
  ranges: FeatureRanges;
  onChange: (k: keyof PredictRequest, v: number) => void;
  meta: (typeof META)[StellarClass] | null;
  conf: number;
  loading: boolean;
}) {
  function goToBorder() {
    onChange("redshift", 0.9);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
      <div className="space-y-4">
        <div>
          <h3 className="text-[17px] font-semibold text-gray-900">¿De qué color brilla?</h3>
          <p className="mt-1 text-[13px] text-gray-600 leading-relaxed">
            Cuando dos objetos están a distancias parecidas, el redshift no alcanza para decidir. Ahí el
            modelo mira el <strong>brillo en 5 colores de luz</strong>, del ultravioleta al infrarrojo.
            Ajústalos y observa el desempate.
          </p>
        </div>

        <button type="button" onClick={goToBorder} className="btn-ghost text-nasa-blue">
          Llévame a un caso de frontera (z = 0.9) →
        </button>

        <div className="space-y-3">
          {BANDS.map((b) => {
            const r = ranges[b.k];
            const v = clamp(values[b.k], r.min, r.max);
            const pct = ((v - r.min) / (r.max - r.min)) * 100;
            return (
              <div key={b.k}>
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 text-[12px] text-gray-700">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: b.color }} />
                    <span className="font-mono font-semibold text-gray-900">{b.k}</span>
                    <span className="text-gray-500">· {b.label}</span>
                  </span>
                  <span className="font-mono text-[11px] text-gray-500 tabular-nums">{v.toFixed(2)} mag</span>
                </div>
                <input
                  type="range"
                  min={r.min}
                  max={r.max}
                  step={0.01}
                  value={v}
                  onChange={(e) => onChange(b.k, Number(e.target.value))}
                  className="slider-range w-full"
                  style={{ "--track": b.color, "--pct": `${pct}%` } as React.CSSProperties}
                  aria-label={`banda ${b.k}`}
                />
              </div>
            );
          })}
        </div>

        <p className="text-[12px] text-gray-500 leading-relaxed border-t border-gray-200 pt-3">
          Menor magnitud = más brillante. Estos 5 colores juntos aportan el{" "}
          <span className="text-gray-900 font-medium">38%</span> restante: son el desempate cuando la
          distancia no basta.
        </p>
      </div>

      <div className="lg:sticky lg:top-24">
        <LiveVerdict meta={meta} conf={conf} loading={loading} />
      </div>
    </div>
  );
}

/* ---------- Paso 3: veredicto ---------- */

function VoteGrid({ top3 }: { top3: [StellarClass, number][] }) {
  const cells: StellarClass[] = [];
  top3.forEach(([c, p]) => {
    const n = Math.round(p * 100);
    for (let k = 0; k < n; k++) cells.push(c);
  });
  while (cells.length < 100 && top3[0]) cells.push(top3[0][0]);
  const grid = cells.slice(0, 100);

  return (
    <div
      className="grid gap-[3px]"
      style={{ gridTemplateColumns: "repeat(20, minmax(0, 1fr))" }}
    >
      {grid.map((c, idx) => (
        <span
          key={idx}
          className="aspect-square rounded-[2px]"
          style={{ background: META[c].color }}
        />
      ))}
    </div>
  );
}

function StepVerdict({
  result,
  values,
  meta,
  conf,
}: {
  result: PredictResponse | null;
  values: PredictRequest;
  meta: (typeof META)[StellarClass] | null;
  conf: number;
}) {
  if (!result || !meta) {
    return <div className="text-[13px] text-gray-500 font-mono">Calculando veredicto…</div>;
  }
  const topVotes = Math.round((result.confidence ?? conf) * 100);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[17px] font-semibold text-gray-900">El veredicto</h3>
        <p className="mt-1 text-[13px] text-gray-600 leading-relaxed">
          El modelo es un <strong>bosque de 100 árboles de decisión</strong>. Cada árbol vota una clase
          mirando los 8 datos. La <strong>confianza</strong> es cuántos coincidieron.
        </p>
      </div>

      <div
        className="rounded-lg border p-5"
        style={{ background: meta.bg, borderColor: `${meta.color}40` }}
      >
        <div className="flex items-baseline gap-3">
          <span className="text-[34px] font-semibold leading-none" style={{ color: meta.color }}>
            {meta.label}
          </span>
          <span className="font-mono text-[22px] tabular-nums" style={{ color: meta.color }}>
            {(conf * 100).toFixed(0)}%
          </span>
        </div>
        <p className="mt-2 text-[12.5px] text-gray-600">
          <strong style={{ color: meta.color }}>{topVotes} de 100 árboles</strong> votaron {meta.label}.
          Es {meta.blurb}.
        </p>
      </div>

      <div>
        <div className="label-uppercase mb-2">Cómo votaron los 100 árboles</div>
        <VoteGrid top3={result.top3} />
        <div className="mt-3 flex flex-wrap gap-3">
          {result.top3.map(([c, p]) => (
            <span key={c} className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: META[c].color }} />
              {META[c].label} {(p * 100).toFixed(0)}%
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="text-[12px] text-gray-600 mb-2.5">
          Ya entendiste cómo decide. Ahora explóralo de verdad:
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/universe" className="btn-primary">
            Ver este objeto en 3D →
          </Link>
          <Link href="/sky-map" className="btn-ghost">
            Explorar el cielo completo
          </Link>
          <a href="#clasificador" className="btn-ghost">
            Probar con mis propios valores
          </a>
        </div>
      </div>
    </div>
  );
}
