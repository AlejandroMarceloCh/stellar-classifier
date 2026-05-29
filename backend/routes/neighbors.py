"""Endpoint POST /api/neighbors — k-NN espacial 3D."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger("stellar.routes.neighbors")
router = APIRouter()


class NeighborsRequest(BaseModel):
    alpha: float = Field(..., description="Right Ascension (degrees)")
    delta: float = Field(..., description="Declination (degrees)")
    redshift: float = Field(..., description="Cosmological redshift")
    k: int = Field(5, ge=1, le=50, description="Cantidad de vecinos (1-50)")


class Neighbor(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    alpha: float
    delta: float
    redshift: float
    class_: str = Field(..., alias="class")
    distance_norm: float
    obj_id: str


class NeighborsResponse(BaseModel):
    neighbors: list[Neighbor]
    query: dict
    k: int


@router.post(
    "/api/neighbors",
    response_model=NeighborsResponse,
    responses={
        400: {"description": "Coordenadas fuera de rango"},
        503: {"description": "Servicio de neighbors no disponible"},
    },
)
def get_neighbors(payload: NeighborsRequest, request: Request) -> NeighborsResponse:
    service = request.app.state.neighbors

    if not service.is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error_code": "NEIGHBORS_NOT_AVAILABLE",
                    "message": "Servicio k-NN no disponible"},
        )

    # Validar rangos (relax — son coordenadas, no features)
    for col, value in [("alpha", payload.alpha), ("delta", payload.delta), ("redshift", payload.redshift)]:
        r_min = service.raw_min[col]
        r_max = service.raw_max[col]
        if value < r_min or value > r_max:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_code": "INPUT_OUT_OF_RANGE",
                    "field": col,
                    "message": f"{col}={value} fuera del rango del dataset [{r_min:.4f}, {r_max:.4f}]",
                    "valid_range": {"min": r_min, "max": r_max},
                },
            )

    try:
        neighbors = service.find_neighbors(
            {"alpha": payload.alpha, "delta": payload.delta, "redshift": payload.redshift},
            k=payload.k,
        )
        return NeighborsResponse(
            neighbors=[Neighbor(**{**n, "class": n["class"]}) for n in neighbors],
            query={"alpha": payload.alpha, "delta": payload.delta, "redshift": payload.redshift},
            k=payload.k,
        )
    except Exception as e:
        logger.exception("error in /api/neighbors")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error_code": "INTERNAL_ERROR", "message": str(e)},
        ) from e
