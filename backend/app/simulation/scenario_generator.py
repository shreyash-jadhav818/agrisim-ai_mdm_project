"""
AgriSim AI - What-If Scenario Generator Module
Automatically generates 8 independent What-If agronomic scenarios from baseline inputs:
  A. Baseline farming plan
  B. Reduced irrigation (-20% depth/quantity)
  C. Increased irrigation (+20% depth/quantity)
  D. Reduced fertilizer application (-25% N-P-K)
  E. Alternative nutrient application (balanced optimal N-P-K recommendation)
  F. Earlier sowing date (-14 days)
  G. Later sowing date (+14 days)
  H. Combined changes (irrigation adjustment + balanced fertilizer + optimized sowing)

Every scenario is calculated independently using the same biophysical model version
and baseline environmental conditions.
Calculates for each scenario:
  - Estimated yield per hectare
  - Estimated total harvest
  - Irrigation water consumption (m3)
  - Water savings compared with baseline (%)
  - Total nutrient quantities (N, P, K in kg)
  - Modeled fertilizer costs (INR)
  - Modeled cultivation costs (INR)
  - Estimated revenue (INR, if selling price supplied)
  - Estimated net return (INR, if price and costs supplied)
  - Yield percentage change vs baseline
  - Water consumption percentage change vs baseline
  - Important biophysical assumptions and uncertainty information
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
class ScenarioDeltaMetrics:
    scenario_id: str
    scenario_name: str
    scenario_code: str  # 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'
    description: str
    
    # Harvest & Yield
    estimated_yield_kg_ha: float
    estimated_yield_quintal_acre: float
    estimated_total_harvest_quintals: float
    estimated_total_harvest_tonnes: float
    yield_delta_pct: float
    
    # Water
    irrigation_water_consumption_m3: float
    irrigation_depth_mm: float
    water_savings_m3: float
    water_consumption_delta_pct: float
    
    # Nutrients
    total_n_applied_kg: float
    total_p_applied_kg: float
    total_k_applied_kg: float
    n_applied_kg_ha: float
    p_applied_kg_ha: float
    k_applied_kg_ha: float
    excess_fertilizer_detected: bool
    
    # Economics (in INR)
    modeled_fertilizer_cost_inr: Optional[float]
    modeled_cultivation_costs_inr: Optional[float]
    cost_delta_pct: Optional[float]
    estimated_revenue_inr: Optional[float]
    estimated_net_return_inr: Optional[float]
    net_return_delta_pct: Optional[float]
    is_partial_modeled_cost: bool
    
    # Provenance & Diagnostics
    biophysical_factors: Dict[str, float]
    assumptions: List[str]
    limitations: List[str]
    
    # Full detailed simulation output reference
    detailed_run: SimulationRunOutput

@dataclass
class WhatIfSuiteResult:
    baseline: ScenarioDeltaMetrics
    scenarios: List[ScenarioDeltaMetrics]
    comparison_table: List[Dict[str, Any]]
    agronomic_synthesis: List[str]

def generate_what_if_scenarios(
    baseline_payload: FarmInputPayload,
    custom_overrides: Optional[Dict[str, Dict[str, Any]]] = None
) -> WhatIfSuiteResult:
    """
    Generates and executes all 8 standard What-If scenarios (A through H)
    and computes differential analytics against the baseline plan.
    """
    overrides = custom_overrides or {}
    crop_params = get_crop_parameters(baseline_payload.crop_type)
    
    # Parse baseline sowing date
    base_sow_dt = datetime.strptime(baseline_payload.sowing_date.strip(), "%Y-%m-%d")
    
    # -------------------------------------------------------------
    # Scenario Definitions (A through H)
    # -------------------------------------------------------------
    scenario_configs = [
        {
            "code": "A",
            "name": "Baseline Farming Plan",
            "desc": "Current farmer plan using specified irrigation, nutrient dosage, and sowing calendar.",
            "modifiers": {}
        },
        {
            "code": "B",
            "name": "Reduced Irrigation (-20%)",
            "desc": "Simulates 20% reduction in irrigation depth to assess drought tolerance and water conservation.",
            "modifiers": {
                "irrigation_depth_mm": (
                    baseline_payload.irrigation_depth_mm * 0.80
                    if baseline_payload.irrigation_depth_mm is not None
                    else max(0.0, crop_params.optimal_water_requirement_mm * 0.80)
                )
            }
        },
        {
            "code": "C",
            "name": "Increased Irrigation (+20%)",
            "desc": "Simulates 20% increase in irrigation depth to test if water is limiting or induces root aeration hypoxia.",
            "modifiers": {
                "irrigation_depth_mm": (
                    baseline_payload.irrigation_depth_mm * 1.20
                    if baseline_payload.irrigation_depth_mm is not None
                    else crop_params.optimal_water_requirement_mm * 1.20
                )
            }
        },
        {
            "code": "D",
            "name": "Reduced Fertilizer Application (-25%)",
            "desc": "Simulates a 25% cut in Nitrogen, Phosphorus, and Potassium to analyze input cost savings vs yield impact.",
            "modifiers": {
                "nitrogen_kg_ha": round(baseline_payload.nitrogen_kg_ha * 0.75, 1),
                "phosphorus_kg_ha": round(baseline_payload.phosphorus_kg_ha * 0.75, 1),
                "potassium_kg_ha": round(baseline_payload.potassium_kg_ha * 0.75, 1)
            }
        },
        {
            "code": "E",
            "name": "Alternative Nutrient Application (Balanced ICAR Dose)",
            "desc": "Applies crop-specific optimal balanced N-P-K recommendation based on ICAR agronomic research.",
            "modifiers": {
                "nitrogen_kg_ha": crop_params.optimal_nitrogen_kg_ha,
                "phosphorus_kg_ha": crop_params.optimal_phosphorus_kg_ha,
                "potassium_kg_ha": crop_params.optimal_potassium_kg_ha
            }
        },
        {
            "code": "F",
            "name": "Earlier Sowing Date (-14 Days)",
            "desc": "Shifts sowing 14 days earlier to evaluate pre-monsoon heat escape or emergence risks.",
            "modifiers": {
                "sowing_date": (base_sow_dt - timedelta(days=14)).strftime("%Y-%m-%d")
            }
        },
        {
            "code": "G",
            "name": "Later Sowing Date (+14 Days)",
            "desc": "Shifts sowing 14 days later to test crop vulnerability to terminal heat stress during grain filling.",
            "modifiers": {
                "sowing_date": (base_sow_dt + timedelta(days=14)).strftime("%Y-%m-%d")
            }
        },
        {
            "code": "H",
            "name": "Combined Changes (Irrigation, Fertilizer & Sowing)",
            "desc": "Combines balanced fertilization, optimized water management (drip with target depth), and optimal sowing alignment.",
            "modifiers": {
                "nitrogen_kg_ha": crop_params.optimal_nitrogen_kg_ha,
                "phosphorus_kg_ha": crop_params.optimal_phosphorus_kg_ha,
                "potassium_kg_ha": crop_params.optimal_potassium_kg_ha,
                "irrigation_depth_mm": round(crop_params.optimal_water_requirement_mm * 0.90, 1),
                "mulching_used": True
            }
        }
    ]
    
    # -------------------------------------------------------------
    # Execute Baseline (Scenario A) First
    # -------------------------------------------------------------
    base_run = run_orchestrated_simulation(baseline_payload, scenario_name="Baseline Farming Plan")
    
    baseline_delta = ScenarioDeltaMetrics(
        scenario_id="scenario_A",
        scenario_name="Baseline Farming Plan",
        scenario_code="A",
        description=scenario_configs[0]["desc"],
        estimated_yield_kg_ha=base_run.estimated_yield_kg_ha,
        estimated_yield_quintal_acre=base_run.estimated_yield_quintal_acre,
        estimated_total_harvest_quintals=base_run.estimated_total_harvest_quintals,
        estimated_total_harvest_tonnes=base_run.estimated_total_harvest_tonnes,
        yield_delta_pct=0.0,
        irrigation_water_consumption_m3=base_run.total_irrigation_volume_m3,
        irrigation_depth_mm=base_run.total_irrigation_depth_mm,
        water_savings_m3=0.0,
        water_consumption_delta_pct=0.0,
        total_n_applied_kg=base_run.total_n_applied_kg,
        total_p_applied_kg=base_run.total_p_applied_kg,
        total_k_applied_kg=base_run.total_k_applied_kg,
        n_applied_kg_ha=base_run.n_applied_kg_ha,
        p_applied_kg_ha=base_run.p_applied_kg_ha,
        k_applied_kg_ha=base_run.k_applied_kg_ha,
        excess_fertilizer_detected=base_run.excess_fertilizer_detected,
        modeled_fertilizer_cost_inr=base_run.modeled_fertilizer_cost_inr,
        modeled_cultivation_costs_inr=base_run.total_modeled_cultivation_costs_inr,
        cost_delta_pct=0.0 if base_run.total_modeled_cultivation_costs_inr is not None else None,
        estimated_revenue_inr=base_run.estimated_gross_revenue_inr,
        estimated_net_return_inr=base_run.estimated_net_return_inr,
        net_return_delta_pct=0.0 if base_run.estimated_net_return_inr is not None else None,
        is_partial_modeled_cost=base_run.is_partial_modeled_cost,
        biophysical_factors={
            "water_factor": base_run.water_response_factor,
            "aeration_factor": base_run.aeration_hypoxia_factor,
            "nutrient_factor": base_run.nutrient_response_factor,
            "temperature_factor": base_run.temperature_stress_factor,
            "sowing_factor": base_run.sowing_suitability_factor
        },
        assumptions=base_run.assumptions,
        limitations=base_run.limitations,
        detailed_run=base_run
    )
    
    # -------------------------------------------------------------
    # Execute Remaining Scenarios (B through H) and calculate deltas
    # -------------------------------------------------------------
    evaluated_scenarios: List[ScenarioDeltaMetrics] = []
    
    for cfg in scenario_configs[1:]:
        code = cfg["code"]
        name = cfg["name"]
        desc = cfg["desc"]
        
        # Clone baseline payload dictionary
        sc_dict = copy.deepcopy(baseline_payload.__dict__)
        
        # Apply standard scenario modifiers
        for k, v in cfg["modifiers"].items():
            sc_dict[k] = v
            
        # Apply custom user overrides for this scenario if provided
        if code in overrides:
            for k, v in overrides[code].items():
                if v is not None and k in sc_dict:
                    sc_dict[k] = v
        if name in overrides:
            for k, v in overrides[name].items():
                if v is not None and k in sc_dict:
                    sc_dict[k] = v
                    
        # Re-instantiate FarmInputPayload
        sc_payload = FarmInputPayload(**sc_dict)
        
        # Run simulation independently
        sc_run = run_orchestrated_simulation(sc_payload, scenario_name=name)
        
        # Calculate Deltas relative to Baseline
        # 1. Yield Delta %
        base_yield = max(0.1, base_run.estimated_yield_kg_ha)
        yield_delta_pct = round(((sc_run.estimated_yield_kg_ha - base_yield) / base_yield) * 100.0, 2)
        
        # 2. Water Delta % and Savings
        base_water = base_run.total_irrigation_volume_m3
        water_diff = base_water - sc_run.total_irrigation_volume_m3
        if base_water > 0:
            water_delta_pct = round(((sc_run.total_irrigation_volume_m3 - base_water) / base_water) * 100.0, 2)
        else:
            water_delta_pct = 0.0
            
        # 3. Cost Delta %
        cost_delta_pct = None
        if base_run.total_modeled_cultivation_costs_inr and sc_run.total_modeled_cultivation_costs_inr:
            base_cost = max(1.0, base_run.total_modeled_cultivation_costs_inr)
            cost_delta_pct = round(((sc_run.total_modeled_cultivation_costs_inr - base_cost) / base_cost) * 100.0, 2)
            
        # 4. Net Return Delta %
        net_delta_pct = None
        if base_run.estimated_net_return_inr is not None and sc_run.estimated_net_return_inr is not None:
            if abs(base_run.estimated_net_return_inr) > 1.0:
                net_delta_pct = round(
                    ((sc_run.estimated_net_return_inr - base_run.estimated_net_return_inr) / abs(base_run.estimated_net_return_inr)) * 100.0,
                    2
                )
            else:
                net_delta_pct = 0.0
                
        metrics = ScenarioDeltaMetrics(
            scenario_id=f"scenario_{code}",
            scenario_name=name,
            scenario_code=code,
            description=desc,
            estimated_yield_kg_ha=sc_run.estimated_yield_kg_ha,
            estimated_yield_quintal_acre=sc_run.estimated_yield_quintal_acre,
            estimated_total_harvest_quintals=sc_run.estimated_total_harvest_quintals,
            estimated_total_harvest_tonnes=sc_run.estimated_total_harvest_tonnes,
            yield_delta_pct=yield_delta_pct,
            irrigation_water_consumption_m3=sc_run.total_irrigation_volume_m3,
            irrigation_depth_mm=sc_run.total_irrigation_depth_mm,
            water_savings_m3=round(water_diff, 1),
            water_consumption_delta_pct=water_delta_pct,
            total_n_applied_kg=sc_run.total_n_applied_kg,
            total_p_applied_kg=sc_run.total_p_applied_kg,
            total_k_applied_kg=sc_run.total_k_applied_kg,
            n_applied_kg_ha=sc_run.n_applied_kg_ha,
            p_applied_kg_ha=sc_run.p_applied_kg_ha,
            k_applied_kg_ha=sc_run.k_applied_kg_ha,
            excess_fertilizer_detected=sc_run.excess_fertilizer_detected,
            modeled_fertilizer_cost_inr=sc_run.modeled_fertilizer_cost_inr,
            modeled_cultivation_costs_inr=sc_run.total_modeled_cultivation_costs_inr,
            cost_delta_pct=cost_delta_pct,
            estimated_revenue_inr=sc_run.estimated_gross_revenue_inr,
            estimated_net_return_inr=sc_run.estimated_net_return_inr,
            net_return_delta_pct=net_delta_pct,
            is_partial_modeled_cost=sc_run.is_partial_modeled_cost,
            biophysical_factors={
                "water_factor": sc_run.water_response_factor,
                "aeration_factor": sc_run.aeration_hypoxia_factor,
                "nutrient_factor": sc_run.nutrient_response_factor,
                "temperature_factor": sc_run.temperature_stress_factor,
                "sowing_factor": sc_run.sowing_suitability_factor
            },
            assumptions=sc_run.assumptions,
            limitations=sc_run.limitations,
            detailed_run=sc_run
        )
        evaluated_scenarios.append(metrics)
        
    # -------------------------------------------------------------
    # Build Structured Tabular Comparison
    # -------------------------------------------------------------
    all_metrics = [baseline_delta] + evaluated_scenarios
    table = []
    for m in all_metrics:
        table.append({
            "code": m.scenario_code,
            "name": m.scenario_name,
            "yield_kg_ha": m.estimated_yield_kg_ha,
            "yield_q_acre": m.estimated_yield_quintal_acre,
            "yield_delta_pct": m.yield_delta_pct,
            "harvest_tonnes": m.estimated_total_harvest_tonnes,
            "water_m3": m.irrigation_water_consumption_m3,
            "water_savings_m3": m.water_savings_m3,
            "water_delta_pct": m.water_consumption_delta_pct,
            "n_kg_ha": m.n_applied_kg_ha,
            "p_kg_ha": m.p_applied_kg_ha,
            "k_kg_ha": m.k_applied_kg_ha,
            "fertilizer_cost_inr": m.modeled_fertilizer_cost_inr,
            "total_cost_inr": m.modeled_cultivation_costs_inr,
            "cost_delta_pct": m.cost_delta_pct,
            "revenue_inr": m.estimated_revenue_inr,
            "net_return_inr": m.estimated_net_return_inr,
            "net_return_delta_pct": m.net_return_delta_pct,
            "is_partial_cost": m.is_partial_modeled_cost
        })
        
    # -------------------------------------------------------------
    # Agronomic Syntheses & Insights
    # -------------------------------------------------------------
    insights = []
    
    # 1. Best Yield Scenario
    best_yield_sc = max(all_metrics, key=lambda x: x.estimated_yield_kg_ha)
    if best_yield_sc.scenario_code != "A":
        insights.append(
            f"Highest harvest potential achieved by {best_yield_sc.scenario_name} "
            f"({best_yield_sc.estimated_yield_kg_ha:,.0f} kg/ha, {best_yield_sc.yield_delta_pct:+.1f}% vs baseline)."
        )
    else:
        insights.append("Baseline farming plan achieves the highest harvest potential among evaluated single-factor variations.")
        
    # 2. Water Conservation Scenario
    water_saving_scs = [s for s in evaluated_scenarios if s.water_savings_m3 > 0]
    if water_saving_scs:
        best_water_sc = max(water_saving_scs, key=lambda x: x.water_savings_m3)
        insights.append(
            f"{best_water_sc.scenario_name} conserves {best_water_sc.water_savings_m3:,.0f} m³ of irrigation water "
            f"({abs(best_water_sc.water_consumption_delta_pct):.1f}% reduction) with a {best_water_sc.yield_delta_pct:+.1f}% yield adjustment."
        )
        
    # 3. Excessive Input Check
    if baseline_delta.excess_fertilizer_detected:
        insights.append(
            "Baseline inputs apply excessive fertilizer above crop uptake saturation, triggering yield penalties. "
            "Switching to Scenario E (Balanced ICAR Dose) eliminates vegetative lodging."
        )
    if baseline_delta.detailed_run.excess_irrigation_penalty_pct > 2.0:
        insights.append(
            f"Baseline plan induces {baseline_delta.detailed_run.excess_irrigation_penalty_pct:.1f}% root aeration hypoxia penalty from excessive ponding. "
            "Controlled deficit irrigation (Scenario B) restores root oxygenation."
        )
        
    # 4. Profitability Scenario (if price supplied)
    if baseline_delta.estimated_net_return_inr is not None:
        profitable_scs = [s for s in all_metrics if s.estimated_net_return_inr is not None]
        if profitable_scs:
            best_profit_sc = max(profitable_scs, key=lambda x: x.estimated_net_return_inr)
            if best_profit_sc.scenario_code != "A":
                insights.append(
                    f"Optimal economic return generated by {best_profit_sc.scenario_name} "
                    f"with estimated net return of ₹{best_profit_sc.estimated_net_return_inr:,.0f} "
                    f"({best_profit_sc.net_return_delta_pct:+.1f}% gain over baseline)."
                )
    else:
        insights.append(
            "Economic revenues and net returns omitted because crop selling price was not supplied. "
            "Configure selling price to view financial comparative returns."
        )
        
    return WhatIfSuiteResult(
        baseline=baseline_delta,
        scenarios=evaluated_scenarios,
        comparison_table=table,
        agronomic_synthesis=insights
    )
