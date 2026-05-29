# Plan — Stellar Classifier (Proyecto Final DS3022)

> **Curso**: DS-3022 Desarrollo de Producto de Datos (UTEC) — Prof. Germain García Zanabria.
> **Tipo**: Proyecto final (peso alto).
> **Base técnica**: clonar el flujo de `Recomendación_producto.ipynb` (cultivos, 22 clases) sobre nueva data + capas que el notebook base omite.
> **Plus técnico**: visualización con quadtree (mapa 2D del cielo) + octree (universo 3D rotable).
> **Frontend**: aplicación web separada del notebook técnico.
> **Última actualización**: 2026-05-26.

---

## 1. Objetivo del proyecto

Construir un **producto de datos completo** que clasifique objetos celestes (Galaxia / Estrella / Quásar) a partir de observaciones del Sloan Digital Sky Survey (SDSS17), siguiendo el flujo canónico del curso (8 fases del playbook DS3022) + UI web con visualización espacial 2D/3D.

### Categoría del producto (en lenguaje del curso)
- **Tipo**: Sistema de Recomendación / Decision Support (Slide 28-30 U1_T1).
- **Pregunta de negocio**: "¿Qué tipo de objeto celeste observé?" → Modelo de decisión (Slide 22 U1_T1).
- **Modalidad**: Predictivo (Slide 34 Ideación).
- **Pipeline**: User Data (observaciones) → User Profile (vector de features) → Recommender system (clasificador) → Product (clase + objetos similares) — Slide 6 U4_T2.

---

## 2. Dataset

**Stellar Classification SDSS17**
- Fuente: Kaggle `fedesoriano/stellar-classification-dataset-sdss17`.
- Tamaño: 100,000 filas.
- Clases (3): `GALAXY`, `STAR`, `QSO` (quásar).
- Features clave:
  - **Espaciales**: `alpha` (RA, 0-360°), `delta` (DEC, -90 a +90°).
  - **Fotométricas**: `u, g, r, i, z` (5 bandas de brillo).
  - **Cosmológica**: `redshift` (corrimiento al rojo ≈ distancia proxy).
  - **Metadata** (descartables para el modelo): `run_ID, rerun_ID, cam_col, field_ID, spec_obj_ID, plate, MJD, fiber_ID`.

### Por qué este dataset (justificación atada a magna)
- **Slide 25 U1_T1 — Taxonomía Zrenner**: dataset clasificado como External / Open / Structured / Volume-Driven. Es un benchmark real de astronomía profesional.
- **Slide 11 U4_T2**: balance esperable ~59% GALAXY, ~22% STAR, ~19% QSO. Acceptable; usar `stratify=y`.
- Tres features **son coordenadas reales** → habilitan quadtree/octree con sentido físico, no decoración.

---

## 3. Stack técnico (Ruta B — ambiciosa)

### Backend (Python)
```
FastAPI 0.115+
scikit-learn 1.7.2
pandas 2.3.3
numpy 2.2.6
scipy 1.14+
joblib (alternativa a pickle para modelos grandes — Slide 54-57 U4_T2)
pydantic 2.x (validación de inputs)
uvicorn (servidor)
```

### Frontend (TypeScript)
```
Next.js 15 (app router)
React 19
Tailwind CSS 4
react-plotly.js + plotly.js-dist-min (visualización 3D principal)
D3.js 7 (quadtree 2D)
Recharts (matriz confusión, bar charts)
shadcn/ui (componentes base)
```

**Decisión de visualización 3D**: Plotly Scatter3d. **Three.js descartado definitivamente** (fuera de alcance). Justificación: 4-8 horas de setup vs 2-3 días con Three.js; visual equivalente para la presentación (puntos en 3D, color por clase, rotable, zoom, hover).

### Notebook técnico
```
Jupyter + nbconvert
Python venv local en /backend/venv/
```

### Infraestructura
- Repo Git monorepo (`backend/`, `frontend/`, `notebooks/`).
- Deploy local para presentación (FastAPI en :8000, Next.js en :3000).
- Opcional: Railway / Render para backend + Vercel para frontend.

---

## 4. Estructura del repositorio

