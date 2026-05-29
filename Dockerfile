# Backend FastAPI — Stellar Classifier. Imagen para Render (Docker runtime).
# Build context = raíz del repo (necesita backend/ + frontend/public/data).
FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# 1) Dependencias de runtime (capa cacheable)
COPY backend/requirements-prod.txt ./backend/requirements-prod.txt
RUN pip install --no-cache-dir -r backend/requirements-prod.txt

# 2) Código + artefactos que el backend lee en runtime:
#    backend/models/*.pkl, backend/data/star_classification.csv,
#    frontend/public/data/{quadtree,octree,sample_points}.json
COPY backend ./backend
COPY frontend/public/data ./frontend/public/data

# Render inyecta $PORT en runtime; 8000 como default local.
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}"]
