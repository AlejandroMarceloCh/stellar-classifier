"""Test suite riguroso para 05_octree_3d.ipynb.

Invariantes:
- sum(counts hojas) == sample_size (10K)
- Children no se solapan + cubren el bounds del padre
- bounds_norm y bounds_raw consistentes (normalization es lineal)
- IDs jerárquicos
- class_distribution sum == count
- max_depth_real <= max_depth configurado
- Conservación per-clase
- sample_points.json arrays paralelos coherentes
"""
import json
import sys
from pathlib import Path
import nbformat
import pandas as pd
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
NB = ROOT / 'notebooks' / '05_octree_3d.ipynb'
OCTREE_JSON = ROOT / 'frontend' / 'public' / 'data' / 'octree.json'
SAMPLE_JSON = ROOT / 'frontend' / 'public' / 'data' / 'sample_points.json'
SUMMARY = ROOT / 'docs' / 'octree_summary.json'

results = []
def check(name, cond, detail=''):
    results.append(('PASS' if cond else 'FAIL', name, detail))

# === 1. Notebook ===
print("=" * 70)
print("1. Estructura del notebook 05")
print("=" * 70)

nb = nbformat.read(NB, as_version=4)
code = [c for c in nb.cells if c.cell_type == 'code']
md = [c for c in nb.cells if c.cell_type == 'markdown']
check(">=7 celdas código", len(code) >= 7)
check(">=8 celdas markdown", len(md) >= 8)
unexec = [i for i, c in enumerate(code) if c.execution_count is None]
check("Todas ejecutadas", len(unexec) == 0, f"sin exec: {unexec}")
err = [(i, o.get('ename')) for i, c in enumerate(code) for o in c.get('outputs', [])
       if o.get('output_type') == 'error']
check("Sin errores", len(err) == 0, f"{err}")

stderr = ''.join(o.get('text', '') for c in code for o in c.get('outputs', [])
                 if o.get('output_type') == 'stream' and o.get('name') == 'stderr')
critical = [w for w in ['DeprecationWarning', 'FutureWarning', 'UserWarning', 'RuntimeWarning'] if w in stderr]
check("Sin warnings críticos", len(critical) == 0, f"{critical}: {stderr[:300]}")

# === 2. octree.json ===
print("\n" + "=" * 70)
print("2. octree.json válido")
print("=" * 70)

check("octree.json existe", OCTREE_JSON.exists())
octree = json.loads(OCTREE_JSON.read_text())
size_kb = OCTREE_JSON.stat().st_size / 1024
check(f"Tamaño <2MB ({size_kb:.0f}KB)", size_kb < 2000)

required = {'metadata', 'raw_ranges', 'stats', 'nodes'}
check("Campos requeridos", required.issubset(set(octree.keys())))

nodes = octree['nodes']
leaves = [n for n in nodes if n['is_leaf']]
internals = [n for n in nodes if not n['is_leaf']]
check(">=1 hoja", len(leaves) > 0)
check(">=1 interno", len(internals) > 0)

# Invariante: sum hojas = sample size
leaf_sum = sum(n['count'] for n in leaves)
check(f"sum hojas == sample_size ({leaf_sum}=={octree['metadata']['sample_size']})",
      leaf_sum == octree['metadata']['sample_size'])

# Cada nodo tiene bounds_norm Y bounds_raw
for n in nodes[:10]:
    check(f"node {n['id']}: tiene bounds_norm",
          'bounds_norm' in n and all(k in n['bounds_norm'] for k in
              ['x_min', 'x_max', 'y_min', 'y_max', 'z_min', 'z_max']))
    check(f"node {n['id']}: tiene bounds_raw",
          'bounds_raw' in n and all(k in n['bounds_raw'] for k in
              ['alpha_min', 'alpha_max', 'delta_min', 'delta_max',
               'redshift_min', 'redshift_max']))

# class_distribution suma == count en TODOS los nodos
mismatch = [(n['id'], sum(n['class_distribution'].values()), n['count'])
            for n in nodes if sum(n['class_distribution'].values()) != n['count']]
check("class_distribution sum == count (todos los nodos)",
      len(mismatch) == 0, f"{mismatch[:3]}")

# Max depth no excede
md_real = max(n['depth'] for n in nodes)
md_conf = octree['metadata']['max_depth']
check(f"max_depth_real ({md_real}) <= configurado ({md_conf})", md_real <= md_conf)

# === 3. Consistencia parent-children ===
print("\n" + "=" * 70)
print("3. Consistencia parent-children")
print("=" * 70)

by_id = {n['id']: n for n in nodes}
check("IDs únicos", len(by_id) == len(nodes))

# Referencias rotas
broken = [(n['id'], c) for n in nodes for c in n['children'] if c not in by_id]
check("Referencias children válidas", len(broken) == 0, f"{broken[:3]}")

# sum(children.count) == parent.count
inconsist = [(n['id'], n['count'], sum(by_id[c]['count'] for c in n['children']))
             for n in internals
             if sum(by_id[c]['count'] for c in n['children']) != n['count']]
check("sum(children.count) == parent.count", len(inconsist) == 0, f"{inconsist[:3]}")

# IDs jerárquicos
bad = [(n['id'], c) for n in internals for c in n['children'] if not c.startswith(n['id'] + '-')]
check("IDs jerárquicos", len(bad) == 0, f"{bad[:3]}")

# Internos con 8 children
wrong_arity = [(n['id'], len(n['children'])) for n in internals if len(n['children']) != 8]
check("Internos con exactamente 8 children", len(wrong_arity) == 0, f"{wrong_arity[:3]}")

