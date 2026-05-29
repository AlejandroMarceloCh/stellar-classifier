"""
Test suite riguroso para 02_preprocessing.ipynb.

Verifica:
- Estructura del notebook
- Artefactos generados (parquets, scaler.pkl, encoder.pkl, train_ranges.json)
- Sanity de los datasets (shapes, dtypes, sin nulls, ranges)
- Sanity del scaler (mean ≈ 0, std ≈ 1 en train)
- NO data leakage (test no fue usado para fit)
- Stratify funcionó (proporciones preservadas)
- preprocessing_summary.json es válido y consistente
- Reproducibilidad (re-ejecutar da los mismos resultados)
"""

import hashlib
import json
import subprocess
import sys
from pathlib import Path

import joblib
import nbformat
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
NB = ROOT / "notebooks" / "02_preprocessing.ipynb"
SUMMARY = ROOT / "docs" / "preprocessing_summary.json"
MODELS_DIR = ROOT / "backend" / "models"
DATA_DIR = ROOT / "backend" / "data"

FEATURE_COLS = ["alpha", "delta", "u", "g", "r", "i", "z", "redshift"]
EXPECTED_CLASSES = {"GALAXY", "STAR", "QSO"}
EXPECTED_ENCODING = {"GALAXY": 0, "STAR": 1, "QSO": 2}

results = []


def check(name, cond, detail=""):
    results.append(("PASS" if cond else "FAIL", name, detail))
    return cond


# =====================================================================
# TEST 1 — Estructura del notebook
# =====================================================================
print("=" * 70)
print("TEST 1 — Estructura del notebook")
print("=" * 70)

nb = nbformat.read(NB, as_version=4)
check("Notebook v4.5+", nb.nbformat >= 4)

code_cells = [c for c in nb.cells if c.cell_type == "code"]
md_cells = [c for c in nb.cells if c.cell_type == "markdown"]
check(">=8 celdas de código", len(code_cells) >= 8, f"actual: {len(code_cells)}")
check(">=8 celdas markdown", len(md_cells) >= 8, f"actual: {len(md_cells)}")

unexecuted = [i for i, c in enumerate(code_cells) if c.execution_count is None]
check("Todas las celdas de código ejecutadas", len(unexecuted) == 0,
      f"sin ejecutar: {unexecuted}")

cells_with_errors = []
for i, c in enumerate(code_cells):
    for output in c.get("outputs", []):
        if output.get("output_type") == "error":
            cells_with_errors.append((i, output.get("ename"), output.get("evalue")))
check("Ninguna celda con error", len(cells_with_errors) == 0,
      f"errores: {cells_with_errors}")

try:
    nbformat.validate(nb)
    check("nbformat.validate() pasa", True)
except Exception as e:
    check("nbformat.validate() pasa", False, str(e))


# =====================================================================
# TEST 2 — Artefactos serializados existen
# =====================================================================
print("\n" + "=" * 70)
print("TEST 2 — Artefactos serializados existen y tienen tamaño razonable")
print("=" * 70)

expected_artifacts = {
    MODELS_DIR / "scaler.pkl": (0.5, 50),
    MODELS_DIR / "label_encoder.pkl": (0.05, 10),
    MODELS_DIR / "train_ranges.json": (0.2, 5),
    DATA_DIR / "X_train_scaled.parquet": (1000, 10_000),
    DATA_DIR / "X_test_scaled.parquet": (250, 3_000),
    DATA_DIR / "X_train_raw.parquet": (1000, 10_000),
    DATA_DIR / "X_test_raw.parquet": (250, 3_000),
    DATA_DIR / "y_train.parquet": (100, 1_000),
    DATA_DIR / "y_test.parquet": (50, 500),
}

for path, (min_kb, max_kb) in expected_artifacts.items():
    exists = path.exists()
    check(f"Existe: {path.name}", exists)
    if exists:
        size_kb = path.stat().st_size / 1024
        check(
            f"Tamaño razonable: {path.name} ({size_kb:.1f}KB en [{min_kb},{max_kb}])",
            min_kb <= size_kb <= max_kb,
            f"actual: {size_kb:.1f}KB",
        )


