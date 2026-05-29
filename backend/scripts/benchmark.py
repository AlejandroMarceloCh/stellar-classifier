"""Benchmark de latencia de /api/predict y /api/neighbors.

Mide p50, p95, p99 sobre N corridas con inputs aleatorios del test set.
Genera docs/benchmarks.md y docs/benchmarks.json.

Uso:
    backend/venv/bin/python -m backend.scripts.benchmark
"""
from __future__ import annotations

import json
import statistics
import sys
import time
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
N_RUNS = 100
WARMUP_RUNS = 10


def percentile(data: list[float], p: float) -> float:
    """Calcula percentil p (0-100) de una lista de floats."""
    if not data:
        return 0.0
    sorted_data = sorted(data)
    k = (len(sorted_data) - 1) * (p / 100)
    f = int(k)
    c = min(f + 1, len(sorted_data) - 1)
    if f == c:
        return sorted_data[f]
    return sorted_data[f] + (sorted_data[c] - sorted_data[f]) * (k - f)


def benchmark_endpoint(client: TestClient, endpoint: str, method: str,
                       payload_iter, n_runs: int) -> dict[str, Any]:
    """Corre N requests al endpoint y devuelve estadísticas de latencia en ms."""
    # Warmup
    for _ in range(WARMUP_RUNS):
        payload = next(payload_iter)
        if method == "POST":
            client.post(endpoint, json=payload)
        else:
            client.get(endpoint)

    latencies = []
    response_sizes = []
    for _ in range(n_runs):
        payload = next(payload_iter)
        start = time.perf_counter()
        if method == "POST":
            r = client.post(endpoint, json=payload)
        else:
            r = client.get(endpoint)
        elapsed_ms = (time.perf_counter() - start) * 1000
        latencies.append(elapsed_ms)
        response_sizes.append(len(r.content))
        assert r.status_code == 200, f"Benchmark fallido: {r.status_code} - {r.text[:200]}"

    return {
        "endpoint": endpoint,
        "method": method,
        "n_runs": n_runs,
        "warmup_runs": WARMUP_RUNS,
        "latency_ms": {
            "p50": percentile(latencies, 50),
            "p95": percentile(latencies, 95),
            "p99": percentile(latencies, 99),
            "mean": statistics.mean(latencies),
            "min": min(latencies),
            "max": max(latencies),
        },
        "response_size_bytes": {
            "mean": int(statistics.mean(response_sizes)),
            "min": int(min(response_sizes)),
            "max": int(max(response_sizes)),
        },
    }


