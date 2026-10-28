import json
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any

from app.schemas.simulation import (
    SimulationInput,
    SimulationResult,
    ScenarioComparisonInput,
    ScenarioComparisonResult,
    ScenarioComparisonItem,
    ModularFarmInput,
    WhatIfScenariosInput
)
from app.simulation.engine import run_simulation
from app.simulation.simulation_orchestrator import FarmInputPayload, run_orchestrated_simulation
from app.simulation.scenario_generator import generate_what_if_scenarios
from app.database.session import get_db

router = APIRouter(prefix="/simulation", tags=["Simulation"])

@router.post("/run", response_model=SimulationResult)
def execute_simulation(sim_input: SimulationInput):
    """
    Runs a complete single-season numerical simulation for the specified farm, crop, and inputs.
    Saves the execution run into the SQLite database history.
    """
    try:
        result = run_simulation(sim_input, scenario_name="Baseline")
        
        # Persist to database
        with get_db() as db:
            cursor = db.cursor()
            
            # Ensure farm profile exists
            farm = sim_input.farm_profile
            farm_id = farm.id or f"farm_{farm.name.lower().replace(' ', '_')}"
            cursor.execute("""
            INSERT OR REPLACE INTO farm_profiles (id, name, location, state, zone, total_acres, soil_type, irrigation_system)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (farm_id, farm.name, f"{farm.state}, India", farm.state, farm.zone, farm.total_acres, farm.soil_type, farm.irrigation_system))
            
            # Insert simulation run
            cursor.execute("""
            INSERT INTO simulation_runs (
                id, farm_profile_id, name, crop_id, season, sowing_date,
                yield_quintal_acre, water_consumed_m3, total_cost_inr, revenue_inr, profit_inr,
                water_productivity_kg_m3, input_data, output_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                result.run_id,
                farm_id,
                f"{result.crop_name} Simulation",
                result.crop_id,
                result.season,
                sim_input.sowing_date,
                result.yield_quintal_acre,
                result.total_water_consumed_m3_acre * farm.total_acres,
                result.costs.total_cost,
                result.gross_revenue_inr,
                result.net_profit_inr,
                result.water_productivity_kg_m3,
                sim_input.model_dump_json(),
                result.model_dump_json()
            ))
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

