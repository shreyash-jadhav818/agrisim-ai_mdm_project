from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.schemas.simulation import SimulationInput, SimulationResult, IrrigationEvent, FertilizerApplication, ModularFarmInput

class OptimizationInput(BaseModel):
    base_simulation: SimulationInput
    objective: str = Field(
        default="maximize_profit",
        description="Optimization objective: maximize_profit, minimize_water, maximize_yield, minimize_cost"
    )
    max_water_allowable_mm: Optional[float] = Field(
        default=None,
        description="Cap on total irrigation water in mm"
    )
    max_budget_inr_per_acre: Optional[float] = Field(
        default=None,
        description="Budget ceiling in INR per acre"
    )
    min_target_yield_quintal: Optional[float] = Field(
        default=None,
        description="Minimum acceptable yield in quintals per acre"
    )
    optimize_irrigation: bool = True
    optimize_fertilizer: bool = True

class OptimizationResult(BaseModel):
    success: bool
    objective_achieved: str
    optimal_schedule: List[IrrigationEvent]
    optimal_fertilizer: List[FertilizerApplication]
    baseline_metrics: Dict[str, float]
    optimized_metrics: Dict[str, float]
    improvements: Dict[str, float]
    optimized_simulation: SimulationResult
    recommendations: List[str]
    methodology: str

class ParetoOptimizationInput(BaseModel):
    baseline_input: ModularFarmInput
    max_water_m3: Optional[float] = Field(default=None, description="Upper ceiling on water consumption in m3")
    max_budget_inr: Optional[float] = Field(default=None, description="Upper ceiling on total cultivation costs in INR")
    min_yield_kg_ha: Optional[float] = Field(default=None, description="Lower floor on crop harvest in kg/ha")
    custom_irrigation_multipliers: Optional[List[float]] = Field(default=None, description="Irrigation scaling factors (e.g. [0.6, 0.8, 1.0, 1.2])")
    custom_nitrogen_rates: Optional[List[float]] = Field(default=None, description="Nitrogen test rates in kg/ha")

