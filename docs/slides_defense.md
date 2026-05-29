# Defense Q&A — Stellar Classifier

> **Propósito**: preguntas que probablemente haga el profe (o un jurado estricto), con respuestas atadas a slides de la carta magna del curso.
> **Versión**: v1.0 — Día 0. Refinar Día 19 con métricas reales medidas.
> **Convención**: las respuestas con `[a confirmar Día N]` requieren actualización con el dato real medido.

---

## Categoría 1 — Decisiones de dataset y modelado

### Q: ¿Por qué este dataset (SDSS17)?

**A**: Por tres razones:
1. **Benchmark profesional**: SDSS Data Release 17 es estándar en la literatura astronómica. Según Slide 25 U1_T1 (Taxonomía Zrenner), califica como External / Open / Structured / Volume-Driven.
2. **Las features son interpretables**: `alpha, delta, redshift` son **coordenadas físicas reales** del cielo, no abstractas. Habilitan visualización con sentido (quadtree del cielo, octree del universo).
3. **Tamaño manejable**: 100K filas — suficiente para entrenar un modelo robusto sin desbordar la laptop ni la presentación.

### Q: ¿Por qué `stratify=y` en el split?

**A**: El balance es ~59% GALAXY / ~22% STAR / ~19% QSO, no uniforme. Sin `stratify`, un test aleatorio podría desbalancearse aún más y producir métricas engañosas (Slide 11 U4_T2 — "sin balance, accuracy engaña"). `stratify=y` mantiene la proporción de clases en train y test. **Mejora explícita sobre el notebook base del profe** que omitió este detalle.

### Q: ¿Por qué `StandardScaler` solo, sin MinMax también?

**A**: Slide 40 U3_T2 deja la elección abierta entre MinMax y Standard. Lo cerré con datos: en el experimento previo con el dataset cultivos del profe, Standard solo > MinMax+Standard en cascada para modelos lineales (LogReg). Para árboles (RF, GB), Slide 38 U3_T2 dice que da igual. Hacer doble escalado es redundante y oscurece el pipeline.

### Q: ¿Por qué Random Forest y no Naive Bayes que es más simple?

**A**: La matriz de correlación de features fotométricas muestra alta correlación entre u-g-r-i-z (son filtros del mismo objeto a diferentes longitudes de onda). Naive Bayes asume independencia condicional entre features — supuesto que se viola fuertemente acá. RF maneja correlaciones de forma natural y captura interacciones no-lineales (típico de astronomía: redshift × brillo determina muchas cosas). Slide 13 U4_T2: "un algoritmo razonable con buenos datos a menudo supera a un gran algoritmo con datos no tan buenos" — RF es ese "algoritmo razonable".

### Q: ¿Por qué joblib en lugar de pickle?

**A**: Slide 56-57 U4_T2 explícito: joblib es óptimo para modelos con muchos NumPy arrays. Random Forest con 100 árboles tiene cientos de arrays internamente — joblib usa compresión y paralelismo que pickle no tiene. Para modelos pequeños daría igual; para RF, joblib es la elección estándar de scikit-learn.

---

## Categoría 2 — Decisiones de visualización y producto

### Q: ¿Por qué quadtree y octree? ¿No es overengineering?

**A**: No, por dos razones:
1. **Sentido físico**: las features `alpha`, `delta`, `redshift` SON coordenadas — no estoy forzando estructuras espaciales sobre data tabular cualquiera. Es exactamente lo que usan los catálogos SDSS reales (HEALPix tessellation).
2. **Uso productivo, no decorativo**: el quadtree sirve para visualizar densidad celeste (mapa de calor por cuadrantes); el octree sirve para **k-NN rápido** del objeto consultado en el universo 3D. Sin ellos, mostrar "objetos similares" sería un scan lineal de 100K filas por request.

### Q: ¿Por qué Plotly y no Three.js?

**A**: Decisión informada por curva de aprendizaje vs beneficio. Three.js requiere 2-3 días de setup para conseguir lo mismo (puntos 3D rotables, hover, zoom). Plotly Scatter3d lo da en 4-8 horas con menos código. Para un Prototipo universitario donde la rúbrica valora **funcionalidad y diseño** sobre **complejidad técnica gratuita**, Plotly gana.

### Q: ¿Por qué solo 10K puntos en `/universe` si el dataset tiene 100K?

**A**: Dos razones técnicas:
1. Plotly empieza a laggear con >20K puntos en navegadores promedio.
2. 10K es un sample estratificado por clase, así que mantiene la distribución del dataset completo.
Si quisieras precisión absoluta sobre todos los 100K, el `/sky-map` con quadtree es el canal correcto (agrega densidad sin renderizar punto por punto).

### Q: ¿Por qué tres chips de demo precargados?

**A**: Sin ellos, el profe (o cualquier usuario nuevo) llega al form y no sabe qué valores meter. Probaría con valores random, obtendría predicción extrapolada, y descartaría el producto. Los chips garantizan que en **un click** ve el flujo completo (predicción + universe + neighbors). Es onboarding, no decoración — coherente con el Persona Carlos (ver `user_persona.md`).

---

