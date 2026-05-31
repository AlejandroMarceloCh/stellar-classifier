# Spec de construcción — `/explore` (Stellar Classifier · refactor 100% dark)

> Fuente de verdad del refactor. Salida del design panel (3 direcciones + síntesis).
> Generado 2026-05-30. Defensa 2026-06-10. **Ejecutar el `build_order` en orden.**

## Decisión bloqueada

Dirección ganadora: **"Observatorio — Google Earth del cielo"** como columna vertebral, con injertos de las otras dos.

- **`/explore` es una RUTA NUEVA dark** con su propio theme. **NO** se retocan las 4 rutas light existentes (`/`, `/sky-map`, `/universe`, `/analysis`).
- Las 4 rutas light **SOBREVIVEN como "modo docente / por dentro del modelo"** → protegen los 7 pts de Datos&Modelo de la rúbrica.
- El home `/` **NO se reemplaza**: se le agrega un CTA prominente "Entrar al mapa del cielo" → `/explore`, y un enlace discreto "Para docentes: ver el modelo por dentro".
- **Reuso confirmado del código real:** `UniverseScene.tsx` ya tiene `CLASS_COLOR_BRIGHT` con los 3 hex (GALAXY `#5b9bff`, STAR `#fbbf24`, QSO `#c879f5`) → honestidad cromática 2D↔3D gratis. Plotly se carga con `import("plotly.js-dist-min")` dinámico.
- **Extender (no reescribir) `UniverseScene`:** añadir prop `revealObject:{alpha,delta,redshift,true_class,obj_id}` que resalta el objeto con su clase REAL. Mantener la prop `prediction` intacta (no romper `/universe`).

## Injertos

- De Mission Control (Dir 2): máquina de estados con nombres (S0..S6); **ping de radar** (una expansión al entrar el objeto al viewport); reveal en **3 columnas TÚ / MODELO / REAL**; spatial-hash para hit-testing O(1).
- De Planetario (Dir 3): división tipográfica **mono = dato medido / sans = voz que guía**; teñido de celdas quadtree por `dominant_class` al ~10% (ciencia real, sesgo regional); micro-descripción de 1 línea bajo cada botón de clase; contador "Descubiertos n/240" en localStorage; modo terminal "Pon a prueba al modelo" al agotar los 240; enlace "Para docentes".

## Paleta final (única, hex)

```
bg            #05070D   (azul-negro, NO negro puro — el negro aplana la profundidad)
surface       rgba(12,17,27,0.74)   (glass + backdrop-blur-md)
surface2      #0D1322
border        rgba(120,150,210,0.16)  (hairline azulado)
text_primary  #E8EDF7
text_muted    #8595B8
accent        #39D3C3   (cian-verde — acción/foco/anillo. NUNCA representa una clase)
galaxy        #5B9BFF
star          #FBBF24
qso           #C879F5
```

Tipografía: **Inter** para todo; **JetBrains Mono SOLO** para cifras/coordenadas (α, δ, redshift, confianza, obj_ID). Mayúsculas con tracking 0.14em solo en kickers y nombres de clase. Cero serif/italic/editorial.

## Blueprint de `/explore`

Pantalla completa edge-to-edge. 3 capas en z-index:

