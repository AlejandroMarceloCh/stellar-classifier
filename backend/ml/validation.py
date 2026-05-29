"""Validación de inputs contra los rangos del training set."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

FEATURE_COLS = ["alpha", "delta", "u", "g", "r", "i", "z", "redshift"]


class InputValidationError(Exception):
    """Lanzado cuando un input está fuera de rango o tiene features faltantes."""

    def __init__(self, error_code: str, message: str, field: str | None = None,
                 valid_range: dict | None = None):
        self.error_code = error_code
        self.message = message
        self.field = field
        self.valid_range = valid_range
        super().__init__(message)

    def to_dict(self) -> dict:
        payload = {"error_code": self.error_code, "message": self.message}
        if self.field is not None:
            payload["field"] = self.field
        if self.valid_range is not None:
            payload["valid_range"] = self.valid_range
        return payload


def load_train_ranges(path: Path) -> dict[str, dict[str, float]]:
    return json.loads(path.read_text())


def validate_input(payload: dict[str, Any], ranges: dict[str, dict[str, float]]) -> None:
    """Verifica que cada feature esté presente y dentro de [min, max] del training set.

    Raises InputValidationError si falla.
    """
    for col in FEATURE_COLS:
        if col not in payload:
            raise InputValidationError(
                error_code="MISSING_FEATURE",
                message=f"Falta la feature '{col}' en el input",
                field=col,
            )

        value = payload[col]
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise InputValidationError(
                error_code="INVALID_TYPE",
                message=f"'{col}' debe ser numérico (recibido: {type(value).__name__})",
                field=col,
            )

        r = ranges[col]
        if value < r["min"] or value > r["max"]:
            raise InputValidationError(
                error_code="INPUT_OUT_OF_RANGE",
                message=(
                    f"'{col}'={value} está fuera del rango entrenado "
                    f"[{r['min']:.4f}, {r['max']:.4f}]"
                ),
                field=col,
                valid_range={"min": r["min"], "max": r["max"]},
            )
