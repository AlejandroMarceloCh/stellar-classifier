"""Tests para /api/neighbors, /api/octree, /api/sample-points."""
from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient
from scipy.spatial import cKDTree
import numpy as np

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="module")
def client():
    from backend.main import app
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def sample_3d():
    """Un punto 3D válido del test set."""
    X_test = pd.read_parquet(ROOT / "backend" / "data" / "X_test_raw.parquet")
    row = X_test.iloc[0]
    return {"alpha": float(row["alpha"]), "delta": float(row["delta"]),
            "redshift": float(row["redshift"])}


# ---------- /api/neighbors ----------

def test_neighbors_basic(client, sample_3d):
    r = client.post("/api/neighbors", json={**sample_3d, "k": 5})
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["neighbors"]) == 5
    assert body["k"] == 5
    assert body["query"] == sample_3d


def test_neighbors_default_k(client, sample_3d):
    r = client.post("/api/neighbors", json=sample_3d)
    body = r.json()
    assert len(body["neighbors"]) == 5  # default


def test_neighbors_k_variants(client, sample_3d):
    for k in [1, 3, 10, 50]:
        r = client.post("/api/neighbors", json={**sample_3d, "k": k})
        assert r.status_code == 200, f"k={k}: {r.text}"
        assert len(r.json()["neighbors"]) == k


def test_neighbors_k_out_of_range(client, sample_3d):
    # k=0 no permitido
    r = client.post("/api/neighbors", json={**sample_3d, "k": 0})
    assert r.status_code == 422
    # k=51 supera el límite
    r = client.post("/api/neighbors", json={**sample_3d, "k": 51})
    assert r.status_code == 422


def test_neighbors_alpha_out_of_range(client, sample_3d):
    r = client.post("/api/neighbors", json={**sample_3d, "alpha": -10})
    assert r.status_code == 400
    assert r.json()["detail"]["field"] == "alpha"


def test_neighbors_redshift_out_of_range(client, sample_3d):
    r = client.post("/api/neighbors", json={**sample_3d, "redshift": 100})
    assert r.status_code == 400
    assert r.json()["detail"]["field"] == "redshift"


def test_neighbors_distance_increases(client, sample_3d):
    """Los vecinos deben venir ORDENADOS por distancia ascendente."""
    r = client.post("/api/neighbors", json={**sample_3d, "k": 10})
    distances = [n["distance_norm"] for n in r.json()["neighbors"]]
    assert distances == sorted(distances), f"Distances no ordenadas: {distances}"


def test_neighbors_class_in_valid_set(client, sample_3d):
    r = client.post("/api/neighbors", json={**sample_3d, "k": 5})
    for n in r.json()["neighbors"]:
        assert n["class"] in {"GALAXY", "STAR", "QSO"}


def test_neighbors_matches_kdtree_directly(client, sample_3d):
    """Validación independiente: el endpoint debe coincidir con un cKDTree
    construido manualmente sobre el mismo dataset."""
    # Reconstruir cKDTree manualmente
    df = pd.read_csv(ROOT / "backend" / "data" / "star_classification.csv")
    mask = (df[["u", "g", "r", "i", "z"]] == -9999).any(axis=1)
    df = df[~mask].reset_index(drop=True)

    cols = ["alpha", "delta", "redshift"]
    coords = df[cols].values.astype(float)
    raw_min = {c: float(df[c].min()) for c in cols}
    raw_max = {c: float(df[c].max()) for c in cols}
    norm = np.array([(coords[:, i] - raw_min[c]) / (raw_max[c] - raw_min[c])
                     for i, c in enumerate(cols)]).T
    tree = cKDTree(norm)
    query_norm = np.array([(sample_3d[c] - raw_min[c]) / (raw_max[c] - raw_min[c]) for c in cols])
    expected_dist, expected_idx = tree.query(query_norm, k=5)

    r = client.post("/api/neighbors", json={**sample_3d, "k": 5})
    api_neighbors = r.json()["neighbors"]

    # Comparar distancias (tolerancia floating-point)
    api_distances = np.array([n["distance_norm"] for n in api_neighbors])
    assert np.allclose(api_distances, expected_dist, atol=1e-9)

    # Comparar clases (deben coincidir con las filas)
    for api_n, idx in zip(api_neighbors, expected_idx):
        assert api_n["class"] == df.iloc[int(idx)]["class"]


# ---------- /api/octree ----------

def test_octree_endpoint(client):
    r = client.get("/api/octree")
    assert r.status_code == 200
    body = r.json()
    assert "nodes" in body
    assert "raw_ranges" in body
    assert "stats" in body
    assert len(body["nodes"]) > 0


def test_octree_has_3d_bounds(client):
    body = client.get("/api/octree").json()
    first_leaf = next(n for n in body["nodes"] if n["is_leaf"])
    assert "bounds_norm" in first_leaf
    assert "bounds_raw" in first_leaf
    for key in ["alpha_min", "alpha_max", "delta_min", "delta_max",
                "redshift_min", "redshift_max"]:
        assert key in first_leaf["bounds_raw"]


def test_octree_invariant_sum_eq_sample(client):
    """Suma de counts de hojas == sample_size."""
    body = client.get("/api/octree").json()
    leaf_sum = sum(n["count"] for n in body["nodes"] if n["is_leaf"])
    assert leaf_sum == body["metadata"]["sample_size"]


# ---------- /api/sample-points ----------

def test_sample_points_endpoint(client):
    r = client.get("/api/sample-points")
    assert r.status_code == 200
    body = r.json()
    assert "alpha" in body and "delta" in body and "redshift" in body and "class" in body
    assert len(body["alpha"]) == len(body["delta"]) == len(body["redshift"]) == len(body["class"])
    assert body["metadata"]["count"] == 10_000


def test_sample_points_stratified(client):
    body = client.get("/api/sample-points").json()
    from collections import Counter
    counts = Counter(body["class"])
    total = sum(counts.values())
    # Proporciones esperadas: GALAXY ~59%, STAR ~22%, QSO ~19%
    assert abs(counts["GALAXY"] / total - 0.5944) < 0.01
    assert abs(counts["STAR"] / total - 0.2159) < 0.01
    assert abs(counts["QSO"] / total - 0.1896) < 0.01


def test_sample_points_classes_valid(client):
    body = client.get("/api/sample-points").json()
    assert set(body["class"]).issubset({"GALAXY", "STAR", "QSO"})


# ---------- Health debe seguir OK con nuevo servicio ----------

def test_health_with_neighbors_loaded(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