- **Capa 0 — SkyCanvas** (`z-0`, `position:fixed inset-0`): un `<canvas>` 2D nativo al 100% del viewport, SUELO de la pantalla, nunca se encoge. Dibuja 10.000 puntos reales (`/api/sample-points`), la grilla del quadtree y el objeto misterioso activo.
- **Capa 1 — HUD glass flotante** (`z-10`, `surface` + `backdrop-blur-md` + `border` hairline). 5 anclas, nunca cubren el centro:
  - **Arriba-izq:** marca "Stellar Classifier" + breadcrumb de zoom en lenguaje humano ("Vista amplia del cielo" → "Sector α 90-180 / δ+40" → "Acercándote a una luz"), clickeable. Botón fantasma "Salir del viaje" → home.
  - **Arriba-der:** coordenadas en vivo del centro del viewport en mono (`α 184.2° · δ +37.1° · 4.3×`). 3 chips toggle de clase (color real, click = mostrar/ocultar capa). Contador "Descubiertos 7/240" + racha "Aciertos 5/7".
  - **Abajo-izq:** leyenda 3 clases (color + nombre + 1 palabra: "cerca"/"lejos"/"extremo"). "Objetos a la vista: 1.240".
  - **Abajo-der:** MINIMAPA 180×120px = cielo completo (α 0-360 × δ -18.8/83) con rectángulo accent del viewport; click/arrastre = teletransporte (vuelo 400ms). Los 240 objetos-misión marcados como puntos accent tenues.
  - **Abajo-centro:** instrucción contextual tenue + botón fantasma "Llévame a una luz misteriosa" (fly-to al siguiente no descubierto).
- **Capa 2 — GamePanel** (`z-20`): NO existe en VIAJE. Aparece en INTERCEPTACIÓN. Desktop: glass sheet abajo-centro ~560px (no columna lateral — no partir el cielo). Móvil/tablet: bottom-sheet ~70% alto. El cielo siempre se ve detrás (backdrop-blur).

**Navegación:** pan/zoom CONTINUO Google Earth. Arrastre = pan con inercia (`velocity *= 0.92/frame`). Rueda/pinch = zoom-to-cursor (anclar punto bajo el mouse). Doble-click = zoom-in ahí. Tecla `0`/"Vista amplia" = zoom-to-fit. El quadtree NO se navega como carpetas: rejilla que se densifica con el zoom (depth 0→6 según scale), celdas teñidas por `dominant_class` al ~10% alpha. Celda bajo cursor resaltada accent + su distribución en el HUD.

## Estrategia de canvas (receta validada — el riesgo #1 de perf)

- `<canvas>` DPR-aware: `canvas.width = cssW*dpr`, `ctx.scale(dpr,dpr)` una vez.
- Fetch `/api/sample-points` UNA vez → TypedArrays: `Float32Array` para alpha/delta/redshift, `Uint8Array` para clase (0/1/2).
- Cámara = `{offsetX, offsetY, scale}` en coords-mundo. Mundo = plano α∈[0,360] (X), δ∈[-18.8,83] (Y invertido para que el norte celeste quede arriba). `worldToScreen(α,δ)` y `screenToWorld`.
- Por frame: (a) culling de viewport con margen de 1 pantalla; (b) batch por clase (3 cambios de `fillStyle`, no 10K); (c) `ctx.fillRect(x,y,s,s)` de 1.5–3px según LOD (~4× más rápido que `arc+fill`).
- LOD: scale baja → 1.5px, opacity 0.7, twinkle (±12% **alpha**, SOLO brillo, nunca posición); scale alta → 3px + halo radial-gradient barato SOLO en los <300 visibles.
- `requestAnimationFrame` con **dirty-flag**: repinta solo si la cámara cambió o hay animación viva. En reposo 0% CPU.
- Grilla quadtree = `strokeRect` de nodos cuyo depth ≈ nivel de zoom e intersectan viewport, a `border`.
- Objeto activo = segunda pasada con glow animado (fuera del batch estático).
- Hover (<500 visibles): **spatial-hash / grid-bucket** en world-space, lookup O(1). NUNCA recorrer 10K por mousemove.
- Fondo: ~120 estrellas de ambiente falsas muy tenues con parallax 0.3 — **DECLARADAS como decorado, no datos**.
- Target 60fps en pan/zoom en laptop integrada. **Medir con Performance tab en el paso 4 antes de seguir.**

## Máquina de estados del juego (S0–S6)

