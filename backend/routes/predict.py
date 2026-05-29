"""Endpoint POST /api/predict."""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field, ConfigDict

from ..ml.inference import ModelNotLoadedError
from ..ml.validation import InputValidationError

logger = logging.getLogger("stellar.routes.predict")
router = APIRouter()


class PredictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    alpha: float = Field(..., description="Right Ascension (RA) in degrees [0, 360]")
    delta: float = Field(..., description="Declination (DEC) in degrees [-90, 90]")
    u: float = Field(..., description="Ultraviolet photometric band")
    g: float = Field(..., description="Green photometric band")
    r: float = Field(..., description="Red photometric band")
    i: float = Field(..., description="Near-infrared photometric band")
    z: float = Field(..., description="Far-infrared photometric band")
    redshift: float = Field(..., description="Cosmological redshift")


class PredictResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    prediction: str
    confidence: float | None
    top3: list[list]
    model_version: str


@router.post(
    "/api/predict",
    response_model=PredictResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"description": "Input inválido (rango fuera o tipo incorrecto)"},
        503: {"description": "Modelo no disponible"},
    },
)
def predict(payload: PredictRequest, request: Request) -> PredictResponse:
    service = request.app.state.inference

    if not service.is_ready:
        logger.error("predict request received but model is not loaded")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error_code": "MODEL_NOT_LOADED", "message": "Modelo no disponible"},
        )

    try:
        result = service.predict(payload.model_dump())
        return PredictResponse(**result)
    except InputValidationError as e:
        logger.info("validation error: %s", e.message)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.to_dict()) from e
    except ModelNotLoadedError as e:
        logger.error("model not loaded during predict: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error_code": "MODEL_NOT_LOADED", "message": str(e)},
        ) from e
    except Exception as e:
        logger.exception("unexpected error in predict")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error_code": "INTERNAL_ERROR", "message": str(e)},
        ) from e
