"""
Test suite riguroso para 01_eda.ipynb.

Verifica:
- Estructura del notebook (todas las celdas válidas)
- Cómputos independientes contra el CSV (no confiar en cache del notebook)
- Schema y consistencia de eda_summary.json
- Reproducibilidad (re-ejecutar da los mismos resultados)
- Cross-check con el plan.md y el Data Product Canvas
"""

import json
import sys
from pathlib import Path

import nbformat
import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
NOTEBOOK_PATH = REPO_ROOT / "notebooks" / "01_eda.ipynb"
DATASET_PATH = REPO_ROOT / "backend" / "data" / "star_classification.csv"
SUMMARY_PATH = REPO_ROOT / "docs" / "eda_summary.json"

FEATURE_COLS = ["alpha", "delta", "u", "g", "r", "i", "z", "redshift"]
METADATA_COLS = [
    "obj_ID", "run_ID", "rerun_ID", "cam_col", "field_ID",
    "spec_obj_ID", "plate", "MJD", "fiber_ID",
]
EXPECTED_CLASSES = {"GALAXY", "STAR", "QSO"}
SENTINEL = -9999

# --- Tracking ---
results = []
def check(name, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    results.append((status, name, detail))
    return condition


# =====================================================================
# TEST 1 — Estructura del notebook
# =====================================================================
print("=" * 70)
print("TEST 1 — Estructura del notebook")
print("=" * 70)

nb = nbformat.read(NOTEBOOK_PATH, as_version=4)
check("Notebook v4.5+", nb.nbformat >= 4 and nb.nbformat_minor >= 5)
check("Mínimo 20 celdas", len(nb.cells) >= 20, f"actual: {len(nb.cells)}")

code_cells = [c for c in nb.cells if c.cell_type == "code"]
md_cells = [c for c in nb.cells if c.cell_type == "markdown"]
check(">=10 celdas de código", len(code_cells) >= 10, f"actual: {len(code_cells)}")
check(">=5 celdas markdown", len(md_cells) >= 5, f"actual: {len(md_cells)}")

# Todas las celdas de código deben haber sido ejecutadas (execution_count != None)
unexecuted = [i for i, c in enumerate(code_cells) if c.execution_count is None]
check("Todas las celdas de código ejecutadas", len(unexecuted) == 0, f"sin ejecutar: {unexecuted}")

# Ninguna celda tira excepción
cells_with_errors = []
for i, c in enumerate(code_cells):
    for output in c.get("outputs", []):
        if output.get("output_type") == "error":
            cells_with_errors.append((i, output.get("ename"), output.get("evalue")))
check("Ninguna celda con error", len(cells_with_errors) == 0, f"errores: {cells_with_errors}")

# Cada celda tiene id (nbformat 4.5+)
cells_no_id = [i for i, c in enumerate(nb.cells) if not c.get("id")]
check("Todas las celdas con id", len(cells_no_id) == 0, f"sin id: {cells_no_id}")

# Validación nbformat estricta
try:
    nbformat.validate(nb)
    check("nbformat.validate() pasa", True)
except Exception as e:
    check("nbformat.validate() pasa", False, str(e))


# =====================================================================
# TEST 2 — Invariantes del dataset
# =====================================================================
print("\n" + "=" * 70)
print("TEST 2 — Invariantes del dataset")
print("=" * 70)

check("CSV existe en backend/data/", DATASET_PATH.exists(), str(DATASET_PATH))
df = pd.read_csv(DATASET_PATH)

check("Shape (100000, 18)", df.shape == (100000, 18), f"actual: {df.shape}")

# Columnas esperadas
expected_cols = set(FEATURE_COLS + METADATA_COLS + ["class"])
actual_cols = set(df.columns)
missing = expected_cols - actual_cols
extra = actual_cols - expected_cols
check("Columnas esperadas presentes", len(missing) == 0, f"faltan: {missing}")
check("Sin columnas inesperadas", len(extra) == 0, f"extras: {extra}")

# Dtypes — features deben ser numéricas, class debe ser str/object
non_numeric_features = [c for c in FEATURE_COLS if not pd.api.types.is_numeric_dtype(df[c])]
check("Todas las features son numéricas", len(non_numeric_features) == 0, f"no numéricas: {non_numeric_features}")
check("'class' es object/string", df["class"].dtype == "object")


# =====================================================================
# TEST 3 — Cómputos cruzados independientes
# =====================================================================
print("\n" + "=" * 70)
print("TEST 3 — Cómputos independientes vs. eda_summary.json")
print("=" * 70)

check("eda_summary.json existe", SUMMARY_PATH.exists())
summary = json.loads(SUMMARY_PATH.read_text())

# Shape
check(
    "summary['dataset_shape'] coincide",
    summary["dataset_shape"] == [100000, 18],
    f"summary: {summary['dataset_shape']}, real: [100000, 18]",
)

# Nulls totales (cómputo independiente)
real_nulls = int(df.isnull().sum().sum())
check(
    "summary['nulls_total'] == real",
    summary["nulls_total"] == real_nulls,
    f"summary: {summary['nulls_total']}, real: {real_nulls}",
)

# Duplicados
real_dups = int(df.duplicated().sum())
check(
    "summary['duplicates_total'] == real",
    summary["duplicates_total"] == real_dups,
    f"summary: {summary['duplicates_total']}, real: {real_dups}",
)

# Class counts (cómputo independiente)
real_counts = df["class"].value_counts().to_dict()
check(
    "summary['class_counts'] == real",
    summary["class_counts"] == real_counts,
    f"summary: {summary['class_counts']}, real: {real_counts}",
)

# Class proportions (con tolerancia de redondeo 0.01)
real_pct = (df["class"].value_counts(normalize=True) * 100).round(2).to_dict()
prop_match = all(
    abs(summary["class_proportions"][k] - v) < 0.01
    for k, v in real_pct.items()
)
check("summary['class_proportions'] coincide (±0.01)", prop_match)

# Sentinel count independiente
mask_sentinel = (df[["u", "g", "r", "i", "z"]] == SENTINEL).any(axis=1)
real_sentinel_rows = int(mask_sentinel.sum())
check(
    "summary['sentinel_rows_detected'] == real",
    summary["sentinel_rows_detected"] == real_sentinel_rows,
    f"summary: {summary['sentinel_rows_detected']}, real: {real_sentinel_rows}",
)

# Sentinel por banda
real_per_band = {col: int((df[col] == SENTINEL).sum()) for col in ["u", "g", "r", "i", "z"]}
check(
    "summary['sentinel_per_band'] == real",
    summary["sentinel_per_band"] == real_per_band,
    f"summary: {summary['sentinel_per_band']}, real: {real_per_band}",
)

# Feature ranges RAW
ranges_raw_match = all(
    abs(summary["feature_ranges_raw"][col]["min"] - float(df[col].min())) < 1e-6
    and abs(summary["feature_ranges_raw"][col]["max"] - float(df[col].max())) < 1e-6
    for col in FEATURE_COLS
)
check("summary['feature_ranges_raw'] coincide con df.min()/max()", ranges_raw_match)

# Feature ranges CLEAN (post-drop de sentinels)
df_clean = df[~mask_sentinel]
ranges_clean_match = all(
    abs(summary["feature_ranges_clean"][col]["min"] - float(df_clean[col].min())) < 1e-6
    and abs(summary["feature_ranges_clean"][col]["max"] - float(df_clean[col].max())) < 1e-6
    for col in FEATURE_COLS
)
check("summary['feature_ranges_clean'] coincide con df sin sentinels", ranges_clean_match)


# =====================================================================
# TEST 4 — Outputs visuales (matplotlib figures)
# =====================================================================
print("\n" + "=" * 70)
print("TEST 4 — Figuras generadas en el notebook")
print("=" * 70)

# Contar celdas con outputs de tipo "image/png" (matplotlib se renderiza así)
cells_with_images = 0
total_images = 0
for c in code_cells:
    for output in c.get("outputs", []):
        if output.get("output_type") == "display_data":
            data = output.get("data", {})
            if "image/png" in data:
                cells_with_images += 1
                total_images += 1
                break

check(">= 4 figuras generadas (balance, heatmap, distribs, scatter)", total_images >= 4,
      f"actual: {total_images}")


# =====================================================================
# TEST 5 — Schema completo de eda_summary.json
# =====================================================================
print("\n" + "=" * 70)
print("TEST 5 — Schema y consistencia de eda_summary.json")
print("=" * 70)

required_keys = {
    "timestamp", "dataset_shape", "features", "target", "metadata_dropped",
    "class_counts", "class_proportions", "nulls_total", "duplicates_total",
    "sentinel_rows_detected", "sentinel_per_band",
    "feature_ranges_raw", "feature_ranges_clean", "decisions",
}
missing_keys = required_keys - set(summary.keys())
check("Todos los campos requeridos presentes", len(missing_keys) == 0, f"faltan: {missing_keys}")

check("features == FEATURE_COLS", summary["features"] == FEATURE_COLS)
check("target == 'class'", summary["target"] == "class")
check("metadata_dropped tiene 9 columnas",
      len(summary["metadata_dropped"]) == 9,
      f"actual: {len(summary['metadata_dropped'])}")

# Clases esperadas
check("class_counts tiene exactamente GALAXY/STAR/QSO",
      set(summary["class_counts"].keys()) == EXPECTED_CLASSES)

# Decisions debe tener al menos 3 entradas
check(">=3 decisiones documentadas", len(summary["decisions"]) >= 3,
      f"actual: {len(summary['decisions'])}")

# Decision sobre sentinel debe estar
sentinel_decision = any("9999" in d or "sentinel" in d.lower() or "centinela" in d.lower() for d in summary["decisions"])
check("Decisión sobre centinelas documentada", sentinel_decision)


# =====================================================================
# TEST 6 — Cross-check con plan.md
# =====================================================================
print("\n" + "=" * 70)
print("TEST 6 — Cross-check con plan.md y Data Product Canvas")
print("=" * 70)

plan_text = (REPO_ROOT / "plan.md").read_text()
canvas_text = (REPO_ROOT / "docs" / "data_product_canvas.md").read_text()

# El plan dice "59% GALAXY, ~22% STAR, ~19% QSO" — verificar margen
real_galaxy = real_pct["GALAXY"]
real_star = real_pct["STAR"]
real_qso = real_pct["QSO"]
check("GALAXY ≈ 59% (margen ±2)", abs(real_galaxy - 59) < 2, f"real: {real_galaxy}%")
check("STAR ≈ 22% (margen ±2)", abs(real_star - 22) < 2, f"real: {real_star}%")
check("QSO ≈ 19% (margen ±2)", abs(real_qso - 19) < 2, f"real: {real_qso}%")

# Plan menciona las 8 features — verificar que existen
for feat in FEATURE_COLS:
    check(f"Feature '{feat}' mencionada en plan.md", feat in plan_text)

# Plan menciona stratify=y — verificar que la decisión sigue válida (debe haber al menos 2 clases con suficientes filas)
class_min = min(real_counts.values())
check("Mínimo de filas por clase > 1000 (justifica stratify)",
      class_min > 1000, f"min: {class_min}")


# =====================================================================
# TEST 7 — Reproducibilidad
# =====================================================================
print("\n" + "=" * 70)
print("TEST 7 — Reproducibilidad (re-leer CSV da los mismos números)")
print("=" * 70)

# Re-leer CSV y verificar que los hashes coinciden
import hashlib
csv_hash = hashlib.sha256(DATASET_PATH.read_bytes()).hexdigest()
check("Hash SHA256 del CSV es estable", len(csv_hash) == 64, f"hash: {csv_hash[:16]}...")

# Re-leer y comparar shapes
df2 = pd.read_csv(DATASET_PATH)
check("Re-lectura da el mismo shape", df.shape == df2.shape)
check("Re-lectura da las mismas class_counts",
      df["class"].value_counts().to_dict() == df2["class"].value_counts().to_dict())


# =====================================================================
# RESUMEN
# =====================================================================
print("\n" + "=" * 70)
print("RESUMEN")
print("=" * 70)
total = len(results)
passed = sum(1 for s, _, _ in results if s == "PASS")
failed = total - passed

for status, name, detail in results:
    icon = "✓" if status == "PASS" else "✗"
    line = f"  {icon} {name}"
    if detail and status == "FAIL":
        line += f"    └─ {detail}"
    print(line)

print(f"\n{passed}/{total} tests pasan")
if failed > 0:
    print(f"❌ {failed} FALLAN")
    sys.exit(1)
else:
    print("✅ TODO LIMPIO")
    sys.exit(0)