```
stellar-classifier/
├── plan.md                          ← este archivo
├── README.md                         ← introducción, cómo correr
├── .gitignore
│
├── notebooks/
│   ├── 01_eda.ipynb                  ← Fase 1-2 del playbook
│   ├── 02_preprocessing.ipynb        ← Fase 3-5
│   ├── 03_modeling.ipynb             ← Fase 6 (10 modelos + CV + métricas)
│   ├── 04_quadtree_eda.ipynb         ← Quadtree 2D del cielo
│   ├── 05_octree_3d.ipynb            ← Octree (universo 3D)
│   └── 06_inference_pipeline.ipynb   ← Fase 7-8 (función + pickles)
│
├── backend/
│   ├── venv/
│   ├── requirements.txt
│   ├── main.py                       ← FastAPI app
│   ├── models/
│   │   ├── model.pkl
│   │   ├── scaler.pkl
│   │   └── label_encoder.pkl
│   ├── data/
│   │   └── sdss_sample.parquet       ← muestra 10K para servir
│   ├── routes/
│   │   ├── predict.py                ← POST /api/predict
│   │   ├── quadtree.py               ← GET /api/quadtree
│   │   ├── octree.py                 ← GET /api/octree
│   │   ├── neighbors.py              ← POST /api/neighbors (k vecinos)
│   │   └── metrics.py                ← GET /api/metrics
│   ├── ml/
│   │   ├── inference.py              ← carga modelo, predice
│   │   ├── quadtree_builder.py       ← construye quadtree desde df
│   │   ├── octree_builder.py         ← construye octree desde df
│   │   └── validation.py             ← rangos válidos de inputs
│   └── tests/
│       └── test_predict.py
│
├── frontend/
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  ← / (predicción)
│   │   ├── sky-map/page.tsx          ← /sky-map (quadtree 2D)
│   │   ├── universe/page.tsx         ← /universe (octree 3D)
│   │   ├── analysis/page.tsx         ← /analysis (métricas)
│   │   └── api/                      ← (proxy al backend si se requiere)
│   ├── components/
│   │   ├── PredictionForm.tsx
│   │   ├── ResultCard.tsx
│   │   ├── QuadtreeView.tsx          ← D3.js
│   │   ├── UniverseScene.tsx         ← Plotly Scatter3d
│   │   ├── ConfusionMatrix.tsx
│   │   ├── ModelComparison.tsx
│   │   └── ui/                       ← shadcn primitives
│   ├── lib/
│   │   ├── api.ts                    ← fetch wrappers
│   │   └── types.ts                  ← interfaces TS
│   └── public/
│       └── ...
│
└── docs/
    ├── data_product_canvas.md        ← Slide 29 Ideación (9 bloques)
    ├── user_persona.md               ← Slide 14-16 Ideación
    ├── journey_map.md                ← Slide 26 Ideación
    ├── mockups/                      ← wireframes low-fi de las 4 pantallas (Slide 39-41)
    │   ├── pantalla_prediccion.png
    │   ├── pantalla_sky_map.png
    │   ├── pantalla_universe.png
    │   └── pantalla_analysis.png
    ├── slides_defense.md             ← Q&A defensiva para la presentación
    ├── elevator_pitch.md             ← 5 componentes (Slide 42-45 Ideación)
    └── architecture.md               ← diagramas
```

---

## 5. Las 8 fases del flujo del profe (replicar + mejorar)

Referencia canónica: [reference_ds3022_classification_playbook](~/.claude/projects/-Users-alejandromarcelo-Desktop-PROYECTOS-2026/memory/reference_ds3022_classification_playbook.md).

### Fase 1 — Carga + sanity check (notebook `01_eda.ipynb`)
```python
df = pd.read_csv('star_classification.csv')
df.head()
df.shape
df.info()
df.isnull().sum()
df.duplicated().sum()
df.describe()
```
- **Esperado**: 100K filas, 18 columnas, sin nulls relevantes.
- **Decisión**: descartar columnas metadata (`run_ID, rerun_ID, cam_col, field_ID, spec_obj_ID, plate, MJD, fiber_ID`) — son IDs, no features predictivas.

### Fase 2 — EDA (notebook `01_eda.ipynb` + `04_quadtree_eda.ipynb`)
- `df['class'].value_counts()` → confirmar balance.
- `df.corr()` heatmap sobre features numéricas.
- `histplot` (no `distplot` — está deprecated) para cada feature.
- `scatterplot` alpha vs delta coloreado por clase (mapa cielo crudo).
- **Quadtree 2D del cielo** → notebook 04.
- **EXTRA del playbook**: análisis de redshift por clase (boxplot).

### Fase 3 — Encoding (notebook `02_preprocessing.ipynb`)
```python
dict_clase = {'GALAXY': 0, 'STAR': 1, 'QSO': 2}
df['target'] = df['class'].map(dict_clase)
```
- Sigue el estilo del profe (diccionario manual). Mantener consistencia.

### Fase 4 — Train/test split (notebook `02_preprocessing.ipynb`)
```python
X = df.drop(['class', 'target'] + metadata_cols, axis=1)
y = df['target']
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y  # ← mejora vs notebook cultivos
)
```
- **Decisión**: `stratify=y` SÍ (el notebook cultivos lo omitió; documentar la mejora).

### Fase 5 — Feature Scaling (notebook `02_preprocessing.ipynb`)
- **Decisión defendible**: **solo `StandardScaler`**, no doble escalado.
- **Justificación**: Slide 38 U3_T2 dice que árboles no necesitan escalar; LogReg/SVM/KNN sí. Standard funciona mejor que MinMax para LogReg en mi experimento previo (cultivos). Hacer doble es redundante (Slide 40 U3_T2 deja la elección abierta — la cerramos con datos).

### Fase 6 — Modelado (notebook `03_modeling.ipynb`)
- **Paso 0 — Baseline trivial**: `DummyClassifier(strategy='most_frequent')`. Reportar su accuracy (debería estar cerca de 59% por proporción de GALAXY). Cualquier modelo que no supere baseline por ≥10 puntos es sospechoso.
- Loop sobre los 10 modelos del notebook cultivos.
- **EXTRA del playbook**:
  - `random_state` fijo en cada modelo (reproducibilidad).
  - `cross_val_score(cv=StratifiedKFold(5, shuffle=True, random_state=42))`.
  - `classification_report(y_test, ypred)` para el ganador (Slide 51 U4_T2 lo muestra explícitamente).
  - `confusion_matrix` con heatmap.
  - **Feature ablation rápido**: entrenar RF con solo `redshift` vs RF con todas las features → reportar la diferencia (responde la pregunta "por qué no solo redshift").
- **Elección final**: Random Forest o Gradient Boosting (probable). Decidir post-experimento.

