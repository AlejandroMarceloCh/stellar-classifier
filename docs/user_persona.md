# User Persona — Stellar Classifier

> **Framework**: Slide 14-16 Ideación (Curso DS3022).
> **Versión**: v1.0 — Día 0.

---

## Persona principal: **Carlos Mendoza**

```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────┐                                                │
│  │  ◉ ◉    │   "Tengo un Celestron de 8 pulgadas y cada    │
│  │   ╳     │   noche capturo objetos del cielo. Sé en qué  │
│  │  ─── ── │   coordenadas estoy mirando, pero no siempre  │
│  └─────────┘   sé si lo que veo es una galaxia lejana,     │
│  Carlos M.     una estrella vecina o algo más exótico."     │
│  37 años                                                    │
│  Lima, Perú                                                 │
└─────────────────────────────────────────────────────────────┘
```

### Demografía
- **Edad**: 37 años
- **Ubicación**: Lima, Perú
- **Ocupación**: Ingeniero civil (trabajo full-time, no relacionado a astronomía)
- **Educación**: Universitaria completa; astronomía es hobby serio desde hace 8 años

### Setup técnico
- Telescopio Celestron NexStar 8SE con cámara CCD básica.
- Software de captura: SharpCap o ASIAir.
- Manejo de coordenadas ecuatoriales (RA / DEC), magnitudes fotométricas, bandas u-g-r-i-z.
- No tiene espectrógrafo (cuestan >$15K USD).

### Objetivos
1. Identificar rápido el tipo de objeto que está observando esa noche.
2. Aprender sobre la estructura del universo (qué hay cerca, qué hay lejos).
3. Compartir hallazgos validados con su club de astronomía local.

### Frustraciones (Pain points)
- **Buscar manualmente en SIMBAD o NED es lento** — interfaces complejas, datos crudos.
- **No siempre puede descargar el catálogo SDSS local** para hacer cross-match (datos pesados, conexión inestable).
- **Las apps astronómicas (SkySafari, Stellarium) muestran posición pero NO clasifican objetos nuevos** — solo lo que ya está en su catálogo.
- **Si fotografía algo que no aparece en catálogos amateur**, queda sin saber qué es por días o semanas.

### Necesidades (Jobs to be done)
- "Cuando capture un objeto nuevo, quiero **clasificarlo en menos de 1 minuto** sin abrir 5 herramientas."
- "Quiero **ver dónde cae mi objeto entre miles de reales** del SDSS — me da contexto físico, no solo un label."
- "Quiero **explicar mis observaciones** a otros amateurs con visualizaciones claras, no tablas de números."

### Nivel técnico
- ⭐⭐⭐⭐ Astronomía (autodidacta avanzado).
- ⭐⭐⭐ Web / UX (usuario, no power user).
- ⭐⭐ Data science (entiende qué es accuracy y matriz de confusión, no necesita ver código).

### Frecuencia de uso esperada
- **2-3 veces por semana** en temporada de cielo despejado (mayo-octubre en Lima).
- **Sesiones de 10-30 minutos** por uso típico.

---

## Personas secundarias (mencionadas, no priorizadas en el MVP)

### Persona 2: **Dr. Lucía Quispe** — Astrofísica en observatorio académico
- Usa el producto como **herramienta de pre-screening** antes de pedir tiempo en un espectrógrafo profesional.
- Necesita acceso a la API (no solo UI) para integrar con sus pipelines.
- **Fuera del scope del Prototype** — la API REST queda disponible pero sin SLA.

### Persona 3: **Diego Ramos** — Estudiante de Física en pregrado
- Usa el producto como **material didáctico** en su curso de astronomía observacional.
- Valora la visualización 3D y la matriz de confusión para entender el modelo.
- **Cubierto parcialmente** por las pantallas `/universe` y `/analysis`.

---

## Quote definitorio (para tarjeta del Persona)

> *"No necesito otro Stellarium. Necesito algo que me diga, en segundos, si lo que cacé anoche es una galaxia a millones de años luz o una estrella de mi propia Vía Láctea."*
> — Carlos, en su tercer mes de querer hacer follow-up de un objeto que SDSS no había publicado aún.

---

## Cómo este Persona moldea las decisiones de diseño

| Decisión del producto | Razón en el Persona |
|---|---|
| 3 chips de demo precargados en `/` | Carlos quiere entender en 1 minuto si vale la pena, sin ingresar nada. |
| Validación de rangos en inputs | Carlos puede pegar valores mal copiados — el sistema lo detecta antes de predecir basura. |
| Top-3 con confianza | Carlos prefiere "94% galaxia, 5% quásar" sobre "es galaxia" — sabe que la confianza importa. |
| Vecinos resaltados en `/universe` | Le da contexto físico (objetos similares reales del SDSS), no solo un label. |
| Copy en español neutro | Carlos es peruano; rioplatense le suena raro / extranjero. |
| Sin login | Carlos no quiere crear cuenta para una herramienta que usa 3 veces por semana. |
