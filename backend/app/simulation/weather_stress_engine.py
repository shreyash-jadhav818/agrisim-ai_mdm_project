"""
AgriSim AI - Weather Stress Testing Engine
Systematically evaluates crop and farm economic vulnerability under hypothetical climate shocks:
  1. Normal Climatological Baseline
  2. Lower-Than-Expected Rainfall (-35% seasonal precipitation)
  3. Severe Drought Stress (-70% precipitation + elevated ET demand)
  4. Extreme Thermal Shock / Heatwave (+3.5°C mean, +5.0°C peak anthesis heat)
  5. Excess Deluge & Waterlogging (+80% precipitation, evaluating infiltration, deep percolation & hypoxia)
  6. Combined Heat & Drought Stress (+3.5°C temperature + -60% rainfall)

Reuses the biophysical simulation orchestrator (FAO-56, FAO-33, Stewart yield functions)
while keeping all management inputs (irrigation depth, fertilizer N-P-K, sowing date) constant.
Clearly discloses that all evaluations are hypothetical scenario stress tests.
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
class WeatherShockScenarioResult:
    scenario_id: str
    scenario_name: str
    severity: str
    description: str
    weather_adjustments: Dict[str, Any]
    
    # Biophysical Harvest Outcomes
    estimated_yield_kg_ha: float
    estimated_yield_quintal_acre: float
    estimated_total_harvest_tonnes: float
    yield_delta_kg_ha: float
    yield_delta_pct: float
    
    # Water & Infiltration Metrics
    gross_rainfall_mm: float
    effective_rainfall_mm: float
    deep_percolation_mm: float
    irrigation_water_consumption_m3: float
    water_productivity_kg_m3: float
    
    # Financial Impact (INR ₹)
    modeled_cost_inr: Optional[float]
    estimated_net_return_inr: Optional[float]
    profit_delta_inr: Optional[float]
    profit_delta_pct: Optional[float]
    
    # Physiological Stress Diagnostic Factors
    water_response_factor: float
    aeration_hypoxia_factor: float
    temperature_stress_factor: float
    is_vulnerable: bool
    vulnerability_trigger: str
    mitigation_advisory: str

@dataclass
class WeatherStressBatteryResult:
    crop_name: str
    farm_area_ha: float
    baseline_yield_kg_ha: float
    baseline_water_m3: float
    baseline_profit_inr: Optional[float]
    
    # All tested scenarios
    scenarios: List[WeatherShockScenarioResult]
    
    # Composite Resilience Metrics
    resilience_score: float  # 0 to 100
    resilience_rating: str   # High Resilience, Moderate, Vulnerable, Severe Risk
    most_vulnerable_scenario: str
    executive_advisory: str
    
    methodology_disclosure: str = (
        "Hypothetical stress-test modeling based on FAO-56 and FAO-33 biophysical production equations. "
        "Does not constitute live meteorological forecasting or probabilistic risk guarantees."
    )

def run_weather_stress_testing_battery(
    baseline_payload: FarmInputPayload
) -> WeatherStressBatteryResult:
    """
    Executes a comprehensive battery of 6 hypothetical weather shocks against baseline management.
    """
    crop_params = get_crop_parameters(baseline_payload.crop_type)
    
    # 1. Run Baseline Simulation
    base_run = run_orchestrated_simulation(baseline_payload, scenario_name="Normal Weather Baseline")
    base_yield = base_run.estimated_yield_kg_ha
    base_profit = base_run.estimated_net_return_inr
    
    # Extract baseline climate values
    base_temp = baseline_payload.temperature_c if baseline_payload.temperature_c is not None else 25.0
    base_rain = baseline_payload.rainfall_mm if baseline_payload.rainfall_mm is not None else 100.0
    
    # 2. Define the 6 Systematic Weather Shocks
    shock_definitions = [
        {
            "id": "normal_weather",
            "name": "Normal Weather (Baseline)",
            "severity": "Baseline",
            "desc": "Expected regional seasonal climate with historical baseline precipitation and diurnal temperatures.",
            "temp_mod": base_temp,
            "rain_mod": base_rain,
            "tmax_mod": (base_temp + 6.5),
            "adj_desc": {"temperature_c": f"{base_temp:.1f}°C (Unchanged)", "rainfall_mm": f"{base_rain:.0f} mm (Unchanged)"},
            "mitigation": "Maintain baseline agronomic schedule; monitor soil moisture tension regularly."
        },
        {
            "id": "lower_rainfall",
            "name": "Lower-Than-Expected Rainfall (-35%)",
            "severity": "Moderate",
            "desc": "Simulates a 35% seasonal rainfall deficit testing reliance on supplemental irrigation.",
            "temp_mod": base_temp + 0.8,
            "rain_mod": max(0.0, base_rain * 0.65),
            "tmax_mod": (base_temp + 8.0),
            "adj_desc": {"rainfall_mm": f"{base_rain * 0.65:.0f} mm (-35%)", "temperature_c": f"{base_temp + 0.8:.1f}°C (+0.8°C)"},
            "mitigation": "Apply conservation tillage or mulching to curb soil evaporation; prepare supplemental irrigation."
        },
        {
            "id": "drought_stress",
            "name": "Severe Drought Stress (-70% Rain)",
            "severity": "Severe",
            "desc": "Severe agricultural drought with 70% rainfall deficit and high atmospheric vapor pressure deficit.",
            "temp_mod": base_temp + 2.0,
            "rain_mod": max(0.0, base_rain * 0.30),
            "tmax_mod": (base_temp + 9.5),
            "adj_desc": {"rainfall_mm": f"{base_rain * 0.30:.0f} mm (-70%)", "temperature_c": f"{base_temp + 2.0:.1f}°C (+2.0°C)"},
            "mitigation": "Shift to regulated deficit drip irrigation; prioritize flowering and grain filling stages."
        },
        {
            "id": "heat_stress",
            "name": "Extreme Heatwave Shock (+3.5°C)",
            "severity": "Severe",
            "desc": "Thermal spike (+3.5°C mean, +5.0°C daytime peak) causing floret sterility during reproductive anthesis.",
            "temp_mod": base_temp + 3.5,
            "rain_mod": base_rain,
            "tmax_mod": (base_temp + 11.5),
            "adj_desc": {"temperature_c": f"{base_temp + 3.5:.1f}°C (+3.5°C)", "tmax_spike": "+5.0°C daytime peak"},
            "mitigation": "Light canopy misting/sprinklers to increase relative humidity; advance sowing date to escape hot winds."
        },
        {
            "id": "excess_deluge",
            "name": "Excess Rainfall & Deluge (+80%)",
            "severity": "Moderate to High",
            "desc": "80% excess rainfall testing soil infiltration, deep percolation, and root aeration hypoxia.",
            "temp_mod": max(15.0, base_temp - 1.5),
            "rain_mod": base_rain * 1.80,
            "tmax_mod": (base_temp + 4.0),
            "adj_desc": {"rainfall_mm": f"{base_rain * 1.80:.0f} mm (+80%)", "temperature_c": f"{base_temp - 1.5:.1f}°C (-1.5°C)"},
            "mitigation": "Construct field drainage ditches or broad bed and furrow (BBF) systems to prevent stagnant waterlogging."
        },
        {
            "id": "combined_heat_drought",
            "name": "Combined Heatwave & Drought Shock",
            "severity": "Extreme",
            "desc": "Compound climate shock: +3.5°C thermal spike coinciding with -60% rainfall drought.",
            "temp_mod": base_temp + 3.5,
            "rain_mod": max(0.0, base_rain * 0.40),
            "tmax_mod": (base_temp + 11.0),
            "adj_desc": {"temperature_c": f"{base_temp + 3.5:.1f}°C (+3.5°C)", "rainfall_mm": f"{base_rain * 0.40:.0f} mm (-60%)"},
            "mitigation": "Implement emergency micro-irrigation; foliar potassium nitrate spray to support stomatal regulation."
        }
    ]
    
    outcomes: List[WeatherShockScenarioResult] = []
    
    for shock in shock_definitions:
        # Clone baseline payload and apply ONLY the weather adjustments
        sc_dict = copy.deepcopy(baseline_payload.__dict__)
        sc_dict["temperature_c"] = shock["temp_mod"]
        sc_dict["tmax_c"] = shock["tmax_mod"]
        sc_dict["tmin_c"] = shock["temp_mod"] - 6.5
        sc_dict["rainfall_mm"] = shock["rain_mod"]
        
        sc_payload = FarmInputPayload(**sc_dict)
        sc_run = run_orchestrated_simulation(sc_payload, scenario_name=shock["name"])
        
        # Calculate Deltas relative to baseline
        yield_delta_kg = round(sc_run.estimated_yield_kg_ha - base_yield, 1)
        yield_delta_pct = round((yield_delta_kg / max(1.0, base_yield)) * 100.0, 2)
        
        prof_delta_inr = None
        prof_delta_pct = None
        if base_profit is not None and sc_run.estimated_net_return_inr is not None:
            prof_delta_inr = round(sc_run.estimated_net_return_inr - base_profit, 2)
            if abs(base_profit) > 1.0:
                prof_delta_pct = round((prof_delta_inr / abs(base_profit)) * 100.0, 2)
                
        # Vulnerability detection
        is_vuln = yield_delta_pct < -20.0 or (sc_run.estimated_net_return_inr is not None and sc_run.estimated_net_return_inr < 0)
        triggers = []
        if yield_delta_pct < -20.0:
            triggers.append(f"Significant yield loss ({yield_delta_pct:+.1f}%)")
        if sc_run.excess_irrigation_penalty_pct > 5.0:
            triggers.append(f"Root aeration hypoxia ({sc_run.excess_irrigation_penalty_pct:.1f}% loss)")
        if sc_run.temperature_stress_factor < 0.85:
            triggers.append("Floret sterility from reproductive heat shock")
        if sc_run.estimated_net_return_inr is not None and sc_run.estimated_net_return_inr < 0:
            triggers.append("Net financial loss under shock")
        if not triggers:
            triggers.append("Resilient buffer under current management")
            
        outcome = WeatherShockScenarioResult(
            scenario_id=shock["id"],
            scenario_name=shock["name"],
            severity=shock["severity"],
            description=shock["desc"],
            weather_adjustments=shock["adj_desc"],
            estimated_yield_kg_ha=sc_run.estimated_yield_kg_ha,
            estimated_yield_quintal_acre=sc_run.estimated_yield_quintal_acre,
            estimated_total_harvest_tonnes=sc_run.estimated_total_harvest_tonnes,
            yield_delta_kg_ha=yield_delta_kg,
            yield_delta_pct=yield_delta_pct,
            gross_rainfall_mm=round(shock["rain_mod"], 1),
            effective_rainfall_mm=sc_run.total_effective_rainfall_mm,
            deep_percolation_mm=sc_run.deep_percolation_mm,
            irrigation_water_consumption_m3=sc_run.total_irrigation_volume_m3,
            water_productivity_kg_m3=sc_run.water_productivity_kg_m3,
            modeled_cost_inr=sc_run.total_modeled_cultivation_costs_inr,
            estimated_net_return_inr=sc_run.estimated_net_return_inr,
            profit_delta_inr=prof_delta_inr,
            profit_delta_pct=prof_delta_pct,
            water_response_factor=sc_run.water_response_factor,
            aeration_hypoxia_factor=sc_run.aeration_hypoxia_factor,
            temperature_stress_factor=sc_run.temperature_stress_factor,
            is_vulnerable=is_vuln,
            vulnerability_trigger="; ".join(triggers),
            mitigation_advisory=shock["mitigation"]
        )
        outcomes.append(outcome)
        
    # 3. Calculate Overall Resilience Score (0 to 100)
    # Average yield retention across the non-baseline shock scenarios
    shock_outcomes = [o for o in outcomes if o.scenario_id != "normal_weather"]
    avg_yield_retention = sum(max(0.0, 100.0 + o.yield_delta_pct) for o in shock_outcomes) / max(1, len(shock_outcomes))
    resilience_score = max(0.0, min(100.0, avg_yield_retention))
    
    if resilience_score >= 82.0:
        rating = "High Climate Resilience"
    elif resilience_score >= 68.0:
        rating = "Moderate Resilience"
    elif resilience_score >= 50.0:
        rating = "Vulnerable to Extremes"
    else:
        rating = "Severe Climate Vulnerability"
        
    worst_sc = min(shock_outcomes, key=lambda o: o.yield_delta_pct)
    
    advisory = (
        f"Under hypothetical climate stress scenarios, your farm plan exhibits a composite resilience rating of "
        f"{resilience_score:.1f}/100 ({rating}). The primary vulnerability is '{worst_sc.scenario_name}' "
        f"which results in a {worst_sc.yield_delta_pct:+.1f}% harvest decline ({abs(worst_sc.yield_delta_kg_ha):,.0f} kg/ha reduction)."
    )
    
    return WeatherStressBatteryResult(
        crop_name=crop_params.name,
        farm_area_ha=base_run.farm_area_ha,
        baseline_yield_kg_ha=base_yield,
        baseline_water_m3=base_run.total_irrigation_volume_m3,
        baseline_profit_inr=base_profit,
        scenarios=outcomes,
        resilience_score=round(resilience_score, 1),
        resilience_rating=rating,
        most_vulnerable_scenario=worst_sc.scenario_name,
        executive_advisory=advisory
    )