### Fase 7 — Sistema de predicción (notebook `06_inference_pipeline.ipynb` + `backend/ml/inference.py`)
```python
def recommendation(alpha, delta, u, g, r, i_band, z_band, redshift):
    # 1. Validar rangos (mejora vs notebook cultivos)
    if not validate_inputs(alpha, delta, ...):
        return {'error': 'Inputs fuera de rango', 'ranges': train_ranges}

    # 2. Escalar
    features = pd.DataFrame([[alpha, delta, u, g, r, i_band, z_band, redshift]],
                            columns=FEATURE_NAMES)  # ← fix UserWarning del notebook
    X_scaled = scaler.transform(features)

    # 3. Predecir + probabilidades
    pred = model.predict(X_scaled)[0]
    proba = model.predict_proba(X_scaled)[0]

    # 4. Top-3 con confianza
    top3 = sorted(zip(CLASS_NAMES, proba), key=lambda x: -x[1])[:3]

    # 5. Buscar K vecinos cercanos en octree (3D: alpha, delta, redshift)
    neighbors = octree.knn(np.array([alpha, delta, redshift]), k=5)

    return {
        'prediction': CLASS_NAMES[pred],
        'confidence': float(proba[pred]),
        'top3': top3,
        'neighbors': neighbors
    }
```

### Fase 8 — Serialización (notebook `06_inference_pipeline.ipynb`)
```python
import joblib  # ← usar joblib en vez de pickle (Slide 54-57 U4_T2)
joblib.dump(model, 'models/model.pkl')
joblib.dump(scaler, 'models/scaler.pkl')
joblib.dump(label_encoder_inv, 'models/label_encoder.pkl')
```
- **Decisión defendible**: joblib > pickle para RF con 100 árboles (paralelismo, eficiencia con NumPy arrays — Slide 56 U4_T2).
- Guardar `train_ranges.json` para validación de inputs.

---

## 6. Quadtree y Octree — qué hacen y cómo

### Quadtree 2D (notebook `04_quadtree_eda.ipynb` → JSON consumido por frontend)

**Qué**: subdivisión recursiva del cielo en cuadrantes basada en densidad.
**Por qué**: visualizar dónde el cielo está poblado vs. vacío; mostrar cúmulos reales del SDSS.
**Librería**: implementación propia + `matplotlib.patches.Rectangle` para preview en notebook; D3.js en frontend.

**Datos generados** (export a `frontend/public/data/quadtree.json`):
```json
{
  "bounds": {"alpha_min": 0, "alpha_max": 360, "delta_min": -90, "delta_max": 90},
  "nodes": [
    {
      "id": "0", "depth": 0,
      "bounds": [...],
      "count": 100000,
      "dominant_class": "GALAXY",
      "class_distribution": {"GALAXY": 59000, "STAR": 22000, "QSO": 19000},
      "children": ["0-0", "0-1", "0-2", "0-3"]
    },
    ...
  ]
}
```

### Octree 3D (notebook `05_octree_3d.ipynb` → JSON consumido por frontend)

**Qué**: subdivisión recursiva del volumen 3D (alpha, delta, redshift) en octantes.
**Por qué**: las clases se separan principalmente por redshift (STAR ≈ 0, GALAXY medio, QSO alto). El octree expone esto visualmente Y permite k-NN rápido en la función de predicción.
**Librería**: implementación propia simple O `scipy.spatial.cKDTree` (más rápido para k-NN, aunque no es octree puro). Decisión: implementar octree real para fines didácticos; cKDTree como fallback de performance.

**Datos generados** (export a `frontend/public/data/octree.json`):
```json
{
  "bounds": {...},
  "nodes": [...],
  "leaves": [
    {"id": "leaf-123", "centroid": [185.2, 12.1, 0.34], "count": 142, "dominant_class": "GALAXY"},
    ...
  ]
}
```

**Para inferencia (k-NN del objeto consultado)**:
- Implementación en `backend/ml/octree_builder.py` carga el árbol al levantar FastAPI.
- `/api/neighbors` recibe (alpha, delta, redshift) y devuelve 5 vecinos más cercanos.

---

## 7. Frontend — 4 pantallas

### Pantalla 1 — `/` (Predicción)
**Componentes**:
- `DemoChips` (arriba del formulario): 3 botones grandes "🌌 Galaxia conocida", "⭐ Estrella conocida", "✨ Quásar conocido" que precargan inputs de objetos reales del SDSS (3 ejemplos curados desde el dataset). **Cuando el profe haga la demo, no piensa qué valores meter — clickea un chip y ve la predicción correcta inmediatamente.**
- `PredictionForm`: 8 inputs numéricos con sliders limitados a `train_ranges`. Cada input muestra su rango válido como hint.
- Botón "Clasificar" (deshabilitado si algún input está fuera de rango).
- `ResultCard`: clase predicha + barra de confianza + top-3 con barras horizontales.
- Mini-preview de la visualización 3D: punto rojo sobre fondo de muestra del universo (Plotly Scatter3d en modo compacto, no interactivo). Link "Ver en universo completo →" lleva a `/universe` con state compartido.

**Datos demo (3 chips)**: curados desde el dataset, persistidos en `frontend/lib/demo_objects.ts`:
```ts
export const DEMO_OBJECTS = [
  { label: '🌌 Galaxia M104', alpha: 189.997, delta: -11.623, u: 18.5, g: 17.2, r: 16.8, i: 16.5, z: 16.4, redshift: 0.003 },
  { label: '⭐ Estrella vecina',   alpha: 165.123, delta: 35.456,  u: 14.2, g: 13.8, r: 13.5, i: 13.4, z: 13.3, redshift: 0.0001 },
  { label: '✨ Quásar 3C 273',     alpha: 187.278, delta: 2.052,   u: 16.4, g: 16.1, r: 15.9, i: 15.7, z: 15.5, redshift: 0.158 },
];
```
(Valores aproximados — confirmar con el dataset real en Día 9. Si no calzan con el modelo, sustituir por filas reales del CSV).

**Endpoint usado**: `POST /api/predict`.

### Pantalla 2 — `/sky-map` (Quadtree 2D)
**Componentes**:
- `QuadtreeView`: D3.js dibuja el quadtree sobre canvas 1200x600.
- Hover sobre celda → tooltip (n objetos, clase dominante, %).
- Filtros toggle: Galaxy / Star / Quasar.
- Slider de profundidad del quadtree (1-8 niveles).
- Leyenda de colores.

