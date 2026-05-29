"use client";

import type { PredictRequest } from "@/lib/types";

interface InputPreviewProps {
  values: PredictRequest;
}

export function InputPreview({ values }: InputPreviewProps) {
  const W = 280;
  const H = 120;
  const a = Number.isFinite(values.alpha) ? values.alpha : 180;
  const d = Number.isFinite(values.delta) ? values.delta : 0;
  const x = (a / 360) * W;
  const y = H - ((d + 90) / 180) * H;

  const z = values.redshift;
  let hint: { label: string; color: string; reason: string } | null = null;
  if (Number.isFinite(z)) {
    if (z < 0.01) hint = { label: "estrella", color: "#D97706", reason: "z bajo → objeto local" };
    else if (z > 1.0) hint = { label: "quásar", color: "#7B2D8E", reason: "z alto → muy distante" };
    else hint = { label: "galaxia", color: "#0B3D91", reason: "z intermedio → galaxia típica" };
  }

  return (
    <div className="card p-4 space-y-5">
      <div className="flex items-baseline justify-between">
        <span className="label-uppercase">Vista previa de tus datos</span>
        <span className="font-mono text-[10px] text-gray-400">en vivo</span>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[11px] font-medium text-gray-700">Posición en el cielo</span>
          <span className="font-mono text-[10px] text-gray-400">J2000</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block rounded-md">
          <defs>
            <linearGradient id="skybg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0B3D91" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#fafafa" stopOpacity="1" />
            </linearGradient>
          </defs>
          <rect x={0} y={0} width={W} height={H} fill="url(#skybg)" stroke="#e5e5e5" strokeWidth="0.5" />
          <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="#a3a3a3" strokeWidth={0.5} strokeDasharray="2 3" />
          {Array.from({ length: 24 }).map((_, i) => {
            const sx = (i * 137.5) % W;
            const sy = (i * 71.3 + 17) % H;
            const r = 0.4 + (i % 4) * 0.15;
            return <circle key={i} cx={sx} cy={sy} r={r} fill="#525252" opacity={0.35 + (i % 3) * 0.15} />;
          })}
          {Number.isFinite(values.alpha) && Number.isFinite(values.delta) && (
            <g transform={`translate(${x} ${y})`}>
              <circle r={11} fill="none" stroke="#FC3D21" strokeWidth={0.7} opacity={0.5} />
              <circle r={6} fill="none" stroke="#FC3D21" strokeWidth={1.5} />
              <circle r={2} fill="#FC3D21" />
            </g>
          )}
          <text x={5} y={H - 5} fill="#737373" fontSize="8" fontFamily="monospace">α 0°</text>
          <text x={W - 30} y={H - 5} fill="#737373" fontSize="8" fontFamily="monospace">α 360°</text>
        </svg>
        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-700 font-mono tabular-nums">
          <span>α {Number.isFinite(values.alpha) ? values.alpha.toFixed(2) : "—"}°</span>
          <span>δ {Number.isFinite(values.delta) ? values.delta.toFixed(2) : "—"}°</span>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-medium text-gray-700 mb-2">Perfil fotométrico</div>
        <PhotoBars values={values} />
      </div>

      <div>
        <div className="text-[11px] font-medium text-gray-700 mb-2">Redshift</div>
        <RedshiftGauge z={values.redshift} hint={hint} />
      </div>

      {hint && (
        <div
          className="rounded-md px-3 py-2 text-[12px] border"
          style={{ background: `${hint.color}10`, borderColor: `${hint.color}40` }}
        >
          <span className="text-gray-700">Heurística por redshift: </span>
          <span className="font-semibold" style={{ color: hint.color }}>
            {hint.label}
          </span>
          <span className="text-gray-500"> · {hint.reason}</span>
        </div>
      )}
    </div>
  );
}

function PhotoBars({ values }: { values: PredictRequest }) {
  const bands: { k: keyof Pick<PredictRequest, "u" | "g" | "r" | "i" | "z">; color: string }[] = [
    { k: "u", color: "#7B2D8E" },
    { k: "g", color: "#16a34a" },
    { k: "r", color: "#dc2626" },
    { k: "i", color: "#ea580c" },
    { k: "z", color: "#991b1b" },
  ];
  const LO = 10, HI = 32;
  return (
    <div className="bg-gray-50 rounded-md border border-gray-200 p-3">
      <div className="flex items-end gap-2 h-20">
        {bands.map((b) => {
          const v = values[b.k];
          const has = Number.isFinite(v);
          const t = has ? Math.max(0, Math.min(1, 1 - (v - LO) / (HI - LO))) : 0;
          return (
            <div key={b.k} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex-1 w-full flex items-end">
                <div
                  className="w-full rounded-t-sm transition-all duration-300"
                  style={{
                    height: `${has ? Math.max(8, t * 100) : 0}%`,
                    background: has ? b.color : "transparent",
                  }}
                />
              </div>
              <span className="font-mono text-[10px] text-gray-700 font-semibold">{b.k}</span>
              <span className="font-mono text-[9px] text-gray-500 tabular-nums">
                {has ? v.toFixed(1) : "—"}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-gray-500 leading-snug">
        Barra alta = objeto brillante en esa banda (menor magnitud).
      </p>
    </div>
  );
}

function RedshiftGauge({
  z,
  hint,
}: {
  z: number;
  hint: { label: string; color: string; reason: string } | null;
}) {
  const LO = -0.01, HI = 7.01;
  const has = Number.isFinite(z);
  const t = has ? Math.max(0, Math.min(1, (z - LO) / (HI - LO))) : 0;
  return (
    <div>
      <div className="relative h-3 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
          style={{
            width: `${t * 100}%`,
            background: hint ? hint.color : "#a3a3a3",
          }}
        />
        {/* Bandas indicativas */}
        <div className="absolute inset-y-0 left-[0.13%] w-px bg-gray-300" />
        <div className="absolute inset-y-0 left-[14.4%] w-px bg-gray-300" />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-gray-500">
        <span>0 · local</span>
        <span>1 · galaxia</span>
        <span>7 · quásar</span>
      </div>
      <div className="mt-2 font-mono text-[11px] text-gray-900 tabular-nums">
        z̃ = {has ? z.toFixed(4) : "—"}
      </div>
    </div>
  );
}
