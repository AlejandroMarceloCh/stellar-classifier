// Tipos compartidos con el backend (mantener en sync con backend/routes/*.py).

export type StellarClass = "GALAXY" | "STAR" | "QSO";

export interface PredictRequest {
  alpha: number;
  delta: number;
  u: number;
  g: number;
  r: number;
  i: number;
  z: number;
  redshift: number;
}

export interface PredictResponse {
  prediction: StellarClass;
  confidence: number | null;
  top3: [StellarClass, number][];
  model_version: string;
}

export interface NeighborsRequest {
  alpha: number;
  delta: number;
  redshift: number;
  k?: number;
}

export interface Neighbor {
  alpha: number;
  delta: number;
  redshift: number;
  class: StellarClass;
  distance_norm: number;
  obj_id: string;
}

export interface NeighborsResponse {
  neighbors: Neighbor[];
  query: { alpha: number; delta: number; redshift: number };
  k: number;
}

export interface QuadtreeNode {
  id: string;
  depth: number;
  bounds: {
    alpha_min: number;
    alpha_max: number;
    delta_min: number;
    delta_max: number;
  };
  count: number;
  class_distribution: Partial<Record<StellarClass, number>>;
  dominant_class: StellarClass | null;
  children: string[];
  is_leaf: boolean;
}

export interface QuadtreePayload {
  metadata: {
    generated_at: string;
    dataset_rows: number;
    max_depth: number;
    min_count: number;
    feature_x: string;
    feature_y: string;
  };
  bounds: {
    alpha_min: number;
    alpha_max: number;
    delta_min: number;
    delta_max: number;
  };
  stats: {
    total_nodes: number;
    leaves: number;
    internal: number;
    empty_leaves: number;
    max_depth_real: number;
  };
  nodes: QuadtreeNode[];
}

export interface OctreeNode {
  id: string;
  depth: number;
  bounds_norm: {
    x_min: number; x_max: number;
    y_min: number; y_max: number;
    z_min: number; z_max: number;
  };
  bounds_raw: {
    alpha_min: number; alpha_max: number;
    delta_min: number; delta_max: number;
    redshift_min: number; redshift_max: number;
  };
  count: number;
  class_distribution: Partial<Record<StellarClass, number>>;
  dominant_class: StellarClass | null;
  children: string[];
  is_leaf: boolean;
}

export interface OctreePayload {
  metadata: {
    generated_at: string;
    sample_size: number;
    max_depth: number;
    min_count: number;
    features_3d: string[];
    random_state: number;
  };
  raw_ranges: Record<string, { min: number; max: number }>;
  stats: {
    total_nodes: number;
    leaves: number;
    internal: number;
    empty_leaves: number;
    max_depth_real: number;
  };
  nodes: OctreeNode[];
}

export interface SamplePointsPayload {
  metadata: { generated_at: string; count: number; stratified_by: string; random_state: number };
  features: string[];
  class_colors: Record<StellarClass, string>;
  alpha: number[];
  delta: number[];
  redshift: number[];
  class: StellarClass[];
  obj_ID: string[];
}

export interface ModelMetadata {
  version: string;
  model_type: string;
  trained_at: string;
  dataset_hash_sha256: string;
  dataset_rows: number;
  train_rows: number;
  test_rows: number;
  features: string[];
  classes: StellarClass[];
  metrics: {
    baseline_accuracy_majority: number;
    test_accuracy: number;
    test_f1_macro: number;
    cv_accuracy_mean: number;
    cv_accuracy_std: number;
    margin_over_baseline_pts: number;
    per_class: Record<StellarClass, {
      precision: number;
      recall: number;
      f1_score: number;
      support: number;
    }>;
  };
  feature_importance: Record<string, number> | null;
}

export interface ApiError {
  error_code: string;
  message: string;
  field?: string;
  valid_range?: { min: number; max: number };
}

export type FeatureName = "alpha" | "delta" | "u" | "g" | "r" | "i" | "z" | "redshift";

export type FeatureRanges = Record<FeatureName, {
  min: number;
  max: number;
  mean: number;
  std: number;
}>;

export interface ModelEntry {
  model: string;
  cv_accuracy_mean: number;
  cv_accuracy_std: number;
  test_accuracy: number;
  test_f1_macro: number;
  time_seconds: number;
}

export interface ClassReportEntry {
  precision: number;
  recall: number;
  "f1-score": number;
  support: number;
}

export interface ModelingSummary {
  timestamp: string;
  random_state: number;
  cv_folds: number;
  baseline: {
    strategy: string;
    accuracy: number;
  };
  winner: {
    name: string;
    test_accuracy: number;
    test_f1_macro: number;
    cv_accuracy_mean: number;
    cv_accuracy_std: number;
    margin_over_baseline_pts: number;
  };
  all_models: ModelEntry[];
  classification_report: Record<string, ClassReportEntry | number | { precision: number; recall: number; "f1-score": number; support: number }>;
  confusion_matrix: number[][];
  feature_ablation_rf: {
    accuracy_redshift_only: number;
    accuracy_all_features: number;
    diff_pts: number;
  };
  decisions: string[];
}

export interface DemoObject {
  obj_id: string;
  alpha: number;
  delta: number;
  u: number;
  g: number;
  r: number;
  i: number;
  z: number;
  redshift: number;
  expected_class: StellarClass;
  expected_confidence: number;
}
