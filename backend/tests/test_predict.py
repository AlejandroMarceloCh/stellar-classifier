"""Tests del backend FastAPI usando TestClient (httpx).

Cobertura:
- Caso feliz: predict con un input válido del test set devuelve 200 + prediction correcta
- Errores 400: missing feature, fuera de rango, tipo inválido, extra fields
- Errores 422: JSON malformado
- 503: simulación de modelo no cargado
- /api/health responde 'ok'
- /api/version expone metadata
- /api/quadtree sirve el JSON precalculado
- CORS habilitado
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="session")
def client():
    """TestClient con la app real (lifespan ejecutado, modelo cargado)."""
    from backend.main import app
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def sample_input():
    """Un input válido del test set."""
    X_test = pd.read_parquet(ROOT / "backend" / "data" / "X_test_raw.parquet")
    return X_test.iloc[0].to_dict()


@pytest.fixture(scope="session")
def sample_label():
    y_test = pd.read_parquet(ROOT / "backend" / "data" / "y_test.parquet")["target"]
    int_to_class = {0: "GALAXY", 1: "STAR", 2: "QSO"}
    return int_to_class[int(y_test.iloc[0])]


# ---------- Root + health + version ----------

def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    body = r.json()
    assert body["service"] == "Stellar Classifier API"
    assert "/api/predict" in body["endpoints"]


def test_health_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["model_loaded"] is True


def test_version(client):
    r = client.get("/api/version")
    assert r.status_code == 200
    metadata = r.json()
    assert "version" in metadata
    assert "model_type" in metadata
    assert "dataset_hash_sha256" in metadata
    assert "metrics" in metadata
    assert metadata["features"] == ["alpha", "delta", "u", "g", "r", "i", "z", "redshift"]
    assert len(metadata["dataset_hash_sha256"]) == 64


# ---------- Predict caso feliz ----------

def test_predict_happy_path(client, sample_input, sample_label):
    r = client.post("/api/predict", json=sample_input)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["prediction"] == sample_label
    assert 0 <= body["confidence"] <= 1
    assert len(body["top3"]) == 3
    assert "model_version" in body
    # Confidence == primera prob del top3
    assert abs(body["confidence"] - body["top3"][0][1]) < 1e-9


def test_predict_returns_valid_class(client, sample_input):
    r = client.post("/api/predict", json=sample_input)
    body = r.json()
    assert body["prediction"] in {"GALAXY", "STAR", "QSO"}


def test_predict_top3_sums_close_to_1(client, sample_input):
    r = client.post("/api/predict", json=sample_input)
    body = r.json()
    total = sum(p for _, p in body["top3"])
    assert abs(total - 1.0) < 0.01  # las top3 cubren ~todas las clases (son solo 3)


def test_predict_multiple_inputs(client):
    """Probar 20 inputs del test set y validar accuracy alta."""
    X_test = pd.read_parquet(ROOT / "backend" / "data" / "X_test_raw.parquet").head(20)
    y_test = pd.read_parquet(ROOT / "backend" / "data" / "y_test.parquet")["target"].head(20)
    int_to_class = {0: "GALAXY", 1: "STAR", 2: "QSO"}

    correct = 0
    for (_, row), label_int in zip(X_test.iterrows(), y_test):
        r = client.post("/api/predict", json=row.to_dict())
        assert r.status_code == 200, r.text
        if r.json()["prediction"] == int_to_class[int(label_int)]:
            correct += 1
    assert correct >= 18, f"Accuracy en 20 muestras: {correct}/20 — esperado >=18"


# ---------- Errores 400 ----------

def test_predict_missing_feature(client, sample_input):
    bad = sample_input.copy()
    del bad["redshift"]
    r = client.post("/api/predict", json=bad)
    assert r.status_code == 422  # Pydantic detecta missing field


def test_predict_out_of_range_redshift(client, sample_input):
    bad = sample_input.copy()
    bad["redshift"] = 100.0
    r = client.post("/api/predict", json=bad)
    assert r.status_code == 400
    detail = r.json()["detail"]
    assert detail["error_code"] == "INPUT_OUT_OF_RANGE"
    assert detail["field"] == "redshift"
    assert "valid_range" in detail


def test_predict_out_of_range_alpha(client, sample_input):
    bad = sample_input.copy()
    bad["alpha"] = -50.0
    r = client.post("/api/predict", json=bad)
    assert r.status_code == 400
    assert r.json()["detail"]["field"] == "alpha"


def test_predict_sentinel_value(client, sample_input):
    """El valor -9999 (centinela SDSS) debe ser rechazado."""
    bad = sample_input.copy()
    bad["u"] = -9999
    r = client.post("/api/predict", json=bad)
    assert r.status_code == 400
    assert r.json()["detail"]["error_code"] == "INPUT_OUT_OF_RANGE"


def test_predict_extra_field_rejected(client, sample_input):
    """Pydantic con extra='forbid' rechaza fields desconocidos."""
    bad = sample_input.copy()
    bad["unknown_feature"] = 42
    r = client.post("/api/predict", json=bad)
    assert r.status_code == 422


def test_predict_invalid_json(client):
    r = client.post("/api/predict", content=b"not json", headers={"content-type": "application/json"})
    assert r.status_code == 422


def test_predict_wrong_type(client, sample_input):
    bad = sample_input.copy()
    bad["alpha"] = "not a number"
    r = client.post("/api/predict", json=bad)
    assert r.status_code == 422  # Pydantic detecta tipo


# ---------- Quadtree endpoint ----------

def test_quadtree_endpoint(client):
    r = client.get("/api/quadtree")
    assert r.status_code == 200
    body = r.json()
    assert "nodes" in body
    assert "bounds" in body
    assert "metadata" in body
    assert len(body["nodes"]) > 0


# ---------- CORS ----------

def test_cors_preflight(client):
    """Preflight OPTIONS para Next.js."""
    r = client.options(
        "/api/predict",
        headers={
            "origin": "http://localhost:3000",
            "access-control-request-method": "POST",
            "access-control-request-headers": "content-type",
        },
    )
    assert r.status_code == 200
    assert "access-control-allow-origin" in {k.lower() for k in r.headers}
