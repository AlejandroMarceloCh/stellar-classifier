"use client";

import { useMemo } from "react";
import type { FeatureName, FeatureRanges, PredictRequest } from "@/lib/types";
import { HelpHint } from "@/components/Tooltip";

interface FieldDef {
  name: FeatureName;
  label: string;
  unit?: string;
  step: number;
  color: string;
  tip: string;
}

const GROUPS: { title: string; hint: string; fields: FieldDef[] }[] = [
  {
    title: "Coordenadas espaciales",
    hint: "Dónde se encuentra el objeto en el cielo · arrastra para mover el marcador en el mapa",
    fields: [
      {
        name: "alpha",
        label: "α · ascensión recta",
        unit: "°",
        step: 0.1,
        color: "#0B3D91",
        tip: "Coordenada celeste análoga a la longitud terrestre. Mide el ángulo horizontal desde el equinoccio de primavera. Va de 0° a 360°.",
      },
      {
        name: "delta",
        label: "δ · declinación",
        unit: "°",
        step: 0.1,
        color: "#0B3D91",
        tip: "Coordenada celeste análoga a la latitud terrestre. Mide el ángulo vertical desde el ecuador celeste. Va de -90° (polo sur) a +90° (polo norte).",
      },
    ],
  },
  {
    title: "Bandas fotométricas",
    hint: "Brillo en 5 longitudes de onda · arrastra y mira cómo cambian las barras de color",
    fields: [
      { name: "u", label: "u · ultravioleta", unit: "mag", step: 0.01, color: "#7B2D8E", tip: "Magnitud aparente en la banda ultravioleta (~355 nm). Sensible a estrellas calientes. Menor valor = más brillante." },
      { name: "g", label: "g · verde", unit: "mag", step: 0.01, color: "#16a34a", tip: "Magnitud aparente en la banda verde (~470 nm). Pico de emisión de estrellas tipo solar." },
      { name: "r", label: "r · rojo", unit: "mag", step: 0.01, color: "#dc2626", tip: "Magnitud aparente en la banda roja (~620 nm). Sensible a estrellas frías." },
      { name: "i", label: "i · IR cercano", unit: "mag", step: 0.01, color: "#ea580c", tip: "Magnitud aparente en la banda infrarrojo cercano (~750 nm). Atraviesa mejor el polvo interestelar." },
      { name: "z", label: "z · IR medio", unit: "mag", step: 0.01, color: "#991b1b", tip: "Magnitud aparente en la banda infrarrojo medio (~900 nm). Útil para objetos con redshift alto." },
    ],
  },
  {
    title: "Redshift",
    hint: "Corrimiento al rojo — la feature más predictiva del modelo (61.7% de importancia)",
    fields: [
      {
        name: "redshift",
        label: "z̃ · corrimiento al rojo",
        step: 0.001,
        color: "#FC3D21",
        tip: "Mide qué tan rápido se aleja un objeto por la expansión del universo. z=0 → objeto local (estrella). z entre 0.05 y 0.5 → galaxia típica. z > 1 → quásar muy distante.",
      },
    ],
  },
];

interface PredictionFormProps {
  values: PredictRequest;
  ranges: FeatureRanges;
  onChange: (name: FeatureName, value: number) => void;
  onSubmit: () => void;
  onReset?: () => void;
  isLoading: boolean;
}

function isInvalid(v: number, r: { min: number; max: number }) {
  return !Number.isFinite(v) || v < r.min || v > r.max;
}

export function PredictionForm({
  values,
  ranges,
  onChange,
  onSubmit,
  onReset,
  isLoading,
}: PredictionFormProps) {
  const invalidCount = useMemo(
    () => GROUPS.flatMap((g) => g.fields).filter((f) => isInvalid(values[f.name], ranges[f.name])).length,
    [values, ranges],
  );
  const valid = invalidCount === 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !isLoading) onSubmit();
      }}
      className="space-y-0 card divide-y divide-gray-200"
    >
      {GROUPS.map((group) => (
        <section key={group.title} className="p-5">
          <header className="mb-4">
            <h3 className="section-h2">{group.title}</h3>
            <p className="section-sub">{group.hint}</p>
          </header>
          <div className="space-y-3.5">
            {group.fields.map((f) => (
              <SliderField
                key={f.name}
                field={f}
                value={values[f.name]}
                range={ranges[f.name]}
                onChange={(val) => onChange(f.name, val)}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 bg-gray-50">
        <div className="flex items-center gap-2 text-[12px]">
          <span
            aria-hidden
            className={
              "inline-block w-1.5 h-1.5 rounded-full " +
              (valid ? "bg-success" : "bg-warning")
            }
          />
          <span className="text-gray-700">
            {valid
              ? "8 / 8 valores válidos · listo para clasificar"
              : `${8 - invalidCount} / 8 válidos · ${invalidCount} fuera de rango`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onReset && (
            <button type="button" onClick={onReset} disabled={isLoading} className="btn-ghost">
              Limpiar
            </button>
          )}
          <button type="submit" disabled={!valid || isLoading} className="btn-primary">
            {isLoading ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-white/70 animate-pulse" />
                Clasificando
              </>
            ) : (
              "Clasificar objeto"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

function SliderField({
  field,
  value,
  range,
  onChange,
}: {
  field: FieldDef;
  value: number;
  range: { min: number; max: number };
  onChange: (v: number) => void;
}) {
  const has = Number.isFinite(value);
  const bad = isInvalid(value, range);
  const span = range.max - range.min || 1;
  const clamped = has ? Math.max(range.min, Math.min(range.max, value)) : range.min;
  const pct = ((clamped - range.min) / span) * 100;
  const track = bad ? "#dc2626" : field.color;

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span className="flex items-center gap-1.5 text-[12.5px] text-gray-800 font-medium">
          <span
            aria-hidden
            className="inline-block w-2 h-2 rounded-full shrink-0"
            style={{ background: field.color }}
          />
          {field.label}
          <HelpHint content={field.tip} side="top" />
        </span>
        <div className="relative shrink-0">
          <input
            type="number"
            step="any"
            value={has ? value : ""}
            onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
            className={"input-num w-28 pr-8 text-right " + (bad ? "input-error" : "")}
            aria-invalid={bad}
            aria-label={field.label}
          />
          {field.unit && (
            <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center font-mono text-[10px] text-gray-400">
              {field.unit}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={field.step}
          value={clamped}
          onChange={(e) => onChange(Number(e.target.value))}
          className="slider-range flex-1"
          style={
            {
              "--track": track,
              "--pct": `${pct}%`,
            } as React.CSSProperties
          }
          aria-label={`${field.label} (deslizador)`}
        />
        <span className="font-mono text-[10px] text-gray-400 tabular-nums w-[92px] text-right shrink-0">
          [{range.min.toFixed(2)}, {range.max.toFixed(2)}]
        </span>
      </div>
    </div>
  );
}
