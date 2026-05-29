# Wireframes — Stellar Classifier

> **Framework**: Slide 39-41 Ideación (Curso DS3022) — "Construir mock-up antes de codear".
> **Versión**: v1.0 — Día 0.
> **Fidelidad**: Low-fi (ASCII art). Suficiente para validar layout antes de implementar.

---

## Por qué ASCII y no Figma

Tres razones:
1. **Velocidad**: 30 min total vs 3-4 hrs en Figma.
2. **Versionable en git**: cambios revisables en diffs, no exports binarios.
3. **Suficiente fidelidad** para definir jerarquía, layout, navegación. Lo visual final se construye con Tailwind en Semana 2-3.

Si en la presentación el profe pide "mockups visuales", se exportan estos ASCII a imagen con `monodraw` o equivalente.

---

## Navegación global (todas las pantallas)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Stellar Classifier    [ Predicción ] [ Sky Map ] [ Universe ] [ Analysis ]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Tabs activos en color primario; resto en gris.
- Sticky top, contraste alto, fondo oscuro tipo "modo astronomía".

---

## Pantalla 1 — `/` (Predicción)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Stellar Classifier    [ Predicción* ] [ Sky Map ] [ Universe ] [ Analysis ] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Clasifica un objeto celeste                                                │
│   Ingresa observaciones del Sloan Digital Sky Survey o prueba un ejemplo.   │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │  Prueba con un ejemplo real:                                         │  │
│   │  [ 🌌 Galaxia M104 ]  [ ⭐ Estrella vecina ]  [ ✨ Quásar 3C 273 ]   │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   ┌─── Coordenadas espaciales ─────────────────────────────────────────┐    │
│   │  Alpha (RA)       [   189.997   ] grados   (0 – 360)              │    │
│   │  Delta (DEC)      [   -11.623   ] grados   (-90 – 90)             │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│   ┌─── Bandas fotométricas ────────────────────────────────────────────┐    │
│   │  u (ultravioleta) [   18.5   ]   (10 – 32)                        │    │
│   │  g (verde)        [   17.2   ]   (10 – 32)                        │    │
│   │  r (rojo)         [   16.8   ]   (10 – 32)                        │    │
│   │  i (infrarrojo)   [   16.5   ]   (10 – 32)                        │    │
│   │  z (cercano IR)   [   16.4   ]   (10 – 32)                        │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│   ┌─── Distancia cosmológica ──────────────────────────────────────────┐    │
│   │  Redshift (z)     [   0.003  ]   (-0.01 – 7.01)                   │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│           [    Clasificar    ]    (deshabilitado si hay rangos inválidos)   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Estado post-predicción (mismo path, sección de resultado expandida)

