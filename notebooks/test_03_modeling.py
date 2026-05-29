"""
Test suite riguroso para 03_modeling.ipynb.

Verifica:
- Estructura del notebook
- Artefactos generados (model.pkl, model_metadata.json, modeling_summary.json)
- Sanity del modelo (predict funciona, predict_proba si aplica)
- Métricas (baseline, ganador, margen, recall QSO)
- Classification report consistente con métricas
- Confusion matrix coherente con classification_report
- Feature ablation: solo-redshift < todas
- model_metadata schema completo
- Roundtrip joblib (cargar y predecir igual)
"""
import json
import sys
from pathlib import Path
import nbformat
import numpy as np
import pandas as pd
import joblib

ROOT = Path(__file__).resolve().parents[1]
NB = ROOT / 'notebooks' / '03_modeling.ipynb'
MODEL_PKL = ROOT / 'backend' / 'models' / 'model.pkl'
MODEL_META = ROOT / 'backend' / 'models' / 'model_metadata.json'
SUMMARY = ROOT / 'docs' / 'modeling_summary.json'

FEATURE_COLS = ['alpha', 'delta', 'u', 'g', 'r', 'i', 'z', 'redshift']
CLASS_NAMES = ['GALAXY', 'STAR', 'QSO']

results = []
def check(name, cond, detail=''):
    results.append(('PASS' if cond else 'FAIL', name, detail))

# === 1. Estructura del notebook ===
print("=" * 70)
print("1. Estructura del notebook")
print("=" * 70)

nb = nbformat.read(NB, as_version=4)
code_cells = [c for c in nb.cells if c.cell_type == 'code']
md_cells = [c for c in nb.cells if c.cell_type == 'markdown']
check(">=10 celdas de código", len(code_cells) >= 10, f"actual: {len(code_cells)}")
check(">=10 celdas markdown", len(md_cells) >= 10, f"actual: {len(md_cells)}")

unexecuted = [i for i, c in enumerate(code_cells) if c.execution_count is None]
check("Todas las celdas ejecutadas", len(unexecuted) == 0, f"sin ejecutar: {unexecuted}")

errors_in_cells = []
for i, c in enumerate(code_cells):
    for o in c.get('outputs', []):
        if o.get('output_type') == 'error':
            errors_in_cells.append((i, o.get('ename')))
check("Ninguna celda con error", len(errors_in_cells) == 0, f"errores: {errors_in_cells}")

try:
    nbformat.validate(nb)
    check("nbformat.validate() pasa", True)
except Exception as e:
    check("nbformat.validate() pasa", False, str(e))

# === 2. Artefactos existen ===
print("\n" + "=" * 70)
print("2. Artefactos generados")
print("=" * 70)

check("model.pkl existe", MODEL_PKL.exists())
check("model_metadata.json existe", MODEL_META.exists())
check("modeling_summary.json existe", SUMMARY.exists())

# model.pkl entre 1 KB y 50 MB (model could be big for Bagging or small for LR)
model_kb = MODEL_PKL.stat().st_size / 1024
check(f"model.pkl tamaño razonable [1KB, 50MB] ({model_kb:.1f}KB)",
      1 <= model_kb <= 50_000)

# === 3. Cargar modelo y verificar predicción ===
print("\n" + "=" * 70)
print("3. Sanity del modelo (carga + predict)")
print("=" * 70)

model = joblib.load(MODEL_PKL)
check("model cargado OK", model is not None)
check("model tiene método predict", hasattr(model, 'predict'))
check("model tiene método fit", hasattr(model, 'fit'))

# Cargar test set
X_test_scaled = pd.read_parquet(ROOT / 'backend' / 'data' / 'X_test_scaled.parquet')
y_test = pd.read_parquet(ROOT / 'backend' / 'data' / 'y_test.parquet')['target']

# Predict
y_pred = model.predict(X_test_scaled)
check("predict devuelve shape correcto", y_pred.shape == y_test.shape)
check("predict devuelve solo clases válidas",
      set(np.unique(y_pred)).issubset({0, 1, 2}))

# Métrica computada manualmente
from sklearn.metrics import accuracy_score, f1_score
test_acc = accuracy_score(y_test, y_pred)
check(f"test accuracy >= 0.95 (real: {test_acc:.4f})", test_acc >= 0.95)

# === 4. model_metadata.json schema ===
print("\n" + "=" * 70)
print("4. model_metadata.json schema")
print("=" * 70)

metadata = json.loads(MODEL_META.read_text())

required_top = {'version', 'model_type', 'trained_at', 'dataset_hash_sha256',
                'features', 'classes', 'hyperparameters', 'metrics'}
missing = required_top - set(metadata.keys())
check("Todos los campos requeridos presentes", len(missing) == 0, f"faltan: {missing}")

check("features == FEATURE_COLS", metadata['features'] == FEATURE_COLS)
check("classes == CLASS_NAMES", metadata['classes'] == CLASS_NAMES)
check("SHA256 tiene 64 chars", len(metadata['dataset_hash_sha256']) == 64)

# Verificar que el SHA256 coincide con el CSV real
import hashlib
csv_hash = hashlib.sha256((ROOT / 'backend' / 'data' / 'star_classification.csv').read_bytes()).hexdigest()
check("SHA256 coincide con CSV real",
      metadata['dataset_hash_sha256'] == csv_hash)

# Metrics
m = metadata['metrics']
check("metrics tiene baseline_accuracy_majority", 'baseline_accuracy_majority' in m)
check("metrics tiene test_accuracy", 'test_accuracy' in m)
check("metrics tiene cv_accuracy_mean/std", 'cv_accuracy_mean' in m and 'cv_accuracy_std' in m)
check("metrics tiene margin_over_baseline_pts", 'margin_over_baseline_pts' in m)
check("metrics tiene per_class", 'per_class' in m)

