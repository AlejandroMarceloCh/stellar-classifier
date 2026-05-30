# Audit del plan de deploy — instrucciones para Codex 5.3

Este archivo le dice a Codex qué auditar y cómo. Pegalo en Cursor, junto con el repo abierto.

## Qué auditar

**El plan de deploy y los archivos de configuración que se van a usar**. NO el notebook (ya fue auditado dos veces, P0/P1/P2 cubiertos, veredicto del re-audit adversarial = "sólido").

Archivos en scope:
- `deploy_plan.md` — el plan completo a ejecutar.
- `Dockerfile` — imagen del backend.
- `.dockerignore` — qué entra y qué no a la imagen.
- `render.yaml` — Blueprint que Render va a leer.
- `backend/requirements-prod.txt` — dependencias de runtime.
- `backend/main.py` — específicamente la sección de CORS (no el resto del backend).
- `frontend/.env.example` — contrato de env del frontend.
- `frontend/.env.local` — env para dev local (no debe estar en el commit).
- `.gitignore` — confirmar que entra el modelo + CSV y no entra lo pesado innecesario.

Archivos fuera de scope (NO auditar):
- `notebooks/00_pipeline_presentacion.ipynb` y todo `notebooks/` — ya auditados.
- `backend/ml/`, `backend/routes/`, `backend/tests/` — código del modelo y rutas; fuera del scope del deploy.
- `frontend/app/`, `frontend/components/`, `frontend/lib/` — código de UI; fuera del scope del deploy.
- `docs/` — documentos del producto; fuera del scope.

## Cómo evaluar

Para cada finding, responder:
1. **Severidad**: P0 (bloqueante, no debería ejecutarse así), P1 (mejora importante para subir nota / blindar el deploy), P2 (nice-to-have).
2. **Verificación**: cita textual del archivo y línea (ej: `Dockerfile:18`, `render.yaml:9`, `deploy_plan.md §Riesgos`).
3. **Por qué importa**: 1-2 oraciones de impacto real, no teórico.
4. **Acción concreta**: el fix exacto, no "consideren mejorar X".

## Dimensiones a chequear

### A. Coherencia del plan
- ¿Los pasos del plan reflejan el estado actual de los archivos? ¿Hay desalineamiento entre lo que el plan promete y lo que los archivos hacen?
- ¿Los comandos del paso 2 (Vercel CLI) son sintácticamente correctos y funcionan en la versión actual del CLI?
- ¿El criterio de éxito es verificable objetivamente?

### B. Riesgos no cubiertos
- ¿Qué puede salir mal en el deploy que no esté en la sección "Riesgos conocidos y mitigaciones"?
- Específicamente: ¿hay algún escenario donde el smoke test pase pero el sistema esté en realidad roto?
- ¿La mitigación de cold start (~50s) es realista para una defensa en vivo, o es un hand-wave?

### C. Configuración Docker
- `Dockerfile`: ¿COPY trae todo lo necesario? ¿deja afuera algo crítico? ¿el `CMD` arranca el servicio correctamente con `$PORT` de Render?
- `.dockerignore`: ¿excluye `backend/venv/` (sería catastrófico si entra: 500MB+)? ¿deja entrar `backend/models/*.pkl` y `backend/data/star_classification.csv`?
- ¿La imagen final es razonable en tamaño (target: <500MB)?

### D. CORS y seguridad
- `backend/main.py` CORS: el regex `https://.*\.vercel\.app` ¿es seguro o demasiado abierto? ¿Permite a un atacante con cualquier subdomain de Vercel pegarle a la API con `allow_credentials=True`?
- ¿Hay headers de seguridad faltantes que un evaluador serio marcaría (HSTS, X-Content-Type-Options)?
- `ALLOWED_ORIGINS` por env: ¿el split por coma maneja whitespace y casos edge (cadena vacía, trailing comma)?

### E. render.yaml
- ¿El `healthCheckPath: /api/health` está correctamente apuntando a un endpoint que existe y responde 200 cuando el modelo está cargado?
- ¿`plan: free` con `region: oregon` es la mejor región para Latinoamérica/Perú? ¿Habría que usar otra (ej. ohio, frankfurt) para menor latencia?
- ¿`envVars` con `sync: false` para `ALLOWED_ORIGINS` está bien o requiere algo más?

### F. requirements-prod.txt
- ¿Hay versiones que produzcan conflictos transitivos en Python 3.10 (Render slim image)?
- ¿scikit-learn 1.7.2 está pinneado correctamente para que el `.pkl` se deserialice sin warnings de versión?
- ¿Falta alguna dependencia de runtime que el código importe pero no esté listada?

### G. KISS / over-engineering
- ¿Hay algo en el plan que viole el principio KISS declarado? Específicamente, ¿alguna mitigación que en realidad agrega complejidad sin resolver un riesgo concreto?
- ¿Algún paso "Lo que NO voy a hacer" debería en realidad hacerse porque es bloqueante?

### H. .gitignore
- ¿Las excepciones `!backend/models/*.pkl` y `!backend/data/star_classification.csv` están bien ubicadas (después de los patterns que las niegan)?
- ¿Algún archivo sensible podría colarse en commits futuros (.env.local, tokens, .env)?

## Formato de salida esperado

```
P0 (NO ejecutaría así):
- [finding] · [archivo:linea] · [por qué importa] · [acción concreta]
- ...

P1 (mejoras importantes):
- ...

P2 (nice-to-have):
- ...

Veredicto:
- ready_to_execute: true | false
- rationale: 2-3 oraciones
- remaining_actions: lista en orden de prioridad
```

## Reglas

- **Sin floro**. Si el plan está bien, decímelo en una línea y enfocate solo en lo mejorable.
- **Adversarial por default**: si dudas si algo es problema, asumí que sí lo es y dejá que el autor lo defienda.
- **Citá evidencia siempre**: nada de "creo que..." o "podría ser que...". Si no podés citar archivo y línea, no es un finding.
- **Distinguí lo que ya está mitigado** (sección "Riesgos conocidos") de lo nuevo. No re-flageés riesgos que el plan ya documenta y acepta conscientemente.
- **Respetá KISS**: este es un prototipo académico para una defensa de clase, no un sistema de producción. No pidas CI/CD, Sentry, multi-region, blue/green deploy.
- **Si pedís un fix, ofrecé el patch** (no "considere agregar X" sino "agregar la línea Y al archivo Z").
