# Prompt para auditoría del plan con Codex 5.5

> Copiar TODO el bloque debajo y pegarlo en Codex 5.5 (CLI o web).
> Asume que Codex tiene acceso al archivo `plan.md` del repo. Si no, pegar también el contenido del plan.md después del prompt.

---

## ──────── COPIAR DESDE ACÁ ────────

Eres un revisor técnico senior. Vas a auditar un plan de proyecto final de un curso universitario de Data Science. El plan está en el archivo `plan.md` del directorio actual (`/Users/alejandromarcelo/Desktop/PROYECTOS_2026/stellar-classifier/plan.md`). Léelo completo antes de responder.

### CONTEXTO COMPLETO (necesario para auditar bien)

**Quién soy yo (el autor del plan)**
- Estudiante de UTEC (Lima, Perú), Computer Science.
- Manejo Python (scraping, pandas, FastAPI, ML básico), JS/TS (React, Next.js, Tailwind, Vite, Expo), PostgreSQL, Docker.
- No he tocado Three.js antes. Sí manejo D3.js a nivel básico.

**El curso**
- **DS-3022 "Desarrollo de Producto de Datos"** en UTEC.
- Profesor: Germain García Zanabria.
- El curso enseña a construir **productos de datos completos** (no solo modelos): Ideación → MVP → Notebook técnico → UI/MLUX.
- 5 unidades cubiertas: U1 Fundamentos, U2 Requerimientos+MVP, U3 Feature Engineering, U4 Modelos+ML in Production, U5 MLUX/MLUI.
- El profe nos dio un notebook de ejemplo `Recomendación_producto.ipynb` (clasificación de 22 cultivos según N, P, K, temperatura, humedad, pH, lluvia) que sirve de **plantilla técnica**.

**Rúbrica del proyecto final (20 pts total)**

| Criterio | Pts | Descripción del nivel "Excelente" |
|----------|-----|-----------------------------------|
| Funcionalidad | 5 | Funciona impecable, sin errores, cumple todos los requisitos funcionales. |
| Diseño y Usabilidad | 5 | Diseño excepcionalmente atractivo, usabilidad intuitiva y efectiva. |
| Integración de Datos y Modelo | 7 | Integración perfecta con los datos y modelo seleccionados, clara comprensión y utilización. |
| Innovación | 3 | Nivel excepcional, ideas/enfoques novedosos. |

**Lo que el profe enseña explícitamente (slides clave)**

- **Slide 22 U1_T1**: Productos de datos por pregunta de negocio:
  - "¿Qué debo hacer a continuación?" → **Modelo de decisión**.
  - "¿Cuál es mi desempeño?" → Métrica.
  - "¿Cuál será mi demanda futura?" → Pronóstico.
- **Slide 28-30 U1_T1**: Sistemas de recomendación / Decision support (ejemplos: Amazon "customers who viewed", OSINT, Bitcoin grafos).
- **Slide 6 U4_T2**: Pipeline de Recomendación: `User Data → User Profile → Recommender system → Product recommendations`.
- **Slide 29 Ideación**: Data Product Canvas con 9 bloques (Problema, Usuario, Data, Hipótesis, Solución, Actores, Métricas, Impacto, Acciones).
- **Slide 39-41 Ideación**: Construir Mock-up antes de codear.
- **Slide 42-45 Ideación**: Elevator Pitch — 5 componentes (Gancho, Problema, Solución, Propuesta de valor, Call to action).
- **Slide 11 U4_T2**: Distribución sesgada de datos — sin balance, accuracy engaña (ejemplo 99% saludable / 1% enfermo).
- **Slide 34-40 U3_T2**: Feature Scaling. Slide 38 = tabla canónica:
  - Necesitan escalar: Regresión, SVM, KNN, NN, K-Means, PCA.
  - NO necesitan: Decision Tree, Random Forest, Naive Bayes, Gradient Boosting.
  - Slide 39 = regla de oro: split ANTES de escalar (sino hay data leakage).
  - Slide 40 = el profe DEJA ABIERTO si usar MinMax o Standard.
- **Slide 13 U4_T2**: "Un algoritmo razonable con buenos datos a menudo superará a un gran algoritmo con datos no tan buenos" + invita a búsqueda bibliográfica.
- **Slide 16 U4_T2**: Servidor de Modelos — triángulo "Entrenar → Disponibilizar → Proveer servicio".
- **Slide 17-23 U4_T2**: Métricas en ambientes reales: Latencia (<300ms ideal), Costo, Rendimiento.
- **Slide 50-57 U4_T2**: Pickle vs Joblib. Joblib es óptimo para modelos con muchos NumPy arrays (RF de 100 árboles, etc.).
- **Slide 51 U4_T2**: después de cargar el pickle, evaluar con `classification_report`.
- **Slide 16 U5**: Precisión y costo del error — validar que el sistema no recomiende basura.
- **Slide 32 U2**: Fases de MVP (Prueba de Concepto → Prototype → MVP Pilot → MVP Listo → Expandir). Mi entrega = **Prototype** (modelo robusto + sistema soporte mínimo + UI).
- **Slide 32 U1_T1**: "Wheels within wheels" — un producto de datos puede ser compuesto (sub-productos integrados).