- **S0 VIAJE:** navega libre. Ve 10K puntos + 240 objetos-misión anillados (anillo accent que respira). HUD "Escaneando el cielo…". → (objeto-misión entra al viewport) S1. → (botón "Llévame a una luz misteriosa") fly-to → S1.
- **S1 CONTACTO:** el objeto crece, emite PING de radar (círculo accent que se expande UNA vez) + anillo que respira. HUD "Hay un objeto sin clasificar cerca. Acércate." → (click/doble-click o centrarlo) S2.
- **S2 INTERCEPTACIÓN:** micro-zoom al objeto, resto del cielo se atenúa (`globalAlpha 0.3`). Entra el GamePanel. Muestra obj_id (mono), α/δ (mono), y las **5 bandas fotométricas u,g,r,i,z como 5 barras** ("Así brilla esta luz en 5 colores, del ultravioleta al infrarrojo"). REDSHIFT con CANDADO: "Distancia: oculta — es la pista que el modelo más usa." → (auto) S3.
- **S3 APUESTA:** "¿Qué crees que es esta luz?". 3 botones grandes con color+icono+micro-descripción: "Estrella: vive cerca, en nuestra galaxia" / "Galaxia: miles de millones de estrellas, muy lejos" / "Quásar: el corazón brillante de una galaxia lejana". "No hay penalización. Es para aprender." → (elige) S4.
- **S4 PREDICCIÓN:** `POST /api/predict` con los 8 features REALES (incluido el redshift oculto). Botón elegido pulsa "Consultando al modelo…" (mín 300ms). Llega `{prediction, confidence, top3}`. Revela "El modelo dice: Galaxia (97.3%)" + top-3 mini-barras. Comparación preliminar TÚ vs MODELO. Aún no la verdad. → (auto ~800ms o "Ver el resultado") S5.
- **S5 REVEAL:** entra `true_class`. Comparación en **3 COLUMNAS TÚ / MODELO / REAL** con check/cruz. El candado del redshift se ABRE, el número cuenta de 0 al real (mono). Frase causal honesta (umbral validado, lenguaje probabilístico). El objeto en canvas hace cross-fade al color de su clase real (400ms). Badge "Acertaste"/"Casi" (NUNCA rojo de castigo). Contador "Descubiertos n/240" +persiste. → ("Ver dónde está en el universo") S6. → ("Buscar otra luz") S0 con fly-to.
- **S6 PROFUNDIDAD (octree 3D):** ver reveal abajo. → ("Volver al mapa") S0 en el mismo punto.
- **Terminal (descubiertos == 240):** modo "Pon a prueba al modelo" (form libre `/api/predict`) o reciclar con ranking de racha.
- **Persistencia:** localStorage `{descubiertos: string[obj_id], racha_aciertos, racha_total}`. `prefers-reduced-motion` → cortes instantáneos, count-ups → valor final directo.

## Reveal octree 3D (S6, el clímax)

Reusa Plotly (`UniverseScene.tsx`, dynamic import, octree + sample-points, MISMOS hex). Añadir prop `revealObject` con clase y redshift REALES.

1. **Transición desde S5:** card de pistas se desvanece; canvas 2D hace zoom-OUT hasta el cielo completo. **Overlay negro de ~150ms** cubre el cambio de motor Canvas→Plotly (mitiga el corte entre render engines).
2. **Montaje:** Plotly Scatter3d casi pantalla completa, fondo radial `#131c33→#05070D`. Ejes X=α, Y=δ, **Z=redshift normalizado** (de `octree.raw_ranges`, 0→7.008). Z etiquetado: "CERCA" abajo (z≈0), "LEJOS" arriba, título "profundidad ≈ redshift ≈ qué tan lejos".
3. **Cámara:** arranca casi de plano (mirando α×δ como el mapa 2D) y hace TWEEN a vista 3/4 (`eye x1.6 y1.6 z1.15` — valores reales del layout actual). PLAN B si va a saltos: corte directo a 3/4 con fade.
4. **Contexto:** 10K puntos tenues (opacity ~0.25) + wireframe octree sutil. Submuestrear a ~3-5K si el montaje pesa (>600ms ya observado en /universe).
5. **El objeto:** diamante grande con color de su clase REAL, en su Z real, con **línea-plomada vertical punteada** de su Z al plano z=0.
6. **Cadena causal honesta** (panel lateral, derivada del valor REAL, umbral validado): z<0.01 → "Casi sin redshift: este objeto está cerca, por eso es una estrella." z alto → "Redshift alto significa que está muy lejos, y a esa distancia casi siempre vemos galaxias o quásares." LENGUAJE PROBABILÍSTICO, nunca absolutos.
7. **Conexión con el modelo:** barra inferior "El redshift pesa 61.7% en la decisión" (`feature_importance` REAL de `/api/version`, leído en runtime — no hardcodear).
8. **Salida:** invierte la transición. `plotly.purge()` al salir.