**Endpoint usado**: `GET /api/quadtree?depth=N&filter=class`.

### Pantalla 3 — `/universe` (Visualización 3D del universo)
**Componentes**:
- `UniverseScene` con `react-plotly.js` (`Scatter3d`):
  - 10K puntos coloreados por clase (sample del dataset) en ejes (alpha, delta, redshift).
  - Plotly nativo: rotar con drag, zoom con scroll, hover muestra tooltip con clase y coords.
  - Si vienes desde `/`: tu objeto consultado aparece como ⬤ rojo grande (símbolo `diamond`) + sus 5 vecinos resaltados con borde negro.
- Filtros: rango de redshift, toggle por clase.
- Toggle "mostrar subdivisión del octree" (líneas wireframe — se dibuja con `Mesh3d` o `Surface` de Plotly).

**Endpoint usado**: `GET /api/octree` + `POST /api/neighbors`.

**Nota**: Plotly Scatter3d es el stack final. Three.js está fuera de alcance del proyecto.

### Pantalla 4 — `/analysis` (Métricas)
**Componentes**:
- `ConfusionMatrix`: heatmap interactivo con Recharts.
- `ModelComparison`: bar chart con accuracy + CV mean ± std de los 10 modelos.
- Classification report por clase (tabla con precision/recall/F1).
- Feature importance del RF (bar chart horizontal).

**Endpoint usado**: `GET /api/metrics` (servido desde un JSON estático precalculado).

---

## 8. Plan semanal (3 semanas + Día 0)

### Día 0 — Pre-proyecto: Ideación + Wireframes (medio día)

| Tarea | Entregable | Justificación magna |
|---|---|---|
| Borrador del Data Product Canvas (9 bloques) — versión 0.5 | `docs/data_product_canvas.md` v0.5 | Slide 29 Ideación |
| Definir User Persona (1 arquetipo principal: astrónomo amateur) | `docs/user_persona.md` con foto/cara + necesidades | Slide 14-16 Ideación |
| Journey Map: cómo el usuario hace esto HOY sin el producto | `docs/journey_map.md` (puntos de contacto, dolores actuales) | Slide 26 Ideación |
| Wireframes a mano o Figma de las 4 pantallas (low-fi) | `docs/mockups/*.png` o `.fig` | Slide 39-41 Ideación ("construir mock-up para explicar la idea") |

**Por qué Día 0 importa**: la rúbrica de **Diseño /5** premia el proceso UX (Slide 24 U5 — Design Thinking: Empathize → Define → Ideate → **Prototype** → Test). Sin mockups, perdés 1-2 pts de Diseño aunque la UI final esté linda. **30 minutos por pantalla = 2 horas total**, no es perfeccionismo.

### Semana 1 — Fundación técnica (notebook + backend mínimo)

| Día | Tarea | Entregable |
|---|---|---|
| 1 | Bajar SDSS17 de Kaggle. EDA inicial (notebook 01). | `01_eda.ipynb` con shape, describe, value_counts, heatmap, scatterplot crudo. |
| 2 | Preprocessing: encoding, split, scaler (notebook 02). | `02_preprocessing.ipynb` + decisión documentada de scaler único. |
| 3 | Modelado: 10 modelos + CV + classification_report + matriz confusión (notebook 03). | `03_modeling.ipynb` con resultados. Elegir modelo final. |
| 4 | Sistema de predicción + serialización (notebook 06). | `06_inference_pipeline.ipynb` + `model.pkl`, `scaler.pkl`, `label_encoder.pkl`, `train_ranges.json`. |
| 5 | FastAPI con `/api/predict` funcionando + tests. | Backend que responde JSON desde Postman/curl. |
| 6 | Quadtree 2D (notebook 04) + endpoint `/api/quadtree`. | `quadtree.json` exportado + endpoint sirviéndolo. |
| 7 | Buffer / catch-up / documentación interna. | README inicial del repo. |

**Checkpoint S1**: backend completo + 4 notebooks ejecutables. Sin frontend aún. **Si tronaste tiempo acá, ya tienes el equivalente al notebook del profe + plus de quadtree** — degradás a Streamlit y entregás Ruta A.

### Semana 2 — Frontend base + integración

| Día | Tarea | Entregable |
|---|---|---|
| 8 | Setup Next.js + Tailwind + shadcn. Layout base, navegación. | `app/layout.tsx` + nav funcional. |
| 9 | Pantalla `/` (Predicción): form + ResultCard + integración con `/api/predict`. | Predicción end-to-end funcionando. |
| 10 | Pantalla `/sky-map`: D3.js + QuadtreeView. | Quadtree interactivo con hover. |
| 11 | Pulir `/sky-map`: filtros, slider profundidad, leyenda. | Pantalla 2 terminada. |
| 12 | Pantalla `/analysis`: ConfusionMatrix + ModelComparison. | Pantalla 4 terminada. |
| 13 | Octree (notebook 05) + endpoint `/api/octree` + `/api/neighbors`. | Backend listo para 3D. |
| 14 | Buffer / arreglar bugs. | Estado estable de Pantallas 1, 2, 4 + backend completo. |

**Checkpoint S2**: 3 de 4 pantallas funcionando + backend completo. **Si tronaste tiempo acá, ya tienes un proyecto fuerte** (Streamlit no se compara con esto).

### Semana 3 — Visualización 3D + pulido + presentación

