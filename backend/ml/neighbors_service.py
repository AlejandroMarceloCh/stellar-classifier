"""k-NN productivo con scipy.spatial.cKDTree sobre (alpha, delta, redshift) normalizados.

Construido al startup desde el dataset completo (99,999 filas, sin centinela).
NO se serializa — reconstruirlo toma <1s.
"""
from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from scipy.spatial import cKDTree

logger = logging.getLogger("stellar.neighbors")

FEATURES_3D = ["alpha", "delta", "redshift"]
PHOTOMETRIC_BANDS = ["u", "g", "r", "i", "z"]


class NeighborsService:
    """k-NN sobre coordenadas espaciales 3D normalizadas a [0,1].

    Construye un cKDTree al startup desde el CSV (no del sample 10K, sino del
    dataset completo limpio de 99,999 filas).
    """

    def __init__(self, csv_path: Path):
        self.csv_path = csv_path
        self.tree: cKDTree | None = None
        self.data: pd.DataFrame | None = None
        self.raw_min: dict[str, float] = {}
        self.raw_max: dict[str, float] = {}
        self.is_ready = False

    def load(self) -> None:
        start = time.perf_counter()
        df = pd.read_csv(self.csv_path)
        # Misma limpieza que el preprocessing
        mask = (df[PHOTOMETRIC_BANDS] == -9999).any(axis=1)
        df = df[~mask].reset_index(drop=True)

        coords = df[FEATURES_3D].values.astype(np.float64)

        # Normalizar a [0,1] (mismo esquema que el octree)
        self.raw_min = {col: float(df[col].min()) for col in FEATURES_3D}
        self.raw_max = {col: float(df[col].max()) for col in FEATURES_3D}

        normalized = np.empty_like(coords)
        for i, col in enumerate(FEATURES_3D):
            span = self.raw_max[col] - self.raw_min[col]
            normalized[:, i] = (coords[:, i] - self.raw_min[col]) / span

        self.tree = cKDTree(normalized)
        self.data = df
        self.is_ready = True
        elapsed = time.perf_counter() - start
        logger.info(
            "cKDTree construido: %d puntos, 3D, en %.2fs", len(df), elapsed,
        )

    def normalize_point(self, point: dict[str, float]) -> np.ndarray:
        return np.array(
            [(point[col] - self.raw_min[col]) / (self.raw_max[col] - self.raw_min[col])
             for col in FEATURES_3D],
            dtype=np.float64,
        )

    def find_neighbors(self, point: dict[str, float], k: int = 5) -> list[dict[str, Any]]:
        """Devuelve los k vecinos más cercanos al `point` en espacio 3D normalizado.

        `point` debe contener al menos las claves `alpha`, `delta`, `redshift`.
        Otras claves (u, g, r, i, z) se ignoran — el k-NN es 3D.

        Cada vecino devuelto incluye: alpha, delta, redshift, class, distance_norm.
        """
        if not self.is_ready:
            raise RuntimeError("NeighborsService.load() no fue llamado o falló")

        normalized = self.normalize_point(point)
        distances, indices = self.tree.query(normalized, k=k)

        # Si k=1, distances/indices son escalares — normalizar a arrays
        if k == 1:
            distances = np.array([distances])
            indices = np.array([indices])

        neighbors = []
        for dist, idx in zip(distances, indices):
            row = self.data.iloc[int(idx)]
            neighbors.append({
                "alpha": float(row["alpha"]),
                "delta": float(row["delta"]),
                "redshift": float(row["redshift"]),
                "class": str(row["class"]),
                "distance_norm": float(dist),
                "obj_id": str(row.get("obj_ID", "")),
            })
        return neighbors
