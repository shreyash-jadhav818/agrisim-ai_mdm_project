export interface CropStage {
  name: string;
  duration_days: number;
  kc: number;
  ky: number;
  description: string;
}

export interface Crop {
  id: string;
  name: string;
  hindi_name: string;
  season: string;
  duration_days: number;
  base_temp_c: number;
  opt_temp_c: number;
  max_temp_c: number;
  total_gdd: number;
  potential_yield_quintal_acre: number;
  msp_inr_per_quintal: number;
  market_price_range_inr: [number, number];
  default_n_req_kg_acre: number;
  default_p_req_kg_acre: number;
  default_k_req_kg_acre: number;
  root_depth_min_m: number;
  root_depth_max_m: number;
  allowable_depletion_p: number;
  stages: CropStage[];
  description: string;
  economics?: {
    seed_cost_acre: number;
    land_prep_acre: number;
    crop_protection_acre: number;
    labor_harvest_acre: number;
    energy_cost_per_m3: number;
  };
}

export interface SoilType {
  id: string;
  name: string;
  hindi_name: string;
  description: string;
  field_capacity_vol: number;
  wilting_point_vol: number;
  saturation_vol: number;
  available_water_mm_per_m: number;
  ksat_mm_day: number;
  default_om_pct: number;
}

export interface AgroZone {
  id: string;
  name: string;
  latitude: number;
  elevation_m: number;
  annual_rainfall_mm: number;
  primary_crops: string[];
  primary_soils: string[];
}

export interface IrrigationEvent {
  day: number;
  amount_mm: number;
  method: string;
}

export interface FertilizerApplication {
  day: number;
  n_kg_acre: number;
  p_kg_acre: number;
  k_kg_acre: number;
  fertilizer_name: string;
}

export interface FarmProfile {
  id?: string;
  name: string;
  state: string;
  zone: string;
  total_acres: number;
  soil_type: string;
  irrigation_system: string;
}

export interface SimulationInput {
  farm_profile: FarmProfile;
  crop_id: string;
  sowing_date: string;
  irrigation_schedule: IrrigationEvent[];
  fertilizer_plan: FertilizerApplication[];
  soil_organic_matter_pct: number;
  mulching_used: boolean;
  target_yield_quintal_acre?: number;
  custom_price_per_quintal?: number;
  custom_seed_cost_per_acre?: number;
  electricity_or_diesel_cost_per_m3?: number;
}

export interface DailySimulationStep {
  day: number;
  date: string;
  stage_name: string;
  gdd_accumulated: number;
  et0_mm: number;
  kc: number;
  etc_mm: number;
  eta_mm: number;
  precipitation_mm: number;
  irrigation_mm: number;
  soil_depletion_mm: number;
  root_depth_m: number;
  water_stress_ks: number;
  heat_stress_factor: number;
  biomass_accumulated_kg_acre: number;
}

export interface SimulationCostBreakdown {
  seed_cost: number;
  land_prep_cost: number;
  fertilizer_cost: number;
  irrigation_energy_cost: number;
  crop_protection_cost: number;
  labor_harvest_cost: number;
  total_cost: number;
}

export interface SimulationResult {
  run_id: string;
  scenario_name: string;
  crop_id: string;
  crop_name: string;
  season: string;
  duration_days: number;
  yield_quintal_acre: number;
  yield_kg_ha: number;
  potential_yield_quintal_acre: number;
  yield_gap_pct: number;
  total_water_consumed_mm: number;
  total_water_consumed_m3_acre: number;
  total_irrigation_applied_mm: number;
  total_rainfall_mm: number;
  effective_rainfall_mm: number;
  deep_percolation_mm: number;
  total_n_applied_kg_acre: number;
  total_p_applied_kg_acre: number;
  total_k_applied_kg_acre: number;
  water_productivity_kg_m3: number;
  costs: SimulationCostBreakdown;
  gross_revenue_inr: number;
  net_profit_inr: number;
  profit_per_acre_inr: number;
  return_on_investment_roi_pct: number;
  daily_steps: DailySimulationStep[];
  limiting_factors: string[];
  scientific_validation_notes: string[];
}