## Categoría 3 — Funcionalidad y robustez

### Q: ¿Cuál es la latencia del sistema?

**A**: Targets (Slide 18 U4_T2 — objetivo profe <300ms):
- `/api/predict`: p50 <100ms, p95 <200ms.
- `/api/neighbors` (cKDTree sobre 100K): p95 <150ms.
- Total end-to-end: <300ms.

Medición real registrada en `docs/benchmarks.md` post-Día 5 con 100 corridas y reportada como p50/p95/p99. **[Valores reales: a llenar Día 5]**.

### Q: ¿Y si el usuario ingresa redshift=10 (imposible físicamente)?

**A**: El backend rechaza el input antes de predecir. Pydantic valida tipos; `backend/ml/validation.py` valida rangos contra `train_ranges.json` (mínimo/máximo observados en el dataset de entrenamiento). Devuelve HTTP 400 con mensaje claro:
```json
{
  "error_code": "INPUT_OUT_OF_RANGE",
  "message": "redshift=10 está fuera del rango entrenado [-0.01, 7.01]",
  "field": "redshift",
  "valid_range": {"min": -0.01, "max": 7.01}
}
```
Slide 16 U5 — "precisión y costo del error". Mejor decir "no sé" que extrapolar silenciosamente.

### Q: ¿Qué pasa si `model.pkl` está corrupto o no carga?

**A**: FastAPI loguea el stacktrace al startup. El endpoint `/api/health` reporta `degraded`. `/api/predict` devuelve HTTP 503 con: *"Modelo no disponible — contactar al administrador"*. No falla silenciosamente con predicciones aleatorias. **Defensa**: la robustez del backend es parte de Funcionalidad/5 — sin manejo de fallos, perdés puntos aunque el caso feliz funcione.

### Q: ¿Es un MVP o un producto?

**A**: Es un **Prototipo** según Slide 32 U2 — "modelo robusto + sistema de soporte mínimo + UI inicial". NO es un MVP Pilot (que requiere monitoreo en producción, logs centralizados, métricas en vivo, etc.). El curso enseña que el Prototipo es la fase 2 de 5 del ciclo MVP — y eso es exactamente lo que entrega este proyecto.

### Q: ¿Es un producto de datos compuesto?

**A**: Sí. Slide 32 U1_T1 — "wheels within wheels". El producto integra:
- **Sub-producto 1**: clasificador ML (Random Forest).
- **Sub-producto 2**: indexador espacial (cKDTree + octree visual).
- **Sub-producto 3**: visualizador web (4 pantallas).
Cada uno tiene su propio pipeline y métricas, integrados en el sistema final.

---

## Categoría 4 — Preguntas DURAS (jurado estricto)

### Q: ¿Cuál es tu baseline trivial y cuánto lo superas?

**A**: `DummyClassifier(strategy='most_frequent')` predice siempre GALAXY (la clase mayoritaria) → accuracy ≈ 59%. El RF lo supera por **≥25 puntos absolutos** [a confirmar Día 3]. Sin este baseline, una accuracy de 95% suena impresionante pero no se sabe si el modelo realmente aprendió algo o solo está prediciendo la clase dominante. Reportado en `model_metadata.json` y visible en `/analysis`.

### Q: ¿Por qué no usar solo `redshift` si separa tanto las clases?

**A**: Lo probé (ablation en `notebooks/03_modeling.ipynb`):
- Solo redshift: ~85% accuracy [a confirmar Día 3].
- Todas las features: ~97% accuracy [a confirmar Día 3].

La diferencia (~12 puntos) viene de los casos límite: stars cercanas con redshift cosmológico ~0 que se confunden con galaxias de baja-z. Las bandas fotométricas (u-g-r-i-z) capturan diferencias espectrales que el redshift solo no resuelve.

### Q: ¿Cuál es el costo del error por clase?

**A**: Asimétrico:
- **Confundir QSO → STAR** (false negative de quásar): caro. Los quásares son raros y científicamente valiosos. Si el modelo los manda a STAR, se pierde la observación de seguimiento.
- **Confundir STAR → QSO** (false positive): barato. El follow-up espectroscópico confirma o descarta rápido.

Por eso vigilo el **recall de la clase QSO** específicamente. Target: ≥ 0.85. Si baja, ajusto con `class_weight='balanced'` o muevo el threshold de decisión.

### Q: ¿Cómo garantizas que no hay data leakage?

**A**: Tres controles:
1. **Split antes de escalar** (Slide 39 U3_T2) — el scaler se ajusta solo con train, no ve el test.
2. **Drop de columnas metadata** (run_ID, MJD, plate, etc.) que podrían correlacionar con la clase por el orden en que SDSS las muestreó.
3. **Cross-validation**: si CV accuracy ≈ test accuracy ± 0.5 puntos, no hay leakage estructural. Si difieren mucho, hay sobreajuste o leakage que investigar.

### Q: ¿Cómo versionas modelo y datos para reproducir resultados?

**A**: `models/model_metadata.json` se genera junto con `model.pkl` y contiene:
- SHA256 del CSV de entrada.
- Lista exacta de features.
- Hyperparameters del modelo.
- Métricas (accuracy, F1, baseline, std del CV).
- Fecha de entrenamiento.
- `random_state=42` fijo.