**El notebook base (Recomendación_producto.ipynb)** que sirve de plantilla técnica tiene 8 fases:

1. Carga + sanity check (`read_csv`, `head`, `shape`, `info`, `isnull`, `duplicated`, `describe`).
2. EDA (heatmap correlación, value_counts, distribuciones).
3. Encoding del target con diccionario manual.
4. Train/test split (`random_state=42`, sin `stratify` en el original).
5. Feature scaling con MinMax + Standard EN CASCADA (redundante, lo verifiqué experimentalmente — para Random Forest no afecta; para LogReg, Standard solo > MinMax+Standard).
6. Entrenar 10 modelos (LogReg, NB, SVM, KNN, DT, RF, Bagging, AdaBoost, GBoost, ExtraTrees), elegir el mejor por accuracy. AdaBoost colapsa en 14% por config default rota para 22 clases.
7. Función `recommendation(...)` que envuelve scaler + predict + decode. NO valida rangos de inputs → extrapola silenciosamente.
8. Pickle del modelo + scalers.

**Bugs conocidos del notebook base** (que mi plan SÍ corrige):
- Doble escalado redundante.
- Sin `stratify=y` en split.
- Sin classification_report ni matriz de confusión.
- Sin cross-validation.
- `recommendation()` no valida rangos → extrapola.
- `recommendation()` tira UserWarning por feature names mismatch.

**Mi proyecto (lo que el plan describe)**

- **Dataset**: Stellar Classification SDSS17 de Kaggle (`fedesoriano/stellar-classification-dataset-sdss17`). 100,000 filas, 3 clases (Galaxy/Star/Quasar), features: alpha (RA), delta (DEC), u, g, r, i, z (5 bandas fotométricas), redshift.
- **Por qué este dataset**: las features `alpha, delta, redshift` SON coordenadas espaciales reales del cielo → habilitan visualización con **quadtree 2D** (mapa del cielo) y **octree 3D** (universo). Esto es lo que usan los catálogos astronómicos reales (HEALPix, SDSS). Justifica innovación /3 sin ser decorativo.
- **Stack decidido**:
  - Backend: FastAPI + scikit-learn + joblib.
  - Frontend: Next.js 15 + Tailwind + **Plotly.js para 3D** (Three.js descartado definitivamente por curva de aprendizaje — stack 3D final es Plotly.js Scatter3d).
  - Notebooks técnicos en Jupyter.
- **4 pantallas del frontend**:
  1. `/` Predicción (form + 3 chips de demo con objetos reales).
  2. `/sky-map` Quadtree 2D con D3.js.
  3. `/universe` Plotly Scatter3d con octree wireframe.
  4. `/analysis` Métricas del modelo (confusion matrix, comparativa 10 modelos, feature importance).
- **Plan temporal**: Día 0 + 3 semanas (21 días).
  - Día 0: Wireframes + Data Product Canvas + User Persona + Journey Map.
  - Semana 1 (días 1-7): Notebooks 01-06 + backend FastAPI + quadtree.
  - Semana 2 (días 8-14): Frontend Next.js + 3 de 4 pantallas + endpoint /octree.
  - Semana 3 (días 15-21): Visualización 3D + pulido + docs + elevator pitch + demo.

**Convenciones obligatorias (NO violar)**
- Código en inglés (variables, funciones, comentarios).
- UI y docs en **español neutro peruano** — NO rioplatense ("vos/querés" prohibido).
- Sin co-author en commits (autoría limpia del estudiante).

---

### TU TAREA: AUDITAR ESE PLAN

Lee `plan.md` (15 secciones, ~500 líneas) y dame una auditoría desde 5 ángulos. NO eres complaciente — quiero que encuentres TODO lo que está mal o falta. Si el plan está perfecto en algún ángulo, dilo, pero no inventes elogios.

#### Ángulo 1 — Realismo del cronograma
- ¿Los días asignados a cada tarea son realistas para un estudiante intermedio que NO ha tocado Three.js, maneja FastAPI a nivel básico pero nunca lo desplegó en producción, y tiene otras obligaciones académicas paralelas?
- ¿Hay tareas que están subestimadas en tiempo? ¿Sobreestimadas?
- ¿El buffer del último día de cada semana es suficiente?
- ¿Qué pasaría si en Día 13 (octree) se atrasa? ¿El plan tiene degradación elegante?