export interface ScenarioComparisonItem {
  scenario_name: string;
  yield_quintal_acre: number;
  yield_delta_pct: number;
  water_consumed_m3_acre: number;
  water_delta_pct: number;
  total_cost_inr: number;
  cost_delta_pct: number;
  net_profit_inr: number;
  profit_delta_pct: number;
  water_productivity_kg_m3: number;
  roi_pct: number;
  result: SimulationResult;
}

export interface ScenarioComparisonResult {
  baseline: SimulationResult;
  scenarios: ScenarioComparisonItem[];
  key_insights: string[];
}

export interface OptimizationResult {
  success: boolean;
  objective_achieved: string;
  optimal_schedule: IrrigationEvent[];
  optimal_fertilizer: FertilizerApplication[];
  baseline_metrics: Record<string, number>;
  optimized_metrics: Record<string, number>;
  improvements: {
    profit_delta_pct: number;
    water_saved_pct: number;
    yield_delta_pct: number;
    water_productivity_delta_pct: number;
  };
  optimized_simulation: SimulationResult;
  recommendations: string[];
  methodology: string;
}

export interface StressScenarioOutcome {
  scenario_id: string;
  scenario_name: string;
  description: string;
  severity: string;
  yield_quintal_acre: number;
  yield_loss_pct: number;
  profit_loss_inr: number;
  critical_impact: string;
  mitigation_strategy: string;
  simulation_result?: SimulationResult;
}

export interface StressTestResult {
  crop_name: string;
  baseline_yield: number;
  baseline_profit: number;
  outcomes: StressScenarioOutcome[];
  resilience_score: number;
  resilience_rating: string;
  vulnerability_summary: string;
}

export interface DistributionBin {
  bin_start: number;
  bin_end: number;
  bin_center: number;
  count: number;
  frequency_pct: number;
}

export interface MonteCarloRiskResult {
  iterations: number;
  mean_yield: number;
  std_yield: number;
  p10_yield: number;
  p50_yield: number;
  p90_yield: number;
  mean_profit: number;
  std_profit: number;
  p10_profit: number;
  p50_profit: number;
  p90_profit: number;
  loss_probability_pct: number;
  value_at_risk_95_inr: number;
  expected_shortfall_95_inr: number;
  yield_distribution: DistributionBin[];
  profit_distribution: DistributionBin[];
  risk_rating: string;
  risk_executive_summary: string;
}

export interface AIExplanationResponse {
  executive_summary: string;
  limiting_factor_analysis: string;
  irrigation_diagnosis: string;
  fertilizer_diagnosis: string;
  profit_levers: string;
  actionable_recommendations: string[];
  scientific_basis: string;
  engine_used: string;
}

export interface HistoryRecord {
  id: string;
  farm_profile_id: string;
  name: string;
  crop_id: string;
  season: string;
  sowing_date: string;
  yield_quintal_acre: number;
  water_consumed_m3: number;
  total_cost_inr: number;
  revenue_inr: number;
  profit_inr: number;
  water_productivity_kg_m3: number;
  created_at: string;
}

export interface ModularFarmInput {
  crop_type: string;
  farm_area: number;
  farm_area_unit: 'acres' | 'hectares';
  soil_type: string;
  temperature_c?: number;
  tmin_c?: number;
  tmax_c?: number;
  rainfall_mm?: number;
  relative_humidity_pct?: number;
  sowing_date: string;
  crop_duration_days?: number;
  irrigation_method: string;
  irrigation_depth_mm?: number;
  irrigation_frequency?: number;
  nitrogen_kg_ha: number;
  phosphorus_kg_ha: number;
  potassium_kg_ha: number;
  fertilizer_cost_total?: number;
  irrigation_cost_total?: number;
  other_production_costs?: number;
  crop_selling_price_per_quintal?: number;
  mulching_used: boolean;
  soil_organic_matter_pct?: number;
}