## Copy deck (español neutro, listo para pegar)

- "Arrastra para explorar el cielo. Acerca con la rueda."
- "Hay un objeto sin clasificar cerca. Acércate para verlo."
- "Así brilla esta luz en 5 colores, del ultravioleta al infrarrojo. Esa es su huella."
- "Distancia: oculta. Es la pista que el modelo más usa para decidir; intenta adivinar sin ella."
- "¿Qué crees que es esta luz? Elige una opción. No hay penalización, es para aprender."
- "Estrella: vive cerca, en nuestra galaxia."
- "Galaxia: miles de millones de estrellas, muy lejos de aquí."
- "Quásar: el corazón brillante de una galaxia lejana."
- "Consultando al modelo…"
- "El modelo dice: Galaxia, con 97.3% de confianza."
- "Tú dijiste Estrella. El modelo dijo Galaxia. Veamos quién acertó."
- "Acertaste. Era una galaxia. Mira ahora dónde está en el universo."
- "Casi sin redshift: este objeto está cerca, por eso es una estrella."
- "Redshift alto significa que está muy lejos, y a esa distancia casi siempre vemos galaxias o quásares."
- "El redshift pesa 61.7% en la decisión del modelo: por eso adivinar sin verlo era difícil."
- "Has descubierto 8 de 240 luces. Busca otra."
- "Tú: 7 de 9 · El modelo: 9 de 9"
- "Para docentes: ver el modelo por dentro."

## Componentes a crear

- `app/explore/page.tsx` — ruta dark, orquesta la máquina S0-S6, carga sample-points/quadtree/game-objects/version una vez, posee cámara y dirty-flag. Lazy-importa Plotly solo en S6.
- `components/explore/SkyCanvas.tsx` — el `<canvas>` 2D full-bleed. Render loop (rAF+dirty), culling, LOD, batch por clase, twinkle, grilla teñida, spatial-hash hover. Núcleo de perf.
- `components/explore/useCamera.ts` — hook: `{offsetX,offsetY,scale}`, pan+inercia, zoom-to-cursor, fly-to, zoom-to-fit, worldToScreen/screenToWorld.
- `components/explore/useSpatialHash.ts` — grid-bucket world-space para hit-testing O(1) de hover y objetos-misión.
- `components/explore/Hud.tsx` — cromo glass: marca, breadcrumb, coords vivas (mono), chips toggle clase, contadores, instrucción.
- `components/explore/Minimap.tsx` — 180×120 canvas: cielo completo + rectángulo viewport + objetos-misión; click = teletransporte.
- `components/explore/GamePanel.tsx` — glass sheet abajo-centro (bottom-sheet móvil). Renderiza por estado: ficha (S2), bandas, candado redshift, botones apuesta (S3), pulso modelo (S4), reveal 3-columnas (S5).
- `components/explore/PhotometricBars.tsx` — 5 barras horizontales mono para u,g,r,i,z.
- `components/explore/ClassButtons.tsx` — 3 botones apuesta color/icono/micro-descripción.
- `components/explore/RevealComparison.tsx` — tabla 3 columnas TÚ/MODELO/REAL + candado redshift que se abre + count-up + frase causal.
- `components/UniverseScene.tsx` — **EXTENDER**: prop `revealObject`. Mantener `prediction` intacta.
- `components/explore/Reveal3D.tsx` — wrapper S6: monta UniverseScene con revealObject, transición plano→3/4, plomada Z, panel causal, barra feature_importance.
- `lib/gameStore.ts` — localStorage: descubiertos, racha, pool sin-repetir hasta agotar 240.
- `lib/gameState.ts` — tipos + reducer S0..S6 + helper de frase causal con umbral validado.
- Home `/`: CTA prominente "Entrar al mapa del cielo" → `/explore` (no reemplazar el home).

