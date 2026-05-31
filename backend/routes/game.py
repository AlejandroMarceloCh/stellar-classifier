"""Endpoint GET /api/game-objects — pool de objetos del juego (test set, no visto)."""
from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, status

logger = logging.getLogger("stellar.routes.game")
router = APIRouter()

GAME_PATH = Path(__file__).resolve().parents[2] / "frontend" / "public" / "data" / "game_objects.json"

_cache: dict | None = None


@router.get("/api/game-objects")
def get_game_objects() -> dict:
    global _cache
    if _cache is not None:
        return _cache

    if not GAME_PATH.exists():
        logger.error("game_objects.json no encontrado en %s", GAME_PATH)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error_code": "GAME_OBJECTS_NOT_AVAILABLE",
                "message": "game_objects.json no generado — correr backend/scripts/generate_game_objects.py",
            },
        )

    _cache = json.loads(GAME_PATH.read_text())
    return _cache