export interface ScenarioDeltaMetrics {
  scenario_id: string;
  scenario_name: string;
  scenario_code: string;
  description: string;
  estimated_yield_kg_ha: number;
  estimated_yield_quintal_acre: number;
  estimated_total_harvest_quintals: number;
  estimated_total_harvest_tonnes: number;
  yield_delta_pct: number;
  irrigation_water_consumption_m3: number;
  irrigation_depth_mm: number;
  water_savings_m3: number;
  water_consumption_delta_pct: number;
  total_n_applied_kg: number;
  total_p_applied_kg: number;
  total_k_applied_kg: number;
  n_applied_kg_ha: number;
  p_applied_kg_ha: number;
  k_applied_kg_ha: number;
  excess_fertilizer_detected: boolean;
  modeled_fertilizer_cost_inr?: number;
  modeled_cultivation_costs_inr?: number;
  cost_delta_pct?: number;
  estimated_revenue_inr?: number;
  estimated_net_return_inr?: number;
  net_return_delta_pct?: number;
  is_partial_modeled_cost: boolean;
  biophysical_factors: Record<string, number>;
  assumptions: string[];
  limitations: string[];
}

export interface WhatIfSuiteResult {
  baseline: ScenarioDeltaMetrics;
  scenarios: ScenarioDeltaMetrics[];
  comparison_table: Array<{
    code: string;
    name: string;
    yield_kg_ha: number;
    yield_q_acre: number;
    yield_delta_pct: number;
    harvest_tonnes: number;
    water_m3: number;
    water_savings_m3: number;
    water_delta_pct: number;
    n_kg_ha: number;
    p_kg_ha: number;
    k_kg_ha: number;
    fertilizer_cost_inr?: number;
    total_cost_inr?: number;
    cost_delta_pct?: number;
    revenue_inr?: number;
    net_return_inr?: number;
    net_return_delta_pct?: number;
    is_partial_cost: boolean;
  }>;
  agronomic_synthesis: string[];
}

export interface GridOptimizationResult {
  objective: string;
  success: boolean;
  status_message: string;
  baseline_metrics: Record<string, any>;
  optimal_metrics: Record<string, any>;
  improvements: {
    yield_delta_pct: number;
    water_saved_pct: number;
    net_return_delta_pct: number;
  };
  recommended_parameters: {
    irrigation_depth_mm: number;
    irrigation_multiplier: number;
    nitrogen_kg_ha: number;
    phosphorus_kg_ha: number;
    potassium_kg_ha: number;
    sowing_date: string;
  };
  constraints_applied: Record<string, any>;
  total_candidates_evaluated: number;
  feasible_candidates_count: number;
  top_candidates: Array<{
    candidate_id: string;
    irrigation_depth_mm: number;
    nitrogen_kg_ha: number;
    sowing_date: string;
    yield_kg_ha: number;
    water_m3: number;
    net_return_inr?: number;
    is_feasible: boolean;
  }>;
  agronomic_recommendations: string[];
}

export interface ParetoStrategyPoint {
  strategy_id: string;
  strategy_name: string;
  irrigation_depth_mm: number;
  irrigation_multiplier: number;
  nitrogen_kg_ha: number;
  phosphorus_kg_ha: number;
  potassium_kg_ha: number;
  total_fertilizer_kg_ha: number;
  sowing_date: string;
  irrigation_method: string;
  predicted_yield_kg_ha: number;
  predicted_yield_q_acre: number;
  irrigation_water_m3: number;
  total_fertilizer_applied_kg: number;
  modeled_cost_inr?: number;
  estimated_revenue_inr?: number;
  estimated_net_profit_inr?: number;
  water_productivity_kg_m3: number;
  is_pareto_optimal: boolean;
  is_balanced_option: boolean;
  is_feasible: boolean;
  constraint_violations: string[];
  domination_count: number;
  trade_off_notes: string[];
}