#### Ángulo 2 — Cobertura de la rúbrica /20
Por cada criterio (Funcionalidad/5, Diseño/5, Datos&Modelo/7, Innovación/3), evalúa qué nota objetiva sacaría con lo que el plan describe. Sé específico — no "te falta diseño" sino "te falta storyboard, tu plan solo menciona wireframes low-fi".

#### Ángulo 3 — Decisiones técnicas
- ¿Plotly 3D vs Three.js — coincides con la decisión? ¿O recomendarías otra cosa (deck.gl, Three.js Fiber con plantilla, Babylon)?
- ¿Quadtree+Octree custom vs librerías existentes (scipy.spatial, healpy, open3d)? ¿El balance está bien?
- ¿FastAPI vs Flask vs Streamlit con custom — alternativas pertinentes?
- ¿La decisión de joblib > pickle está bien justificada?
- ¿Falta algo en el stack? ¿Sobra algo?
- ¿La arquitectura monorepo es la correcta o conviene separar backend/frontend en repos distintos?

#### Ángulo 4 — Gaps técnicos no contemplados
Cosas que el plan NO menciona pero deberían estar:
- ¿Manejo de errores en la API (HTTP 4xx/5xx, validation errors de Pydantic)?
- ¿CORS, rate limiting, autenticación básica?
- ¿Performance del entrenamiento (RF con 100K filas — tiempo esperado)?
- ¿Tamaño del pickle (puede ser ~50MB con 100 árboles) — afecta deploy?
- ¿Datos faltantes en SDSS17 (¿el dataset tiene nulls?)?
- ¿Outliers — qué hacer si redshift es negativo o NaN?
- ¿Cómo se actualiza el modelo si SDSS publica nuevos datos? (no es obligatorio pero el profe valora)
- ¿Versionado de modelo?
- ¿Logging, monitoring, observability básica?

#### Ángulo 5 — Defensa frente al profe
- Las 10 preguntas Q&A en la sección 10 del plan, ¿están bien respondidas?
- ¿Qué otras 5-10 preguntas haría un profe estricto que NO están cubiertas?
- ¿El elevator pitch de 60-90 segundos suena natural? ¿Es defendible?
- ¿La defensa "es un Prototype, no MVP Pilot" según Slide 32 U2 es correcta? ¿O el profe podría exigir más?

---

### FORMATO DE SALIDA QUE ESPERO

```
# Auditoría de plan.md (Stellar Classifier DS3022)

## Veredicto general
[1-2 párrafos: si arrancarías el plan tal cual o no, qué tan lejos está de un 18-20/20]

## Score por ángulo
- Realismo cronograma: X/10 — razón en 1 línea
- Cobertura rúbrica: X/10 — razón
- Decisiones técnicas: X/10 — razón
- Gaps técnicos: X/10 — razón
- Defensa: X/10 — razón

## Issues CRÍTICOS (cambian el plan, antes de arrancar)
[Lista numerada. Cada uno con: qué, por qué crítico, fix concreto en 1-3 líneas]

## Issues MEDIOS (mejoran sin reescribir el plan)
[Lista numerada con mismo formato]

## Issues MENORES (nice-to-have)
[Lista breve]

## Cosas que el plan hace BIEN (no inventar)
[2-5 puntos honestos]

## Riesgo final que más me preocupa
[Un solo riesgo: el que más probable es que hunda la entrega]

## Próximas 3 acciones concretas
[En orden, qué hacer apenas leído tu audit]
```

Responde en español neutro (no rioplatense). Directo, sin relleno. Si dudas de algo del contexto, pide aclaración antes de auditar — NO inventes.

## ──────── COPIAR HASTA ACÁ ────────

---

## Notas para mí (Alejandro) al usar este prompt

1. **Si Codex no puede leer archivos directamente**, antes de pegar este prompt, pega también el contenido COMPLETO de `plan.md` después con `<plan>...</plan>`.
2. **Si Codex pregunta por la carta magna**, dile que está en `/Users/alejandromarcelo/.claude/proyectos/proyecto-dpd-curso.md` (5137 líneas) y que las citas que aparecen en el plan ya son auto-suficientes.
3. **Si la auditoría de Codex contradice la de Claude**, no asumas que Codex tiene razón automáticamente — compara las dos audits y decide. Las contradicciones suelen ser interesantes (cada modelo ve cosas distintas).
4. **Después de auditar**, podés pedirle a Codex que **aplique los fixes críticos directamente al plan.md** — pasale el archivo y dile "aplica los issues CRÍTICOS y devuélveme el plan actualizado".
