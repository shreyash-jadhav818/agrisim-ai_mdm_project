import {
  Crop,
  SoilType,
  AgroZone,
  SimulationInput,
  SimulationResult,
  ScenarioComparisonResult,
  OptimizationResult,
  StressTestResult,
  MonteCarloRiskResult,
  AIExplanationResponse,
  HistoryRecord,
  ModularFarmInput,
  WhatIfSuiteResult,
  GridOptimizationResult,
  ParetoOptimizationInput,
  ParetoOptimizationResult,
  WeatherStressBatteryResult,
  RiskSensitivityInput,
  RiskSensitivityResult,
  AIProviderStatus,
  AdvisorExplanationRequest,
  AdvisorExplanationResponse,
  ChatRequest,
  ChatResponse,
  HistoryCompareResult
} from '../types';

const API_BASE = '/api/v1';

export async function checkBackendHealth(): Promise<{ status: string; app: string; version: string; database: string }> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check non-200');
    return res.json();
  } catch (e) {
    return { status: 'offline', app: 'AgriSim AI', version: '1.0.0', database: 'disconnected' };
  }
}

export async function executeModularSimulation(input: ModularFarmInput): Promise<any> {
  const res = await fetch(`${API_BASE}/simulation/modular/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Modular simulation failed' }));
    throw new Error(err.detail || 'Simulation execution failed');
  }
  return res.json();
}

export async function executeWhatIfSuite(
  baselineInput: ModularFarmInput,
  customOverrides?: Record<string, any>
): Promise<WhatIfSuiteResult> {
  const res = await fetch(`${API_BASE}/simulation/modular/what-if`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      baseline_input: baselineInput,
      custom_overrides: customOverrides || {}
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'What-If scenario suite failed' }));
    throw new Error(err.detail || 'Failed to generate What-If scenarios');
  }
  return res.json();
}

export async function executeGridOptimization(
  baselineInput: ModularFarmInput,
  objective: string = 'estimated_yield',
  maxWater?: number,
  maxBudget?: number,
  minYield?: number
): Promise<GridOptimizationResult> {
  const res = await fetch(`${API_BASE}/optimize/grid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      baseline_input: baselineInput,
      objective,
      max_water_m3: maxWater || null,
      max_budget_inr: maxBudget || null,
      min_yield_kg_ha: minYield || null
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Grid optimization failed' }));
    throw new Error(err.detail || 'Failed to optimize strategy');
  }
  return res.json();
}

export async function deleteHistoryRecord(runId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/history/${runId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete history record');
}


export async function fetchCrops(): Promise<Crop[]> {
  const res = await fetch(`${API_BASE}/crops`);
  if (!res.ok) throw new Error('Failed to fetch crops catalog');
  return res.json();
}

export async function fetchSoils(): Promise<SoilType[]> {
  const res = await fetch(`${API_BASE}/crops/data/soils`);
  if (!res.ok) throw new Error('Failed to fetch soils catalog');
  return res.json();
}

export async function fetchZones(): Promise<AgroZone[]> {
  const res = await fetch(`${API_BASE}/crops/data/zones`);
  if (!res.ok) throw new Error('Failed to fetch agro-climatic zones');
  return res.json();
}

export async function executeSimulation(input: SimulationInput): Promise<SimulationResult> {
  const res = await fetch(`${API_BASE}/simulation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Simulation request failed' }));
    throw new Error(err.detail || 'Simulation failed');
  }
  return res.json();
}

export async function executeScenarioComparison(
  baseSimulation: SimulationInput,
  scenarios: Array<{
    name: string;
    mulching_used?: boolean;
    irrigation_system?: string;
    irrigation_schedule?: any[];
    fertilizer_plan?: any[];
    sowing_date?: string;
  }>
): Promise<ScenarioComparisonResult> {
  const res = await fetch(`${API_BASE}/simulation/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_simulation: baseSimulation, scenarios })
  });
  if (!res.ok) throw new Error('Failed to compare scenarios');
  return res.json();
}

export async function executeOptimization(
  baseSimulation: SimulationInput,
  objective: string,
  maxWater?: number,
  maxBudget?: number,
  minYield?: number
): Promise<OptimizationResult> {
  const res = await fetch(`${API_BASE}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base_simulation: baseSimulation,
      objective,
      max_water_allowable_mm: maxWater || null,
      max_budget_inr_per_acre: maxBudget || null,
      min_target_yield_quintal: minYield || null,
      optimize_irrigation: true,
      optimize_fertilizer: true
    })
  });
  if (!res.ok) throw new Error('Failed to run optimization');
  return res.json();
}

export async function executeStressTest(
  baseSimulation: SimulationInput,
  scenarioIds?: string[]
): Promise<StressTestResult> {
  const res = await fetch(`${API_BASE}/stress-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base_simulation: baseSimulation,
      scenario_ids: scenarioIds || null
    })
  });
  if (!res.ok) throw new Error('Failed to run stress test');
  return res.json();
}

