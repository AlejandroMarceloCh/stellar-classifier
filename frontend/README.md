# Stellar Classifier — Frontend (Next.js 15)

> UI del proyecto DS3022. Consume el backend FastAPI en `http://localhost:8000` por default.

---

## Setup

```bash
cd ~/Desktop/PROYECTOS_2026/stellar-classifier/frontend
npm install
```

## Desarrollo

```bash
npm run dev   # puerto 3000, hot reload
```

Asegurate que el backend esté corriendo en otra terminal:
```bash
cd ~/Desktop/PROYECTOS_2026/stellar-classifier
backend/venv/bin/uvicorn backend.main:app --reload --port 8000
```

## Build de producción

```bash
npm run build   # output en .next/
npm run start   # sirve el build
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Dev server con HMR (puerto 3000) |
| `npm run build` | Build de producción estático |
| `npm run start` | Sirve el build (post-build) |
| `npm run lint` | ESLint del código |
| `npm run typecheck` | TypeScript check sin emitir |

## Estructura

```
frontend/
├── app/
│   ├── layout.tsx           # Layout global + Nav + footer
│   ├── globals.css          # Tailwind + tema astronomía
│   ├── page.tsx             # / — Predicción (Día 9)
│   ├── sky-map/page.tsx     # /sky-map — Quadtree D3.js (Día 10-11)
│   ├── universe/page.tsx    # /universe — Plotly Scatter3d (Día 15-17)
│   └── analysis/page.tsx    # /analysis — Métricas (Día 12)
├── components/
│   └── Nav.tsx              # Navegación global con active state
├── lib/
│   ├── api.ts               # Cliente del backend FastAPI
│   ├── cn.ts                # Helper clsx + tailwind-merge
│   └── types.ts             # Tipos compartidos con backend
└── public/data/             # JSONs precalculados (quadtree, octree, sample_points)
```

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | URL base del backend FastAPI |

Crear `.env.local` para override:
```
NEXT_PUBLIC_API_URL=http://localhost:8001
```

## Tema visual

- Fondo: `#0a0a14` (azul casi negro — modo astronomía)
- Acento: `#06b6d4` (cyan)
- Clases:
  - GALAXY: `#3b82f6` (azul)
  - STAR: `#fbbf24` (ámbar)
  - QSO: `#a855f7` (púrpura)

Convenciones:
- Código en **inglés**.
- Copy en **español neutro peruano** — NO rioplatense.
