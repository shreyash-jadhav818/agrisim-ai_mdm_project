"""
AgriSim AI - Automated Test Suite for Modular Agricultural Simulation Engine
Covers:
  1. Unit conversions and exact irrigation volume formula (m3 = depth_mm * area_ha * 10)
  2. All 10 initial crops and soil characteristics integrity
  3. Excessive fertilizer yield penalty (stem lodging / osmotic burn)
  4. Excessive irrigation yield penalty (aeration hypoxia / waterlogging)
  5. Sowing-date suitability and phenological windows
  6. Non-negativity and upper-bound yield constraints
  7. Transparent financial accounting in INR without fabricating missing data
  8. Automated What-If Scenarios generation (Scenarios A through H)
  9. Constrained grid-search optimizer (yield, net return, lower water)
 10. API endpoints for modular simulation, what-if suite, and grid optimizer
"""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.simulation.unit_conversions import (
    acres_to_hectares,
    hectares_to_acres,
    millimeters_to_meters,
    meters_to_millimeters,
    cubic_meters_to_liters,
    liters_to_cubic_meters,
    calculate_irrigation_volume_m3,
    nutrient_rate_to_total_kg,
    quintals_to_kg,
    kg_to_quintals,
    kg_per_ha_to_quintals_per_acre,
    quintals_per_acre_to_kg_per_ha
)
from app.simulation.crop_parameters import (
    CORE_CROP_REGISTRY,
    get_crop_parameters
)
from app.simulation.soil_characteristics import (
    SOIL_REGISTRY,
    get_soil_characteristics
)
from app.simulation.nutrient_management import evaluate_nutrient_management
from app.simulation.sowing_suitability import evaluate_sowing_suitability
from app.simulation.cost_calculations import calculate_farm_finances
from app.simulation.simulation_orchestrator import (
    FarmInputPayload,
    run_orchestrated_simulation
)
from app.simulation.scenario_generator import generate_what_if_scenarios
from app.simulation.grid_optimizer import run_constrained_grid_search

client = TestClient(app)

# -------------------------------------------------------------
# 1. UNIT CONVERSIONS & EXACT IRRIGATION FORMULA TESTS
# -------------------------------------------------------------
def test_unit_conversions_accuracy():
    # Acres <-> Hectares
    acres = 10.0
    ha = acres_to_hectares(acres)
    assert pytest.approx(ha, 0.001) == 4.046856
    assert pytest.approx(hectares_to_acres(ha), 0.001) == 10.0
    
    # Millimeters <-> Meters
    assert millimeters_to_meters(250.0) == 0.250
    assert meters_to_millimeters(0.250) == 250.0
    
    # Cubic meters <-> Litres
    assert cubic_meters_to_liters(12.5) == 12500.0
    assert liters_to_cubic_meters(12500.0) == 12.5
    
    # Quintals <-> Kilograms
    assert quintals_to_kg(5.0) == 500.0
    assert kg_to_quintals(500.0) == 5.0
    
    # Nutrient rates (kg/ha) to total farm kg
    assert nutrient_rate_to_total_kg(120.0, 3.5) == 420.0

def test_exact_irrigation_volume_formula():
    """
    Verifies the exact formula required:
    Water volume in cubic metres = irrigation depth in millimetres * area in hectares * 10
    """
    # 50 mm depth over 2.0 ha = 50 * 2.0 * 10 = 1000 m3
    vol_m3 = calculate_irrigation_volume_m3(depth_mm=50.0, area_ha=2.0)
    assert vol_m3 == 1000.0
    
    # 100 mm depth over 1.5 ha = 100 * 1.5 * 10 = 1500 m3
    assert calculate_irrigation_volume_m3(depth_mm=100.0, area_ha=1.5) == 1500.0
    
    # Non-negative validation
    with pytest.raises(ValueError):
        calculate_irrigation_volume_m3(depth_mm=-10.0, area_ha=1.0)
    with pytest.raises(ValueError):
        calculate_irrigation_volume_m3(depth_mm=10.0, area_ha=-1.0)

