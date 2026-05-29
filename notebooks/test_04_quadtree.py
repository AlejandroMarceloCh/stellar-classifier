"""
Test suite riguroso para 04_quadtree_eda.ipynb.

Invariantes críticos:
- Sum de counts de hojas == dataset rows (conservación)
- Children no se solapan (cada punto cae en exactamente 1 hijo)
- Children cubren el bounds del padre (sin huecos)
- class_distribution suma == count
- max_depth real <= max_depth configurado
- IDs jerárquicos consistentes (padre 0-1, hijos 0-1-0, 0-1-1, 0-1-2, 0-1-3)
- JSON estructura completa (metadata, bounds, stats, nodes)
- Conservación per-clase (galaxies en hojas == galaxies en dataset)
"""
import json
import sys
from pathlib import Path
import nbformat
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
NB = ROOT / 'notebooks' / '04_quadtree_eda.ipynb'
JSON_PATH = ROOT / 'frontend' / 'public' / 'data' / 'quadtree.json'
SUMMARY = ROOT / 'docs' / 'quadtree_summary.json'

results = []
def check(name, cond, detail=''):
    results.append(('PASS' if cond else 'FAIL', name, detail))

# === 1. Estructura del notebook ===
print("=" * 70)
print("1. Estructura del notebook")
print("=" * 70)

nb = nbformat.read(NB, as_version=4)
code = [c for c in nb.cells if c.cell_type == 'code']
md = [c for c in nb.cells if c.cell_type == 'markdown']
check(">=6 celdas código", len(code) >= 6)
check(">=6 celdas markdown", len(md) >= 6)

unexec = [i for i, c in enumerate(code) if c.execution_count is None]
check("Todas ejecutadas", len(unexec) == 0, f"sin ejecutar: {unexec}")

err_cells = [(i, o.get('ename')) for i, c in enumerate(code)
             for o in c.get('outputs', []) if o.get('output_type') == 'error']
check("Sin celdas con error", len(err_cells) == 0, f"{err_cells}")

# Sin warnings críticos
stderr = ''.join(o.get('text', '') for c in code for o in c.get('outputs', [])
                 if o.get('output_type') == 'stream' and o.get('name') == 'stderr')
critical = [w for w in ['DeprecationWarning', 'FutureWarning', 'UserWarning', 'RuntimeWarning'] if w in stderr]
check("Sin warnings críticos", len(critical) == 0, f"{critical}: {stderr[:300]}")

try:
    nbformat.validate(nb)
    check("nbformat válido", True)
except Exception as e:
    check("nbformat válido", False, str(e))

# === 2. JSON file ===
print("\n" + "=" * 70)
print("2. quadtree.json existe y es válido")
print("=" * 70)

check("quadtree.json existe", JSON_PATH.exists())
size_kb = JSON_PATH.stat().st_size / 1024
check(f"Tamaño razonable ({size_kb:.0f}KB <5MB)", size_kb < 5000)
check(f"Tamaño no trivial (>50KB)", size_kb > 50)

payload = json.loads(JSON_PATH.read_text())
required_top = {'metadata', 'bounds', 'stats', 'nodes'}
missing = required_top - set(payload.keys())
check("JSON tiene campos requeridos", len(missing) == 0, f"faltan: {missing}")

# === 3. Bounds del cielo válidos ===
print("\n" + "=" * 70)
print("3. Bounds")
print("=" * 70)

b = payload['bounds']
check("alpha_min < alpha_max", b['alpha_min'] < b['alpha_max'])
check("delta_min < delta_max", b['delta_min'] < b['delta_max'])
check("alpha rango astronómico válido [0, 360]",
      0 <= b['alpha_min'] and b['alpha_max'] <= 360.1)
check("delta rango astronómico válido [-90, 90]",
      -90 <= b['delta_min'] and b['delta_max'] <= 90.1)

# === 4. Invariante de conservación ===
print("\n" + "=" * 70)
print("4. Invariantes del quadtree")
print("=" * 70)

nodes = payload['nodes']
leaves = [n for n in nodes if n['is_leaf']]
internals = [n for n in nodes if not n['is_leaf']]

check("Hay nodos en el JSON", len(nodes) > 0)
check("Hay al menos 1 hoja", len(leaves) > 0)

# Suma de counts de hojas == dataset
leaf_sum = sum(n['count'] for n in leaves)
check(f"Suma de hojas == dataset (real: {leaf_sum})",
      leaf_sum == payload['metadata']['dataset_rows'],
      f"sum={leaf_sum}, expected={payload['metadata']['dataset_rows']}")

# El nodo raíz contiene a todos
root_nodes = [n for n in nodes if n['id'] == '0' and n['depth'] == 0]
check("Existe exactamente 1 nodo raíz", len(root_nodes) == 1)
if root_nodes:
    root = root_nodes[0]
    check(f"Root.count == dataset_rows (real: {root['count']})",
          root['count'] == payload['metadata']['dataset_rows'])

# class_distribution suma == count en CADA nodo
mismatch = []
for n in nodes:
    dist_sum = sum(n['class_distribution'].values())
    if dist_sum != n['count']:
        mismatch.append((n['id'], dist_sum, n['count']))
check("class_distribution sum == count en TODOS los nodos",
      len(mismatch) == 0, f"mismatches: {mismatch[:3]}")

# Max depth no excede el configurado
max_d_real = max(n['depth'] for n in nodes)
max_d_conf = payload['metadata']['max_depth']
check(f"max_depth_real ({max_d_real}) <= configurado ({max_d_conf})",
      max_d_real <= max_d_conf)

# === 5. Children-parent consistency ===
print("\n" + "=" * 70)
print("5. Consistencia parent-children")
print("=" * 70)

