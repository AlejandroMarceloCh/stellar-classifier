"""Carga del modelo + función de predicción end-to-end."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from .validation import FEATURE_COLS, load_train_ranges, validate_input

logger = logging.getLogger("stellar.inference")


class ModelNotLoadedError(Exception):
    """El modelo no pudo cargarse al startup."""


class InferenceService:
    """Carga modelo, scaler, encoder, ranges al startup y expone predict()."""

    def __init__(self, models_dir: Path):
        self.models_dir = models_dir
        self.model = None
        self.scaler = None
        self.encoder = None
        self.ranges: dict[str, dict[str, float]] = {}
        self.metadata: dict[str, Any] = {}
        self.is_ready = False

    def load(self) -> None:
        """Carga todos los artefactos. Lanza ModelNotLoadedError si algo falla."""
        try:
            self.model = joblib.load(self.models_dir / "model.pkl")
            self.scaler = joblib.load(self.models_dir / "scaler.pkl")
            self.encoder = joblib.load(self.models_dir / "label_encoder.pkl")
            self.ranges = load_train_ranges(self.models_dir / "train_ranges.json")
            self.metadata = json.loads((self.models_dir / "model_metadata.json").read_text())
        except FileNotFoundError as e:
            raise ModelNotLoadedError(f"Artefacto no encontrado: {e}") from e
        except Exception as e:
            raise ModelNotLoadedError(f"Error cargando artefactos: {e}") from e

        self.is_ready = True
        logger.info(
            "modelo cargado: version=%s, model_type=%s, test_acc=%.4f",
            self.metadata.get("version"),
            self.metadata.get("model_type"),
            self.metadata.get("metrics", {}).get("test_accuracy", 0),
        )

    def predict(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Pipeline completo: validate → scale → predict → top3 + decode.

        Raises InputValidationError si el input no es válido.
        Raises ModelNotLoadedError si el modelo no se cargó.
        """
        if not self.is_ready:
            raise ModelNotLoadedError("InferenceService.load() no fue llamado o falló")

        validate_input(payload, self.ranges)

        features = pd.DataFrame(
            [[payload[c] for c in FEATURE_COLS]],
            columns=FEATURE_COLS,
        )
        scaled_array = self.scaler.transform(features)
        scaled = pd.DataFrame(scaled_array, columns=FEATURE_COLS)

        prediction = int(self.model.predict(scaled)[0])
        int_to_class = self.encoder["int_to_class"]
        prediction_label = int_to_class[prediction] if isinstance(list(int_to_class.keys())[0], int) \
            else int_to_class[str(prediction)]

        result: dict[str, Any] = {
            "prediction": prediction_label,
            "model_version": self.metadata.get("version", "unknown"),
        }

        if hasattr(self.model, "predict_proba"):
            probas = self.model.predict_proba(scaled)[0]
            classes = self.model.classes_

            top3_pairs = sorted(zip(classes, probas), key=lambda x: -x[1])[:3]
            top3_labels = []
            for cls_int, p in top3_pairs:
                key = int(cls_int)
                label = int_to_class.get(key) or int_to_class.get(str(key))
                top3_labels.append([label, float(p)])

            confidence = float(probas[list(classes).index(prediction)])
            result["confidence"] = confidence
            result["top3"] = top3_labels
        else:
            result["confidence"] = None
            result["top3"] = [[prediction_label, 1.0]]

        return result
