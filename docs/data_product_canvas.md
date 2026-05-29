# Data Product Canvas — Stellar Classifier

> **Framework**: Slide 29 Ideación (Curso DS3022) — 9 bloques.
> **Versión**: v1.0 — Día 0 del proyecto.
> **Última actualización**: 2026-05-26.

---

## 1. Problema

Identificar el tipo de un objeto celeste observado (Galaxia, Estrella o Quásar) requiere análisis espectroscópico que es **costoso, lento y poco accesible** para observatorios pequeños y astrónomos amateur.

Surveys masivos como SDSS generan más de **1 millón de objetos por noche**, y la clasificación manual o por espectroscopía no escala. Los amateur con telescopio tampoco tienen acceso a espectrógrafos profesionales — quedan limitados a fotometría básica.

**Pregunta de negocio** (Slide 22 U1_T1): *"¿Qué tipo de objeto celeste observé?"* → **Modelo de decisión**.

---

## 2. Usuario

Tres arquetipos, ordenados por prioridad:

1. **Astrónomo amateur con telescopio** *(prioridad alta — User Persona principal)*
   - Mide brillo en 5 bandas (u, g, r, i, z) y posición (alpha, delta) con su equipo.
   - Necesita validar rápido qué tipo de objeto observó antes de seguir observando.

2. **Observatorio pequeño sin espectrógrafo**
   - Genera catálogos fotométricos masivos.
   - Necesita pre-clasificación automatizada para priorizar follow-up espectroscópico.

3. **Estudiante de astrofísica**
   - Usa el sistema como herramienta de aprendizaje.
   - Valora la visualización 3D para entender el universo local.

Detalle completo del Persona principal en [`user_persona.md`](./user_persona.md).

---

## 3. Data

**Dataset**: Stellar Classification SDSS17 (`fedesoriano/stellar-classification-dataset-sdss17` en Kaggle).

| Aspecto | Valor |
|---|---|
| Origen | Externa, Open, Estructurada (Taxonomía Zrenner — Slide 25 U1_T1) |
| Tamaño | 100,000 filas |
| Clases | 3 — GALAXY (~59%), STAR (~22%), QSO (~19%) |
| Features predictivas | 8 — alpha, delta, u, g, r, i, z, redshift |
| Features descartadas | 8 — run_ID, rerun_ID, cam_col, field_ID, spec_obj_ID, plate, MJD, fiber_ID (IDs sin valor predictivo) |
| Calidad esperada | Limpio (SDSS es un benchmark profesional); a confirmar nulls/duplicados en Notebook 01 |

**Por qué este dataset**: las features `alpha`, `delta`, `redshift` son **coordenadas espaciales reales** del cielo. Habilitan visualización con sentido físico (quadtree del mapa celeste, octree del universo 3D), no decoración.

---

## 4. Hipótesis

**H1** (modelo): Las 8 features fotométricas + espaciales son suficientes para discriminar las 3 clases con accuracy ≥ 90% en test (target post-modelado en Día 3).

**H2** (UX): Un astrónomo amateur puede obtener una predicción + interpretación visual en menos de 3 minutos desde que llega a la URL.

**H3** (innovación): Visualizar el objeto consultado dentro del universo local (octree 3D con sus k-vecinos resaltados) aumenta la confianza del usuario en la predicción vs. solo mostrar el label.

---

## 5. Solución

**Producto web con 4 pantallas**:

1. **`/` — Predicción**: form con 8 inputs + 3 chips de demo precargados → clase + confianza + top-3 + mini-vista 3D.
2. **`/sky-map` — Mapa del cielo (quadtree 2D)**: visualización D3.js de la densidad celeste por cuadrantes.
3. **`/universe` — Universo 3D (octree)**: Plotly Scatter3d rotable con 10K objetos, octree wireframe opcional, vecinos resaltados.
4. **`/analysis` — Métricas**: confusion matrix, comparativa de 10 modelos, feature importance.

**Modelo**: Random Forest (probable, decisión post-experimento en Día 3 — comparado contra 9 alternativas y baseline trivial).

**Pipeline del producto** (Slide 6 U4_T2):
```
User Data (8 inputs) → User Profile (vector features) → Recommender (clasificador RF) → Product (clase + top-3 + vecinos similares)
```

---

## 6. Actores

| Actor | Rol |
|---|---|
| **Sponsor** | Prof. Germain García Zanabria (evaluador del curso DS3022). |
| **Stakeholders** | Comunidad astronómica amateur, estudiantes UTEC, observatorios sin espectrógrafo. |
| **Equipo** | 1 estudiante (yo, Alejandro Marcelo). |
| **Proveedor de datos** | Sloan Digital Sky Survey (SDSS) Data Release 17, dataset distribuido vía Kaggle por `fedesoriano`. |

---

## 7. Métricas

### Modelo
| Métrica | Target | Cuándo se mide |
|---|---|---|
| Accuracy test | ≥ 90% | Día 3 |
| F1 macro test | ≥ 0.85 | Día 3 |
| Baseline (DummyClassifier `most_frequent`) | ~59% (referencia) | Día 3 |
| Margen sobre baseline | ≥ 25 puntos absolutos | Día 3 |
| Cross-val accuracy mean ± std | ≥ 0.95 ± 0.01 | Día 3 |
| Recall de clase QSO (minoritaria) | ≥ 0.85 | Día 3 |

### Sistema
| Métrica | Target | Cuándo se mide |
|---|---|---|
| Latencia p50 `/api/predict` | < 100 ms | Día 5 (benchmark) |
| Latencia p95 `/api/predict` | < 200 ms | Día 5 (benchmark) |
| Latencia p95 `/api/neighbors` (cKDTree) | < 150 ms | Día 13 |
| Carga inicial `/universe` con 10K puntos | < 3 s | Día 15 |

### Producto / Usabilidad
| Métrica | Target | Cuándo se mide |
|---|---|---|
| Tiempo hasta primera predicción (usuario nuevo) | ≤ 2 min | Día 20 (3 testers) |
| Tareas completadas sin guía | 3/3 | Día 20 |

**Slide 18 U4_T2** define <300ms como ideal en producción — nuestros targets están holgadamente debajo.

---

## 8. Impacto

| Tipo | Descripción |
|---|---|
| **Educativo** | Democratizar el acceso a clasificación astronómica; herramienta de aprendizaje sobre objetos celestes y estructura del universo. |
| **Operacional** | Reducir tiempo de pre-clasificación manual de minutos/horas a segundos. |
| **Científico** | Pre-filtrar candidatos para follow-up espectroscópico costoso. |
| **Académico** (curso) | Demostrar dominio del flujo CRISP-DM + integración de un producto de datos completo (no solo modelo). |

---

## 9. Acciones

1. **Día 0** — Ideación (este documento) + User Persona + Journey Map + Wireframes.
2. **Semana 1** — Notebooks 01-06 + backend FastAPI + endpoint `/predict` + quadtree.
3. **Semana 2** — Frontend Next.js + 3 pantallas + endpoints `/octree` y `/neighbors`.
4. **Semana 3** — Visualización 3D + pulido + docs + elevator pitch + demo.
5. **Día 21** — Entrega final.

Cronograma completo + Definition of Done en [`plan.md §8`](../plan.md).