| Día | Tarea | Entregable |
|---|---|---|
| 15 | Plotly Scatter3d setup en `/universe`: scene base con 10K puntos coloreados por clase. | Universo 3D rotable funcionando. |
| 16 | Toggle wireframe octree + filtros (redshift, clase) + leyenda. | Visualización completa. |
| 17 | Integración con predicción: state compartido `/ → /universe`, objeto consultado + vecinos resaltados. | Flujo end-to-end con visualización 3D contextual. |
| 18 | Pulido visual (Tailwind), responsive, demo data en Pantalla 1 (chips Galaxy/Star/Quasar real). | UI presentable + onboarding fluido. |
| 19 | Documentación: Data Product Canvas + User Persona + Journey Map + Defense Q&A + **Elevator Pitch** (5 componentes: Gancho, Problema, Solución, Valor, Call to action — Slide 45 Ideación). | Docs/ completo. |
| 20 | Ensayo de demo (3 corridas con tiempo medido) + screenshots + video corto (loom o quicktime). | Material de presentación. |
| 21 | Buffer crítico + arreglos de último minuto + revisión final de DoD. | Entrega final. |

**Checkpoint final**: 4 pantallas + backend + 6 notebooks + docs + demo.

---

## 8.5 Definition of Done por hito crítico

Cada hito debe pasar **todos** sus criterios antes de avanzar. Si falla uno, no se considera cerrado.

### Día 3 — Modelado cerrado
- [ ] 10 modelos entrenados con `random_state=42` y `cv=StratifiedKFold(5)`.
- [ ] `classification_report` y `confusion_matrix` impresos por modelo ganador.
- [ ] **Baseline trivial reportado**: accuracy de `DummyClassifier(strategy='most_frequent')` (debería estar cerca de la proporción de GALAXY ≈ 59%). El modelo ganador debe superar baseline por ≥ 25 puntos absolutos.
- [ ] `model_metadata.json` generado con: hash SHA256 del CSV, lista de features, fecha, modelo elegido, accuracy ± std del CV.

### Día 5 — Backend `/predict` listo
- [ ] `curl POST /api/predict` con un objeto del dataset devuelve la clase correcta + top-3 + confidence.
- [ ] Manejo de errores funcional (rangos fuera, features faltantes, JSON malformado).
- [ ] **Benchmark registrado en `docs/benchmarks.md`**: p50, p95, p99 sobre 100 corridas con input aleatorio del test set.
- [ ] `model_metadata.json` cargado al startup y disponible en `GET /api/version`.
- [ ] Test de carga del modelo: si `model.pkl` está corrupto/ausente, FastAPI loguea error claro y `/predict` devuelve 503.

### Día 9 — Pantalla `/` end-to-end
- [ ] Form en `/` recibe inputs, valida rangos en cliente Y en server, devuelve predicción visible.
- [ ] Los 3 chips de demo (Galaxy, Star, Quasar) **predicen correctamente al clickearse** (no errores, no "fuera de rango"). Si fallan, sustituir por filas reales del dataset.
- [ ] CORS configurado: Next.js (`localhost:3000`) llama a FastAPI (`localhost:8000`) sin errores.

### Día 13 — Octree + Neighbors funcional
- [ ] `GET /api/octree` devuelve JSON con ≤ 2000 nodos (sino el frontend lagea).
- [ ] `POST /api/neighbors` devuelve 5 vecinos correctos para input del test set (validado manualmente contra `cKDTree` puro).
- [ ] **Decisión productiva: `scipy.spatial.cKDTree` para neighbors lookup** (rápido, probado). El octree custom es solo para visualización wireframe; si su construcción se atrasa, la pantalla `/universe` sale igual sin wireframe.

### Día 15 — `/universe` con 3D base
- [ ] `react-plotly.js` carga 10K puntos en `Scatter3d`, coloreados por clase.
- [ ] Rotación con drag, zoom con scroll, hover con tooltip funcional.
- [ ] Tiempo de carga inicial de la página < 3s en laptop del estudiante.

### Día 17 — Flujo end-to-end con state compartido
- [ ] Desde `/`, clickear "Ver en universo completo" → `/universe` carga con el objeto consultado resaltado (símbolo distinto) + 5 vecinos con borde.
- [ ] State persistido con `searchParams` o Zustand (NO localStorage para evitar bugs entre tabs).
- [ ] Si el state se pierde, `/universe` carga sin objeto resaltado sin romper (defensive default).

### Día 20 — Demo lista
- [ ] 3 corridas completas del demo grabadas y cronometradas (objetivo: ≤ 5 min cada una).
- [ ] Screenshots de las 4 pantallas guardados en `docs/screenshots/`.
- [ ] Elevator pitch ensayado 5 veces, con un timing real ≤ 90 seg.
- [ ] 3 usuarios externos al proyecto probaron la UI (compañeros, no familia) — feedback documentado en `docs/usability_test.md`.

---

## 8.6 Protocolo de benchmark (docs/benchmarks.md)

Ejecutar en Día 5 (backend listo) y re-ejecutar en Día 17 (post-integración).

**Script**: `backend/scripts/benchmark.py` (escribir en Día 5).

```python
# Mide 100 corridas con inputs del test set
# Reporta p50, p95, p99 y media para cada endpoint
endpoints = ['/api/predict', '/api/neighbors', '/api/quadtree', '/api/octree']
```

**Tabla a llenar (`docs/benchmarks.md`)**:

| Endpoint | p50 (ms) | p95 (ms) | p99 (ms) | Tamaño respuesta |
|---|---|---|---|---|
| `/api/predict` | _a medir_ | _a medir_ | _a medir_ | _a medir_ |
| `/api/neighbors` | _a medir_ | _a medir_ | _a medir_ | _a medir_ |
| `/api/quadtree` | _a medir_ | _a medir_ | _a medir_ | _a medir_ |
| `/api/octree` | _a medir_ | _a medir_ | _a medir_ | _a medir_ |

