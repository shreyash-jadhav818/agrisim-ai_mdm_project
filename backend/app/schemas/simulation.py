from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime

class IrrigationEvent(BaseModel):
    day: int = Field(..., description="Day after sowing (1 to harvest)", ge=1)
    amount_mm: float = Field(..., description="Irrigation depth applied in mm", ge=0.0)
    method: str = Field(default="drip", description="Irrigation method: drip, flood, sprinkler, furrow")

class FertilizerApplication(BaseModel):
    day: int = Field(..., description="Day after sowing (1 to harvest)", ge=1)
    n_kg_acre: float = Field(default=0.0, description="Elemental Nitrogen applied in kg/acre", ge=0.0)
    p_kg_acre: float = Field(default=0.0, description="Elemental Phosphorus P2O5 in kg/acre", ge=0.0)
    k_kg_acre: float = Field(default=0.0, description="Elemental Potassium K2O in kg/acre", ge=0.0)
    fertilizer_name: str = Field(default="Custom Mix", description="e.g. Urea, DAP, MOP, 19:19:19")

class FarmProfileInput(BaseModel):
    id: Optional[str] = None
    name: str = Field(default="Green Valley Farm", description="Farm name")
    state: str = Field(default="Punjab", description="Indian State")
    zone: str = Field(default="Trans-Gangetic Plain", description="Agro-Climatic Zone")
    total_acres: float = Field(default=5.0, description="Farm size in acres", gt=0.0)
    soil_type: str = Field(default="Alluvial Loam", description="Soil texture type")
    irrigation_system: str = Field(default="drip", description="Default irrigation system")

class SimulationInput(BaseModel):
    farm_profile: FarmProfileInput = Field(default_factory=FarmProfileInput)
    crop_id: str = Field(default="wheat", description="Crop identifier")
    sowing_date: str = Field(default="2026-11-15", description="Sowing date (YYYY-MM-DD)")
    irrigation_schedule: List[IrrigationEvent] = Field(default_factory=list)
    fertilizer_plan: List[FertilizerApplication] = Field(default_factory=list)
    soil_organic_matter_pct: float = Field(default=0.8, description="Soil organic matter % (0.2 to 3.0)")
    mulching_used: bool = Field(default=False, description="Whether plastic/organic mulch is applied")
    target_yield_quintal_acre: Optional[float] = Field(default=None, description="Target yield in quintals/acre")
    custom_price_per_quintal: Optional[float] = Field(default=None, description="Custom market price in INR/quintal")
    custom_seed_cost_per_acre: Optional[float] = Field(default=None, description="Seed cost INR/acre")
    electricity_or_diesel_cost_per_m3: Optional[float] = Field(default=None, description="Water pumping cost INR/m3")

    @field_validator("sowing_date")
    @classmethod
    def validate_sowing_date(cls, v: str) -> str:
        try:
            datetime.strptime(v.strip(), "%Y-%m-%d")
            return v.strip()
        except Exception:
            raise ValueError(f"Invalid sowing_date '{v}'. Format must be YYYY-MM-DD.")

class DailySimulationStep(BaseModel):
    day: int
    date: str
    stage_name: str
    gdd_accumulated: float
    et0_mm: float
    kc: float
    etc_mm: float
    eta_mm: float
    precipitation_mm: float
    irrigation_mm: float
    soil_depletion_mm: float
    root_depth_m: float
    water_stress_ks: float
    heat_stress_factor: float
    biomass_accumulated_kg_acre: float

class SimulationCostBreakdown(BaseModel):
    seed_cost: float
    land_prep_cost: float
    fertilizer_cost: float
    irrigation_energy_cost: float
    crop_protection_cost: float
    labor_harvest_cost: float
    total_cost: float

class SimulationResult(BaseModel):
    run_id: str
    scenario_name: Optional[str] = "Baseline"
    crop_id: str
    crop_name: str
    season: str
    duration_days: int
    yield_quintal_acre: float
    yield_kg_ha: float
    potential_yield_quintal_acre: float
    yield_gap_pct: float
    total_water_consumed_mm: float
    total_water_consumed_m3_acre: float
    total_irrigation_applied_mm: float
    total_rainfall_mm: float
    effective_rainfall_mm: float
    deep_percolation_mm: float
    total_n_applied_kg_acre: float
    total_p_applied_kg_acre: float
    total_k_applied_kg_acre: float
    water_productivity_kg_m3: float
    costs: SimulationCostBreakdown
    gross_revenue_inr: float
    net_profit_inr: float
    profit_per_acre_inr: float
    return_on_investment_roi_pct: float
    daily_steps: List[DailySimulationStep]
    limiting_factors: List[str]
    scientific_validation_notes: List[str]

