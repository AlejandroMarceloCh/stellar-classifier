// Cliente del backend FastAPI. Base URL configurable via NEXT_PUBLIC_API_URL.
import type {
  ApiError,
  DemoObject,
  FeatureRanges,
  GameObjectsPayload,
  ModelMetadata,
  ModelingSummary,
  NeighborsRequest,
  NeighborsResponse,
  OctreePayload,
  PredictRequest,
  PredictResponse,
  QuadtreePayload,
  SamplePointsPayload,
  StellarClass,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class StellarApiError extends Error {
  constructor(public status: number, public detail: ApiError | string) {
    super(typeof detail === "string" ? detail : detail.message);
    this.name = "StellarApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    let detail: ApiError | string;
    try {
      const body = await res.json();
      detail = body.detail ?? body;
    } catch {
      detail = res.statusText;
    }
    throw new StellarApiError(res.status, detail);
  }

  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; model_loaded: boolean }>("/api/health"),
  version: () => request<ModelMetadata>("/api/version"),
  ranges: () => request<FeatureRanges>("/api/ranges"),
  demoObjects: () => request<Record<StellarClass, DemoObject>>("/api/demo-objects"),
  predict: (payload: PredictRequest) =>
    request<PredictResponse>("/api/predict", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  neighbors: (payload: NeighborsRequest) =>
    request<NeighborsResponse>("/api/neighbors", {
      method: "POST",
      body: JSON.stringify({ k: 5, ...payload }),
    }),
  quadtree: () => request<QuadtreePayload>("/api/quadtree"),
  octree: () => request<OctreePayload>("/api/octree"),
  samplePoints: () => request<SamplePointsPayload>("/api/sample-points"),
  modelingSummary: () => request<ModelingSummary>("/api/modeling-summary"),
  gameObjects: () => request<GameObjectsPayload>("/api/game-objects"),
};