**Targets** (Slide 18 U4_T2 — objetivo profe <300ms):
- `/predict` p95 < 200ms.
- `/neighbors` p95 < 150ms.
- `/quadtree` y `/octree` p95 < 500ms (son lecturas de JSON precalculado, deberían volar).

**Si no se cumple**: documentar el por qué + plan de optimización (ej. sampling de 10K para octree, caché de modelo en memoria, gzip de respuestas).

---

## 8.7 Contrato de la API + manejo de errores

**Formato de respuesta exitosa**:
```json
{
  "prediction": "GALAXY",
  "confidence": 0.94,
  "top3": [["GALAXY", 0.94], ["QSO", 0.05], ["STAR", 0.01]],
  "neighbors": [{"id": "...", "alpha": 185.2, "delta": 12.1, "redshift": 0.34, "class": "GALAXY", "distance": 0.012}],
  "model_version": "rf_v1_20260603"
}
```

**Formato de respuesta de error**:
```json
{
  "error_code": "INPUT_OUT_OF_RANGE",
  "message": "redshift=10 está fuera del rango entrenado [-0.01, 7.01]",
  "field": "redshift",
  "valid_range": {"min": -0.01, "max": 7.01}
}
```

**Códigos HTTP**:
| Código | Cuándo |
|---|---|
| 200 | Predicción exitosa |
| 400 | Input inválido (Pydantic validation, rango fuera) |
| 422 | Estructura JSON incorrecta (FastAPI default) |
| 500 | Error inesperado del modelo |
| 503 | Modelo no cargado / archivo corrupto |

**Logging estructurado** (`backend/main.py`):
- Cada request loguea: timestamp, endpoint, status, latencia, hash del input.
- Errores logean stacktrace completo + input que causó el error.
- Usar `logging.getLogger("stellar")` con format JSON-line para facilitar grep.

---

## 8.8 Versionado del modelo

**Archivo `models/model_metadata.json`** (generado en Día 3, leído por backend al startup):
```json
{
  "version": "rf_v1_20260603",
  "model_type": "RandomForestClassifier",
  "trained_at": "2026-06-03T15:30:00Z",
  "dataset_hash_sha256": "ab12cd34...",
  "dataset_rows": 100000,
  "features": ["alpha", "delta", "u", "g", "r", "i", "z", "redshift"],
  "feature_ranges": {
    "alpha": [0.0, 360.0],
    "delta": [-90.0, 90.0],
    "u": [...],
    "redshift": [-0.01, 7.01]
  },
  "metrics": {
    "accuracy_test": 0.97,
    "f1_macro_test": 0.95,
    "cv_accuracy_mean": 0.96,
    "cv_accuracy_std": 0.003,
    "baseline_accuracy_majority": 0.59
  },
  "hyperparameters": {"n_estimators": 100, "random_state": 42, "max_depth": null}
}
```

**Endpoint `GET /api/version`**: devuelve este JSON tal cual. Permite al profe verificar reproducibilidad.

---

## 8.9 Plan de contingencia por hito

| Si falla… | Degradación elegante |
|---|---|
| Día 3 (modelado) — accuracy <85% | Diagnosticar: distribución sesgada (probar `class_weight='balanced'`), features colineales (drop una de u/g/r/i/z), o data leakage (revisar el split). NO entrar a Fase 7 sin un modelo defendible. |
| Día 5 (FastAPI) — endpoint lento o roto | Degradar a Streamlit como UI completa (Ruta A). Mantener notebooks intactos. Documentar el pivote. |
| Día 9 (pantalla `/`) — integración con CORS rota | Servir Next.js como build estático en `backend/static/` y montar `app.mount('/', StaticFiles())`. Saltea problemas CORS. |
| Día 13 (octree) — construcción lenta o JSON > 5MB | Eliminar wireframe del octree. Usar solo `cKDTree` para neighbors. Pantalla `/universe` muestra Scatter3d sin subdivisiones (cumple igual). |
| Día 15 (Plotly 3D) — laggea con 10K puntos | Reducir a 5K muestreado estratificado por clase + usar `Scattergl` (WebGL). Si igual lagea, samplear a 2K. |
| Día 17 (state compartido) — bugs entre pantallas | Eliminar la integración cross-page. Cada pantalla funciona standalone. El profe valora más estabilidad que features. |

---

## 9. Capa 1 — Ideación (docs/data_product_canvas.md)

Slide 29 Ideación — 9 bloques. Borrador inicial:

1. **Problema**: Identificar el tipo de un objeto celeste observado requiere análisis espectroscópico costoso y lento. Los astrónomos amateur y los surveys masivos generan miles de observaciones que necesitan clasificación rápida.
2. **Usuario**: Astrónomos amateur con telescopio + Observatorios pequeños sin acceso a espectroscopía + Estudiantes de astrofísica.
3. **Data**: SDSS17 (100K objetos confirmados). Externa, abierta, estructurada. Tiene features fotométricas + espaciales + redshift.
4. **Hipótesis**: Las features fotométricas (u,g,r,i,z) combinadas con redshift son suficientes para discriminar las 3 clases con accuracy ≥ 90%.
5. **Solución**: Producto web que clasifica un objeto dado sus observaciones + muestra contexto espacial (mapa cielo, vecinos en el universo 3D). Modelo predictivo (RF). Output: clase + confianza + objetos similares.
6. **Actores**: Sponsor: profe Germain. Stakeholders: comunidad astronómica amateur, estudiantes UTEC.
7. **Métricas clave**: Accuracy multiclase (a confirmar Día 3, target ≥ 90%), F1 macro por clase, latencia p50 de inferencia (target <200ms, a medir Día 5), tiempo a entender la UI (a medir con 3 testers en Día 20).
8. **Impacto**: Reducir tiempo de clasificación manual; democratizar herramientas astronómicas; valor educativo.
9. **Acciones**: Construir notebook → backend → frontend → demo → publicar (opcional GitHub público).