# -------------------------------------------------------------
# 2. 10 INITIAL CROPS & SOILS REGISTRY
# -------------------------------------------------------------
def test_ten_initial_crops_present():
    expected_crops = [
        "rice", "wheat", "maize", "soybean", "cotton",
        "sugarcane", "groundnut", "chickpea", "sorghum", "pearl_millet"
    ]
    for crop_id in expected_crops:
        assert crop_id in CORE_CROP_REGISTRY, f"Crop '{crop_id}' missing from CORE_CROP_REGISTRY"
        crop = get_crop_parameters(crop_id)
        assert crop.reference_yield_kg_ha > 0
        assert crop.optimal_water_requirement_mm > 0
        assert crop.base_temperature_c >= 0
        assert len(crop.stages) >= 3

def test_soil_characteristics_integrity():
    for soil_id, soil in SOIL_REGISTRY.items():
        assert soil.wilting_point_vol < soil.field_capacity_vol < soil.saturation_vol
        assert soil.ksat_mm_day > 0
        assert soil.available_water_capacity_mm_per_m > 0

# -------------------------------------------------------------
# 3. EXCESSIVE FERTILIZER PENALTY TEST
# -------------------------------------------------------------
def test_excessive_fertilizer_yield_penalty():
    """
    Verifies that excessive fertilizer application does not monotonically increase yield,
    but instead incurs an explicit penalty due to vegetative lodging and osmotic stress.
    """
    crop = get_crop_parameters("wheat")
    # Optimal N for wheat is 120 kg/ha; threshold is 165 kg/ha
    optimal_eval = evaluate_nutrient_management(
        n_applied_kg_ha=120.0,
        p_applied_kg_ha=60.0,
        k_applied_kg_ha=40.0,
        crop_params=crop,
        farm_area_ha=2.0
    )
    
    excess_eval = evaluate_nutrient_management(
        n_applied_kg_ha=260.0,  # Far above 165 kg/ha threshold
        p_applied_kg_ha=60.0,
        k_applied_kg_ha=40.0,
        crop_params=crop,
        farm_area_ha=2.0
    )
    
    assert excess_eval.excess_fertilizer_detected is True
    assert excess_eval.excess_fertilizer_penalty_pct > 0.0
    # Excessive fertilizer factor must be lower than optimal factor due to penalty!
    assert excess_eval.nutrient_yield_factor < optimal_eval.nutrient_yield_factor

# -------------------------------------------------------------
# 4. EXCESSIVE IRRIGATION HYPOXIA PENALTY TEST
# -------------------------------------------------------------
def test_excessive_irrigation_hypoxia_penalty():
    """
    Verifies that excessive irrigation waterlogging on heavy soils reduces yield
    due to root zone aeration hypoxia.
    """
    # Baseline adequate irrigation (500 mm)
    normal_input = FarmInputPayload(
        crop_type="wheat",
        farm_area=2.0,
        farm_area_unit="ha",
        soil_type="Black Cotton Soil (Vertisol)",
        irrigation_method="flood",
        irrigation_depth_mm=500.0,
        nitrogen_kg_ha=120.0
    )
    normal_run = run_orchestrated_simulation(normal_input)
    
    # Extreme excessive flood irrigation (1100 mm on vertisol heavy clay)
    excess_input = FarmInputPayload(
        crop_type="wheat",
        farm_area=2.0,
        farm_area_unit="ha",
        soil_type="Black Cotton Soil (Vertisol)",
        irrigation_method="flood",
        irrigation_depth_mm=1100.0,
        nitrogen_kg_ha=120.0
    )
    excess_run = run_orchestrated_simulation(excess_input)
    
    assert excess_run.excess_irrigation_penalty_pct > 0.0
    assert excess_run.aeration_hypoxia_factor < 1.0
    # Over-flooding heavy clay impairs final harvest yield
    assert excess_run.estimated_yield_kg_ha < normal_run.estimated_yield_kg_ha


# -------------------------------------------------------------
# 5. SOWING-DATE SUITABILITY TEST
# -------------------------------------------------------------
def test_sowing_date_suitability():
    crop = get_crop_parameters("wheat")  # Optimal window Nov 01 - Nov 25
    # Sowing on Nov 15 is optimal
    opt_sow = evaluate_sowing_suitability("2026-11-15", crop)
    assert opt_sow.is_within_optimal_window is True
    assert opt_sow.days_deviation_from_optimum == 0
    assert opt_sow.sowing_suitability_factor == 1.0
    
    # Sowing on Jan 10 is very late (terminal heat penalty)
    late_sow = evaluate_sowing_suitability("2027-01-10", crop)
    assert late_sow.is_within_optimal_window is False
    assert late_sow.days_deviation_from_optimum > 0
    assert late_sow.sowing_suitability_factor < 1.0
    assert "Delayed sowing" in late_sow.phenological_hazard