```
┌─── Resultado ──────────────────────────────────────────────────────────────┐
│                                                                            │
│   🌌 GALAXY                                                                │
│   Confianza: ████████████████████ 94%                                      │
│                                                                            │
│   Top-3 probables                                                          │
│   GALAXY  ████████████████████  94%                                        │
│   QSO     █                      5%                                        │
│   STAR    ▌                      1%                                        │
│                                                                            │
│   ┌─── Mini-vista del universo ─────────────────────────────────────────┐ │
│   │  (Plotly Scatter3d compacto, no interactivo, 1000 puntos sample)   │ │
│   │  • • • • • • • • ◆ • • • • •  ← diamante rojo = tu objeto         │ │
│   │  • • ⚪⚪⚪ • • • • • • • •         círculos = 5 vecinos cercanos   │ │
│   └────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│       [ Ver en universo completo →  ]   [ Clasificar otro objeto ]        │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Pantalla 2 — `/sky-map` (Quadtree 2D del cielo)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Stellar Classifier    [ Predicción ] [ Sky Map* ] [ Universe ] [ Analysis ] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Mapa del cielo — densidad de objetos del SDSS                              │
│                                                                              │
│   ┌─ Filtros ──────────────────────────────────┐   ┌─ Profundidad ───────┐  │
│   │  [✓] Galaxy   [✓] Star   [✓] Quasar       │   │  [────●────] 5 / 8  │  │
│   └────────────────────────────────────────────┘   └─────────────────────┘  │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │  Mapa Quadtree D3.js (1200 x 600)                                    │  │
│   │  ┌─────────────────────┬────────┬─────┬───────┐                       │  │
│   │  │ █████████ ░░░░░ ░░░ │ ███████│ ███ │  ███  │   ← cuadrantes       │  │
│   │  ├──────────┬──────────┼────────┴─────┼───────┤    coloreados por    │  │
│   │  │   ████   │  ░░░░░░  │    ██████    │  ██   │    clase dominante   │  │
│   │  ├─┬─┬─┬─┬──┴─┬────────┼──────────────┴───────┤                       │  │
│   │  │█│ │ │█│ ██ │ ░░░░░░ │     ████████         │   hover: tooltip      │  │
│   │  └─┴─┴─┴─┴────┴────────┴──────────────────────┘   con N objetos +    │  │
│   │                                                    distribución      │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   Leyenda:  🟦 Galaxy   🟨 Star   🟪 Quasar     Eje X: alpha   Eje Y: delta │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Pantalla 3 — `/universe` (Octree 3D)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Stellar Classifier    [ Predicción ] [ Sky Map ] [ Universe* ] [ Analysis ] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Universo 3D — Plotly Scatter3d                                             │
│                                                                              │
│   ┌─ Controles ──────────────────────────────────────────────────────────┐  │
│   │  Filtros:  [✓] Galaxy  [✓] Star  [✓] Quasar                          │  │
│   │  Redshift range: [────●─────────●────]  0.0 – 3.5                    │  │
│   │  [ ] Mostrar wireframe del octree                                    │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │   Plotly 3D Scene                                                    │  │
│   │                                                                      │  │
│   │              •          • •  •                                       │  │
│   │           •   •      •      •  •                                     │  │
│   │        •    •     •    •    ◆     •     ← ◆ rojo = objeto consultado│  │
│   │      •  •     ⚪    ⚪  ⚪    ⚪  ⚪  •     ⚪ = vecinos resaltados   │  │
│   │     •      •     •   •    •    •  •                                  │  │
│   │   •    •      •    •    •     •                                      │  │
│   │      •     •     •     •  •                                          │  │
│   │                                                                      │  │
│   │   (drag = rotar, scroll = zoom, hover = tooltip por punto)           │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   Mostrando 10,000 puntos (sample estratificado del SDSS17)                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Estados especiales**:
- Si vino desde `/`: objeto consultado aparece como ◆ rojo grande + 5 vecinos con borde.
- Si entró directo: solo el scatter sin objeto destacado (Plan B documentado en plan §8.9).

---

## Pantalla 4 — `/analysis` (Métricas del modelo)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Stellar Classifier    [ Predicción ] [ Sky Map ] [ Universe ] [ Analysis* ] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Análisis del modelo                                                        │
│                                                                              │
│   ┌─ Confusion Matrix (test set) ───────┐  ┌─ Métricas globales ──────────┐ │
│   │                                     │  │                              │ │
│   │           GAL    STA    QSO         │  │  Accuracy:      0.97         │ │
│   │   GAL  [████████████░░░░░░]         │  │  F1 macro:      0.95         │ │
│   │   STA  [░░░░░░░██████████░]         │  │  Baseline*:     0.59         │ │
│   │   QSO  [░░░░░░░░░░░░██████]         │  │  Margen:        +0.38 abs    │ │
│   │                                     │  │                              │ │
│   │   (heatmap interactivo con hover)   │  │  * DummyClassifier majority  │ │
│   └─────────────────────────────────────┘  └──────────────────────────────┘ │
│                                                                              │
│   ┌─ Comparativa de 10 modelos (CV accuracy) ─────────────────────────────┐ │
│   │                                                                       │ │
│   │   Random Forest      ████████████████████ 0.97 ± 0.003               │ │
│   │   Gradient Boosting  ███████████████████  0.96 ± 0.004               │ │
│   │   Extra Trees        ███████████████████  0.96 ± 0.005               │ │
│   │   ...                                                                 │ │
│   │   Naive Bayes        █████████████        0.82 ± 0.012               │ │
│   │   AdaBoost (default) ██████               0.43 ± 0.020 ← colapso     │ │
│   │   Baseline trivial   ███████              0.59  (most_frequent)      │ │
│   │                                                                       │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   ┌─ Feature Importance (Random Forest) ──────────────────────────────────┐ │
│   │                                                                       │ │
│   │   redshift   ████████████████████████████████  0.62                  │ │
│   │   g          ████████                          0.10                   │ │
│   │   r          ███████                           0.09                   │ │
│   │   u          ██████                            0.08                   │ │
│   │   i          █████                             0.06                   │ │
│   │   z (band)   ████                              0.03                   │ │
│   │   alpha      █                                 0.01                   │ │
│   │   delta      █                                 0.01                   │ │
│   │                                                                       │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Jerarquía visual común (las 4 pantallas)

1. **H1**: título de pantalla (~28px, peso bold).
2. **Subtítulo**: descripción corta de qué hace la pantalla (~16px, peso regular).
3. **Filtros / controles**: agrupados en card con borde sutil.
4. **Visualización principal**: el espacio más grande de la pantalla (60-70% del viewport).
5. **Metadata / leyenda**: pie de pantalla, ~14px.

## Colores propuestos (a refinar Día 18)

| Elemento | Color | Por qué |
|---|---|---|
| Galaxy | `#3b82f6` (azul) | Las galaxias tienden a azulado-rojizo; azul = familiar. |
| Star | `#fbbf24` (ámbar) | Las estrellas suelen visualizarse en tonos cálidos. |
| Quasar | `#a855f7` (púrpura) | Color distintivo, denota "exótico". |
| Background | `#0a0a14` (azul muy oscuro casi negro) | Modo astronomía / cielo nocturno. |
| Texto primario | `#f8fafc` (casi blanco) | Alto contraste sobre fondo oscuro. |
| Acento (botones) | `#06b6d4` (cyan) | Destaca sin saturar. |