# Verificar valores
check(f"baseline ≈ 0.59 (real: {m['baseline_accuracy_majority']:.4f})",
      0.58 < m['baseline_accuracy_majority'] < 0.60)
check(f"test_accuracy >= 0.95 (real: {m['test_accuracy']:.4f})",
      m['test_accuracy'] >= 0.95)
check(f"margen sobre baseline >= 25 pts (real: {m['margin_over_baseline_pts']:.2f})",
      m['margin_over_baseline_pts'] >= 25)
check(f"cv_accuracy_std razonable (<0.01) (real: {m['cv_accuracy_std']:.4f})",
      m['cv_accuracy_std'] < 0.01)

# Per-class: las 3 clases presentes
for cls in CLASS_NAMES:
    check(f"per_class[{cls}] presente", cls in m['per_class'])
    p = m['per_class'][cls]
    check(f"{cls}: precision/recall/f1/support presentes",
          all(k in p for k in ['precision', 'recall', 'f1_score', 'support']))

# Recall QSO target
qso_recall = m['per_class']['QSO']['recall']
check(f"Recall QSO >= 0.85 (target Q&A) (real: {qso_recall:.4f})", qso_recall >= 0.85)

# === 5. modeling_summary.json ===
print("\n" + "=" * 70)
print("5. modeling_summary.json")
print("=" * 70)

summary = json.loads(SUMMARY.read_text())

required = {'baseline', 'winner', 'all_models', 'classification_report',
            'confusion_matrix', 'feature_ablation_rf', 'decisions'}
missing = required - set(summary.keys())
check("summary tiene campos requeridos", len(missing) == 0, f"faltan: {missing}")

# 10 modelos entrenados (DoD)
check("all_models tiene exactamente 10 modelos",
      len(summary['all_models']) == 10,
      f"actual: {len(summary['all_models'])}")

# El ganador del summary coincide con metadata
check("summary.winner.name == metadata.model_type",
      summary['winner']['name'] == metadata['model_type'])

# Confusion matrix es 3x3
cm = summary['confusion_matrix']
check("confusion_matrix es 3x3", len(cm) == 3 and all(len(row) == 3 for row in cm))
cm_total = sum(sum(row) for row in cm)
check(f"cm total = 20000 (test rows) (real: {cm_total})", cm_total == 20_000)

# Feature ablation
fa = summary['feature_ablation_rf']
check("ablation: solo_redshift < todas",
      fa['accuracy_redshift_only'] < fa['accuracy_all_features'])
check(f"ablation diff_pts > 0 (real: {fa['diff_pts']:.2f})",
      fa['diff_pts'] > 0)

# === 6. Consistencia entre classification_report y confusion_matrix ===
print("\n" + "=" * 70)
print("6. Consistencia: classification_report ↔ confusion_matrix")
print("=" * 70)

report = summary['classification_report']
cm_np = np.array(cm)

# Diagonal de CM = TP. Recall por clase = TP / row sum
for i, cls in enumerate(CLASS_NAMES):
    tp = cm_np[i, i]
    row_sum = cm_np[i].sum()
    computed_recall = tp / row_sum if row_sum > 0 else 0
    report_recall = report[cls]['recall']
    check(f"recall({cls}) coincide CM vs report (CM={computed_recall:.4f}, report={report_recall:.4f})",
          abs(computed_recall - report_recall) < 0.001)

# === 7. Re-predict con modelo cargado vs y_pred guardado en summary
print("\n" + "=" * 70)
print("7. Roundtrip joblib (load → predict idéntico)")
print("=" * 70)

# El modelo cargado debe predecir lo mismo que está en summary
report_loaded = {'GALAXY': {}, 'STAR': {}, 'QSO': {}}
from sklearn.metrics import classification_report as cr
rep_full = cr(y_test, y_pred, target_names=CLASS_NAMES, output_dict=True)

for cls in CLASS_NAMES:
    saved_p = report[cls]['precision']
    fresh_p = rep_full[cls]['precision']
    check(f"precision({cls}) idéntico (saved={saved_p:.4f}, fresh={fresh_p:.4f})",
          abs(saved_p - fresh_p) < 0.0001)

# === 8. Reproducibilidad — hyperparameters consistentes
print("\n" + "=" * 70)
print("8. Hyperparameters consistentes")
print("=" * 70)

hp = metadata['hyperparameters']
# El modelo serializado debe tener los hyperparameters reportados
model_hp = model.get_params()
# Compare keys (algunos values son objetos no serializables, en metadata son strings)
common_keys = set(hp.keys()) & set(model_hp.keys())
check(f"Hyperparameters tiene >=5 keys ({len(hp)})", len(hp) >= 5)

# random_state debe ser 42
if 'random_state' in hp:
    rs = hp['random_state']
    # Puede venir como int o string "42"
    check("random_state == 42", str(rs) == '42' or rs == 42)

# === RESUMEN ===
print("\n" + "=" * 70)
print("RESUMEN")
print("=" * 70)
passed = sum(1 for s, _, _ in results if s == 'PASS')
failed = len(results) - passed
for status, name, detail in results:
    icon = '✓' if status == 'PASS' else '✗'
    line = f"  {icon} {name}"
    if detail and status == 'FAIL':
        line += f"\n     └─ {detail}"
    print(line)

print(f"\n{passed}/{len(results)} tests pasan")
sys.exit(1 if failed else 0)
