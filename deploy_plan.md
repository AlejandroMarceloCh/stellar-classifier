# Plan de deploy — Stellar Classifier (DS3022)

Plan KISS para llevar el proyecto a producción accesible por el profesor. Pensado para ser auditado: cada decisión está justificada y los anti-patterns están explícitos.

## Objetivo

Dejar el flujo completo (notebook entrenado → API → frontend) accesible vía dos URLs públicas, sin tocar nada que no sea estrictamente necesario para que funcione end-to-end.

## Stack y decisiones (con racional)

| Capa | Plataforma | Por qué |
|------|------------|---------|
| Repo fuente | GitHub público (`AlejandroMarceloCh/stellar-classifier`) | Render y Vercel deployan desde GitHub. Dataset SDSS17 es público (Kaggle), modelo es propio, no hay nada sensible. |
| Backend FastAPI | Render free (Docker runtime) | Hostea Python + 38MB de `.pkl`. Free tier alcanza para una demo. Spin-down a los 15 min, cold start ~50s en la 1ª request — aceptable para defensa. |
| Frontend Next.js 15 | Vercel hobby (CLI `vercel --prod`) | Build optimizado para Next, gratis, CLI ya autenticada (`alejandromarceloch`). |
| Datos en runtime | Dentro de la imagen Docker del backend | `model.pkl`, `scaler.pkl`, `label_encoder.pkl`, `star_classification.csv` (para `/api/neighbors`), y `frontend/public/data/*.json` (quadtree/octree/sample_points que el backend lee). |

## Estado actual (verificado, no asumido)

- ✅ Repo público pusheado, commit `2ca5756` con notebook auditado + correcciones del re-audit.
- ✅ `Dockerfile` en raíz: build context = root; COPY `backend/` + `frontend/public/data/`; `CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}`.
- ✅ `.dockerignore`: excluye venv, parquets, notebooks, node_modules.
- ✅ `render.yaml` (Blueprint): tipo `web`, runtime `docker`, plan `free`, `healthCheckPath: /api/health`, var opcional `ALLOWED_ORIGINS`.
- ✅ `backend/requirements-prod.txt`: solo runtime (fastapi, uvicorn, pydantic, pandas, numpy, scipy, scikit-learn 1.7.2, joblib). Sin jupyter/matplotlib/dev.
- ✅ CORS en `backend/main.py`: localhost para dev + env var `ALLOWED_ORIGINS` + `allow_origin_regex=r"https://.*\.vercel\.app"` (cualquier deploy de Vercel pasa sin cambio de config).
- ✅ `frontend/.env.example` documenta `NEXT_PUBLIC_API_URL`. Local usa `frontend/.env.local`.
- ✅ Tracking en repo: `model.pkl` (38MB), `scaler.pkl`, `label_encoder.pkl`, `star_classification.csv` (16MB), `pipeline.pkl` (38MB bonus). Total ~96MB, dentro de límites de GitHub (warn >50MB por archivo, hard 100MB; ninguno se pasa).
- ✅ `gh` autenticado como `AlejandroMarceloCh`, `vercel` como `alejandromarceloch`, `docker` instalado.
- ❌ Backend en Render: pendiente (requiere cuenta del usuario; sin Render CLI/token disponible).
- ❌ Frontend en Vercel: pendiente (espera a tener URL de backend para `NEXT_PUBLIC_API_URL`).

## Plan paso a paso

### Paso 1 — Render (acción del usuario)

1. https://dashboard.render.com → login con GitHub.
2. **New +** → **Blueprint** → conectar `AlejandroMarceloCh/stellar-classifier`.
3. Render lee `render.yaml`, muestra servicio `stellar-classifier-api`. Apply.
4. Esperar build (~5-7 min: pip install sklearn/pandas/scipy + COPY de 38MB de artefactos).
5. Cuando esté `Live`, copiar URL `https://stellar-classifier-api.onrender.com` (o sufijo si está tomada).
6. Pasarme la URL.

**Verificación** (yo, una vez recibida la URL):
```bash
curl https://<render-url>/api/health
# esperado: {"status":"ok","model_loaded":true}

curl -X POST https://<render-url>/api/predict \
  -H "Content-Type: application/json" \
  -d '{"alpha":177.64,"delta":24.14,"u":22.07,"g":20.63,"r":19.64,"i":19.08,"z":18.77,"redshift":0.576}'
# esperado: {"prediction":"GALAXY","confidence":0.93,...}
```

### Paso 2 — Vercel (yo, vía CLI, NO interactivo)

```bash
cd frontend
vercel link --yes --project stellar-classifier --scope alejandromarceloch
printf 'https://<render-url>\n' | vercel env add NEXT_PUBLIC_API_URL production
vercel --prod --yes
```

Todos los comandos son no interactivos para reproducibilidad y para que la
defensa no se trabe en prompts del CLI.

Salida esperada: URL `https://stellar-classifier-<hash>.vercel.app`.

### Paso 3 — Smoke test end-to-end

1. `curl <vercel-url>` → HTTP 200.
2. Abrir Vercel en navegador, clickear un caso de prueba (ej. "Galaxia típica"), confirmar que el resultado aparece.
3. DevTools → Network: verificar que el POST a `/api/predict` va al dominio de Render y devuelve 200 (no CORS error).
4. Probar `/sky-map`, `/universe`, `/analysis` para confirmar que `/api/quadtree`, `/api/octree`, `/api/sample-points`, `/api/modeling-summary` responden.
5. `/api/neighbors` (el más pesado por el cKDTree de 99,999 puntos — si falla,
   la pantalla `/universe` con resaltado de vecinos rompe en silencio):
   ```bash
   curl -X POST https://<render-url>/api/neighbors \
     -H "Content-Type: application/json" \
     -d '{"alpha":177.64,"delta":24.14,"redshift":0.576}'
   # esperado: {"neighbors":[...5 elementos...], "query":{...}, "k":5}
   ```

