"""Genera el pool de objetos del juego desde el TEST SET (data no vista por el modelo).

Replica el split exacto del notebook (random_state=42, test_size=0.2, stratify, drop
centinela -9999) y exporta una muestra estratificada de filas de test con las 8 features
fisicas + la clase real + obj_ID. El frontend usa estas filas como "objetos misteriosos":
manda las 8 features a /api/predict (inferencia real del modelo) y usa la clase real solo
para puntuar la respuesta del jugador.

Garantia metodologica: estas filas estan en X_test, el modelo nunca las entreno.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[2]
CSV_PATH = ROOT / "backend" / "data" / "star_classification.csv"
OUT_PATH = ROOT / "frontend" / "public" / "data" / "game_objects.json"

FEATURES = ["alpha", "delta", "u", "g", "r", "i", "z", "redshift"]
TARGET = "class"
SENTINEL = -9999
RANDOM_STATE = 42
TEST_SIZE = 0.2
CLASS_TO_INT = {"GALAXY": 0, "STAR": 1, "QSO": 2}

# Cuantos objetos por clase entran al pool del juego (estratificado).
PER_CLASS = 80


def main() -> None:
    df = pd.read_csv(CSV_PATH)

    # Misma limpieza que el notebook: drop filas con centinela en cualquier banda.
    sentinel_mask = (df[FEATURES] == SENTINEL).any(axis=1)
    df = df.loc[~sentinel_mask].reset_index(drop=True)
    df["target"] = df[TARGET].map(CLASS_TO_INT)

    # Mismo split EXACTO que el notebook. Pasamos el df completo para arrastrar obj_ID.
    _, test_df = train_test_split(
        df,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=df["target"],
    )

    # Muestra estratificada y balanceada del test set (PER_CLASS por clase).
    rng = np.random.RandomState(RANDOM_STATE)
    picks = []
    for cls in ["GALAXY", "STAR", "QSO"]:
        pool = test_df[test_df[TARGET] == cls]
        n = min(PER_CLASS, len(pool))
        idx = rng.choice(pool.index.to_numpy(), size=n, replace=False)
        picks.append(test_df.loc[idx])

    sample = pd.concat(picks).sample(frac=1, random_state=RANDOM_STATE).reset_index(drop=True)

    objects = []
    for _, row in sample.iterrows():
        objects.append({
            "obj_id": str(int(row["obj_ID"])),
            "alpha": float(row["alpha"]),
            "delta": float(row["delta"]),
            "u": float(row["u"]),
            "g": float(row["g"]),
            "r": float(row["r"]),
            "i": float(row["i"]),
            "z": float(row["z"]),
            "redshift": float(row["redshift"]),
            "true_class": str(row[TARGET]),
        })

    payload = {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": "test_set",
            "note": "Filas reservadas del 20% de test — el modelo nunca las entreno.",
            "random_state": RANDOM_STATE,
            "test_size": TEST_SIZE,
            "per_class": PER_CLASS,
            "count": len(objects),
            "features": FEATURES,
        },
        "class_distribution": {
            cls: int((sample[TARGET] == cls).sum()) for cls in ["GALAXY", "STAR", "QSO"]
        },
        "objects": objects,
    }

    OUT_PATH.write_text(json.dumps(payload, indent=2))
    print(f"OK: {len(objects)} objetos -> {OUT_PATH}")
    print("Distribucion:", payload["class_distribution"])


if __name__ == "__main__":
    main()