node_by_id = {n['id']: n for n in nodes}
check("IDs únicos", len(node_by_id) == len(nodes),
      f"IDs duplicados: {len(nodes) - len(node_by_id)}")

# Cada children ID referenciado debe existir
broken_refs = []
for n in nodes:
    for child_id in n.get('children', []):
        if child_id not in node_by_id:
            broken_refs.append((n['id'], child_id))
check("Todas las referencias a children existen",
      len(broken_refs) == 0, f"refs rotas: {broken_refs[:3]}")

# Si un nodo tiene children, NO es hoja
mislabeled = [n['id'] for n in nodes if n['children'] and n['is_leaf']]
check("Nodos con children no son hojas", len(mislabeled) == 0,
      f"mal etiquetados: {mislabeled[:3]}")

# Si un nodo es hoja, NO tiene children
mislabeled2 = [n['id'] for n in nodes if n['is_leaf'] and n['children']]
check("Nodos hoja no tienen children", len(mislabeled2) == 0,
      f"{mislabeled2[:3]}")

# Sum de counts de children == count del padre (CONSERVACIÓN)
inconsistencies = []
for n in internals:
    children_sum = sum(node_by_id[c]['count'] for c in n['children'])
    if children_sum != n['count']:
        inconsistencies.append((n['id'], n['count'], children_sum))
check("sum(children.count) == parent.count (conservación recursiva)",
      len(inconsistencies) == 0, f"{inconsistencies[:3]}")

# IDs jerárquicos: cada child_id empieza con parent_id + '-'
bad_ids = []
for n in internals:
    for c in n['children']:
        if not c.startswith(n['id'] + '-'):
            bad_ids.append((n['id'], c))
check("IDs jerárquicos consistentes", len(bad_ids) == 0, f"{bad_ids[:3]}")

# === 6. Bounds de children cubren bounds del padre ===
print("\n" + "=" * 70)
print("6. Bounds children cubren padre (sin huecos, sin overlap)")
print("=" * 70)

overlap_or_gap = []
for n in internals:
    if len(n['children']) != 4:
        overlap_or_gap.append((n['id'], f'tiene {len(n["children"])} children'))
        continue
    p_b = n['bounds']
    alpha_mid = (p_b['alpha_min'] + p_b['alpha_max']) / 2
    delta_mid = (p_b['delta_min'] + p_b['delta_max']) / 2
    # Esperado: bottom-left, bottom-right, top-left, top-right
    expected = [
        {'alpha_min': p_b['alpha_min'], 'alpha_max': alpha_mid,
         'delta_min': p_b['delta_min'], 'delta_max': delta_mid},
        {'alpha_min': alpha_mid, 'alpha_max': p_b['alpha_max'],
         'delta_min': p_b['delta_min'], 'delta_max': delta_mid},
        {'alpha_min': p_b['alpha_min'], 'alpha_max': alpha_mid,
         'delta_min': delta_mid, 'delta_max': p_b['delta_max']},
        {'alpha_min': alpha_mid, 'alpha_max': p_b['alpha_max'],
         'delta_min': delta_mid, 'delta_max': p_b['delta_max']},
    ]
    for child_id, exp in zip(n['children'], expected):
        actual = node_by_id[child_id]['bounds']
        ok = all(abs(actual[k] - exp[k]) < 1e-9 for k in exp)
        if not ok:
            overlap_or_gap.append((child_id, exp, actual))

check("Bounds de children correctos (4 cuadrantes balanceados)",
      len(overlap_or_gap) == 0, f"errores: {overlap_or_gap[:2]}")

# === 7. Cross-check con dataset ===
print("\n" + "=" * 70)
print("7. Conservación per-clase contra dataset original")
print("=" * 70)

df = pd.read_csv(ROOT / 'backend' / 'data' / 'star_classification.csv')
df = df[~(df[['u', 'g', 'r', 'i', 'z']] == -9999).any(axis=1)]
expected_per_class = df['class'].value_counts().to_dict()

# Sumar la distribución de clase de las hojas
leaf_class_sum = {}
for n in leaves:
    for cls, count in n['class_distribution'].items():
        leaf_class_sum[cls] = leaf_class_sum.get(cls, 0) + count

for cls in ['GALAXY', 'STAR', 'QSO']:
    expected = expected_per_class.get(cls, 0)
    actual = leaf_class_sum.get(cls, 0)
    check(f"Conservación {cls}: hojas suman == dataset ({actual}=={expected})",
          actual == expected)

# === 8. Stats coherentes ===
print("\n" + "=" * 70)
print("8. stats del JSON coinciden con realidad")
print("=" * 70)

stats = payload['stats']
check(f"stats.total_nodes ({stats['total_nodes']}) == len(nodes) ({len(nodes)})",
      stats['total_nodes'] == len(nodes))
check(f"stats.leaves ({stats['leaves']}) == hojas reales ({len(leaves)})",
      stats['leaves'] == len(leaves))
check(f"stats.internal ({stats['internal']}) == internos reales ({len(internals)})",
      stats['internal'] == len(internals))

empty = sum(1 for n in leaves if n['count'] == 0)
check(f"stats.empty_leaves ({stats['empty_leaves']}) == hojas vacías ({empty})",
      stats['empty_leaves'] == empty)

# === 9. quadtree_summary.json válido ===
print("\n" + "=" * 70)
print("9. quadtree_summary.json")
print("=" * 70)

check("summary existe", SUMMARY.exists())
s = json.loads(SUMMARY.read_text())
required = {'parameters', 'dataset', 'output', 'tree', 'invariant_check', 'decisions'}
check("summary tiene campos requeridos", required.issubset(set(s.keys())),
      f"faltan: {required - set(s.keys())}")
check("summary.invariant_check.sum_leaves_eq_rows", s['invariant_check']['sum_leaves_eq_rows'])

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
