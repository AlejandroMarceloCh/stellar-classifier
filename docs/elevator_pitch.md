# Elevator Pitch — Stellar Classifier

> **Framework**: Slide 42-45 Ideación (Curso DS3022) — 5 componentes.
> **Duración objetivo**: 60-90 segundos.
> **Versión**: v1.0 — Día 0 (refinable en Día 19).

---

## Guion completo (lectura en voz alta = ~75 segundos)

### 1. Gancho (10 seg)

> *"Cada noche, el Sloan Digital Sky Survey captura más de un millón de objetos celestes. Clasificar cada uno con espectroscopía profesional costaría décadas de tiempo de observatorio."*

**Cómo decirlo**: pausado, con énfasis en "un millón" y "décadas". Mirar a una persona específica del jurado.

---

### 2. Problema (15 seg)

> *"Los astrónomos amateur que tienen telescopio en casa, y los observatorios pequeños sin espectrógrafo, no tienen forma rápida de saber qué tipo de objeto observaron. Hoy buscan manualmente en catálogos crípticos, o esperan semanas a que se publiquen los datos del SDSS oficial. La mayoría termina con un backlog de objetos sin clasificar."*

**Cómo decirlo**: tono empático. Mostrar que entiendes el dolor real.

---

### 3. Solución (20 seg)

> *"Stellar Classifier toma 8 observaciones básicas que cualquier amateur puede medir — posición en el cielo, brillo en cinco bandas fotométricas, y redshift — y predice de forma instantánea si es una Galaxia, una Estrella o un Quásar. Además, te muestra dónde cae tu objeto entre diez mil reales del SDSS, en un universo 3D rotable, con sus cinco vecinos más cercanos resaltados."*

**Cómo decirlo**: enfatizar "instantánea", "diez mil reales", "3D rotable". Acompañar con gesto que sugiera rotación.

---

### 4. Propuesta de valor (15 seg)

> *"Combina un modelo de Random Forest entrenado sobre 100 mil objetos confirmados del SDSS con dos estructuras espaciales —un quadtree del mapa del cielo y un octree del universo 3D— que son las mismas que usan los catálogos astronómicos profesionales. No solo predices: comprendes el contexto físico donde cae tu objeto."*

**Cómo decirlo**: aquí va el punto técnico fuerte (quadtree/octree = innovación). No apurarse.

---

### 5. Call to action (10 seg)

> *"Lo pueden probar ahora mismo. Hay tres ejemplos cargados con un solo click —una galaxia conocida, una estrella vecina, y un quásar famoso— para ver el flujo completo en menos de un minuto. ¿Vamos al universo?"*

**Cómo decirlo**: sonrisa al final. Transición directa a la demo en pantalla (`/`).

---

## Versión corta (30-40 segundos — backup si el tiempo es ajustado)

> *"El SDSS publica más de un millón de objetos celestes por noche, pero los amateur y observatorios pequeños no tienen forma rápida de clasificarlos. Stellar Classifier toma 8 mediciones básicas y predice si es Galaxia, Estrella o Quásar al instante, mostrando el objeto dentro de un universo 3D rotable con sus vecinos similares. Hay 3 ejemplos cargados para probarlo en un click — ¿lo vemos?"*

---

## Versión técnica (45 segundos — para audiencia técnica si el profe pregunta más)

> *"Stellar Classifier es un Prototipo de producto de datos según la fase de MVP del curso. Backend en FastAPI con un Random Forest entrenado sobre 100K objetos del SDSS17 — accuracy en test [a confirmar Día 3] y superando el baseline trivial por al menos 25 puntos. Frontend en Next.js con visualización 2D del cielo en D3.js usando un quadtree custom, y visualización 3D del universo con Plotly Scatter3d más un octree. El sistema de vecinos cercanos usa scipy.spatial.cKDTree para que las queries sean rápidas — menos de 200ms p95 según el benchmark del Día 5. Sigue el flujo canónico de 8 fases del notebook de cultivos del profe, corrigiendo sus 6 bugs documentados."*

---

## Plan de ensayo (Día 19-20)

| Sesión | Duración | Foco |
|---|---|---|
| Ensayo 1 | 10 min | Leer en voz alta. Cronometrar. |
| Ensayo 2 | 10 min | Sin leer. Memorizar transiciones. |
| Ensayo 3 | 10 min | Grabarse en video. Revisar tics verbales ("eh", "este"). |
| Ensayo 4 | 10 min | Con un compañero como audiencia. Pedir feedback. |
| Ensayo 5 | 10 min | Final. Bajo presión simulada (con cronómetro visible). |

**Total**: 50 minutos en Día 19. Objetivo: poder dar el pitch sin notas, en exactamente 75 ± 10 segundos.

---

## Lo que NO decir

- ❌ **Mencionar Three.js** (descartado del scope).
- ❌ Decir accuracy específico antes de medirlo (Día 3 confirma).
- ❌ Decir "es producción ready" — es un **Prototipo**, no MVP Pilot (Slide 32 U2).
- ❌ Comparar contra herramientas que no investigamos a fondo (SIMBAD, NED) — riesgo de pregunta técnica que no puedo responder.
- ❌ Usar términos rioplatenses ("vos podés", "querés probarlo") — español neutro peruano.

---

## Convenciones de presentación oral

- Velocidad: 150-160 palabras por minuto (relajado, no apurado).
- Volumen: medio-alto (audiencia universitaria, ~20 personas).
- Pausas estratégicas: después de "un millón", "décadas", "instantánea" — dejar respirar el dato.
- Postura: erguida, manos visibles, NO en bolsillos.
- Contacto visual: rotar entre 3 puntos del jurado, no quedarse mirando uno solo.