# === 4. Bounds children cubren padre ===
print("\n" + "=" * 70)
print("4. Bounds_norm de children cubren padre (8 octantes balanceados)")
print("=" * 70)

import math
problems = []
for n in internals:
    p = n['bounds_norm']
    xm = (p['x_min'] + p['x_max']) / 2
    ym = (p['y_min'] + p['y_max']) / 2
    zm = (p['z_min'] + p['z_max']) / 2
    expected_octants = []
    for i in range(8):
        x_lo = p['x_min'] if (i & 1) == 0 else xm
        x_hi = xm if (i & 1) == 0 else p['x_max']
        y_lo = p['y_min'] if (i & 2) == 0 else ym
        y_hi = ym if (i & 2) == 0 else p['y_max']
        z_lo = p['z_min'] if (i & 4) == 0 else zm
        z_hi = zm if (i & 4) == 0 else p['z_max']
        expected_octants.append({'x_min': x_lo, 'x_max': x_hi,
                                 'y_min': y_lo, 'y_max': y_hi,
                                 'z_min': z_lo, 'z_max': z_hi})
    for cid, exp in zip(n['children'], expected_octants):
        actual = by_id[cid]['bounds_norm']
        if any(not math.isclose(actual[k], exp[k], abs_tol=1e-9) for k in exp):
            problems.append((cid, exp, actual))

check("Bounds_norm de children correctos (8 octantes)",
      len(problems) == 0, f"{problems[:2]}")

# bounds_raw consistentes con bounds_norm (denormalización lineal)
rr = octree['raw_ranges']
norm_errors = []
for n in nodes[:50]:  # sample para velocidad
    expected_raw = {}
    for key_raw, key_norm in [('alpha_min', 'x_min'), ('alpha_max', 'x_max'),
                              ('delta_min', 'y_min'), ('delta_max', 'y_max'),
                              ('redshift_min', 'z_min'), ('redshift_max', 'z_max')]:
        feat = key_raw.split('_')[0]
        span = rr[feat]['max'] - rr[feat]['min']
        expected_raw[key_raw] = rr[feat]['min'] + n['bounds_norm'][key_norm] * span
        if not math.isclose(n['bounds_raw'][key_raw], expected_raw[key_raw], abs_tol=1e-6):
            norm_errors.append((n['id'], key_raw, n['bounds_raw'][key_raw], expected_raw[key_raw]))
check("bounds_raw == denormalize(bounds_norm)", len(norm_errors) == 0, f"{norm_errors[:3]}")

# === 5. Conservación per-clase ===
print("\n" + "=" * 70)
print("5. Conservación per-clase contra sample real")
print("=" * 70)

# Reconstruir sample
df = pd.read_csv(ROOT / 'backend' / 'data' / 'star_classification.csv')
df = df[~(df[['u', 'g', 'r', 'i', 'z']] == -9999).any(axis=1)]

# El sample del notebook usa train_test_split con stratify y random_state=42
from sklearn.model_selection import train_test_split
_, df_sample = train_test_split(df, test_size=10_000 / len(df),
                                 stratify=df['class'], random_state=42)
expected_class = Counter(df_sample['class'])

# Sumar class_distribution de hojas
total_by_class = {'GALAXY': 0, 'STAR': 0, 'QSO': 0}
for n in leaves:
    for cls, c in n['class_distribution'].items():
        total_by_class[cls] = total_by_class.get(cls, 0) + c

for cls in ['GALAXY', 'STAR', 'QSO']:
    check(f"Conservación {cls}: {total_by_class[cls]} == {expected_class[cls]}",
          total_by_class[cls] == expected_class[cls])

# === 6. sample_points.json ===
print("\n" + "=" * 70)
print("6. sample_points.json válido")
print("=" * 70)

check("sample_points.json existe", SAMPLE_JSON.exists())
sp = json.loads(SAMPLE_JSON.read_text())

check("metadata.count == 10000", sp['metadata']['count'] == 10_000)
check("alpha array longitud 10000", len(sp['alpha']) == 10_000)
check("delta array longitud 10000", len(sp['delta']) == 10_000)
check("redshift array longitud 10000", len(sp['redshift']) == 10_000)
check("class array longitud 10000", len(sp['class']) == 10_000)
check("Clases válidas", set(sp['class']).issubset({'GALAXY', 'STAR', 'QSO'}))
check("alpha en rango [0, 360]", all(0 <= a <= 360 for a in sp['alpha'][:100]))
check("redshift no negativos extremos", all(r > -1 for r in sp['redshift'][:100]))

# Stratificación
cnt = Counter(sp['class'])
expected_pct = {'GALAXY': 0.5944, 'STAR': 0.2159, 'QSO': 0.1896}
for cls, pct in expected_pct.items():
    real_pct = cnt[cls] / 10_000
    check(f"{cls} proporción ~{pct:.4f} (real {real_pct:.4f})",
          abs(real_pct - pct) < 0.01)

# === 7. octree_summary ===
print("\n" + "=" * 70)
print("7. octree_summary.json")
print("=" * 70)

check("summary existe", SUMMARY.exists())
s = json.loads(SUMMARY.read_text())
check("summary.invariant_check.sum_leaves_eq_sample", s['invariant_check']['sum_leaves_eq_sample'])
check("summary.tree.total_nodes == real",
      s['tree']['total_nodes'] == len(nodes))
check("summary.tree.leaves == real",
      s['tree']['leaves'] == len(leaves))

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
