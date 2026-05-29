"use client";

import { useMemo } from "react";

const FEATURE_DESC: Record<string, string> = {
  alpha: "Ascensión recta",
  delta: "Declinación",
  u: "Banda ultravioleta",
  g: "Banda verde",
  r: "Banda roja",
  i: "Banda infrarrojo cercano",
  z: "Banda infrarrojo medio",
  redshift: "Corrimiento al rojo",
};

interface FeatureImportanceChartProps {
  importance: Record<string, number>;
  ablation?: {
    accuracy_redshift_only: number;
    accuracy_all_features: number;
    diff_pts: number;
  };
}

export function FeatureImportanceChart({ importance, ablation }: FeatureImportanceChartProps) {
  const data = useMemo(
    () =>
      Object.entries(importance)
        .map(([feature, importance]) => ({
          feature,
          importance,
          desc: FEATURE_DESC[feature] ?? feature,
        }))
        .sort((a, b) => b.importance - a.importance),
    [importance],
  );
  const max = data[0]?.importance ?? 1;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {data.map((d, i) => {
          const isTop = i === 0;
          return (
            <div
              key={d.feature}
              className="grid grid-cols-[18px_64px_1fr_60px] gap-3 items-center px-2 py-1.5 rounded-md transition-colors hover:bg-gray-50"
              title={d.desc}
            >
              <span className="font-mono text-[10px] text-gray-400 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={
                  "font-mono text-[12px] " +
                  (isTop ? "text-nasa-blue font-semibold" : "text-gray-700")
                }
              >
                {d.feature}
              </span>
              <div className="relative h-2">
                <div className="absolute inset-y-0 left-0 right-0 bg-gray-100 rounded-full" />
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{
                    width: `${(d.importance / max) * 100}%`,
                    background: isTop ? "#0B3D91" : "#a3a3a3",
                  }}
                />
              </div>
              <span
                className={
                  "font-mono text-[12px] text-right tabular-nums " +
                  (isTop ? "text-nasa-blue font-semibold" : "text-gray-600")
                }
              >
                {(d.importance * 100).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>

      {ablation && (
        <div className="px-2 pt-3 border-t border-gray-200 text-[11px] text-gray-500 leading-relaxed">
          <span className="text-gray-900 font-medium">redshift</span> sola{" "}
          <span className="font-mono text-gray-700 tabular-nums">
            {(ablation.accuracy_redshift_only * 100).toFixed(2)}%
          </span>{" "}
          · todas las features{" "}
          <span className="font-mono text-gray-700 tabular-nums">
            {(ablation.accuracy_all_features * 100).toFixed(2)}%
          </span>{" "}
          · ganancia{" "}
          <span className="font-mono text-success font-semibold tabular-nums">
            +{ablation.diff_pts.toFixed(2)} pts
          </span>{" "}
          al combinar
        </div>
      )}
    </div>
  );
}
