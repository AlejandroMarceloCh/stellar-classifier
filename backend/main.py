"""FastAPI app — Stellar Classifier backend."""
from __future__ import annotations

import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .ml.inference import InferenceService, ModelNotLoadedError
from .ml.neighbors_service import NeighborsService
from .routes import health, metadata, neighbors, octree, predict, quadtree

# ---------- Logging ----------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-7s | %(name)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    stream=sys.stdout,
)
logger = logging.getLogger("stellar.main")

MODELS_DIR = Path(__file__).resolve().parent / "models"
DATA_CSV = Path(__file__).resolve().parent / "data" / "star_classification.csv"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Carga modelo + cKDTree al startup. Si fallan, los endpoints respectivos devuelven 503."""
    inference = InferenceService(MODELS_DIR)
    neighbors_svc = NeighborsService(DATA_CSV)
    app.state.inference = inference
    app.state.neighbors = neighbors_svc

    try:
        inference.load()
        logger.info("inference listo")
    except ModelNotLoadedError as e:
        logger.error("modelo no cargó: %s — /api/predict devolverá 503", e)
    except Exception as e:
        logger.exception("inference startup error: %s", e)

    try:
        neighbors_svc.load()
        logger.info("neighbors (cKDTree) listo")
    except Exception as e:
        logger.exception("neighbors startup error: %s — /api/neighbors devolverá 503", e)

    yield
    logger.info("shutdown")


app = FastAPI(
    title="Stellar Classifier API",
    description="Backend del proyecto DS3022 — clasificación de objetos celestes del SDSS17.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS: localhost para dev + orígenes extra por env (Render) + deploys de Vercel.
# Regex acotado a un solo segmento de subdominio (no matches arbitrarios).
# allow_credentials=False porque el cliente no envía cookies/credenciales.
_default_origins = [
    "http://localhost:3000", "http://127.0.0.1:3000",
    "http://localhost:3223", "http://127.0.0.1:3223",
]
_env_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins + _env_origins,
    allow_origin_regex=r"^https://[a-z0-9-]+\.vercel\.app$",
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------- Security headers (higiene HTTP básica) ----------
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


# ---------- Request logging middleware ----------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s -> %d (%.1fms)",
        request.method, request.url.path, response.status_code, elapsed_ms,
    )
    return response


# ---------- Routes ----------
app.include_router(health.router, tags=["health"])
app.include_router(predict.router, tags=["predict"])
app.include_router(quadtree.router, tags=["quadtree"])
app.include_router(octree.router, tags=["octree"])
app.include_router(neighbors.router, tags=["neighbors"])
app.include_router(metadata.router, tags=["metadata"])


@app.get("/", tags=["root"])
def root():
    return {
        "service": "Stellar Classifier API",
        "version": "0.1.0",
        "endpoints": [
            "/api/health", "/api/version", "/api/ranges", "/api/demo-objects",
            "/api/modeling-summary",
            "/api/predict",
            "/api/quadtree", "/api/octree", "/api/sample-points",
            "/api/neighbors",
        ],
    }
