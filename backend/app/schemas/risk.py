from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from app.schemas.simulation import SimulationInput, ModularFarmInput

class MonteCarloRiskInput(BaseModel):
    base_simulation: SimulationInput
    iterations: int = Field(default=300, ge=50, le=1000, description="Monte Carlo simulation iterations")
    rainfall_volatility_pct: float = Field(default=25.0, ge=5.0, le=75.0, description="Rainfall CV %")
    temperature_anomaly_c: float = Field(default=1.5, ge=0.0, le=5.0, description="Max temp anomaly in Celsius")
    price_volatility_pct: float = Field(default=20.0, ge=5.0, le=60.0, description="Market price volatility %")

class DistributionBin(BaseModel):
    bin_start: float
    bin_end: float
    bin_center: float
    count: int
    frequency_pct: float

class MonteCarloRiskResult(BaseModel):
    iterations: int
    mean_yield: float
    std_yield: float
    p10_yield: float
    p50_yield: float
    p90_yield: float
    mean_profit: float
    std_profit: float
    p10_profit: float
    p50_profit: float
    p90_profit: float
    loss_probability_pct: float
    value_at_risk_95_inr: float
    expected_shortfall_95_inr: float
    yield_distribution: List[DistributionBin]
    profit_distribution: List[DistributionBin]
    risk_rating: str  # Low Risk, Moderate Risk, Elevated Risk, High Risk
    risk_executive_summary: str

class RiskSensitivityInput(BaseModel):
    baseline_input: ModularFarmInput
    rainfall_variation_pct: float = Field(default=50.0, ge=5.0, le=90.0, description="Rainfall swing percentage (+/- %)")
    temperature_anomaly_c: float = Field(default=4.0, ge=0.5, le=8.0, description="Maximum thermal anomaly in °C")
    fertilizer_inflation_pct: float = Field(default=50.0, ge=0.0, le=100.0, description="Fertilizer price inflation (+ %)")
    price_volatility_pct: float = Field(default=30.0, ge=5.0, le=70.0, description="Crop selling price volatility (+/- %)")
    sowing_shift_days: int = Field(default=14, ge=1, le=45, description="Sowing window shift (+/- days)")

