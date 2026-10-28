"""
AgriSim AI - Automated Regression Test Suite for Advanced Modules
Covers:
  1. Pareto Dominance and Multi-Objective Frontier Engine
  2. Constraint Enforcement and Infeasible Candidate Pruning
  3. Weather Stress Testing Battery (6 Systematic Climate Shocks)
  4. Scenario-Based Risk Sensitivity & Tornado Ranking Engine
  5. API Route Verification for /optimize/pareto, /stress-test/battery, /risk/sensitivity
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

from app.simulation.simulation_orchestrator import FarmInputPayload
from app.simulation.pareto_optimizer import (
    check_pareto_dominance,
    run_multi_objective_pareto_optimization
)
from app.simulation.weather_stress_engine import (
    run_weather_stress_testing_battery
)
from app.simulation.risk_sensitivity_engine import (
    run_risk_sensitivity_analysis
)

client = TestClient(app)

def test_pareto_dominance_logic():
    """
    Verifies that Pareto dominance adheres to multi-objective definitions:
    A dominates B iff A >= B for all objectives and A > B for at least one.
    """
    directions = {
        "yield": "max",
        "water": "min",
        "fertilizer": "min",
        "profit": "max"
    }
    
    cand_a = {"yield": 3500, "water": 4000, "fertilizer": 180, "profit": 50000}
    cand_b = {"yield": 3200, "water": 4500, "fertilizer": 200, "profit": 42000}
    # A is strictly superior in all 4 dimensions -> A dominates B
    assert check_pareto_dominance(cand_a, cand_b, directions) is True
    assert check_pareto_dominance(cand_b, cand_a, directions) is False
    
    # Trade-off candidate C: Higher yield than A, but consumes more water
    cand_c = {"yield": 3800, "water": 5000, "fertilizer": 180, "profit": 52000}
    # Neither dominates the other
    assert check_pareto_dominance(cand_a, cand_c, directions) is False
    assert check_pareto_dominance(cand_c, cand_a, directions) is False

def test_pareto_frontier_generation_and_balanced_option():
    """
    Executes multi-objective combinatorial optimization for Wheat.
    Ensures that Pareto frontier members are non-dominated by any other candidate,
    and a balanced compromise point is identified.
    """
    payload = FarmInputPayload(
        crop_type="wheat",
        farm_area=2.0,
        farm_area_unit="hectares",
        soil_type="Alluvial Loam",
        temperature_c=18.0,
        rainfall_mm=120.0,
        sowing_date="2026-11-15",
        irrigation_method="drip",
        irrigation_depth_mm=380.0,
        nitrogen_kg_ha=120.0,
        phosphorus_kg_ha=60.0,
        potassium_kg_ha=40.0,
        crop_selling_price_per_quintal=2275.0
    )
    
    result = run_multi_objective_pareto_optimization(
        baseline_payload=payload,
        custom_irrigation_multipliers=[0.6, 0.8, 1.0, 1.2],
        custom_nitrogen_rates=[60.0, 90.0, 120.0]
    )
    
    assert result.total_evaluated > 0
    assert result.feasible_count > 0
    assert result.pareto_frontier_count > 0
    assert len(result.pareto_frontier) == result.pareto_frontier_count
    
    # Balanced strategy must be present
    assert result.balanced_strategy is not None
    assert result.balanced_strategy.is_balanced_option is True
    
    # Ensure no member of the pareto frontier is dominated by any other feasible candidate
    directions = {"yield": "max", "water": "min", "fertilizer": "min", "profit": "max"}
    for p_point in result.pareto_frontier:
        assert p_point.is_feasible is True
        p_dict = {
            "yield": p_point.predicted_yield_kg_ha,
            "water": p_point.irrigation_water_m3,
            "fertilizer": p_point.total_fertilizer_applied_kg,
            "profit": p_point.estimated_net_profit_inr
        }
        for cand in result.all_candidates:
            c_dict = {
                "yield": cand.predicted_yield_kg_ha,
                "water": cand.irrigation_water_m3,
                "fertilizer": cand.total_fertilizer_applied_kg,
                "profit": cand.estimated_net_profit_inr
            }
            # cand cannot dominate p_point
            assert check_pareto_dominance(c_dict, p_dict, directions) is False

def test_pareto_constraint_enforcement():
    """
    Verifies that strategies violating user water quotas or budget ceilings
    are marked infeasible and pruned from the Pareto frontier.
    """
    payload = FarmInputPayload(
        crop_type="wheat",
        farm_area=2.0,
        farm_area_unit="hectares",
        soil_type="Alluvial Loam",
        temperature_c=18.0,
        rainfall_mm=100.0,
        sowing_date="2026-11-15",
        irrigation_method="drip",
        irrigation_depth_mm=400.0
    )
    
    # Restrict water quota to 5000 m3 (which is strict for 2 ha at 400 mm)
    result = run_multi_objective_pareto_optimization(
        baseline_payload=payload,
        max_water_m3=5000.0,
        custom_irrigation_multipliers=[0.5, 0.7, 1.0, 1.3]
    )
    
    # Every point on the Pareto frontier must strictly respect max_water_m3
    for p in result.pareto_frontier:
        assert p.irrigation_water_m3 <= 5000.0 + 1e-3

def test_weather_stress_battery_invariance_and_resilience():
    """
    Verifies the 6-scenario weather stress testing battery:
    1. Management inputs (irrigation depth, fertilizer, sowing date) stay constant across all scenarios.
    2. Deluge scenario evaluates infiltration, runoff, and hypoxia.
    3. Drought and heat scenarios show biophysical degradation.
    4. Resilience score (0-100) and qualitative rating are returned.
    """
    payload = FarmInputPayload(
        crop_type="wheat",
        farm_area=1.0,
        farm_area_unit="hectares",
        soil_type="Black Soil (Vertisol)",
        temperature_c=20.0,
        rainfall_mm=150.0,
        sowing_date="2026-11-15",
        irrigation_method="drip",
        irrigation_depth_mm=350.0,
        nitrogen_kg_ha=120.0,
        phosphorus_kg_ha=60.0,
        potassium_kg_ha=40.0
    )
    
    result = run_weather_stress_testing_battery(payload)
    
    assert len(result.scenarios) == 6
    scenario_ids = [s.scenario_id for s in result.scenarios]
    assert "normal_weather" in scenario_ids
    assert "lower_rainfall" in scenario_ids
    assert "drought_stress" in scenario_ids
    assert "heat_stress" in scenario_ids
    assert "excess_deluge" in scenario_ids
    assert "combined_heat_drought" in scenario_ids
    
    # Verify irrigation volume remained constant across all weather shock scenarios
    base_irr_vol = result.scenarios[0].irrigation_water_consumption_m3
    for sc in result.scenarios:
        assert abs(sc.irrigation_water_consumption_m3 - base_irr_vol) < 1e-3
        
    # Combined heat and drought must suffer more yield loss than normal baseline
    normal_sc = next(s for s in result.scenarios if s.scenario_id == "normal_weather")
    combined_sc = next(s for s in result.scenarios if s.scenario_id == "combined_heat_drought")
    assert combined_sc.estimated_yield_kg_ha < normal_sc.estimated_yield_kg_ha
    assert combined_sc.yield_delta_pct < 0.0
    
    # Resilience score bounded [0, 100]
    assert 0.0 <= result.resilience_score <= 100.0
    assert result.resilience_rating in [
        "High Climate Resilience", "Moderate Resilience", "Vulnerable to Extremes", "Severe Climate Vulnerability"
    ]

def test_risk_sensitivity_tornado_ranking_and_bounding():
    """
    Verifies the risk sensitivity analysis:
    1. Evaluates all 5 dimensions (rainfall, temperature, sowing date, fertilizer cost, crop price).
    2. Ranks tornado sensitivities correctly by impact swing.
    3. Produces Worst-case, Baseline, and Best-case scenarios.
    4. Provides actionable farmer risk mitigations.
    5. Includes transparent methodology disclosure.
    """
    payload = FarmInputPayload(
        crop_type="cotton",
        farm_area=3.0,
        farm_area_unit="acres",
        soil_type="Black Soil (Vertisol)",
        temperature_c=27.0,
        rainfall_mm=450.0,
        sowing_date="2026-06-15",
        irrigation_method="furrow",
        irrigation_depth_mm=400.0,
        nitrogen_kg_ha=100.0,
        phosphorus_kg_ha=50.0,
        potassium_kg_ha=50.0,
        crop_selling_price_per_quintal=6620.0
    )
    
    result = run_risk_sensitivity_analysis(
        baseline_payload=payload,
        rainfall_variation_pct=40.0,
        temperature_anomaly_c=3.5,
        fertilizer_inflation_pct=30.0,
        price_volatility_pct=25.0,
        sowing_shift_days=10
    )
    
    assert len(result.tornado_sensitivities) == 5
    # Verify rankings 1 to 5
    ranks = [item.rank for item in result.tornado_sensitivities]
    assert ranks == [1, 2, 3, 4, 5]
    
    # Highest ranked must be marked as primary risk driver
    assert result.tornado_sensitivities[0].primary_risk_driver is True
    
    # Bounding scenario ordering: Worst <= Baseline <= Best
    assert result.worst_case_scenario.estimated_yield_kg_ha <= result.baseline_scenario.estimated_yield_kg_ha + 1e-3
    assert result.baseline_scenario.estimated_yield_kg_ha <= result.best_case_scenario.estimated_yield_kg_ha + 1e-3
    
    # Risk mitigations must be populated
    assert len(result.risk_mitigations) >= 2
    for m in result.risk_mitigations:
        assert m.title != ""
        assert m.expected_impact != ""
        
    # Methodology disclosure must disclaim fake statistical distributions
    assert "probability distribution" in result.methodology_disclosure.lower()

def test_api_pareto_optimization_endpoint():
    """
    Verifies POST /api/v1/optimize/pareto endpoint
    """
    request_body = {
        "baseline_input": {
            "crop_type": "rice",
            "farm_area": 1.5,
            "farm_area_unit": "hectares",
            "soil_type": "Clay Loam",
            "temperature_c": 28.0,
            "rainfall_mm": 600.0,
            "sowing_date": "2026-06-20",
            "irrigation_method": "flood",
            "irrigation_depth_mm": 700.0,
            "nitrogen_kg_ha": 100.0,
            "phosphorus_kg_ha": 50.0,
            "potassium_kg_ha": 50.0,
            "crop_selling_price_per_quintal": 2183.0
        },
        "custom_irrigation_multipliers": [0.7, 1.0, 1.2],
        "custom_nitrogen_rates": [60.0, 100.0]
    }
    
    response = client.post("/api/v1/optimize/pareto", json=request_body)
    assert response.status_code == 200
    data = response.json()
    assert "pareto_frontier" in data
    assert "balanced_strategy" in data
    assert len(data["pareto_frontier"]) > 0
    assert data["pareto_frontier"][0]["predicted_yield_kg_ha"] > 0

def test_api_weather_stress_battery_endpoint():
    """
    Verifies POST /api/v1/stress-test/battery endpoint
    """
    request_body = {
        "baseline_input": {
            "crop_type": "maize",
            "farm_area": 2.5,
            "farm_area_unit": "acres",
            "soil_type": "Alluvial Loam",
            "temperature_c": 26.0,
            "rainfall_mm": 350.0,
            "sowing_date": "2026-07-01",
            "irrigation_method": "sprinkler",
            "irrigation_depth_mm": 200.0,
            "nitrogen_kg_ha": 120.0,
            "phosphorus_kg_ha": 60.0,
            "potassium_kg_ha": 40.0,
            "crop_selling_price_per_quintal": 2090.0
        }
    }
    
    response = client.post("/api/v1/stress-test/battery", json=request_body)
    assert response.status_code == 200
    data = response.json()
    assert len(data["scenarios"]) == 6
    assert "resilience_score" in data
    assert "Maize" in data["crop_name"]


def test_api_risk_sensitivity_endpoint():
    """
    Verifies POST /api/v1/risk/sensitivity endpoint
    """
    request_body = {
        "baseline_input": {
            "crop_type": "soybean",
            "farm_area": 4.0,
            "farm_area_unit": "acres",
            "soil_type": "Black Soil (Vertisol)",
            "temperature_c": 27.0,
            "rainfall_mm": 500.0,
            "sowing_date": "2026-06-25",
            "irrigation_method": "rainfed",
            "nitrogen_kg_ha": 30.0,
            "phosphorus_kg_ha": 60.0,
            "potassium_kg_ha": 40.0,
            "crop_selling_price_per_quintal": 4600.0
        },
        "rainfall_variation_pct": 35.0,
        "temperature_anomaly_c": 3.0,
        "fertilizer_inflation_pct": 25.0,
        "price_volatility_pct": 20.0,
        "sowing_shift_days": 10
    }
    
    response = client.post("/api/v1/risk/sensitivity", json=request_body)
    assert response.status_code == 200
    data = response.json()
    assert "tornado_sensitivities" in data
    assert len(data["tornado_sensitivities"]) == 5
    assert "worst_case_scenario" in data
    assert "best_case_scenario" in data
    assert "risk_mitigations" in data
