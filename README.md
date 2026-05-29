# Stellar Classifier

> Producto de datos completo que clasifica objetos celestes (Galaxy / Star / Quasar) usando el dataset Stellar Classification SDSS17, con visualización espacial 2D (quadtree) y 3D (octree).
>
> **Curso**: DS3022 — Desarrollo de Producto de Datos (UTEC) — Prof. Germain García Zanabria.

---

## Arquitectura

- **Backend**: FastAPI 0.115 + scikit-learn 1.7 + joblib + SciPy cKDTree
- **Frontend**: Next.js 15 + Tailwind 3.4 + Recharts (matriz/bar charts) + Plotly.js-dist-min (Scatter3d) + SVG nativo (quadtree)
- **Notebooks**: 5 notebooks Jupyter (01-05) que replican el flujo canónico del curso (EDA → preprocessing → modeling → quadtree → octree)
- **Modelo ganador**: Random Forest — test_acc 0.9804, F1 macro 0.977, margen +38.59 pts vs baseline trivial

Documento maestro del proyecto: [plan.md](./plan.md).

### Pantallas del frontend

| Ruta | Función | Datos |
|---|---|---|
| `/` | Predicción individual con form + 3 demos reales | `/api/predict`, `/api/ranges`, `/api/demo-objects` |
| `/sky-map` | Quadtree 2D (α × δ) sobre 100K objetos | `/api/quadtree` |
| `/universe` | Scatter 3D rotable + wireframe octree opcional + marcador de tu última predicción | `/api/octree`, `/api/sample-points` |
| `/analysis` | Matriz confusión, comparativa de 10 modelos (CV ± std + test acc), feature importance | `/api/version`, `/api/modeling-summary` |

El estado entre `/` y `/universe` se persiste en `localStorage` (clave `stellar.lastPrediction.v1`).

---

## Estructura

```
stellar-classifier/
├── plan.md                  # plan maestro (15 secciones)
├── notebooks/               # 6 notebooks técnicos
├── backend/                 # FastAPI + ML
│   ├── routes/              # endpoints
│   ├── ml/                  # inferencia, quadtree, octree, validación
│   ├── models/              # modelos serializados (joblib)
│   ├── data/                # dataset SDSS17 (NO commiteado)
│   └── scripts/             # benchmark, retrain
├── frontend/                # Next.js (Día 8+)
└── docs/                    # Canvas, Persona, Journey, Pitch, Q&A, mockups
```

---

## Setup local

### 1. Bajar el dataset

Desde Kaggle:
```bash
# Opción A — manual: https://www.kaggle.com/datasets/fedesoriano/stellar-classification-dataset-sdss17
# Descomprimir en backend/data/

# Opción B — con kaggle CLI:
kaggle datasets download -d fedesoriano/stellar-classification-dataset-sdss17 -p backend/data --unzip
```

Resultado esperado: `backend/data/star_classification.csv` (~9 MB, 100K filas).

### 2. Backend (Python)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Correr notebook EDA inicial:
```bash
jupyter lab ../notebooks/01_eda.ipynb
```

Levantar API (a partir de Día 5) desde el **root** del proyecto:
```bash
cd ~/Desktop/PROYECTOS_2026/stellar-classifier
backend/venv/bin/uvicorn backend.main:app --reload --port 8000
```

Para correr los tests del backend:
```bash
backend/venv/bin/pytest backend/tests/ -v
```

Para correr el benchmark de latencia (p50/p95/p99):
```bash
backend/venv/bin/python -m backend.scripts.benchmark
```

### 3. Frontend (Next.js)

```bash
cd frontend
npm install
# variable opcional si cambias el puerto del backend:
# echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
# → http://localhost:3000
```

Para typecheck y build:
```bash
npm run typecheck
npm run build
```

---

## Plan de 21 días

| Semana | Días | Foco |
|---|---|---|
| Día 0 | hoy | Ideación + Wireframes |
| Semana 1 | 1-7 | Notebooks + Backend + Quadtree |
| Semana 2 | 8-14 | Frontend base + 3 pantallas + Octree backend |
| Semana 3 | 15-21 | Visualización 3D + pulido + defensa |

Detalle completo en [plan.md §8](./plan.md).

---

## API endpoints

| Método | Path | Descripción |
|---|---|---|
| GET | `/api/health` | Liveness check + `model_loaded` |
| GET | `/api/version` | Metadata completa del modelo cargado (hyperparams, métricas, feature_importance) |
| GET | `/api/ranges` | Rangos `min/max/mean/std` de cada feature en el train set |
| GET | `/api/demo-objects` | 3 filas reales con confianza ≥ 0.99 (una por clase) |
| POST | `/api/predict` | Predicción para 1 objeto · valida rangos · devuelve `prediction`, `confidence`, `top3` |
| POST | `/api/neighbors` | k-NN sobre 99 999 objetos vía cKDTree (default k=5) |
| GET | `/api/quadtree` | Estructura jerárquica 2D del cielo (α × δ) — ~582 KB |
| GET | `/api/octree` | Estructura jerárquica 3D normalizada (α × δ × redshift) |
| GET | `/api/sample-points` | 10 000 puntos estratificados para Scatter3d |
| GET | `/api/modeling-summary` | Snapshot de `notebooks/03_modeling.ipynb`: 10 modelos, CV, confusion matrix, decisiones |

Documentación interactiva: http://localhost:8000/docs (Swagger UI provisto por FastAPI).

---

## Documentos del producto

- [Data Product Canvas](./docs/data_product_canvas.md) — 9 bloques (Slide 29 Ideación)
- [User Persona](./docs/user_persona.md) — Slide 14-16 Ideación
- [Journey Map](./docs/journey_map.md) — Slide 26 Ideación
- [Wireframes](./docs/mockups/) — 4 pantallas (Slide 39-41 Ideación)
- [Elevator Pitch](./docs/elevator_pitch.md) — 5 componentes (Slide 42-45 Ideación)
- [Defense Q&A](./docs/slides_defense.md) — preguntas probables + duras

---

## Convenciones

- Código en inglés (variables, funciones, comentarios).
- UI y docs en español neutro peruano (NO rioplatense).
- Commits con autoría limpia (sin co-author trailers).