export async function executeRiskAnalysis(
  baseSimulation: SimulationInput,
  iterations: number = 300,
  rainfallVol: number = 25,
  tempAnomaly: number = 1.5,
  priceVol: number = 20
): Promise<MonteCarloRiskResult> {
  const res = await fetch(`${API_BASE}/risk/monte-carlo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base_simulation: baseSimulation,
      iterations,
      rainfall_volatility_pct: rainfallVol,
      temperature_anomaly_c: tempAnomaly,
      price_volatility_pct: priceVol
    })
  });
  if (!res.ok) throw new Error('Failed to run risk analysis');
  return res.json();
}

export async function fetchAIExplanation(
  simulationResult: SimulationResult,
  query?: string
): Promise<AIExplanationResponse> {
  const res = await fetch(`${API_BASE}/ai/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      simulation_result: simulationResult,
      farmer_query: query || null
    })
  });
  if (!res.ok) throw new Error('Failed to fetch AI explanation');
  return res.json();
}

export async function fetchHistory(): Promise<HistoryRecord[]> {
  const res = await fetch(`${API_BASE}/history`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function fetchHistoryDetail(runId: string): Promise<{ id: string; input: SimulationInput; output: SimulationResult }> {
  const res = await fetch(`${API_BASE}/history/${runId}`);
  if (!res.ok) throw new Error('Failed to fetch history detail');
  return res.json();
}

export async function downloadReportPdf(sim: SimulationResult): Promise<void> {
  const res = await fetch(`${API_BASE}/reports/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sim)
  });
  if (!res.ok) throw new Error('Failed to generate PDF');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AgriSim_Report_${sim.crop_id}_${sim.run_id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadReportCsv(sim: SimulationResult): Promise<void> {
  const res = await fetch(`${API_BASE}/reports/csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sim)
  });
  if (!res.ok) throw new Error('Failed to generate CSV');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AgriSim_Data_${sim.crop_id}_${sim.run_id}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function executeParetoOptimization(
  input: ParetoOptimizationInput
): Promise<ParetoOptimizationResult> {
  const res = await fetch(`${API_BASE}/optimize/pareto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Pareto optimization failed' }));
    throw new Error(err.detail || 'Pareto optimization failed');
  }
  return res.json();
}

export async function executeWeatherStressBattery(
  baselineInput: ModularFarmInput
): Promise<WeatherStressBatteryResult> {
  const res = await fetch(`${API_BASE}/stress-test/battery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseline_input: baselineInput })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Weather stress battery failed' }));
    throw new Error(err.detail || 'Weather stress battery failed');
  }
  return res.json();
}

export async function executeRiskSensitivity(
  input: RiskSensitivityInput
): Promise<RiskSensitivityResult> {
  const res = await fetch(`${API_BASE}/risk/sensitivity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Risk sensitivity analysis failed' }));
    throw new Error(err.detail || 'Risk sensitivity analysis failed');
  }
  return res.json();
}

export async function fetchAIProviderStatus(): Promise<AIProviderStatus> {
  const res = await fetch(`${API_BASE}/ai/provider-status`);
  if (!res.ok) {
    return {
      active_provider: 'Rule-Based Deterministic Engine',
      provider_mode: 'rule_based',
      local_ollama_available: false,
      ollama_url: 'http://localhost:11434',
      ollama_model: 'llama3.2',
      external_ai_available: false,
      setup_instructions: 'Install Ollama to enable local LLM natural language reasoning.'
    };
  }
  return res.json();
}

export async function fetchAdvisorExplanation(
  request: AdvisorExplanationRequest
): Promise<AdvisorExplanationResponse> {
  const res = await fetch(`${API_BASE}/ai/advisor-explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to generate advisor explanation' }));
    throw new Error(err.detail || 'Failed to generate advisor explanation');
  }
  return res.json();
}

export async function sendChatMessage(
  request: ChatRequest
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Chat assistant failed' }));
    throw new Error(err.detail || 'Chat assistant failed');
  }
  return res.json();
}

export async function downloadScenariosCsv(scenarios: any[], baseline?: any): Promise<void> {
  const res = await fetch(`${API_BASE}/reports/scenarios-csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarios, baseline })
  });
  if (!res.ok) throw new Error('Failed to generate scenarios CSV');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AgriSim_WhatIf_Scenarios_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadSavedRunPdf(runId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/reports/pdf/${runId}`);
  if (!res.ok) throw new Error('Failed to generate PDF for saved run');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AgriSim_Report_${runId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadSavedRunCsv(runId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/reports/csv/${runId}`);
  if (!res.ok) throw new Error('Failed to generate CSV for saved run');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AgriSim_Data_${runId}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function compareHistoryRuns(runIds: string[]): Promise<HistoryCompareResult> {
  const res = await fetch(`${API_BASE}/history/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_ids: runIds })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to compare simulation runs' }));
    throw new Error(err.detail || 'Failed to compare simulation runs');
  }
  return res.json();
}