# -------------------------------------------------------------
# 6. NON-NEGATIVITY & BOUNDING SAFEGUARDS
# -------------------------------------------------------------
def test_yield_non_negativity_and_bounding():
    # Severe drought & zero fertilizer
    zero_input = FarmInputPayload(
        crop_type="maize",
        farm_area=1.0,
        irrigation_depth_mm=0.0,
        rainfall_mm=0.0,
        nitrogen_kg_ha=0.0,
        phosphorus_kg_ha=0.0,
        potassium_kg_ha=0.0
    )
    zero_run = run_orchestrated_simulation(zero_input)
    assert zero_run.estimated_yield_kg_ha >= 0.0
    assert zero_run.estimated_total_harvest_kg >= 0.0
    
    # Extrapolation upper bound safeguard: yield never exceeds 1.15 * reference yield
    assert zero_run.estimated_yield_kg_ha <= zero_run.reference_yield_kg_ha * 1.15

# -------------------------------------------------------------
# 7. TRANSPARENT FINANCIAL ACCOUNTING
# -------------------------------------------------------------
def test_transparent_financial_accounting():
    # Without selling price -> gross revenue and net return MUST NOT be fabricated
    no_price_finances = calculate_farm_finances(
        harvest_quintals=50.0,
        farm_area_ha=2.0,
        farm_area_acres=4.94,
        crop_selling_price_per_quintal=None
    )
    assert no_price_finances.estimated_gross_revenue_inr is None
    assert no_price_finances.estimated_net_return_inr is None
    assert any("selling price not supplied" in note for note in no_price_finances.financial_notes)
    
    # With selling price -> gross revenue computed exactly
    with_price = calculate_farm_finances(
        harvest_quintals=50.0,
        farm_area_ha=2.0,
        farm_area_acres=4.94,
        crop_selling_price_per_quintal=2275.0,  # MSP for wheat
        total_n_applied_kg=240.0,
        water_applied_m3=1000.0,
        other_production_costs_total=15000.0
    )
    assert with_price.estimated_gross_revenue_inr == 50.0 * 2275.0
    assert with_price.estimated_net_return_inr is not None
    assert with_price.total_modeled_cultivation_costs_inr > 0
    assert with_price.is_partial_modeled_cost is False

# -------------------------------------------------------------
# 8. WHAT-IF SCENARIOS A THROUGH H GENERATOR
# -------------------------------------------------------------
def test_what_if_scenarios_a_through_h():
    payload = FarmInputPayload(
        crop_type="wheat",
        farm_area=3.0,
        farm_area_unit="acres",
        soil_type="Alluvial Loam",
        irrigation_method="drip",
        irrigation_depth_mm=320.0,
        nitrogen_kg_ha=120.0,
        phosphorus_kg_ha=60.0,
        potassium_kg_ha=40.0,
        sowing_date="2026-11-15",
        crop_selling_price_per_quintal=2275.0
    )
    
    suite = generate_what_if_scenarios(payload)
    
    # Verify baseline (Scenario A)
    assert suite.baseline.scenario_code == "A"
    assert suite.baseline.yield_delta_pct == 0.0
    assert suite.baseline.water_consumption_delta_pct == 0.0
    
    # Verify scenarios B through H exist
    scenario_codes = [s.scenario_code for s in suite.scenarios]
    assert scenario_codes == ["B", "C", "D", "E", "F", "G", "H"]
    
    # Scenario B (Reduced irrigation) must consume less water than baseline
    sc_b = next(s for s in suite.scenarios if s.scenario_code == "B")
    assert sc_b.water_savings_m3 > 0
    assert sc_b.water_consumption_delta_pct < 0
    
    # Scenario C (Increased irrigation) must consume more water than baseline
    sc_c = next(s for s in suite.scenarios if s.scenario_code == "C")
    assert sc_c.irrigation_water_consumption_m3 > suite.baseline.irrigation_water_consumption_m3
    
    # Scenario D (Reduced fertilizer) must have 25% lower N
    sc_d = next(s for s in suite.scenarios if s.scenario_code == "D")
    assert pytest.approx(sc_d.n_applied_kg_ha, 0.1) == 90.0
    
    # Comparison table must contain all 8 scenarios
    assert len(suite.comparison_table) == 8
    assert len(suite.agronomic_synthesis) >= 2