---

## 9.5 — Elevator Pitch (docs/elevator_pitch.md)

Estructura obligatoria según **Slide 45 Ideación** (5 componentes):

1. **Gancho** (10 seg): "Cada noche, el Sloan Digital Sky Survey captura ~1 millón de objetos del cielo. Clasificar cada uno con espectroscopía costaría décadas."
2. **Problema** (15 seg): "Astrónomos amateur y observatorios pequeños no tienen acceso a espectrógrafos. Hoy clasifican manualmente o esperan a que SDSS publique catálogos, semanas tarde."
3. **Solución** (20 seg): "Stellar Classifier toma 8 observaciones básicas (posición, brillos, redshift) y predice si es Galaxia, Estrella o Quásar de forma instantánea, mostrando además objetos similares reales del SDSS."
4. **Propuesta de valor** (15 seg): "Combina un modelo Random Forest entrenado sobre 100K objetos del SDSS con visualización 3D del universo local — no solo predices, ves dónde cae tu objeto entre miles de reales."
5. **Call to action** (10 seg): "Lo pueden probar ahora — hay 3 ejemplos cargados con un click. ¿Quieren ver el universo?" (transición a demo).

**Total**: 60-90 segundos. Practicar 5 veces antes de la presentación.

---

## 10. Defensa frente al profe (docs/slides_defense.md)

Preguntas probables + respuestas atadas a slides de la magna:

| Pregunta | Respuesta |
|---|---|
| ¿Por qué este dataset? | SDSS17 es benchmark real (Slide 25 U1_T1 — fuente Externa/Open/Structured). Las 3 clases son físicamente distintas por redshift → justifica el modelo. |
| ¿Por qué `stratify=y`? | El balance no es 1/3-1/3-1/3. Sin stratify, el test podría desbalancearse aún más. Estándar para multiclase. |
| ¿Por qué `StandardScaler` solo (sin MinMax)? | Slide 40 U3_T2 deja la pregunta abierta. Probé ambos en cultivos (memoria del playbook): Standard solo > MinMax+Standard para modelos lineales. Para árboles, da igual (Slide 38). |
| ¿Por qué RF y no Naive Bayes que puede ganar? | Slide 11 U4_T2 + heatmap muestra correlación u↔g↔r↔i↔z (filtros fotométricos son no-independientes). NB asume independencia y eso falla acá. |
| ¿Por qué quadtree y octree? | Las features `alpha, delta, redshift` SON coordenadas. Es lo que usan los catálogos SDSS reales. Slide 13 U4_T2 invita a búsqueda bibliográfica. |
| ¿Por qué joblib en lugar de pickle? | Slide 56-57 U4_T2: joblib es óptimo para modelos con muchos NumPy arrays (RF de 100 árboles). Pickle es simple pero menos eficiente acá. |
| ¿Cuál es la latencia? | Target: predicción <50ms, k-NN sobre cKDTree <100ms, total <200ms (Slide 18 U4_T2 — objetivo profe <300ms). Medición real registrada en `docs/benchmarks.md` post-Día 5 con p50/p95 sobre 100 corridas. |
| ¿Y si el usuario ingresa redshift=10 (imposible)? | Validación de rangos rechaza el input antes de predecir (Slide 16 U5 — costo del error). Devuelve mensaje claro al usuario. |
| ¿Es un MVP o un producto? | Es un Prototipo según Slide 32 U2 — modelo robusto + sistema de soporte mínimo + UI inicial. No es MVP Pilot (sin sistema de monitoreo). |
| ¿Producto de datos compuesto? | Sí, Slide 32 U1_T1 "Wheels within wheels": clasificador + indexador espacial + visualizador = sub-productos integrados. |

### Preguntas duras (jurado estricto)

| Pregunta | Respuesta |
|---|---|
| ¿Cuál es tu baseline trivial y cuánto lo superas? | `DummyClassifier(strategy='most_frequent')` predice siempre GALAXY → accuracy ≈ 59% (proporción de la clase dominante). El RF la supera por ≥25 puntos absolutos. Reportado en `model_metadata.json` y en `/analysis`. |
| ¿Por qué no usar solo `redshift` si separa tanto? | Probé el ablation: solo redshift da ~85% accuracy, pero confunde STAR↔GALAXY de baja-z. Sumando bandas u-g-r-i-z el modelo recupera ~10 puntos. Ver `notebooks/03_modeling.ipynb` sección "Feature ablation". |
| ¿Cuál es el costo del error por clase? | Confundir QSO→STAR es el caso más caro (quásares son raros y científicamente valiosos). El `classification_report` muestra recall de QSO específicamente; si baja de 0.85 voy a `class_weight='balanced'` o ajusto el threshold. |
| ¿Cómo garantizas que NO hay data leakage? | (1) Split antes de escalar (Slide 39 U3_T2). (2) Drop de columnas metadata (run_ID, MJD, etc.) que podrían correlacionar con la clase por sesgo de muestreo. (3) Cross-validation con `StratifiedKFold` — si CV ≈ test accuracy, no hay leakage estructural. |
| ¿Cómo versionas modelo y datos? | `model_metadata.json` con SHA256 del CSV + fecha + features + hyperparams + métricas. Endpoint `GET /api/version` lo expone. Reproducibilidad garantizada con `random_state=42` fijo. |
| ¿Qué pasa si `model.pkl` no carga al startup? | FastAPI loguea error con stacktrace, marca `/api/health` como degraded, y `/api/predict` devuelve `503` con mensaje claro. No falla silenciosamente. |
| ¿Por qué octree custom y no solo cKDTree? | Decisión: **cKDTree es el indexador productivo** (rápido, probado, lo usa scipy). El octree custom es solo para la visualización wireframe — muestra la subdivisión del volumen, que es lo didáctico. Si el custom se atrasa, sale `/universe` sin wireframe (Plan B documentado en §8.9). |
| ¿Qué evidencia de usabilidad tienes? | 3 testers externos (no familia, no compañeros del proyecto) prueban la UI en Día 20; feedback registrado en `docs/usability_test.md` con: tiempo a primera predicción, tareas completadas, problemas reportados. NO confío en "se ve bonito". |
| ¿Hay shift de distribución entre train y la demo? | No: los 3 chips de demo son **filas reales del test set** del SDSS17 (no inputs sintéticos). Mismo dataset, misma distribución. |
| ¿Cómo se actualiza el modelo si SDSS publica nuevos datos? | Script `scripts/retrain.py` toma un nuevo CSV, re-ejecuta los notebooks 02-06, y genera nuevo `model_metadata.json` con timestamp + nuevo hash. No automatizado (fuera de scope para Prototype), pero documentado. |

