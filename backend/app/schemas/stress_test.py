from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.schemas.simulation import SimulationInput, SimulationResult, ModularFarmInput

class StressScenarioOutcome(BaseModel):
    scenario_id: str
    scenario_name: str
    description: str
    severity: str  # Moderate, Severe, Extreme
    yield_quintal_acre: float
    yield_loss_pct: float
    profit_loss_inr: float
    critical_impact: str
    mitigation_strategy: str
    simulation_result: Optional[SimulationResult] = None

class StressTestInput(BaseModel):
    base_simulation: SimulationInput
    scenario_ids: Optional[List[str]] = Field(
        default=None,
        description="List of scenario IDs to run (defaults to all standard stress tests)"
    )

class StressTestResult(BaseModel):
    crop_name: str
    baseline_yield: float
    baseline_profit: float
    outcomes: List[StressScenarioOutcome]
    resilience_score: float  # 0 to 100
    resilience_rating: str   # Excellent, Good, Vulnerable, High Risk
    vulnerability_summary: str

class WeatherStressBatteryInput(BaseModel):
    baseline_input: ModularFarmInput