class ScenarioComparisonInput(BaseModel):
    base_simulation: SimulationInput
    scenarios: List[Dict[str, Any]] = Field(default_factory=list, description="Scenarios with names and overrides")

class ScenarioComparisonItem(BaseModel):
    scenario_name: str
    yield_quintal_acre: float
    yield_delta_pct: float
    water_consumed_m3_acre: float
    water_delta_pct: float
    total_cost_inr: float
    cost_delta_pct: float
    net_profit_inr: float
    profit_delta_pct: float
    water_productivity_kg_m3: float
    roi_pct: float
    result: SimulationResult

class ScenarioComparisonResult(BaseModel):
    baseline: SimulationResult
    scenarios: List[ScenarioComparisonItem]
    key_insights: List[str]

class ModularFarmInput(BaseModel):
    crop_type: str = Field(default="wheat", description="Crop identifier or name")
    farm_area: float = Field(default=2.0, gt=0.0, le=50000.0, description="Farm area in acres or hectares")
    farm_area_unit: str = Field(default="acres", description="'acres' or 'hectares'")
    soil_type: str = Field(default="Alluvial Loam", description="Soil texture type")
    temperature_c: Optional[float] = Field(default=None, description="Mean temperature °C")
    tmin_c: Optional[float] = Field(default=None, description="Min temperature °C")
    tmax_c: Optional[float] = Field(default=None, description="Max temperature °C")
    rainfall_mm: Optional[float] = Field(default=None, ge=0.0, description="Seasonal rainfall in mm")
    relative_humidity_pct: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Relative humidity % when available")
    sowing_date: str = Field(default="2026-11-15", description="Sowing date (YYYY-MM-DD)")
    crop_duration_days: Optional[int] = Field(default=None, ge=30, le=450, description="Crop duration in days")
    irrigation_method: str = Field(default="drip", description="Irrigation method: drip, sprinkler, furrow, flood, rainfed")
    irrigation_depth_mm: Optional[float] = Field(default=None, ge=0.0, description="Total irrigation depth in mm")
    irrigation_frequency: Optional[int] = Field(default=None, ge=0, description="Number of irrigation events")
    nitrogen_kg_ha: float = Field(default=120.0, ge=0.0, description="Nitrogen application in kg N/ha")
    phosphorus_kg_ha: float = Field(default=60.0, ge=0.0, description="Phosphorus application in kg P2O5/ha")
    potassium_kg_ha: float = Field(default=40.0, ge=0.0, description="Potassium application in kg K2O/ha")
    fertilizer_cost_total: Optional[float] = Field(default=None, ge=0.0, description="User fertilizer cost in INR")
    irrigation_cost_total: Optional[float] = Field(default=None, ge=0.0, description="User irrigation cost in INR")
    other_production_costs: Optional[float] = Field(default=None, ge=0.0, description="Seeds, labor, tillage costs in INR")
    crop_selling_price_per_quintal: Optional[float] = Field(default=None, ge=0.0, description="Crop selling price in INR/quintal")
    mulching_used: bool = Field(default=False, description="Whether mulch is used")
    soil_organic_matter_pct: Optional[float] = Field(default=None, ge=0.1, le=5.0, description="Soil organic matter %")

    @field_validator("sowing_date")
    @classmethod
    def validate_sowing_date(cls, v: str) -> str:
        try:
            datetime.strptime(v.strip(), "%Y-%m-%d")
            return v.strip()
        except Exception:
            raise ValueError(f"Invalid sowing_date '{v}'. Format must be YYYY-MM-DD.")

class WhatIfScenariosInput(BaseModel):
    baseline_input: ModularFarmInput
    custom_overrides: Optional[Dict[str, Dict[str, Any]]] = Field(default_factory=dict, description="Scenario overrides")

class GridOptimizationInput(BaseModel):
    baseline_input: ModularFarmInput
    objective: str = Field(default="estimated_yield", description="'estimated_yield', 'estimated_net_return', or 'lower_water'")
    max_water_m3: Optional[float] = Field(default=None, description="Ceiling on total irrigation water in m3")
    max_budget_inr: Optional[float] = Field(default=None, description="Ceiling on modeled cultivation costs in INR")
    min_yield_kg_ha: Optional[float] = Field(default=None, description="Minimum yield floor in kg/ha")
    irrigation_multipliers: Optional[List[float]] = Field(default=None, description="Custom irrigation multiplier grid")
    nitrogen_levels_kg_ha: Optional[List[float]] = Field(default=None, description="Custom Nitrogen levels grid")
    sowing_shifts_days: Optional[List[int]] = Field(default=None, description="Custom sowing shift days grid")