# -------------------------------------------------------------
# 9. CONSTRAINED GRID-SEARCH OPTIMIZER
# -------------------------------------------------------------
def test_constrained_grid_search_optimizer():
    payload = FarmInputPayload(
        crop_type="wheat",
        farm_area=2.0,
        farm_area_unit="hectares",
        soil_type="Alluvial Loam",
        irrigation_method="drip",
        irrigation_depth_mm=400.0,
        nitrogen_kg_ha=180.0,  # Excess nitrogen
        crop_selling_price_per_quintal=2275.0
    )
    
    # 1. Optimize for estimated yield
    res_yield = run_constrained_grid_search(
        baseline_payload=payload,
        objective="estimated_yield"
    )
    assert res_yield.success is True
    assert res_yield.optimal_metrics["yield_kg_ha"] >= res_yield.baseline_metrics["yield_kg_ha"]
    
    # 2. Optimize for lower water under quota
    max_water_quota = calculate_irrigation_volume_m3(300.0, 2.0)  # 6000 m3
    res_water = run_constrained_grid_search(
        baseline_payload=payload,
        objective="lower_water",
        max_water_m3=max_water_quota
    )
    assert res_water.success is True
    assert res_water.optimal_metrics["water_m3"] <= max_water_quota
    assert res_water.improvements["water_saved_pct"] >= 0.0

# -------------------------------------------------------------
# 10. API ENDPOINTS INTEGRATION TESTS
# -------------------------------------------------------------
def test_api_modular_run():
    body = {
        "crop_type": "rice",
        "farm_area": 2.5,
        "farm_area_unit": "acres",
        "soil_type": "Clay Loam",
        "temperature_c": 29.0,
        "rainfall_mm": 650.0,
        "sowing_date": "2026-06-20",
        "irrigation_method": "flood",
        "irrigation_depth_mm": 500.0,
        "nitrogen_kg_ha": 100.0,
        "phosphorus_kg_ha": 50.0,
        "potassium_kg_ha": 50.0,
        "crop_selling_price_per_quintal": 2200.0
    }
    resp = client.post("/api/v1/simulation/modular/run", json=body)
    assert resp.status_code == 200
    data = resp.json()
    assert data["crop_id"] == "rice"
    assert data["model_version"] == "AgriSim-YieldEngine-v2.0"
    assert data["estimated_yield_kg_ha"] > 0
    assert data["total_irrigation_volume_m3"] > 0

def test_api_modular_what_if():
    body = {
        "baseline_input": {
            "crop_type": "maize",
            "farm_area": 3.0,
            "farm_area_unit": "acres",
            "soil_type": "Alluvial Loam",
            "sowing_date": "2026-07-05",
            "irrigation_depth_mm": 350.0,
            "nitrogen_kg_ha": 120.0,
            "crop_selling_price_per_quintal": 2090.0
        }
    }
    resp = client.post("/api/v1/simulation/modular/what-if", json=body)
    assert resp.status_code == 200
    data = resp.json()
    assert data["baseline"]["scenario_code"] == "A"
    assert len(data["scenarios"]) == 7
    assert len(data["comparison_table"]) == 8

def test_api_grid_optimization():
    body = {
        "baseline_input": {
            "crop_type": "chickpea",
            "farm_area": 2.0,
            "farm_area_unit": "hectares",
            "soil_type": "Black Cotton Soil (Vertisol)",
            "sowing_date": "2026-10-25",
            "irrigation_depth_mm": 200.0,
            "nitrogen_kg_ha": 30.0,
            "crop_selling_price_per_quintal": 5440.0
        },
        "objective": "estimated_yield"
    }
    resp = client.post("/api/v1/optimize/grid", json=body)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "optimal_metrics" in data
    assert "recommended_parameters" in data