@router.post("/compare", response_model=ScenarioComparisonResult)
def compare_scenarios(compare_input: ScenarioComparisonInput):
    """
    Executes baseline and multiple What-If scenarios (e.g. drip vs flood, deficit irrigation,
    reduced fertilizer, mulching enabled), returning side-by-side comparative analytics.
    """
    try:
        # Run baseline
        baseline = run_simulation(compare_input.base_simulation, scenario_name="Baseline Normal")
        
        comparison_items: List[ScenarioComparisonItem] = []
        
        # If user passed custom scenario overrides
        for s_idx, sc_data in enumerate(compare_input.scenarios):
            s_name = sc_data.get("name", f"Scenario {s_idx + 1}")
            
            # Clone base input and apply overrides
            sc_input_dict = compare_input.base_simulation.model_dump()
            
            # Apply overrides if present
            if "mulching_used" in sc_data:
                sc_input_dict["mulching_used"] = bool(sc_data["mulching_used"])
            if "irrigation_system" in sc_data:
                sc_input_dict["farm_profile"]["irrigation_system"] = sc_data["irrigation_system"]
            if "irrigation_schedule" in sc_data:
                sc_input_dict["irrigation_schedule"] = sc_data["irrigation_schedule"]
            if "fertilizer_plan" in sc_data:
                sc_input_dict["fertilizer_plan"] = sc_data["fertilizer_plan"]
            if "sowing_date" in sc_data:
                sc_input_dict["sowing_date"] = sc_data["sowing_date"]
                
            sc_sim_input = SimulationInput.model_validate(sc_input_dict)
            sc_result = run_simulation(sc_sim_input, scenario_name=s_name)
            
            # Calculate deltas relative to baseline
            y_delta = ((sc_result.yield_quintal_acre - baseline.yield_quintal_acre) / max(0.1, baseline.yield_quintal_acre)) * 100.0
            w_delta = ((sc_result.total_water_consumed_m3_acre - baseline.total_water_consumed_m3_acre) / max(1.0, baseline.total_water_consumed_m3_acre)) * 100.0
            c_delta = ((sc_result.costs.total_cost - baseline.costs.total_cost) / max(1.0, baseline.costs.total_cost)) * 100.0
            p_delta = ((sc_result.net_profit_inr - baseline.net_profit_inr) / max(1.0, abs(baseline.net_profit_inr))) * 100.0
            
            comparison_items.append(ScenarioComparisonItem(
                scenario_name=s_name,
                yield_quintal_acre=sc_result.yield_quintal_acre,
                yield_delta_pct=round(y_delta, 1),
                water_consumed_m3_acre=sc_result.total_water_consumed_m3_acre,
                water_delta_pct=round(w_delta, 1),
                total_cost_inr=sc_result.costs.total_cost,
                cost_delta_pct=round(c_delta, 1),
                net_profit_inr=sc_result.net_profit_inr,
                profit_delta_pct=round(p_delta, 1),
                water_productivity_kg_m3=sc_result.water_productivity_kg_m3,
                roi_pct=sc_result.return_on_investment_roi_pct,
                result=sc_result
            ))
            
        # Synthesize key insights
        insights = []
        if comparison_items:
            best_profit_sc = max(comparison_items, key=lambda x: x.net_profit_inr)
            best_water_sc = min(comparison_items, key=lambda x: x.water_consumed_m3_acre)
            
            if best_profit_sc.net_profit_inr > baseline.net_profit_inr:
                insights.append(
                    f"'{best_profit_sc.scenario_name}' provides the highest profitability, generating +₹{best_profit_sc.net_profit_inr - baseline.net_profit_inr:,.0f} (+{best_profit_sc.profit_delta_pct:.1f}%) in net returns."
                )
            if best_water_sc.water_delta_pct < 0:
                insights.append(
                    f"'{best_water_sc.scenario_name}' achieves greatest water savings, reducing water consumption by {abs(best_water_sc.water_delta_pct):.1f}%."
                )
            insights.append("Compare multi-scenario trajectories above to evaluate trade-offs between pumping costs and crop yield.")
            
        return ScenarioComparisonResult(
            baseline=baseline,
            scenarios=comparison_items,
            key_insights=insights
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scenario comparison failed: {str(e)}")

@router.post("/modular/run")
def execute_modular_simulation(farm_input: ModularFarmInput):
    """
    Executes a complete biophysical numerical simulation using the modular agricultural engine.
    Applies validated FAO-56, FAO-33, and ICAR production functions with non-negativity safeguards,
    excessive input penalties, and explicit provenance disclosures.
    """
    try:
        payload = FarmInputPayload(**farm_input.model_dump())
        result = run_orchestrated_simulation(payload, scenario_name="Modular Farm Simulation")
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Modular simulation failed: {str(e)}")

@router.post("/modular/what-if")
def execute_what_if_scenarios(what_if_input: WhatIfScenariosInput):
    """
    Automatically generates and evaluates all 8 standard What-If farming scenarios (A through H):
      A. Baseline farming plan
      B. Reduced irrigation (-20%)
      C. Increased irrigation (+20%)
      D. Reduced fertilizer application (-25%)
      E. Alternative nutrient application (Balanced ICAR Dose)
      F. Earlier sowing date (-14 days)
      G. Later sowing date (+14 days)
      H. Combined changes (Irrigation + Fertilizer + Sowing)
    Computes yield, water consumption, fertilizer usage, costs, and revenues with exact deltas.
    """
    try:
        payload = FarmInputPayload(**what_if_input.baseline_input.model_dump())
        suite_result = generate_what_if_scenarios(
            baseline_payload=payload,
            custom_overrides=what_if_input.custom_overrides
        )
        return suite_result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"What-If scenario suite failed: {str(e)}")