### Paso 4 — README con URLs (yo, último commit)

`README.md` en raíz del repo con:
- 1 párrafo de qué es el proyecto.
- URL backend (Render) + URL frontend (Vercel).
- Cómo correr local (link a `frontend/.env.example` y al `Dockerfile`).
- Link al notebook de presentación.

Commit + push.

## Riesgos conocidos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Cold start de Render free (~50s la 1ª request) | Alta | Avisar al profe en el README. Para la defensa, hacer 1 request de calentamiento antes. |
| Build de Render falla por timeout en pip install | Media | `requirements-prod.txt` ya es minimal (8 paquetes, sin jupyter). Si falla, re-trigger desde el dashboard. |
| Memoria del free tier de Render (512MB RAM) ajustada por el modelo + cKDTree de 99,999 puntos | Media | Modelo ~40MB en RAM + KDTree ~10MB + FastAPI ~50MB ≈ 100-150MB de baseline. Deja margen. Si crashea, alternativa = bajar a sample del CSV para `/api/neighbors`. |
| CORS bloquea el frontend de Vercel | Baja | Regex `https://.*\.vercel\.app` ya está en `main.py`. No requiere setear `ALLOWED_ORIGINS` para esto. |
| Vercel build falla por `NEXT_PUBLIC_API_URL` no seteada | Baja | El paso 2 setea la env var ANTES de `vercel --prod`. Si no, el fallback en `lib/api.ts` es `http://localhost:8000` y el deploy queda inútil pero no fallido. |
| Tamaño del repo (~96MB) impacta clones | Baja | Aceptable para un proyecto académico. Si molesta, mover `.pkl` a Git LFS más adelante (no en este sprint). |
| Render duerme tras 15 min sin tráfico y el profe lo agarra dormido | Alta | Aceptado. El frontend muestra "cargando metadata del modelo…" mientras espera; tras ~50s funciona normal. |

## Lo que NO voy a hacer (anti-scope creep)

- Custom domain (.com propio).
- CI/CD pipeline explícito (auto-deploy en cada push ya es implícito por la integración Render↔GitHub y Vercel↔GitHub).
- Monitoring/alerting (Sentry, Datadog).
- Auth/rate limiting (es una demo educativa, no hay datos sensibles).
- Múltiples environments (staging/preview), aunque Vercel los hace automáticos sin tocar nada.
- Migrar `.pkl` a Git LFS.
- README ultra-formal con badges, contributing, license, etc. Solo lo esencial.
- Tests adicionales (los existentes en backend/ ya pasan).
- Cualquier cambio al notebook o al modelo (ya auditados 2 veces).
- Tocar el código del backend más allá del CORS ya configurado.

## Criterio de éxito

Termino cuando:
1. `curl https://<render>/api/health` devuelve 200 con `model_loaded: true`.
2. `curl POST https://<render>/api/neighbors` devuelve 5 vecinos (no 503).
3. `curl https://<vercel>/` devuelve 200.
4. Cargar el frontend en el navegador, clickear un demo, y ver el resultado de la predicción.
5. README en `main` con ambas URLs visibles.

Cualquier otra cosa que aparezca durante el deploy y no esté listada en "Riesgos" o "Plan" es alcance extra y se discute antes de hacerlo.

## Para Codex que esté auditando

Cosas que un evaluador estricto debería cuestionar y mi defensa:

- **¿Por qué Docker en Render en vez de runtime nativo Python?** → El backend depende de archivos fuera de `backend/` (lee `frontend/public/data/*.json`). Dockerfile permite COPY de ambos directorios al mismo build context. Runtime nativo de Render obliga a un solo directorio fuente, no calza con la estructura.
- **¿Por qué `model.pkl` en el repo en vez de Git LFS o S3?** → 38MB está bajo el límite hard de GitHub (100MB). LFS o S3 son complicaciones innecesarias para un prototipo académico. KISS.
- **¿Por qué CORS con regex en vez de lista cerrada?** → No sé la URL exacta de Vercel hasta después de deployar; preview deployments cambian de subdomain. Regex acotado a `*.vercel.app` es el balance entre seguridad y operabilidad para una demo.
- **¿Por qué free tier si tiene cold start?** → Costo cero, defensa de una clase tolera 50s de espera con UI de "cargando…", alternativa pagada no agrega valor pedagógico al prototipo.
- **¿Por qué no automatizar más?** → El plan tiene 4 pasos: 2 son de un comando, 1 es manual del usuario (Render dashboard), 1 es smoke test. Automatizar más sería over-engineering para algo que se hace una vez por entrega.
- **¿Por qué no separar el frontend/public/data del backend?** → Acople real heredado del diseño (las rutas `/api/quadtree`, `/api/octree`, `/api/sample-points` leen esos JSON). Refactorizar para que el backend tenga su propio `data/` interna sumaría 1-2h de trabajo y duplicaría archivos en el repo. El Dockerfile resuelve el acople en deploy sin tocar código.
- **¿Por qué no Railway o Fly.io?** → Render fue el que se eligió arriba (sección "Stack y decisiones"). Railway tiene trial limitado, Fly.io tiene 256MB de RAM en free (ajustado para este modelo). Render free con 512MB es el balance.

Si el auditor encuentra un finding **P0 (bloqueante metodológico real)**, se acepta y se incorpora al plan. Findings **P1/P2** se evalúan caso por caso contra el principio KISS: cualquier mejora que sume >30 min de trabajo y no resuelva un riesgo concreto se rechaza por scope.
