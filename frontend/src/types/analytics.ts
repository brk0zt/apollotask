export interface FFTSpectrumItem {
  frequency_cycles_day: number;
  period_days: number | null;
  magnitude: number;
}

export interface FFTAnalysisResponse {
  success: boolean;
  sampling_rate_hours: number;
  signal_length_raw: number;
  fft_length_padded: number;
  dominant_frequency_cycles_day: number;
  dominant_period_days: number;
  peak_magnitude: number;
  insight: string;
  spectrum: FFTSpectrumItem[];
  error?: string;
}

export interface ProjectForecastResponse {
  success: boolean;
  completed_tasks_count?: number;
  incomplete_tasks_count?: number;
  base_velocity: number;
  velocity_drift_coefficient: number;
  total_estimated_remaining_hours: number;
  forecasted_remaining_days: number;
  estimated_completion_date: string;
  newton_raphson_iterations?: number;
  newton_raphson_converged?: boolean;
  method: string;
  confidence: number;
  error?: string;
}

export interface RiskContribution {
  metric_value: number;
  jacobian_sensitivity: number;
  risk_contribution: number;
  percentage_impact: number;
}

export interface RiskScoringResponse {
  success: boolean;
  project_id: number;
  risk_score: number;
  risk_level: string;
  linearization_model: string;
  breakdown: Record<string, RiskContribution>;
  error?: string;
}