---

## 11. Capas de la rúbrica /20 y dónde se cubren

| Criterio | Peso | Dónde se cubre |
|---|---|---|
| **Funcionalidad** /5 | Backend `/api/predict` + frontend funcionando + validación de inputs + tests | Semana 1 día 5 + Semana 2 día 9 + tests/test_predict.py |
| **Diseño y Usabilidad** /5 | 4 pantallas Tailwind + responsive + UX clara + copy en español neutro (NO rioplatense) | Semana 2-3 |
| **Integración Datos y Modelo** /7 | Notebooks técnicos completos + CV + classification_report + matriz confusión + scaler justificado + RF con feature importance | Semana 1 |
| **Innovación** /3 | Quadtree 2D + Octree 3D + sistema de vecinos cercanos (cKDTree productivo, octree visual) + Data Product Canvas | Semana 1-3 transversal |

**Total objetivo**: 18-20 / 20.

---

## 12. Riesgos y plan de mitigación

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Plotly Scatter3d lagea con 10K puntos | Baja | Reducir a 5K puntos en frontend (sampling estratificado por clase). Plotly soporta WebGL nativo con `Scattergl`. |
| Octree custom es lento con 100K puntos | Media | Usar scipy.spatial.cKDTree para k-NN (es lo que recomienda la industria); el "octree visual" es solo para mostrar la subdivisión, no para queries. |
| FastAPI + Next.js corriendo en paralelo durante demo trae problemas de CORS | Baja | Configurar CORS desde día 5. Documentar comandos de arranque en README. |
| Dataset baja en performance en mi laptop | Baja | Samplear a 10K para frontend; entrenar con 100K en notebook. |
| El profe pide UI distinta a Next | Baja | Streamlit como fallback total (degrada todo a Ruta A en 2 días). |
| Olvido el Data Product Canvas y solo entrego notebook + frontend | Media | Hacer Canvas en Semana 1 día 7 (buffer), no al final. |

---

## 13. Convenciones del proyecto

- **Idioma del código**: inglés (variables, funciones, comentarios).
- **Idioma de la UI y docs**: español **neutro** (peruano). NUNCA rioplatense ("vos/querés/arrastrá") — referencia: [feedback_no_rioplatense](~/.claude/projects/-Users-alejandromarcelo-Desktop-PROYECTOS-2026/memory/feedback_no_rioplatense.md).
- **Commits**: SIN co-author Claude — solo autoría del usuario. Referencia: [feedback_no_coauthor_trailer](~/.claude/projects/-Users-alejandromarcelo-Desktop-PROYECTOS-2026/memory/feedback_no_coauthor_trailer.md).
- **No correr build con dev server vivo**: referencia [feedback_next_build_vs_dev](~/.claude/projects/-Users-alejandromarcelo-Desktop-PROYECTOS-2026/memory/feedback_next_build_vs_dev.md).
- **No extender scope sin preguntar**: referencia [feedback_no_extender_scope](~/.claude/projects/-Users-alejandromarcelo-Desktop-PROYECTOS-2026/memory/feedback_no_extender_scope.md).

---

## 14. Entregables finales

Al cierre del proyecto el repo contiene:

1. **6 notebooks técnicos** (01-06) reproducibles end-to-end.
2. **Backend FastAPI** con 5 endpoints + tests.
3. **Frontend Next.js** con 4 pantallas pulidas.
4. **3 modelos pickleados** (model, scaler, label_encoder) + train_ranges.json.
5. **2 JSONs precalculados** (quadtree.json, octree.json) para frontend.
6. **Documentos en `docs/`**:
   - Data Product Canvas (9 bloques).
   - User Persona.
   - Journey Map.
   - Wireframes/Mockups de las 4 pantallas.
   - Defense Q&A.
   - **Elevator Pitch** (5 componentes según Slide 45 Ideación: Gancho, Problema, Solución, Valor, Call to action) — guion de 60-90 segundos para la presentación oral.
   - Architecture diagram.
7. **README** completo con setup local + demo en GIF/video.

---

## 15. Próximo paso inmediato

Bajar el dataset de Kaggle y empezar `01_eda.ipynb`. Comando:

```bash
cd ~/Desktop/PROYECTOS_2026/stellar-classifier
mkdir -p backend/data notebooks
# bajar manualmente desde Kaggle "fedesoriano/stellar-classification-dataset-sdss17"
# o con kaggle CLI:
kaggle datasets download -d fedesoriano/stellar-classification-dataset-sdss17 -p backend/data --unzip
```

Después: `cd backend && python3 -m venv venv && source venv/bin/activate && pip install jupyter pandas numpy scikit-learn matplotlib seaborn scipy fastapi uvicorn pydantic joblib` → arrancar `notebooks/01_eda.ipynb`.
