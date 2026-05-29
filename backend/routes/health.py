"""Endpoints de salud y metadata: /api/health, /api/version."""
from __future__ import annotations

from fastapi import APIRouter, Request, status

router = APIRouter()


@router.get("/api/health")
def health(request: Request) -> dict:
    service = request.app.state.inference
    return {
        "status": "ok" if service.is_ready else "degraded",
        "model_loaded": service.is_ready,
    }


@router.get("/api/version")
def version(request: Request):
    service = request.app.state.inference
    if not service.is_ready:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error_code": "MODEL_NOT_LOADED",
                "message": "model_metadata.json no disponible",
            },
        )
    return service.metadata
