"""Endpoints de metadata: /api/ranges (rangos de features), /api/demo-objects (3 chips)."""
from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, status

logger = logging.getLogger("stellar.routes.metadata")
router = APIRouter()

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODELS_DIR = PROJECT_ROOT / "backend" / "models"
DOCS_DIR = PROJECT_ROOT / "docs"


@router.get("/api/ranges")
def get_ranges(request: Request) -> dict:
    """Devuelve train_ranges.json — los min/max/mean/std del training set para cada feature.

    El frontend lo consume al mount para validar inputs en cliente (UX inmediato)
    sin tener que hacer una request a /predict para descubrir un INPUT_OUT_OF_RANGE.
    """
    service = request.app.state.inference
    if not service.is_ready or not service.ranges:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error_code": "RANGES_NOT_AVAILABLE",
                    "message": "train_ranges.json no disponible"},
        )
    return service.ranges


@router.get("/api/demo-objects")
def get_demo_objects() -> dict:
    """3 filas reales del test set con alta confianza (>= 0.99) — una por clase.

    Generadas por `backend/scripts/build_demo_objects.py`. El frontend las usa
    como chips clickeables en `/` para que el usuario vea el flujo completo
    sin tener que ingresar valores manualmente.
    """
    path = MODELS_DIR / "demo_objects.json"
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error_code": "DEMO_OBJECTS_NOT_AVAILABLE",
                    "message": "demo_objects.json no generado — correr scripts/build_demo_objects.py"},
        )
    return json.loads(path.read_text())


@router.get("/api/modeling-summary")
def get_modeling_summary() -> dict:
    """Devuelve `docs/modeling_summary.json` — comparativa de los 10 modelos, CV scores,
    matriz de confusión, classification_report y decisiones de modelado.

    Lo consume la pantalla `/analysis` del frontend para renderizar el ranking de modelos
    y la matriz de confusión. Es snapshot del notebook 03_modeling — no se regenera en runtime.
    """
    path = DOCS_DIR / "modeling_summary.json"
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error_code": "MODELING_SUMMARY_NOT_AVAILABLE",
                    "message": "docs/modeling_summary.json no disponible — correr notebook 03_modeling"},
        )
    return json.loads(path.read_text())
