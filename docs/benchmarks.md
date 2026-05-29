# Benchmarks — Stellar Classifier Backend

**Generado:** 2026-05-27T16:15:29.871724+00:00
**Host:** TestClient (in-process, no network)
**Corridas:** 100 (+ 10 warmup)

## Resumen

| Endpoint | p50 (ms) | p95 (ms) | p99 (ms) | Target p95 | Status |
|---|---|---|---|---|---|
| `/api/predict` | 30.52 | 32.02 | 62.95 | 200 | ✓ |
| `/api/neighbors` | 1.17 | 1.42 | 1.58 | 150 | ✓ |
| `/api/quadtree` | 10.27 | 12.38 | 32.74 | 500 | ✓ |
| `/api/octree` | 8.32 | 8.93 | 30.36 | 500 | ✓ |
| `/api/sample-points` | 9.11 | 9.66 | 9.90 | 500 | ✓ |
| `/api/health` | 0.73 | 0.87 | 1.02 | 50 | ✓ |

## Detalle por endpoint

### `POST /api/predict`

| Métrica | Valor |
|---|---|
| p50 (ms) | 30.52 |
| p95 (ms) | 32.02 |
| p99 (ms) | 62.95 |
| mean (ms) | 31.15 |
| min (ms) | 26.96 |
| max (ms) | 76.94 |
| response_size_mean (bytes) | 132 |
| response_size_min (bytes) | 129 |
| response_size_max (bytes) | 136 |

### `POST /api/neighbors`

| Métrica | Valor |
|---|---|
| p50 (ms) | 1.17 |
| p95 (ms) | 1.42 |
| p99 (ms) | 1.58 |
| mean (ms) | 1.20 |
| min (ms) | 1.10 |
| max (ms) | 1.63 |
| response_size_mean (bytes) | 887 |
| response_size_min (bytes) | 861 |
| response_size_max (bytes) | 918 |

### `GET /api/quadtree`

| Métrica | Valor |
|---|---|
| p50 (ms) | 10.27 |
| p95 (ms) | 12.38 |
| p99 (ms) | 32.74 |
| mean (ms) | 11.49 |
| min (ms) | 9.90 |
| max (ms) | 33.69 |
| response_size_mean (bytes) | 540200 |
| response_size_min (bytes) | 540200 |
| response_size_max (bytes) | 540200 |

### `GET /api/octree`

| Métrica | Valor |
|---|---|
| p50 (ms) | 8.32 |
| p95 (ms) | 8.93 |
| p99 (ms) | 30.36 |
| mean (ms) | 8.79 |
| min (ms) | 7.92 |
| max (ms) | 30.73 |
| response_size_mean (bytes) | 392032 |
| response_size_min (bytes) | 392032 |
| response_size_max (bytes) | 392032 |

### `GET /api/sample-points`

| Métrica | Valor |
|---|---|
| p50 (ms) | 9.11 |
| p95 (ms) | 9.66 |
| p99 (ms) | 9.90 |
| mean (ms) | 9.16 |
| min (ms) | 8.79 |
| max (ms) | 9.93 |
| response_size_mean (bytes) | 579612 |
| response_size_min (bytes) | 579612 |
| response_size_max (bytes) | 579612 |

### `GET /api/health`

| Métrica | Valor |
|---|---|
| p50 (ms) | 0.73 |
| p95 (ms) | 0.87 |
| p99 (ms) | 1.02 |
| mean (ms) | 0.74 |
| min (ms) | 0.67 |
| max (ms) | 1.18 |
| response_size_mean (bytes) | 35 |
| response_size_min (bytes) | 35 |
| response_size_max (bytes) | 35 |