# =====================================================================
# TEST 3 — Cargar y validar los parquets
# =====================================================================
print("\n" + "=" * 70)
print("TEST 3 — Cargar y validar datasets serializados")
print("=" * 70)

X_train = pd.read_parquet(DATA_DIR / "X_train_raw.parquet")
X_test = pd.read_parquet(DATA_DIR / "X_test_raw.parquet")
X_train_scaled = pd.read_parquet(DATA_DIR / "X_train_scaled.parquet")
X_test_scaled = pd.read_parquet(DATA_DIR / "X_test_scaled.parquet")
y_train = pd.read_parquet(DATA_DIR / "y_train.parquet")["target"]
y_test = pd.read_parquet(DATA_DIR / "y_test.parquet")["target"]

# Shapes coherentes
check("X_train.shape == X_train_scaled.shape", X_train.shape == X_train_scaled.shape)
check("X_test.shape == X_test_scaled.shape", X_test.shape == X_test_scaled.shape)
check("len(X_train) == len(y_train)", len(X_train) == len(y_train))
check("len(X_test) == len(y_test)", len(X_test) == len(y_test))

# Total = 99,999 (post drop del centinela)
total = len(X_train) + len(X_test)
check("Train + Test == 99,999 (post drop centinela)",
      total == 99_999, f"actual: {total}")

# Split 80/20
train_pct = len(X_train) / total
check("Train ratio ~80%", abs(train_pct - 0.80) < 0.01,
      f"actual: {train_pct*100:.2f}%")

# Columnas correctas
check("X_train tiene exactamente FEATURE_COLS",
      list(X_train.columns) == FEATURE_COLS)
check("X_train_scaled tiene exactamente FEATURE_COLS",
      list(X_train_scaled.columns) == FEATURE_COLS)

# Sin nulls
check("X_train sin nulls", X_train.isnull().sum().sum() == 0)
check("X_test sin nulls", X_test.isnull().sum().sum() == 0)
check("y_train sin nulls", y_train.isnull().sum() == 0)

# Targets en {0, 1, 2}
check("y_train solo tiene clases {0,1,2}",
      set(y_train.unique()) == {0, 1, 2})
check("y_test solo tiene clases {0,1,2}",
      set(y_test.unique()) == {0, 1, 2})

# Sin -9999 en X_train (drop funcionó)
contains_sentinel = ((X_train == -9999).any(axis=1)).any()
check("X_train sin centinelas -9999", not contains_sentinel)


# =====================================================================
# TEST 4 — Validar el scaler (mean ≈ 0, std ≈ 1, sin leakage)
# =====================================================================
print("\n" + "=" * 70)
print("TEST 4 — Sanity del StandardScaler")
print("=" * 70)

scaler = joblib.load(MODELS_DIR / "scaler.pkl")
check("Scaler es StandardScaler", isinstance(scaler, StandardScaler))

# El scaler tiene mean_ y scale_ con 8 elementos
check("scaler.mean_ tiene 8 elementos", len(scaler.mean_) == 8)
check("scaler.scale_ tiene 8 elementos", len(scaler.scale_) == 8)

# Verificar que el scaler ESTÁ ajustado SOLO con train (no test):
#   recalculando: scaler.mean_ debe == X_train.mean()
mean_train_real = X_train.mean().values
mean_diff = np.abs(scaler.mean_ - mean_train_real).max()
check("scaler.mean_ == X_train.mean()", mean_diff < 1e-6,
      f"max delta: {mean_diff}")

# Si fuera con el dataset completo (X_train + X_test) sería diferente:
X_all = pd.concat([X_train, X_test])
mean_all = X_all.mean().values
mean_diff_all = np.abs(scaler.mean_ - mean_all).max()
check("scaler.mean_ != X_all.mean() (sin leakage)", mean_diff_all > 1e-6,
      f"delta: {mean_diff_all}")