export interface ParetoOptimizationResult {
  total_evaluated: number;
  feasible_count: number;
  pareto_frontier_count: number;
  pareto_frontier: ParetoStrategyPoint[];
  all_candidates: ParetoStrategyPoint[];
  balanced_strategy?: ParetoStrategyPoint;
  baseline_strategy: ParetoStrategyPoint;
  trade_off_summary: string[];
  methodology_disclosure: string;
}

export interface ParetoOptimizationInput {
  baseline_input: ModularFarmInput;
  max_water_m3?: number;
  max_budget_inr?: number;
  min_yield_kg_ha?: number;
  custom_irrigation_multipliers?: number[];
  custom_nitrogen_rates?: number[];
}

export interface WeatherShockScenarioResult {
  scenario_id: string;
  scenario_name: string;
  severity: string;
  description: string;
  weather_adjustments: Record<string, any>;
  estimated_yield_kg_ha: number;
  estimated_yield_quintal_acre: number;
  estimated_total_harvest_tonnes: number;
  yield_delta_kg_ha: number;
  yield_delta_pct: number;
  gross_rainfall_mm: number;
  effective_rainfall_mm: number;
  deep_percolation_mm: number;
  irrigation_water_consumption_m3: number;
  water_productivity_kg_m3: number;
  modeled_cost_inr?: number;
  estimated_net_return_inr?: number;
  profit_delta_inr?: number;
  profit_delta_pct?: number;
  water_response_factor: number;
  aeration_hypoxia_factor: number;
  temperature_stress_factor: number;
  is_vulnerable: boolean;
  vulnerability_trigger: string;
  mitigation_advisory: string;
}

export interface WeatherStressBatteryResult {
  crop_name: string;
  farm_area_ha: number;
  baseline_yield_kg_ha: number;
  baseline_water_m3: number;
  baseline_profit_inr?: number;
  scenarios: WeatherShockScenarioResult[];
  resilience_score: number;
  resilience_rating: string;
  most_vulnerable_scenario: string;
  executive_advisory: string;
  methodology_disclosure: string;
}

export interface TornadoVariableSensitivity {
  parameter_key: string;
  parameter_label: string;
  unit: string;
  baseline_value: number;
  low_value: number;
  low_label: string;
  low_yield_kg_ha: number;
  low_yield_delta_kg_ha: number;
  low_yield_delta_pct: number;
  low_profit_inr?: number;
  low_profit_delta_inr?: number;
  high_value: number;
  high_label: string;
  high_yield_kg_ha: number;
  high_yield_delta_kg_ha: number;
  high_yield_delta_pct: number;
  high_profit_inr?: number;
  high_profit_delta_inr?: number;
  yield_swing_kg_ha: number;
  yield_swing_pct: number;
  profit_swing_inr?: number;
  rank: number;
  primary_risk_driver: boolean;
  sensitivity_category: string;
}

export interface RiskScenarioOutcome {
  scenario_id: string;
  scenario_name: string;
  description: string;
  estimated_yield_kg_ha: number;
  estimated_yield_quintal_acre: number;
  estimated_total_harvest_tonnes: number;
  yield_delta_kg_ha: number;
  yield_delta_pct: number;
  irrigation_water_m3: number;
  modeled_cost_inr?: number;
  estimated_revenue_inr?: number;
  estimated_net_return_inr?: number;
  profit_delta_inr?: number;
  profit_margin_pct?: number;
  risk_level: string;
  key_drivers: string[];
}

export interface FarmerRiskMitigation {
  risk_domain: string;
  title: string;
  description: string;
  implementation_cost: string;
  expected_impact: string;
  priority: string;
}

