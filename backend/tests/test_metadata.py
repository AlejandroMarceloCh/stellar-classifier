"""Tests para /api/ranges y /api/demo-objects."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    from backend.main import app
    with TestClient(app) as c:
        yield c


FEATURES = ["alpha", "delta", "u", "g", "r", "i", "z", "redshift"]
CLASSES = ["GALAXY", "STAR", "QSO"]


def test_ranges_endpoint(client):
    r = client.get("/api/ranges")
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) == set(FEATURES)
    for f in FEATURES:
        assert {"min", "max", "mean", "std"}.issubset(body[f].keys())
        assert body[f]["min"] < body[f]["max"]


def test_ranges_alpha_within_astronomical_bounds(client):
    body = client.get("/api/ranges").json()
    assert 0 <= body["alpha"]["min"] and body["alpha"]["max"] <= 360
    assert -90 <= body["delta"]["min"] and body["delta"]["max"] <= 90


def test_ranges_u_no_sentinel(client):
    body = client.get("/api/ranges").json()
    # Si tuviera centinela -9999, min sería ese valor
    assert body["u"]["min"] > 0
    assert body["g"]["min"] > 0
    assert body["z"]["min"] > 0


def test_demo_objects_endpoint(client):
    r = client.get("/api/demo-objects")
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) == set(CLASSES)
    for cls in CLASSES:
        demo = body[cls]
        assert demo["expected_class"] == cls
        assert demo["expected_confidence"] >= 0.95
        for f in FEATURES:
            assert f in demo
            assert isinstance(demo[f], (int, float))


def test_demo_objects_predict_correctly(client):
    """Los 3 demos deben predecir su clase esperada con la confianza prometida."""
    demos = client.get("/api/demo-objects").json()
    for cls, demo in demos.items():
        payload = {f: demo[f] for f in FEATURES}
        r = client.post("/api/predict", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["prediction"] == cls, f"Demo {cls} predijo {body['prediction']}"
        assert body["confidence"] >= 0.95, (
            f"Demo {cls} confidence {body['confidence']} < 0.95")
        # Y debe coincidir con expected_confidence (tolerancia)
        assert abs(body["confidence"] - demo["expected_confidence"]) < 0.05


def test_demo_objects_inputs_within_ranges(client):
    """Los demos no deben tener inputs fuera de rango (sino /predict los rechazaría)."""
    ranges = client.get("/api/ranges").json()
    demos = client.get("/api/demo-objects").json()
    for cls, demo in demos.items():
        for f in FEATURES:
            r = ranges[f]
            assert r["min"] <= demo[f] <= r["max"], (
                f"Demo {cls}.{f} = {demo[f]} fuera de [{r['min']}, {r['max']}]")