# Validar que X_train_scaled tiene mean ≈ 0
train_scaled_mean = X_train_scaled.mean().abs().max()
check("X_train_scaled mean ≈ 0", train_scaled_mean < 1e-10,
      f"max |mean|: {train_scaled_mean}")

# Validar que X_train_scaled tiene std ≈ 1 (ddof difference ~1/sqrt(N) tolerated)
train_scaled_std_min = X_train_scaled.std().min()
train_scaled_std_max = X_train_scaled.std().max()
check("X_train_scaled std ≈ 1 (todas las features)",
      0.99 < train_scaled_std_min and train_scaled_std_max < 1.01,
      f"min: {train_scaled_std_min}, max: {train_scaled_std_max}")

# X_test_scaled tiene mean cercano pero NO exacto (eso es señal de NO leakage)
test_scaled_mean = X_test_scaled.mean().abs().max()
check("X_test_scaled mean cercano a 0 pero NO igual",
      0 < test_scaled_mean < 0.5,
      f"max |mean|: {test_scaled_mean}")

# Re-aplicar el scaler manualmente y verificar que coincide
X_train_scaled_manual = scaler.transform(X_train)
diff = np.abs(X_train_scaled.values - X_train_scaled_manual).max()
check("scaler.transform(X_train) == X_train_scaled.parquet",
      diff < 1e-10, f"max delta: {diff}")


# =====================================================================
# TEST 5 — Stratify funcionó (proporciones preservadas)
# =====================================================================
print("\n" + "=" * 70)
print("TEST 5 — Stratify preservó las proporciones de clase")
print("=" * 70)

train_prop = y_train.value_counts(normalize=True).sort_index()
test_prop = y_test.value_counts(normalize=True).sort_index()

max_delta = (train_prop - test_prop).abs().max()
check("Max delta train vs test < 0.005", max_delta < 0.005,
      f"actual: {max_delta:.6f}")

# Las proporciones deben matchear el dataset completo (post-drop centinela)
df_full = pd.read_csv(ROOT / "backend" / "data" / "star_classification.csv")
df_full = df_full[~(df_full[["u", "g", "r", "i", "z"]] == -9999).any(axis=1)]
df_full["target"] = df_full["class"].map(EXPECTED_ENCODING)
full_prop = df_full["target"].value_counts(normalize=True).sort_index()

train_vs_full = (train_prop - full_prop).abs().max()
check("Train proportion ≈ full dataset", train_vs_full < 0.005,
      f"max delta: {train_vs_full:.6f}")


# =====================================================================
# TEST 6 — Encoder válido
# =====================================================================
print("\n" + "=" * 70)
print("TEST 6 — Label encoder válido y consistente")
print("=" * 70)

encoder = joblib.load(MODELS_DIR / "label_encoder.pkl")
check("Encoder es dict", isinstance(encoder, dict))
check("Encoder tiene class_to_int", "class_to_int" in encoder)
check("Encoder tiene int_to_class", "int_to_class" in encoder)
check("class_to_int == {GALAXY:0, STAR:1, QSO:2}",
      encoder["class_to_int"] == EXPECTED_ENCODING)
check("int_to_class es inverso de class_to_int",
      {v: k for k, v in encoder["class_to_int"].items()} == encoder["int_to_class"])


# =====================================================================
# TEST 7 — train_ranges.json
# =====================================================================
print("\n" + "=" * 70)
print("TEST 7 — train_ranges.json válido")
print("=" * 70)

ranges = json.loads((MODELS_DIR / "train_ranges.json").read_text())
check("train_ranges tiene 8 features", len(ranges) == 8)
check("train_ranges tiene exactamente FEATURE_COLS",
      set(ranges.keys()) == set(FEATURE_COLS))

# Cada feature tiene min, max, mean, std
for col, r in ranges.items():
    check(f"{col}: tiene min/max/mean/std",
          all(k in r for k in ["min", "max", "mean", "std"]))
    # Verificar que min < max
    check(f"{col}: min < max", r["min"] < r["max"])

# Verificar contra X_train real
for col in FEATURE_COLS:
    real_min = float(X_train[col].min())
    saved_min = ranges[col]["min"]
    check(f"{col}: min ranges coincide con X_train",
          abs(saved_min - real_min) < 1e-6,
          f"saved: {saved_min}, real: {real_min}")

