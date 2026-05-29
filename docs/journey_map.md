# Journey Map — Carlos Mendoza (astrónomo amateur)

> **Framework**: Slide 26 Ideación (Curso DS3022).
> **Versión**: v1.0 — Día 0.

---

## Escenario

Carlos terminó una sesión de observación a las 2 AM. Capturó 5 objetos nuevos con su Celestron. Tiene las coordenadas (alpha, delta) y mediciones fotométricas en 5 bandas (u, g, r, i, z) y una estimación de redshift. Quiere saber qué tipo de objeto es cada uno antes de publicar en su grupo de Facebook de astronomía.

---

## Journey ACTUAL (sin Stellar Classifier)

| Fase | Acción del usuario | Pensamiento / Emoción | Pain point |
|---|---|---|---|
| **1. Captura** | Carlos termina la sesión. Tiene 5 objetos sin clasificar. | "Espero que al menos uno sea interesante." | Cansancio: 2 AM. |
| **2. Búsqueda inicial** | Abre SIMBAD en el navegador. Pega RA/DEC del primer objeto. | "Esto debería ser rápido." | UI de SIMBAD es críptica para amateurs. |
| **3. Cross-match manual** | SIMBAD devuelve 12 objetos cercanos. No es claro cuál es el suyo. | "Mmm, ¿cuál de estos?" 😕 | Cero contexto visual; tablas de coordenadas. |
| **4. Consulta secundaria** | Abre NED (NASA/IPAC). Pega coordenadas otra vez. | "¿Por qué tengo que repetir todo?" | Sin SSO entre herramientas astronómicas. |
| **5. Lectura cruda** | Lee paper de 30 páginas sobre clasificación SDSS. | "No quiero un PhD, solo saber qué es esto." 😤 | Información hipertécnica. |
| **6. Espera pasiva** | Publica en foro de astronomía amateur preguntando. Espera respuesta. | "Quizás alguien sepa..." | Respuesta en 2-7 días. |
| **7. Renuncia** | Pasa al siguiente objeto. Carlos no clasifica 3 de los 5. | "Lo dejo para después." 😔 | Backlog crece sesión tras sesión. |
| **8. Frustración acumulada** | Su lista de "objetos sin clasificar" tiene 47 entradas de 6 meses. | "Capaz me consigo un software profesional..." | Costos prohibitivos ($500-$5000/año). |

**Tiempo total por objeto**: 15-40 minutos cuando funciona, días cuando no.
**Tasa de éxito**: ~40% de los objetos quedan clasificados.

---

## Journey CON Stellar Classifier

| Fase | Acción del usuario | Pensamiento / Emoción | Mejora |
|---|---|---|---|
| **1. Captura** | Carlos termina la sesión. Tiene 5 objetos. | "Voy a clasificarlos antes de dormir." | Misma. |
| **2. Abre Stellar Classifier** | Va a la URL. Ve los 3 chips de demo. | "Ah, esto se ve simple." 🙂 | Onboarding inmediato. |
| **3. Prueba con un chip** | Clickea "🌌 Galaxia M104". Ve el resultado en 1s. | "Listo, entiendo cómo funciona." | < 30 segundos hasta entender el producto. |
| **4. Ingresa su objeto real** | Pega sus mediciones en el form. Cada input le dice el rango válido. | "Ok, todos mis valores están en rango." | Validación clara, no error genérico. |
| **5. Clasifica** | Clickea "Clasificar". Recibe: `GALAXY 94%`, top-3 (94/5/1). | "Una galaxia. Vamos a ver dónde cae." | Predicción + confianza en 1s. |
| **6. Explora contexto** | Click en "Ver en universo completo". Su objeto aparece como diamante rojo entre 10K puntos del SDSS. | "Wow, está en una zona de muchas galaxias similares." 🤩 | Contexto físico inmediato, no abstracto. |
| **7. Valida con vecinos** | Hover sobre los 5 vecinos resaltados. Todos son galaxias. | "Tiene sentido, confío en la predicción." | Confianza por similitud, no solo por número. |
| **8. Vuelve a `/`** | Procesa los 4 objetos restantes en 5 minutos totales. | "Tengo todos clasificados antes de las 2:30 AM." 😎 | 100% de la sesión clasificada vs 40% antes. |
| **9. Publica con confianza** | Comparte en su grupo con screenshot del `/universe` y la predicción. | "Esto se ve profesional." | Material visual listo para compartir. |

**Tiempo total por objeto**: < 1 minuto.
**Tasa de éxito**: 100% (cada objeto recibe predicción + visualización).

---

## Puntos críticos donde el producto agrega valor

| Punto crítico | Sin Stellar Classifier | Con Stellar Classifier |
|---|---|---|
| **Onboarding** | Buscar tutoriales de SIMBAD/NED. | 3 chips precargados → entiende en 30 seg. |
| **Tiempo a predicción** | 15-40 min. | < 1 min. |
| **Contexto visual** | Tablas de coordenadas crudas. | Quadtree 2D + Universo 3D con vecinos. |
| **Confianza en el resultado** | "El paper dice…" → fe en abstracto. | Top-3 con porcentajes + 5 vecinos similares. |
| **Material para compartir** | Capturas de Excel. | Screenshots del Universe 3D. |

---

## Métricas de éxito del journey (validación Día 20 con 3 testers)

| Métrica | Target |
|---|---|
| Tiempo desde URL hasta primera predicción | ≤ 2 minutos |
| Tasa de objetos clasificados por sesión | 100% de los intentados |
| Frustración reportada (escala 1-5) | ≤ 2 |
| Voluntad de recomendar a otro amateur (NPS-lite) | ≥ 4/5 |

---

## Insights de diseño que vienen del journey

1. **Los 3 chips de demo NO son decoración** — son el onboarding completo en 1 click. Sin ellos, Carlos no entiende qué hace el producto en 30 seg.
2. **El `/universe` no es show-off** — es lo que hace que Carlos *confíe* en la predicción. Sin contexto físico, "94% galaxia" es solo un número.
3. **La validación de rangos por input importa** — Carlos puede pegar valores mal escritos. Mejor "redshift fuera de rango [0, 7]" que predicción silenciosa de un valor extrapolado.
4. **Velocidad importa más que features** — Carlos prefiere 1 predicción rápida que 5 predicciones lentas. El target `<200ms` del Slide 18 U4_T2 no es opcional.