def main():
    print(f"Benchmark del backend ({N_RUNS} corridas + {WARMUP_RUNS} warmup)...")
    print()

    # Cargar test set para iteraciones
    X_test = pd.read_parquet(ROOT / "backend" / "data" / "X_test_raw.parquet")

    from backend.main import app
    with TestClient(app) as client:
        # --- /api/predict ---
        def predict_payloads():
            idx = 0
            n = len(X_test)
            while True:
                yield X_test.iloc[idx % n].to_dict()
                idx += 1

        def neighbors_payloads():
            idx = 0
            n = len(X_test)
            while True:
                row = X_test.iloc[idx % n]
                yield {"alpha": float(row["alpha"]), "delta": float(row["delta"]),
                       "redshift": float(row["redshift"]), "k": 5}
                idx += 1

        print("Benchmark POST /api/predict...")
        predict_stats = benchmark_endpoint(client, "/api/predict", "POST",
                                           predict_payloads(), N_RUNS)
        print_stats(predict_stats)

        print("\nBenchmark POST /api/neighbors...")
        neighbors_stats = benchmark_endpoint(client, "/api/neighbors", "POST",
                                             neighbors_payloads(), N_RUNS)
        print_stats(neighbors_stats)

        print("\nBenchmark GET /api/quadtree...")
        quadtree_stats = benchmark_endpoint(client, "/api/quadtree", "GET",
                                            iter(lambda: None, 1), N_RUNS)
        print_stats(quadtree_stats)

        print("\nBenchmark GET /api/octree...")
        octree_stats = benchmark_endpoint(client, "/api/octree", "GET",
                                          iter(lambda: None, 1), N_RUNS)
        print_stats(octree_stats)

        print("\nBenchmark GET /api/sample-points...")
        sample_stats = benchmark_endpoint(client, "/api/sample-points", "GET",
                                          iter(lambda: None, 1), N_RUNS)
        print_stats(sample_stats)

        print("\nBenchmark GET /api/health...")
        health_stats = benchmark_endpoint(client, "/api/health", "GET",
                                          iter(lambda: None, 1), N_RUNS)
        print_stats(health_stats)

    results = {
        "timestamp": pd.Timestamp.now(tz="UTC").isoformat(),
        "host": "TestClient (in-process, no network)",
        "endpoints": {
            "/api/predict": predict_stats,
            "/api/neighbors": neighbors_stats,
            "/api/quadtree": quadtree_stats,
            "/api/octree": octree_stats,
            "/api/sample-points": sample_stats,
            "/api/health": health_stats,
        },
        "targets_ms": {
            "/api/predict p95": 200,
            "/api/neighbors p95": 150,
            "/api/quadtree p95": 500,
            "/api/octree p95": 500,
            "/api/sample-points p95": 500,
            "/api/health p95": 50,
        },
    }

    out_json = ROOT / "docs" / "benchmarks.json"
    out_json.write_text(json.dumps(results, indent=2))
    print(f"\n✓ benchmarks.json escrito: {out_json}")

    # Generar markdown
    md_lines = [
        "# Benchmarks — Stellar Classifier Backend",
        "",
        f"**Generado:** {results['timestamp']}",
        f"**Host:** {results['host']}",
        f"**Corridas:** {N_RUNS} (+ {WARMUP_RUNS} warmup)",
        "",
        "## Resumen",
        "",
        "| Endpoint | p50 (ms) | p95 (ms) | p99 (ms) | Target p95 | Status |",
        "|---|---|---|---|---|---|",
    ]
    for ep, stats in results["endpoints"].items():
        target = results["targets_ms"].get(f"{ep} p95", "—")
        ok = "✓" if isinstance(target, (int, float)) and stats["latency_ms"]["p95"] < target else "—"
        if isinstance(target, (int, float)) and stats["latency_ms"]["p95"] >= target:
            ok = "✗"
        md_lines.append(
            f"| `{ep}` | {stats['latency_ms']['p50']:.2f} | "
            f"{stats['latency_ms']['p95']:.2f} | {stats['latency_ms']['p99']:.2f} | "
            f"{target} | {ok} |"
        )
    md_lines.append("")
    md_lines.append("## Detalle por endpoint")
    for ep, stats in results["endpoints"].items():
        md_lines.append("")
        md_lines.append(f"### `{stats['method']} {ep}`")
        md_lines.append("")
        md_lines.append("| Métrica | Valor |")
        md_lines.append("|---|---|")
        for k, v in stats["latency_ms"].items():
            md_lines.append(f"| {k} (ms) | {v:.2f} |")
        for k, v in stats["response_size_bytes"].items():
            md_lines.append(f"| response_size_{k} (bytes) | {v} |")

    out_md = ROOT / "docs" / "benchmarks.md"
    out_md.write_text("\n".join(md_lines) + "\n")
    print(f"✓ benchmarks.md escrito: {out_md}")


def print_stats(s):
    L = s["latency_ms"]
    print(f"  p50: {L['p50']:.2f}ms")
    print(f"  p95: {L['p95']:.2f}ms")
    print(f"  p99: {L['p99']:.2f}ms")
    print(f"  mean: {L['mean']:.2f}ms (min={L['min']:.2f}, max={L['max']:.2f})")


if __name__ == "__main__":
    sys.exit(main())