export interface RiskSensitivityResult {
  crop_name: string;
  farm_area_ha: number;
  farm_area_acres: number;
  baseline_yield_kg_ha: number;
  baseline_yield_quintal_acre: number;
  baseline_profit_inr?: number;
  tornado_sensitivities: TornadoVariableSensitivity[];
  baseline_scenario: RiskScenarioOutcome;
  worst_case_scenario: RiskScenarioOutcome;
  best_case_scenario: RiskScenarioOutcome;
  yield_range_kg_ha: {
    worst_case: number;
    baseline: number;
    best_case: number;
    spread_kg_ha: number;
  };
  yield_range_quintal_acre: {
    worst_case: number;
    baseline: number;
    best_case: number;
    spread_quintal_acre: number;
  };
  profit_range_inr?: {
    worst_case_inr: number;
    baseline_inr: number;
    best_case_inr: number;
    spread_inr: number;
  };
  primary_vulnerability_factor: string;
  risk_mitigations: FarmerRiskMitigation[];
  executive_risk_summary: string;
  methodology_disclosure: string;
}

export interface RiskSensitivityInput {
  baseline_input: ModularFarmInput;
  rainfall_variation_pct?: number;
  temperature_anomaly_c?: number;
  fertilizer_inflation_pct?: number;
  price_volatility_pct?: number;
  sowing_shift_days?: number;
}

export interface ExplainableRecommendation {
  recommendation: string;
  reasoning: string;
  expected_impact: {
    yield_baseline_kg_ha?: number;
    yield_recommended_kg_ha?: number;
    yield_delta_kg_ha?: number;
    yield_delta_pct?: number;
    water_baseline_m3?: number;
    water_recommended_m3?: number;
    water_savings_m3?: number;
    water_delta_pct?: number;
    nitrogen_baseline_kg_ha?: number;
    nitrogen_recommended_kg_ha?: number;
    nitrogen_delta_kg_ha?: number;
    nitrogen_delta_pct?: number;
    profit_baseline_inr?: number;
    profit_recommended_inr?: number;
    profit_delta_inr?: number;
    profit_delta_pct?: number;
    [key: string]: any;
  };
  trade_offs: string;
  assumptions: string[];
  uncertainty_and_limitations: string[];
  practical_next_steps: string[];
  disclaimer: string;
}

export interface AdvisorExplanationRequest {
  baseline_simulation?: SimulationResult;
  baseline_payload?: Record<string, any>;
  recommended_strategy?: Record<string, any>;
  selected_objective?: string;
  what_if_results?: Array<Record<string, any>>;
  optimization_result?: Record<string, any>;
  stress_test_result?: Record<string, any>;
  risk_result?: Record<string, any>;
  farmer_query?: string;
}

export interface AdvisorExplanationResponse {
  recommendation_card: ExplainableRecommendation;
  narrative_explanation: string;
  active_provider: string;
  provider_mode: string;
  confidence_notes: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  context?: Record<string, any>;
}

export interface ChatResponse {
  reply: string;
  suggested_followups: string[];
  active_provider: string;
  provider_mode: string;
  referenced_metrics: Record<string, any>;
}

export interface AIProviderStatus {
  active_provider: string;
  provider_mode: string;
  local_ollama_available: boolean;
  ollama_url: string;
  ollama_model: string;
  external_ai_available: boolean;
  external_provider?: string;
  setup_instructions: string;
}


export interface HistoryComparedRun {
  id: string;
  name: string;
  crop_id: string;
  season: string;
  created_at: string;
  yield_quintal_acre: number;
  yield_kg_ha: number;
  yield_delta_pct: number;
  water_consumed_m3: number;
  water_delta_pct: number;
  water_applied_mm: number;
  total_cost_inr: number;
  revenue_inr: number;
  profit_inr: number;
  profit_delta_pct: number;
  water_productivity_kg_m3: number;
  is_baseline: boolean;
}

export interface HistoryCompareResult {
  baseline_run_id: string;
  compared_runs: HistoryComparedRun[];
  summary: string;
}



