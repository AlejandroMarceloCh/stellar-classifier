"""Endpoints GET /api/octree y GET /api/sample-points — sirven los JSON precalculados."""
from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, status

logger = logging.getLogger("stellar.routes.octree")
router = APIRouter()

DATA_DIR = Path(__file__).resolve().parents[2] / "frontend" / "public" / "data"
OCTREE_PATH = DATA_DIR / "octree.json"
SAMPLE_PATH = DATA_DIR / "sample_points.json"

_octree_cache: dict | None = None
_sample_cache: dict | None = None


def _load_cached(path: Path, name: str) -> dict:
    if not path.exists():
        logger.error("%s no encontrado en %s", name, path)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error_code": f"{name.upper()}_NOT_AVAILABLE",
                "message": f"{name} no generado — correr notebook 05",
            },
        )
    return json.loads(path.read_text())


@router.get("/api/octree")
def get_octree() -> dict:
    global _octree_cache
    if _octree_cache is None:
        _octree_cache = _load_cached(OCTREE_PATH, "octree.json")
    return _octree_cache


@router.get("/api/sample-points")
def get_sample_points() -> dict:
    global _sample_cache
    if _sample_cache is None:
        _sample_cache = _load_cached(SAMPLE_PATH, "sample_points.json")
    return _sample_cache