## Build order (ejecutar EN ORDEN)

1. ✅ Backend: `game_objects.json` existe, `/api/game-objects`/`sample-points`/`quadtree`/`octree`/`version` responden. (HECHO)
2. `lib/gameState.ts` + `lib/gameStore.ts`: reducer S0-S6 + persistencia. Helper de frase causal validado contra casos reales.
3. `useCamera.ts` + `useSpatialHash.ts`: cámara pan/zoom/inercia/zoom-to-cursor/fly-to + grid-bucket.
4. `SkyCanvas.tsx`: 10K puntos (TypedArrays, culling, LOD, batch, dirty, twinkle). **MEDIR 60fps antes de seguir.** Grilla quadtree teñida después.
5. `app/explore/page.tsx` esqueleto: SkyCanvas + Hud + Minimap + cámara. Estado VIAJE navegable fluido. **Hito "Google Earth del cielo".**
6. Objetos-misión: sembrar 240 con anillo+ping, hit-testing, transición S0→S1→S2.
7. `GamePanel` + `PhotometricBars` + `ClassButtons`: ficha, pistas, candado, botones. S2→S3.
8. S4 PREDICCIÓN: `POST /api/predict`, pulso, top-3. S5 REVEAL: `RevealComparison`, count-up redshift, frase causal, cross-fade color en canvas, contador.
9. EXTENDER `UniverseScene` con `revealObject`. `Reveal3D.tsx`: S6 lazy Plotly, transición plano→3/4 (plan B corte+fade), plomada Z, panel causal, barra 61.7% de `/api/version`.
10. Pulido: minimapa teletransporte, breadcrumb clickeable, `prefers-reduced-motion`, modo terminal, CTA en home, enlace "Para docentes".
11. QA perf en laptop modesta + validación científica de la frase causal en los 240 (que ninguna mienta) + a11y (color+icono+texto).

## Riesgos clave (mitigaciones ya decididas)

- **PERF #1 canvas:** culling + dirty-flag + twinkle solo en subset + cap de glow top-N con degradación a fillRect plano. Medir en paso 4.
- **PERF #2 Plotly:** lazy import, submuestrear a 3-5K en el reveal.
- **Transición Canvas→Plotly:** overlay negro 150ms; plan B corte+fade si el tween va a saltos.
- **Wiring reveal:** añadir prop `revealObject`, NO tocar `prediction` (rompe /universe).
- **Honestidad científica #1:** validar el umbral del redshift contra los 240 objetos; lenguaje probabilístico. Si una frase contradice un `true_class`, falla la defensa.
- **Honestidad #2:** twinkle y estrellas de ambiente declaradas decorado; nunca mover posiciones reales. Teñido por dominant_class es ciencia real.
- **A11y:** color nunca único canal — botones/leyenda con icono+texto. Accent nunca representa clase. Voz que guía en Inter clara (no mono). `prefers-reduced-motion`.
- **Techo de contenido:** pool sin-repetir + modo terminal.
- **Cheat trivial (aceptable, documentar):** redshift/true_class viajan en el JSON del cliente. Blindar = endpoint que los omita hasta el reveal (cambio backend, fuera de scope a 11 días). Decisión consciente para la defensa.
- **Deadline:** /explore es ruta nueva; las 4 light sobreviven como modo docente. No migrar todo a dark.
- **Degradación si aprieta el tiempo:** minimapa simple (solo rectángulo viewport) entrega el 80%.