Endpoint `GET /api/version` expone este JSON. Cualquier resultado puede reproducirse re-corriendo notebooks con el mismo CSV + random_state.

### Q: ¿Por qué octree custom y no solo `cKDTree` de scipy?

**A**: Decisión bifurcada:
- **Productivo (lookup de neighbors)**: `scipy.spatial.cKDTree`. Es lo que la industria usa, está optimizado en C, sub-milisegundo para k=5 sobre 100K puntos.
- **Visual (wireframe del octree)**: implementación custom en `backend/ml/octree_builder.py`. Su único propósito es **mostrar la subdivisión** del volumen al usuario, no hacer queries.

Si la implementación custom se atrasa, la pantalla `/universe` sale sin wireframe (Plan B en `plan.md §8.9`). El cKDTree sigue funcionando.

### Q: ¿Qué evidencia tienes de usabilidad más allá de "se ve bonito"?

**A**: En Día 20, 3 testers externos (no familia, no compañeros del proyecto) prueban la UI sin guía. Mido:
- Tiempo desde URL hasta primera predicción (target ≤ 2 min).
- Tareas completadas (3 chips + 1 clasificación propia + abrir `/universe`).
- Problemas reportados (preguntas abiertas).

Resultados en `docs/usability_test.md`. **Sin este test, "diseño excelente" del rubric es opinión, no evidencia.**

### Q: ¿Hay shift de distribución entre train y la demo?

**A**: No. Los 3 chips de demo son **filas reales del test set** del SDSS17 (curadas en Día 9 contra el CSV real, no inputs sintéticos). Misma fuente, misma distribución, misma escala. Si el modelo predice mal un chip, eso es bug del modelo, no del input.

### Q: ¿Cómo se actualiza el modelo si SDSS publica nuevos datos?

**A**: Hay un script `scripts/retrain.py` que toma un nuevo CSV, re-ejecuta el pipeline de notebooks 02-06 (preprocessing → modelado → inferencia), y genera un nuevo `model.pkl` + `model_metadata.json` con timestamp y nuevo hash. **No automatizado** (fuera de scope del Prototipo según Slide 32 U2 — un MVP Pilot sí lo automatizaría con cron + monitoreo). Documentado en README.

### Q: ¿Qué pasa si el Plotly Scatter3d laggea en la laptop del salón durante la demo?

**A**: Plan B documentado: reducir a 5K puntos (sample estratificado) + activar `Scattergl` (WebGL nativo). Plan C: 2K puntos. La pantalla `/universe` cumple su propósito con cualquier cantidad ≥ 2K — el insight es la separación 3D de clases, no el conteo bruto.

---

## Preguntas que NO espero pero estoy preparado

### Q: ¿Por qué no usaste un modelo más sofisticado tipo XGBoost o LightGBM?

**A**: Los probé implícitamente: `GradientBoostingClassifier` está en los 10 modelos del benchmark. Si gana sobre RF, lo uso. XGBoost/LightGBM darían rendimiento similar pero agregan dependencia externa que el notebook del profe no usa — coherencia con la convención del curso.

### Q: ¿No es un problema que el dataset sea de Kaggle y no del SDSS oficial?

**A**: Es la misma data publicada por SDSS Data Release 17. `fedesoriano` lo subió a Kaggle con licencia abierta para facilitar acceso. El propio SDSS publica en CAS (Catalog Archive Server) con SQL queries — más fricción para descargar. Cualquier paper de astronomía moderna acepta SDSS como fuente.

### Q: ¿Qué tan generalizable es a otros surveys (Gaia, Pan-STARRS)?

**A**: Las features fotométricas son específicas del SDSS (filtros u-g-r-i-z). Gaia usa otros filtros (G, BP, RP). Re-entrenar con Gaia requiere un nuevo dataset y nuevos rangos. **Eso es trabajo futuro, no parte del Prototipo.** Lo importante es que el pipeline (notebooks 01-06 → backend → frontend) es **portable** — sólo cambian los datos de entrada.

### Q: ¿Por qué no tienes tests unitarios?

**A**: Sí los tengo: `backend/tests/test_predict.py` cubre los casos críticos:
- Predicción con input válido devuelve estructura correcta.
- Input fuera de rango devuelve HTTP 400.
- Modelo no cargado devuelve HTTP 503.

No es cobertura 100% (sería overkill para un Prototipo), pero los caminos críticos están testeados.

---

## Plan de uso de este documento

| Cuándo | Qué hacer |
|---|---|
| **Día 3** (modelado cerrado) | Llenar `[a confirmar Día 3]` con números reales. |
| **Día 5** (backend listo) | Llenar `[a confirmar Día 5]` con métricas de benchmark. |
| **Día 19** (ensayo defensa) | Leer en voz alta. Marcar respuestas que sientas inseguras. |
| **Día 20** (ensayo final) | Practicar las 5 preguntas más probables sin notas. |
| **Día 21** (entrega) | Tener este doc abierto en tab durante la presentación. |