# u/g/z deben tener min > 0 (centinelas fueron eliminados)
for col in ["u", "g", "z"]:
    check(f"{col}: min > 0 (no hay centinelas)",
          ranges[col]["min"] > 0,
          f"min: {ranges[col]['min']}")


# =====================================================================
# TEST 8 — preprocessing_summary.json
# =====================================================================
print("\n" + "=" * 70)
print("TEST 8 — preprocessing_summary.json")
print("=" * 70)

check("preprocessing_summary.json existe", SUMMARY.exists())
summary = json.loads(SUMMARY.read_text())

required_top_keys = {"timestamp", "dataset_input", "cleaning", "encoding",
                     "split", "scaling", "artifacts", "decisions"}
check("Todos los campos top-level presentes",
      required_top_keys.issubset(set(summary.keys())),
      f"faltan: {required_top_keys - set(summary.keys())}")

check("cleaning.sentinel_rows_dropped == 1",
      summary["cleaning"]["sentinel_rows_dropped"] == 1)
check("cleaning.rows_after_cleaning == 99,999",
      summary["cleaning"]["rows_after_cleaning"] == 99_999)
check("encoding.class_to_int correcto",
      summary["encoding"]["class_to_int"] == EXPECTED_ENCODING)
check("split.stratify == True",
      summary["split"]["stratify"] is True)
check("split.random_state == 42",
      summary["split"]["random_state"] == 42)
check("split.train_rows + test_rows == 99,999",
      summary["split"]["train_rows"] + summary["split"]["test_rows"] == 99_999)
check("scaling.scaler == StandardScaler",
      summary["scaling"]["scaler"] == "StandardScaler")
check(">=5 decisiones documentadas",
      len(summary["decisions"]) >= 5)

# Verificar SHA256 del CSV
csv_path = ROOT / summary["dataset_input"]["path"]
real_hash = hashlib.sha256(csv_path.read_bytes()).hexdigest()
check("SHA256 del CSV coincide con el real",
      summary["dataset_input"]["sha256"] == real_hash)


# =====================================================================
# TEST 9 — Reproducibilidad
# =====================================================================
print("\n" + "=" * 70)
print("TEST 9 — Reproducibilidad (re-ejecutar el notebook)")
print("=" * 70)

# Snapshot del summary
summary_before = json.loads(SUMMARY.read_text())

result = subprocess.run(
    [
        str(ROOT / "backend" / "venv" / "bin" / "jupyter"),
        "nbconvert", "--to", "notebook", "--execute", str(NB),
        "--output", "02_preprocessing.ipynb",
        "--ExecutePreprocessor.timeout=180",
        "--ExecutePreprocessor.kernel_name=stellar-classifier",
    ],
    capture_output=True, text=True, cwd=str(ROOT / "notebooks"),
)
check("Re-ejecución sin errores", result.returncode == 0,
      f"stderr: {result.stderr[:300]}" if result.returncode != 0 else "")

summary_after = json.loads(SUMMARY.read_text())

# Comparar campos importantes (excluyendo timestamp)
fields = ["dataset_input", "cleaning", "encoding", "split", "scaling",
          "artifacts", "decisions"]
for f in fields:
    check(f"Reproducible: '{f}'",
          summary_before[f] == summary_after[f])


# =====================================================================
# RESUMEN
# =====================================================================
print("\n" + "=" * 70)
print("RESUMEN")
print("=" * 70)
passed = sum(1 for s, _, _ in results if s == "PASS")
failed = len(results) - passed

for status, name, detail in results:
    icon = "✓" if status == "PASS" else "✗"
    line = f"  {icon} {name}"
    if detail and status == "FAIL":
        line += f"\n     └─ {detail}"
    print(line)

print(f"\n{passed}/{len(results)} tests pasan")
if failed > 0:
    print(f"❌ {failed} FALLAN")
    sys.exit(1)
print("✅ TODO LIMPIO")
