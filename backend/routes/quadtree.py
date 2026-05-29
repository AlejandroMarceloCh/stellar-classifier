"""Endpoint GET /api/quadtree — sirve el JSON precalculado."""
from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, status

logger = logging.getLogger("stellar.routes.quadtree")
router = APIRouter()

QUADTREE_PATH = Path(__file__).resolve().parents[2] / "frontend" / "public" / "data" / "quadtree.json"

_cache: dict | None = None


@router.get("/api/quadtree")
def get_quadtree() -> dict:
    global _cache
    if _cache is not None:
        return _cache

    if not QUADTREE_PATH.exists():
        logger.error("quadtree.json no encontrado en %s", QUADTREE_PATH)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error_code": "QUADTREE_NOT_AVAILABLE",
                "message": "quadtree.json no generado — correr notebook 04",
            },
        )

    _cache = json.loads(QUADTREE_PATH.read_text())
    return _cache
