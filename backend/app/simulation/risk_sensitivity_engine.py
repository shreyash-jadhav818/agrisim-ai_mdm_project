"""
AgriSim AI - Agricultural Risk & Sensitivity Analysis Engine
Performs deterministic scenario-based sensitivity analysis across critical agronomic and market variables:
  1. Rainfall variability (-50% to +50%)
  2. Temperature anomalies (-2.0°C to +4.0°C)
  3. Fertilizer cost inflation (0% to +50%)
  4. Crop selling price fluctuations (-30% to +30%)
  5. Sowing date shifts (-14 days to +14 days)

Computes:
  - Tornado sensitivity rankings based on modeled yield & profit elasticity
  - Three holistic scenarios: Worst-Case Compound, Baseline Plan, and Best-Case Compound
  - Actionable agronomic risk mitigations mapped to vulnerability drivers
  - Clear scientific disclosure distinguishing scenario sensitivity from statistical probability
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import copy

from app.simulation.crop_parameters import get_crop_parameters
from app.simulation.simulation_orchestrator import (
    FarmInputPayload,
    SimulationRunOutput,
    run_orchestrated_simulation
)

@dataclass
class TornadoVariableSensitivity:
    parameter_key: str
    parameter_label: str
    unit: str
    baseline_value: float
    
    # Low swing test
    low_value: float
    low_label: str
    low_yield_kg_ha: float
    low_yield_delta_kg_ha: float
    low_yield_delta_pct: float
    low_profit_inr: Optional[float]
    low_profit_delta_inr: Optional[float]
    
    # High swing test
    high_value: float
    high_label: str
    high_yield_kg_ha: float
    high_yield_delta_kg_ha: float
    high_yield_delta_pct: float
    high_profit_inr: Optional[float]
    high_profit_delta_inr: Optional[float]
    
    # Tornado Ranking metrics
    yield_swing_kg_ha: float     # abs(high_yield - low_yield)
    yield_swing_pct: float
    profit_swing_inr: Optional[float]
    rank: int = 1
    primary_risk_driver: bool = False
    sensitivity_category: str = "Moderate" # "Critical", "High", "Moderate", "Low"

@dataclass
class RiskScenarioOutcome:
    scenario_id: str
    scenario_name: str
    description: str
    estimated_yield_kg_ha: float
    estimated_yield_quintal_acre: float
    estimated_total_harvest_tonnes: float
    yield_delta_kg_ha: float
    yield_delta_pct: float
    irrigation_water_m3: float
    modeled_cost_inr: Optional[float]
    estimated_revenue_inr: Optional[float]
    estimated_net_return_inr: Optional[float]
    profit_delta_inr: Optional[float]
    profit_margin_pct: Optional[float]
    risk_level: str  # "Low", "Moderate", "High", "Critical"
    key_drivers: List[str] = field(default_factory=list)

@dataclass
class FarmerRiskMitigation:
    risk_domain: str
    title: str
    description: str
    implementation_cost: str  # "Low", "Moderate", "High"
    expected_impact: str
    priority: str             # "High", "Medium", "Low"

@dataclass
class RiskSensitivityResult:
    crop_name: str
    farm_area_ha: float
    farm_area_acres: float
    baseline_yield_kg_ha: float
    baseline_yield_quintal_acre: float
    baseline_profit_inr: Optional[float]
    
    # Tornado rankings (sorted by yield swing descending)
    tornado_sensitivities: List[TornadoVariableSensitivity]
    
    # Best, Baseline, Worst scenarios
    baseline_scenario: RiskScenarioOutcome
    worst_case_scenario: RiskScenarioOutcome
    best_case_scenario: RiskScenarioOutcome
    
    # Range spans
    yield_range_kg_ha: Dict[str, float]       # {"min": ..., "baseline": ..., "max": ..., "spread": ...}
    yield_range_quintal_acre: Dict[str, float]
    profit_range_inr: Optional[Dict[str, float]]
    
    # Top vulnerabilities & Mitigations
    primary_vulnerability_factor: str
    risk_mitigations: List[FarmerRiskMitigation]
    executive_risk_summary: str
    
    methodology_disclosure: str = (
        "Scenario-based sensitivity and bounding analysis using biophysical response functions (FAO-56, Mitscherlich-Baule). "
        "Outputs evaluate sensitivity ranges across deterministic input perturbations. "
        "This does NOT represent an empirical probability distribution or guaranteed financial outcome."
    )

def run_risk_sensitivity_analysis(
    baseline_payload: FarmInputPayload,
    rainfall_variation_pct: float = 50.0,     # +/- 50%
    temperature_anomaly_c: float = 4.0,       # -2°C to +4°C
    fertilizer_inflation_pct: float = 50.0,   # +0% to +50%
    price_volatility_pct: float = 30.0,       # +/- 30%
    sowing_shift_days: int = 14               # +/- 14 days
) -> RiskSensitivityResult:
    """
    Executes scenario-based sensitivity analysis across 5 key dimensions and synthesizes
    tornado rankings, bounding scenarios, and agronomic mitigations.
    """
    crop_params = get_crop_parameters(baseline_payload.crop_type)
    
    # 1. Baseline Simulation
    baseline_run = run_orchestrated_simulation(baseline_payload, scenario_name="Baseline Plan")
    base_yield = baseline_run.estimated_yield_kg_ha
    base_profit = baseline_run.estimated_net_return_inr
    base_cost = baseline_run.total_modeled_cultivation_costs_inr
    base_rev = baseline_run.estimated_gross_revenue_inr
    
    base_temp = baseline_payload.temperature_c if baseline_payload.temperature_c is not None else 25.0
    base_rain = baseline_payload.rainfall_mm if baseline_payload.rainfall_mm is not None else 100.0
    base_price = (
        baseline_payload.crop_selling_price_per_quintal 
        if baseline_payload.crop_selling_price_per_quintal is not None 
        else crop_params.selling_price_inr_per_quintal
    )
    base_sow_dt = datetime.strptime(baseline_payload.sowing_date.strip(), "%Y-%m-%d")
    
    # Baseline Scenario Object
    margin_base = (
        (base_profit / base_rev * 100.0) 
        if (base_profit is not None and base_rev and base_rev > 0) 
        else None
    )
    baseline_sc = RiskScenarioOutcome(
        scenario_id="scenario_baseline",
        scenario_name="Baseline Farm Plan",
        description="Normal expected climate, standard input costs, and planned sowing schedule.",
        estimated_yield_kg_ha=base_yield,
        estimated_yield_quintal_acre=baseline_run.estimated_yield_quintal_acre,
        estimated_total_harvest_tonnes=baseline_run.estimated_total_harvest_tonnes,
        yield_delta_kg_ha=0.0,
        yield_delta_pct=0.0,
        irrigation_water_m3=baseline_run.total_irrigation_volume_m3,
        modeled_cost_inr=base_cost,
        estimated_revenue_inr=base_rev,
        estimated_net_return_inr=base_profit,
        profit_delta_inr=0.0 if base_profit is not None else None,
        profit_margin_pct=round(margin_base, 1) if margin_base is not None else None,
        risk_level="Baseline Reference",
        key_drivers=["Planned management inputs", "Historical reference climate"]
    )
    
    # 2. Sensitivity Tornado Grid (Vary 1 variable at a time)
    tornado_vars: List[TornadoVariableSensitivity] = []
    
    # --- Variable 1: Seasonal Rainfall ---
    low_rain = max(0.0, base_rain * (1.0 - rainfall_variation_pct / 100.0))
    high_rain = base_rain * (1.0 + rainfall_variation_pct / 100.0)
    
    p_low_rain = copy.deepcopy(baseline_payload)
    p_low_rain.rainfall_mm = low_rain
    run_low_rain = run_orchestrated_simulation(p_low_rain, scenario_name="Rainfall Low")
    
    p_high_rain = copy.deepcopy(baseline_payload)
    p_high_rain.rainfall_mm = high_rain
    run_high_rain = run_orchestrated_simulation(p_high_rain, scenario_name="Rainfall High")
    
    r_swing_y = abs(run_high_rain.estimated_yield_kg_ha - run_low_rain.estimated_yield_kg_ha)
    r_swing_p = (
        abs(run_high_rain.estimated_net_return_inr - run_low_rain.estimated_net_return_inr)
        if (run_high_rain.estimated_net_return_inr is not None and run_low_rain.estimated_net_return_inr is not None)
        else None
    )
    
    tornado_vars.append(TornadoVariableSensitivity(
        parameter_key="rainfall",
        parameter_label="Seasonal Rainfall",
        unit="mm",
        baseline_value=round(base_rain, 1),
        low_value=round(low_rain, 1),
        low_label=f"-{rainfall_variation_pct:.0f}% ({low_rain:.0f} mm)",
        low_yield_kg_ha=run_low_rain.estimated_yield_kg_ha,
        low_yield_delta_kg_ha=round(run_low_rain.estimated_yield_kg_ha - base_yield, 1),
        low_yield_delta_pct=round(((run_low_rain.estimated_yield_kg_ha - base_yield) / max(1, base_yield)) * 100, 1),
        low_profit_inr=run_low_rain.estimated_net_return_inr,
        low_profit_delta_inr=(
            round(run_low_rain.estimated_net_return_inr - base_profit, 2)
            if (run_low_rain.estimated_net_return_inr is not None and base_profit is not None)
            else None
        ),
        high_value=round(high_rain, 1),
        high_label=f"+{rainfall_variation_pct:.0f}% ({high_rain:.0f} mm)",
        high_yield_kg_ha=run_high_rain.estimated_yield_kg_ha,
        high_yield_delta_kg_ha=round(run_high_rain.estimated_yield_kg_ha - base_yield, 1),
        high_yield_delta_pct=round(((run_high_rain.estimated_yield_kg_ha - base_yield) / max(1, base_yield)) * 100, 1),
        high_profit_inr=run_high_rain.estimated_net_return_inr,
        high_profit_delta_inr=(
            round(run_high_rain.estimated_net_return_inr - base_profit, 2)
            if (run_high_rain.estimated_net_return_inr is not None and base_profit is not None)
            else None
        ),
        yield_swing_kg_ha=round(r_swing_y, 1),
        yield_swing_pct=round((r_swing_y / max(1, base_yield)) * 100, 1),
        profit_swing_inr=round(r_swing_p, 2) if r_swing_p is not None else None
    ))
    
    # --- Variable 2: Ambient Temperature ---
    # Low: mild cooling (-2°C), High: thermal spike (+anomaly°C, e.g. +4°C)
    low_temp = base_temp - 2.0
    high_temp = base_temp + temperature_anomaly_c
    
    p_low_temp = copy.deepcopy(baseline_payload)
    p_low_temp.temperature_c = low_temp
    p_low_temp.tmax_c = (low_temp + 6.0) if baseline_payload.tmax_c is None else (baseline_payload.tmax_c - 2.0)
    p_low_temp.tmin_c = (low_temp - 6.0) if baseline_payload.tmin_c is None else (baseline_payload.tmin_c - 2.0)
    run_low_temp = run_orchestrated_simulation(p_low_temp, scenario_name="Temp Mild")
    
    p_high_temp = copy.deepcopy(baseline_payload)
    p_high_temp.temperature_c = high_temp
    p_high_temp.tmax_c = (high_temp + 8.5) if baseline_payload.tmax_c is None else (baseline_payload.tmax_c + temperature_anomaly_c)
    p_high_temp.tmin_c = (high_temp - 5.0) if baseline_payload.tmin_c is None else (baseline_payload.tmin_c + temperature_anomaly_c)
    run_high_temp = run_orchestrated_simulation(p_high_temp, scenario_name="Temp Heatwave")
    
    t_swing_y = abs(run_high_temp.estimated_yield_kg_ha - run_low_temp.estimated_yield_kg_ha)
    t_swing_p = (
        abs(run_high_temp.estimated_net_return_inr - run_low_temp.estimated_net_return_inr)
        if (run_high_temp.estimated_net_return_inr is not None and run_low_temp.estimated_net_return_inr is not None)
        else None
    )
    
    tornado_vars.append(TornadoVariableSensitivity(
        parameter_key="temperature",
        parameter_label="Ambient Temperature / Thermal Stress",
        unit="°C",
        baseline_value=round(base_temp, 1),
        low_value=round(low_temp, 1),
        low_label=f"-2.0°C ({low_temp:.1f}°C)",
        low_yield_kg_ha=run_low_temp.estimated_yield_kg_ha,
        low_yield_delta_kg_ha=round(run_low_temp.estimated_yield_kg_ha - base_yield, 1),
        low_yield_delta_pct=round(((run_low_temp.estimated_yield_kg_ha - base_yield) / max(1, base_yield)) * 100, 1),
        low_profit_inr=run_low_temp.estimated_net_return_inr,
        low_profit_delta_inr=(
            round(run_low_temp.estimated_net_return_inr - base_profit, 2)
            if (run_low_temp.estimated_net_return_inr is not None and base_profit is not None)
            else None
        ),
        high_value=round(high_temp, 1),
        high_label=f"+{temperature_anomaly_c:.1f}°C ({high_temp:.1f}°C)",
        high_yield_kg_ha=run_high_temp.estimated_yield_kg_ha,
        high_yield_delta_kg_ha=round(run_high_temp.estimated_yield_kg_ha - base_yield, 1),
        high_yield_delta_pct=round(((run_high_temp.estimated_yield_kg_ha - base_yield) / max(1, base_yield)) * 100, 1),
        high_profit_inr=run_high_temp.estimated_net_return_inr,
        high_profit_delta_inr=(
            round(run_high_temp.estimated_net_return_inr - base_profit, 2)
            if (run_high_temp.estimated_net_return_inr is not None and base_profit is not None)
            else None
        ),
        yield_swing_kg_ha=round(t_swing_y, 1),
        yield_swing_pct=round((t_swing_y / max(1, base_yield)) * 100, 1),
        profit_swing_inr=round(t_swing_p, 2) if t_swing_p is not None else None
    ))
    
    # --- Variable 3: Sowing Date Shift ---
    # Shift -14 days (early) vs +14 days (late)
    sow_early_dt = (base_sow_dt - timedelta(days=sowing_shift_days)).strftime("%Y-%m-%d")
    sow_late_dt = (base_sow_dt + timedelta(days=sowing_shift_days)).strftime("%Y-%m-%d")
    
    p_early = copy.deepcopy(baseline_payload)
    p_early.sowing_date = sow_early_dt
    run_early = run_orchestrated_simulation(p_early, scenario_name="Sowing Early")
    
    p_late = copy.deepcopy(baseline_payload)
    p_late.sowing_date = sow_late_dt
    run_late = run_orchestrated_simulation(p_late, scenario_name="Sowing Late")
    
    s_swing_y = abs(run_early.estimated_yield_kg_ha - run_late.estimated_yield_kg_ha)
    s_swing_p = (
        abs(run_early.estimated_net_return_inr - run_late.estimated_net_return_inr)
        if (run_early.estimated_net_return_inr is not None and run_late.estimated_net_return_inr is not None)
        else None
    )
    
    tornado_vars.append(TornadoVariableSensitivity(
        parameter_key="sowing_date",
        parameter_label="Sowing Date Window Shift",
        unit="days",
        baseline_value=0.0,
        low_value=-float(sowing_shift_days),
        low_label=f"-{sowing_shift_days} days ({sow_early_dt})",
        low_yield_kg_ha=run_early.estimated_yield_kg_ha,
        low_yield_delta_kg_ha=round(run_early.estimated_yield_kg_ha - base_yield, 1),
        low_yield_delta_pct=round(((run_early.estimated_yield_kg_ha - base_yield) / max(1, base_yield)) * 100, 1),
        low_profit_inr=run_early.estimated_net_return_inr,
        low_profit_delta_inr=(
            round(run_early.estimated_net_return_inr - base_profit, 2)
            if (run_early.estimated_net_return_inr is not None and base_profit is not None)
            else None
        ),
        high_value=float(sowing_shift_days),
        high_label=f"+{sowing_shift_days} days ({sow_late_dt})",
        high_yield_kg_ha=run_late.estimated_yield_kg_ha,
        high_yield_delta_kg_ha=round(run_late.estimated_yield_kg_ha - base_yield, 1),
        high_yield_delta_pct=round(((run_late.estimated_yield_kg_ha - base_yield) / max(1, base_yield)) * 100, 1),
        high_profit_inr=run_late.estimated_net_return_inr,
        high_profit_delta_inr=(
            round(run_late.estimated_net_return_inr - base_profit, 2)
            if (run_late.estimated_net_return_inr is not None and base_profit is not None)
            else None
        ),
        yield_swing_kg_ha=round(s_swing_y, 1),
        yield_swing_pct=round((s_swing_y / max(1, base_yield)) * 100, 1),
        profit_swing_inr=round(s_swing_p, 2) if s_swing_p is not None else None
    ))
    
    # --- Variable 4: Fertilizer Input Cost Inflation ---
    # Low: Baseline cost (0% inflation), High: +fertilizer_inflation_pct% cost surge
    # Biophysical yield unchanged, but financial profit impacted
    base_fert_cost = baseline_run.modeled_fertilizer_cost_inr if baseline_run.modeled_fertilizer_cost_inr is not None else 5000.0
    fert_cost_high = base_fert_cost * (1.0 + fertilizer_inflation_pct / 100.0)

    
    p_fert_high = copy.deepcopy(baseline_payload)
    p_fert_high.fertilizer_cost_total = fert_cost_high
    run_fert_high = run_orchestrated_simulation(p_fert_high, scenario_name="Fertilizer Cost Inflation")
    
    f_swing_p = (
        abs(base_profit - run_fert_high.estimated_net_return_inr)
        if (base_profit is not None and run_fert_high.estimated_net_return_inr is not None)
        else None
    )
    
    tornado_vars.append(TornadoVariableSensitivity(
        parameter_key="fertilizer_cost",
        parameter_label="Fertilizer Input Price Inflation",
        unit="%",
        baseline_value=0.0,
        low_value=0.0,
        low_label="0% Baseline Inflation",
        low_yield_kg_ha=base_yield,
        low_yield_delta_kg_ha=0.0,
        low_yield_delta_pct=0.0,
        low_profit_inr=base_profit,
        low_profit_delta_inr=0.0 if base_profit is not None else None,
        high_value=fertilizer_inflation_pct,
        high_label=f"+{fertilizer_inflation_pct:.0f}% Cost Surge",
        high_yield_kg_ha=base_yield,
        high_yield_delta_kg_ha=0.0,
        high_yield_delta_pct=0.0,
        high_profit_inr=run_fert_high.estimated_net_return_inr,
        high_profit_delta_inr=(
            round(run_fert_high.estimated_net_return_inr - base_profit, 2)
            if (run_fert_high.estimated_net_return_inr is not None and base_profit is not None)
            else None
        ),
        yield_swing_kg_ha=0.0,
        yield_swing_pct=0.0,
        profit_swing_inr=round(f_swing_p, 2) if f_swing_p is not None else None
    ))
    
    # --- Variable 5: Crop Market Selling Price Volatility ---
    # Low: -price_volatility_pct%, High: +price_volatility_pct%
    price_low = max(500.0, base_price * (1.0 - price_volatility_pct / 100.0))
    price_high = base_price * (1.0 + price_volatility_pct / 100.0)
    
    p_price_low = copy.deepcopy(baseline_payload)
    p_price_low.crop_selling_price_per_quintal = price_low
    run_price_low = run_orchestrated_simulation(p_price_low, scenario_name="Market Price Low")
    
    p_price_high = copy.deepcopy(baseline_payload)
    p_price_high.crop_selling_price_per_quintal = price_high
    run_price_high = run_orchestrated_simulation(p_price_high, scenario_name="Market Price High")
    
    pr_swing_p = (
        abs(run_price_high.estimated_net_return_inr - run_price_low.estimated_net_return_inr)
        if (run_price_high.estimated_net_return_inr is not None and run_price_low.estimated_net_return_inr is not None)
        else None
    )
    
    tornado_vars.append(TornadoVariableSensitivity(
        parameter_key="crop_selling_price",
        parameter_label="Market Selling Price Fluctuation",
        unit="₹/q",
        baseline_value=round(base_price, 0),
        low_value=round(price_low, 0),
        low_label=f"-{price_volatility_pct:.0f}% (₹{price_low:,.0f}/q)",
        low_yield_kg_ha=base_yield,
        low_yield_delta_kg_ha=0.0,
        low_yield_delta_pct=0.0,
        low_profit_inr=run_price_low.estimated_net_return_inr,
        low_profit_delta_inr=(
            round(run_price_low.estimated_net_return_inr - base_profit, 2)
            if (run_price_low.estimated_net_return_inr is not None and base_profit is not None)
            else None
        ),
        high_value=round(price_high, 0),
        high_label=f"+{price_volatility_pct:.0f}% (₹{price_high:,.0f}/q)",
        high_yield_kg_ha=base_yield,
        high_yield_delta_kg_ha=0.0,
        high_yield_delta_pct=0.0,
        high_profit_inr=run_price_high.estimated_net_return_inr,
        high_profit_delta_inr=(
            round(run_price_high.estimated_net_return_inr - base_profit, 2)
            if (run_price_high.estimated_net_return_inr is not None and base_profit is not None)
            else None
        ),
        yield_swing_kg_ha=0.0,
        yield_swing_pct=0.0,
        profit_swing_inr=round(pr_swing_p, 2) if pr_swing_p is not None else None
    ))
    
    # 3. Rank Tornado Variables
    # Rank primarily by yield swing, but if yield swing is 0, rank by profit swing
    def tornado_rank_key(v: TornadoVariableSensitivity):
        p_val = v.profit_swing_inr if v.profit_swing_inr is not None else 0.0
        return (v.yield_swing_kg_ha, p_val)
        
    tornado_vars.sort(key=tornado_rank_key, reverse=True)
    
    for idx, item in enumerate(tornado_vars):
        item.rank = idx + 1
        if idx == 0:
            item.primary_risk_driver = True
            item.sensitivity_category = "Critical"
        elif idx == 1:
            item.sensitivity_category = "High"
        elif idx == 2:
            item.sensitivity_category = "Moderate"
        else:
            item.sensitivity_category = "Low"
            
    # 4. Multi-Factor Bounding Scenarios (Worst-Case Compound vs. Best-Case Compound)
    # Dynamically select adverse vs favorable perturbation for each biophysical parameter
    # Rainfall
    if run_high_rain.estimated_yield_kg_ha >= run_low_rain.estimated_yield_kg_ha:
        worst_rain = low_rain
        best_rain = high_rain
        rain_worst_label = f"-{rainfall_variation_pct:.0f}% Rainfall"
        rain_best_label = f"+{rainfall_variation_pct:.0f}% Rainfall"
    else:
        worst_rain = high_rain
        best_rain = low_rain
        rain_worst_label = f"+{rainfall_variation_pct:.0f}% Deluge"
        rain_best_label = f"-{rainfall_variation_pct:.0f}% Rainfall"

    # Temperature
    if run_high_temp.estimated_yield_kg_ha >= run_low_temp.estimated_yield_kg_ha:
        worst_temp = low_temp
        best_temp = high_temp
        temp_worst_label = "-2.0°C Chill"
        temp_best_label = f"+{temperature_anomaly_c:.1f}°C Thermal"
    else:
        worst_temp = high_temp
        best_temp = low_temp
        temp_worst_label = f"+{temperature_anomaly_c:.1f}°C Heatwave"
        temp_best_label = "-2.0°C Favorable Mild"

    # Sowing Date
    if run_late.estimated_yield_kg_ha >= run_early.estimated_yield_kg_ha:
        worst_sow_dt = sow_early_dt
        best_sow_dt = sow_late_dt
        sow_worst_label = f"-{sowing_shift_days}d Early Shift"
        sow_best_label = f"+{sowing_shift_days}d Favorable Window"
    else:
        worst_sow_dt = sow_late_dt
        best_sow_dt = sow_early_dt
        sow_worst_label = f"+{sowing_shift_days}d Delayed Sowing"
        sow_best_label = f"-{sowing_shift_days}d Timely Sowing"

    # Worst-Case Compound:
    p_worst = copy.deepcopy(baseline_payload)
    p_worst.rainfall_mm = worst_rain
    p_worst.temperature_c = worst_temp
    p_worst.sowing_date = worst_sow_dt
    p_worst.fertilizer_cost_total = fert_cost_high
    p_worst.crop_selling_price_per_quintal = price_low

    run_worst = run_orchestrated_simulation(p_worst, scenario_name="Worst-Case Compound Shock")
    worst_yield = min(base_yield, run_worst.estimated_yield_kg_ha)
    worst_yield_delta = round(worst_yield - base_yield, 1)
    worst_yield_pct = round((worst_yield_delta / max(1, base_yield)) * 100, 1)
    worst_prof_delta = (
        round(run_worst.estimated_net_return_inr - base_profit, 2)
        if (run_worst.estimated_net_return_inr is not None and base_profit is not None)
        else None
    )
    worst_margin = (
        (run_worst.estimated_net_return_inr / run_worst.estimated_gross_revenue_inr * 100.0)
        if (run_worst.estimated_net_return_inr is not None and run_worst.estimated_gross_revenue_inr and run_worst.estimated_gross_revenue_inr > 0)
        else None
    )

    worst_sc = RiskScenarioOutcome(
        scenario_id="scenario_worst_case",
        scenario_name="Worst-Case Compound Scenario",
        description=f"Simultaneous adverse stress: {rain_worst_label}, {temp_worst_label}, {sow_worst_label}, +{fertilizer_inflation_pct:.0f}% fertilizer inflation, and -{price_volatility_pct:.0f}% crop price drop.",
        estimated_yield_kg_ha=worst_yield,
        estimated_yield_quintal_acre=round(worst_yield * 0.00404686 * 10, 2),
        estimated_total_harvest_tonnes=round((worst_yield * run_worst.farm_area_ha) / 1000.0, 3),
        yield_delta_kg_ha=worst_yield_delta,
        yield_delta_pct=worst_yield_pct,
        irrigation_water_m3=run_worst.total_irrigation_volume_m3,
        modeled_cost_inr=run_worst.total_modeled_cultivation_costs_inr,
        estimated_revenue_inr=run_worst.estimated_gross_revenue_inr,
        estimated_net_return_inr=run_worst.estimated_net_return_inr,
        profit_delta_inr=worst_prof_delta,
        profit_margin_pct=round(worst_margin, 1) if worst_margin is not None else None,
        risk_level="High Risk" if (run_worst.estimated_net_return_inr and run_worst.estimated_net_return_inr > 0) else "Critical Risk (Financial Loss)",
        key_drivers=[rain_worst_label, temp_worst_label, sow_worst_label, f"-{price_volatility_pct:.0f}% Market Price Drop"]
    )

    # Best-Case Compound:
    p_best = copy.deepcopy(baseline_payload)
    p_best.rainfall_mm = best_rain
    p_best.temperature_c = best_temp
    p_best.sowing_date = best_sow_dt
    p_best.fertilizer_cost_total = base_fert_cost
    p_best.crop_selling_price_per_quintal = price_high

    run_best = run_orchestrated_simulation(p_best, scenario_name="Best-Case Compound Favorable")
    best_yield = max(base_yield, run_best.estimated_yield_kg_ha)
    best_yield_delta = round(best_yield - base_yield, 1)
    best_yield_pct = round((best_yield_delta / max(1, base_yield)) * 100, 1)
    best_prof_delta = (
        round(run_best.estimated_net_return_inr - base_profit, 2)
        if (run_best.estimated_net_return_inr is not None and base_profit is not None)
        else None
    )
    best_margin = (
        (run_best.estimated_net_return_inr / run_best.estimated_gross_revenue_inr * 100.0)
        if (run_best.estimated_net_return_inr is not None and run_best.estimated_gross_revenue_inr and run_best.estimated_gross_revenue_inr > 0)
        else None
    )

    best_sc = RiskScenarioOutcome(
        scenario_id="scenario_best_case",
        scenario_name="Best-Case Compound Scenario",
        description=f"Favorable climate ({rain_best_label}, {temp_best_label}) combined with timely sowing ({sow_best_label}) and buoyant market pricing (+{price_volatility_pct:.0f}%).",
        estimated_yield_kg_ha=best_yield,
        estimated_yield_quintal_acre=round(best_yield * 0.00404686 * 10, 2),
        estimated_total_harvest_tonnes=round((best_yield * run_best.farm_area_ha) / 1000.0, 3),
        yield_delta_kg_ha=best_yield_delta,
        yield_delta_pct=best_yield_pct,
        irrigation_water_m3=run_best.total_irrigation_volume_m3,
        modeled_cost_inr=run_best.total_modeled_cultivation_costs_inr,
        estimated_revenue_inr=run_best.estimated_gross_revenue_inr,
        estimated_net_return_inr=run_best.estimated_net_return_inr,
        profit_delta_inr=best_prof_delta,
        profit_margin_pct=round(best_margin, 1) if best_margin is not None else None,
        risk_level="Favorable Upside",
        key_drivers=[rain_best_label, temp_best_label, sow_best_label, f"+{price_volatility_pct:.0f}% Strong Market Price"]
    )
    
    # 5. Compile Ranges
    min_y = worst_yield
    max_y = best_yield
    yield_range_kg = {
        "worst_case": min_y,
        "baseline": base_yield,
        "best_case": max_y,
        "spread_kg_ha": round(max_y - min_y, 1)
    }
    yield_range_q_acre = {
        "worst_case": run_worst.estimated_yield_quintal_acre,
        "baseline": baseline_run.estimated_yield_quintal_acre,
        "best_case": run_best.estimated_yield_quintal_acre,
        "spread_quintal_acre": round(run_best.estimated_yield_quintal_acre - run_worst.estimated_yield_quintal_acre, 1)
    }
    
    profit_range = None
    if (run_worst.estimated_net_return_inr is not None and 
        base_profit is not None and 
        run_best.estimated_net_return_inr is not None):
        profit_range = {
            "worst_case_inr": run_worst.estimated_net_return_inr,
            "baseline_inr": base_profit,
            "best_case_inr": run_best.estimated_net_return_inr,
            "spread_inr": round(run_best.estimated_net_return_inr - run_worst.estimated_net_return_inr, 2)
        }
        
    # 6. Synthesize Farmer Risk Mitigations
    mitigations: List[FarmerRiskMitigation] = []
    top_var = tornado_vars[0] if tornado_vars else None
    
    if top_var and top_var.parameter_key == "rainfall":
        mitigations.append(FarmerRiskMitigation(
            risk_domain="Water & Irrigation",
            title="Convert to Regulated Drip & Plastic/Straw Mulching",
            description="High sensitivity to rainfall indicates dependency on supplemental water. Mulching reduces soil evaporation by 20-30% and drip maintains steady root-zone tension.",
            implementation_cost="Moderate",
            expected_impact="Reduces drought yield loss by 40-60%",
            priority="High"
        ))
        mitigations.append(FarmerRiskMitigation(
            risk_domain="Farm Infrastructure",
            title="Rainwater Harvesting Farm Pond (Khet Talab)",
            description="Constructing a small on-farm storage pond provides critical life-saving supplemental irrigation during dry spells.",
            implementation_cost="High",
            expected_impact="Protects against complete crop failure in severe drought",
            priority="Medium"
        ))
    elif top_var and top_var.parameter_key == "temperature":
        mitigations.append(FarmerRiskMitigation(
            risk_domain="Agronomic Schedule",
            title="Advance Sowing Date to Escape Terminal Heat",
            description="Shifting sowing earlier by 7-10 days allows flowering and grain filling to complete before late-season temperature spikes.",
            implementation_cost="Low",
            expected_impact="Preserves 15-25% grain yield under terminal heatwave",
            priority="High"
        ))
        mitigations.append(FarmerRiskMitigation(
            risk_domain="Cultivar Selection",
            title="Adopt Heat-Tolerant Cultivar",
            description="Select certified thermo-tolerant varieties recommended by state agricultural universities (ICAR/SAU).",
            implementation_cost="Low",
            expected_impact="Improves floret fertility retention under high temperatures",
            priority="High"
        ))
    elif top_var and top_var.parameter_key == "sowing_date":
        mitigations.append(FarmerRiskMitigation(
            risk_domain="Field Preparation",
            title="Mechanized Sowing & Seed Priming",
            description="Prepare seedbeds ahead of time and utilize seed drills to hit the optimal sowing window without weather-induced delays.",
            implementation_cost="Low",
            expected_impact="Prevents 10-20% phenological yield lag",
            priority="High"
        ))
        
    # Universal economic and price mitigations
    mitigations.append(FarmerRiskMitigation(
        risk_domain="Financial Risk",
        title="PMFBY Crop Insurance & Staggered Selling",
        description="Enroll under Pradhan Mantri Fasal Bima Yojana (PMFBY) to cap localized climate losses, and utilize warehouse receipts (e-NWR) to avoid distress sales at harvest.",
        implementation_cost="Low",
        expected_impact="Guarantees downside financial floor against catastrophic shocks",
        priority="High"
    ))
    mitigations.append(FarmerRiskMitigation(
        risk_domain="Nutrient Input Management",
        title="Soil-Test Based Split Application (STCR)",
        description="Avoid upfront bulk chemical fertilizer purchase. Apply nitrogen in 3 split doses based on real-time leaf color chart (LCC) readings to insulate against fertilizer inflation.",
        implementation_cost="Low",
        expected_impact="Reduces fertilizer expenditure by 15-25% without yield drop",
        priority="Medium"
    ))
    
    primary_vuln = top_var.parameter_label if top_var else "Climate and Price Volatility"
    
    summary = (
        f"Sensitivity analysis reveals that '{primary_vuln}' is the single largest risk driver for this {crop_params.name} plan "
        f"(producing a {top_var.yield_swing_kg_ha:,.0f} kg/ha yield swing across test bounds). "
        f"Under a compound worst-case shock, estimated yield drops to {run_worst.estimated_yield_kg_ha:,.0f} kg/ha "
        f"({worst_yield_pct:+.1f}%), while a favorable season can achieve {run_best.estimated_yield_kg_ha:,.0f} kg/ha. "
        f"Adopting targeted mitigations like mulching, timely sowing, and crop insurance cushions against downside vulnerability."
    )
    
    return RiskSensitivityResult(
        crop_name=crop_params.name,
        farm_area_ha=baseline_run.farm_area_ha,
        farm_area_acres=baseline_run.farm_area_acres,
        baseline_yield_kg_ha=base_yield,
        baseline_yield_quintal_acre=baseline_run.estimated_yield_quintal_acre,
        baseline_profit_inr=base_profit,
        tornado_sensitivities=tornado_vars,
        baseline_scenario=baseline_sc,
        worst_case_scenario=worst_sc,
        best_case_scenario=best_sc,
        yield_range_kg_ha=yield_range_kg,
        yield_range_quintal_acre=yield_range_q_acre,
        profit_range_inr=profit_range,
        primary_vulnerability_factor=primary_vuln,
        risk_mitigations=mitigations,
        executive_risk_summary=summary
    )
