"""
AgriSim AI - End-to-End & Edge Case Verification Suite
Tests the complete application integration and robustness against edge cases:
- Missing inputs & invalid types
- Invalid dates
- Unsupported crops
- Zero or negative values where prohibited
- Extremely large farm areas
- Infeasible optimization constraints
- Missing optional financial inputs
- Zero baseline values in percentage calculations
- Empty scenario collections
- AI provider offline fallback
- Corrupted/incomplete stored records
- Full save, retrieve, compare, export, and delete lifecycle
- Verification across all 14 supported Indian crops
"""

import json
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.simulation.ai_advisor import safe_pct_change
from app.simulation.grid_optimizer import run_constrained_grid_search
from app.simulation.pareto_optimizer import run_multi_objective_pareto_optimization
from app.simulation.simulation_orchestrator import FarmInputPayload, run_orchestrated_simulation
from app.database.session import get_db

client = TestClient(app)

# 1. Health Checks (Both primary and alias endpoints)
def test_health_check_endpoints():
    r1 = client.get("/api/health")
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["status"] == "healthy"
    assert d1["app"] == "AgriSim AI"
    assert d1["database"] == "sqlite_connected"

    r2 = client.get("/health")
    assert r2.status_code == 200
    assert r2.json()["status"] == "healthy"

    r3 = client.get("/")
    assert r3.status_code == 200
    assert "AgriSim AI" in r3.json()["message"]

# 2. Missing inputs
def test_missing_required_inputs():
    # Empty body
    res = client.post("/api/v1/simulation/modular/run", json={})
    # ModularFarmInput has default fields, so an empty object uses defaults or validates cleanly
    assert res.status_code in [200, 422]

    # Non-dictionary / string payload
    res_str = client.post("/api/v1/simulation/modular/run", json="invalid string")
    assert res_str.status_code == 422

# 3. Invalid dates
def test_invalid_dates_rejected():
    bad_dates = ["invalid-date", "2026-02-31", "2026/11/15", "15-11-2026", ""]
    for bd in bad_dates:
        payload = {
            "crop_type": "wheat",
            "farm_area": 3.0,
            "sowing_date": bd
        }
        res = client.post("/api/v1/simulation/modular/run", json=payload)
        assert res.status_code in [400, 422], f"Expected 400/422 for invalid date '{bd}', got {res.status_code}"

# 4. Unsupported crops
def test_unsupported_crop_rejected():
    payload = {
        "crop_type": "martian_dragonfruit_x",
        "farm_area": 3.0,
        "sowing_date": "2026-11-15"
    }
    res = client.post("/api/v1/simulation/modular/run", json=payload)
    assert res.status_code == 400
    assert "Unsupported crop" in res.json()["detail"]

# 5. Zero or negative values where prohibited
def test_zero_or_negative_values_prohibited():
    # Negative farm area
    res = client.post("/api/v1/simulation/modular/run", json={"farm_area": -2.0})
    assert res.status_code == 422

    # Zero farm area
    res = client.post("/api/v1/simulation/modular/run", json={"farm_area": 0.0})
    assert res.status_code == 422

    # Negative nitrogen
    res = client.post("/api/v1/simulation/modular/run", json={"nitrogen_kg_ha": -25.0})
    assert res.status_code == 422

    # Negative rainfall
    res = client.post("/api/v1/simulation/modular/run", json={"rainfall_mm": -10.0})
    assert res.status_code == 422

    # Negative irrigation depth
    res = client.post("/api/v1/simulation/modular/run", json={"irrigation_depth_mm": -50.0})
    assert res.status_code == 422

# 6. Extremely large farm areas
def test_extremely_large_farm_area_bounded():
    res = client.post("/api/v1/simulation/modular/run", json={"farm_area": 99999999.0})
    assert res.status_code == 422

# 7. Infeasible optimization constraints handled gracefully
def test_infeasible_optimization_constraints():
    base_input = {
        "crop_type": "wheat",
        "farm_area": 4.0,
        "farm_area_unit": "acres",
        "sowing_date": "2026-11-15",
        "irrigation_depth_mm": 300.0,
        "nitrogen_kg_ha": 120.0
    }

    # Grid optimizer with impossible water limit (1 m3) and budget (₹10)
    grid_payload = {
        "baseline_input": base_input,
        "objective": "estimated_yield",
        "max_water_m3": 1.0,
        "max_budget_inr": 10.0,
        "min_yield_kg_ha": 999999.0
    }
    res = client.post("/api/v1/optimize/grid", json=grid_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert "No candidate met all strict constraints" in data["status_message"]

    # Pareto optimizer with impossible constraints
    pareto_payload = {
        "baseline_input": base_input,
        "max_water_m3": 1.0,
        "max_budget_inr": 10.0,
        "min_yield_kg_ha": 999999.0
    }
    res_pareto = client.post("/api/v1/optimize/pareto", json=pareto_payload)
    assert res_pareto.status_code == 200
    p_data = res_pareto.json()
    assert len(p_data["pareto_frontier"]) >= 1

# 8. Missing optional financial inputs
def test_missing_optional_financial_inputs():
    # Minimal inputs without price or production costs
    payload = {
        "crop_type": "wheat",
        "farm_area": 2.0,
        "sowing_date": "2026-11-15",
        "crop_selling_price_per_quintal": None,
        "fertilizer_cost_total": None,
        "irrigation_cost_total": None,
        "other_production_costs": None
    }
    res = client.post("/api/v1/simulation/modular/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["crop_selling_price_per_quintal"] is None
    assert data["estimated_gross_revenue_inr"] is None
    assert data["is_partial_modeled_cost"] is True
    assert len(data["financial_notes"]) >= 1

# 9. Zero baseline values in percentage calculations
def test_zero_baseline_percentage_calculations():
    # Value changes with zero baseline must not throw ZeroDivisionError or +inf
    assert safe_pct_change(100.0, 0.0) == 0.0
    assert safe_pct_change(0.0, 0.0) == 0.0
    assert safe_pct_change(None, 50.0) == 0.0
    assert safe_pct_change(50.0, None) == 0.0
    assert safe_pct_change(120.0, 100.0) == 20.0

# 10. Empty scenario collections
def test_empty_scenario_csv_export():
    payload = {
        "scenarios": [],
        "baseline": {
            "name": "Baseline Plan",
            "yield_kg_ha": 3200.0,
            "yield_q_acre": 13.0,
            "water_m3": 2500.0,
            "n_kg_ha": 120.0,
            "total_cost_inr": 25000.0,
            "net_return_inr": 35000.0
        }
    }
    res = client.post("/api/v1/reports/scenarios-csv", json=payload)
    assert res.status_code == 200
    assert "Baseline Plan" in res.text
    assert "Yield (kg/ha)" in res.text

# 11. AI provider status and offline fallback
def test_ai_provider_status_and_resilient_fallback():
    status_res = client.get("/api/v1/ai/provider-status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["provider_mode"] in ["rule_based", "local_ollama", "external"]

    explain_req = {
        "crop_id": "wheat",
        "crop_name": "Wheat (Rabi)",
        "farm_area_acres": 5.0,
        "selected_objective": "balanced"
    }
    explain_res = client.post("/api/v1/ai/advisor-explain", json=explain_req)
    assert explain_res.status_code == 200
    exp_data = explain_res.json()
    assert "recommendation_card" in exp_data
    rec = exp_data["recommendation_card"]
    assert len(rec["recommendation"]) > 0
    assert len(rec["reasoning"]) > 0
    assert len(rec["practical_next_steps"]) >= 3

# 12. Corrupted stored record resilience
def test_corrupted_stored_record_graceful_handling():
    corrupted_id = "test_corrupted_run_999"
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("""
        INSERT OR REPLACE INTO simulation_runs (
            id, farm_profile_id, name, crop_id, season, sowing_date,
            yield_quintal_acre, water_consumed_m3, total_cost_inr, revenue_inr, profit_inr,
            water_productivity_kg_m3, input_data, output_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            corrupted_id, "farm_test", "Corrupted Run", "wheat", "Rabi", "2026-11-15",
            12.0, 2000.0, 25000.0, 50000.0, 25000.0, 1.2,
            "CORRUPTED_NOT_VALID_JSON{", "CORRUPTED_NOT_VALID_JSON{"
        ))

    # Retrieve detail should not crash with 500
    res = client.get(f"/api/v1/history/{corrupted_id}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["id"] == corrupted_id
    assert detail["input"] == {}
    assert detail["output"] == {}

    # Clean up
    client.delete(f"/api/v1/history/{corrupted_id}")

# 13. Full save, retrieve, compare, export, and delete lifecycle
def test_simulation_full_lifecycle():
    # 1. Run simulation to create database record
    sim_payload = {
        "farm_profile": {
            "name": "Lifecycle Test Holding",
            "state": "Punjab",
            "zone": "Trans-Gangetic Plain",
            "total_acres": 3.0,
            "soil_type": "Alluvial Loam",
            "irrigation_system": "drip"
        },
        "crop_id": "wheat",
        "sowing_date": "2026-11-15",
        "irrigation_schedule": [
            {"day": 21, "amount_mm": 50.0, "method": "drip"},
            {"day": 45, "amount_mm": 50.0, "method": "drip"}
        ],
        "fertilizer_plan": [
            {"day": 1, "n_kg_acre": 20.0, "p_kg_acre": 20.0, "k_kg_acre": 15.0, "fertilizer_name": "Basal"}
        ]
    }
    run_res = client.post("/api/v1/simulation/run", json=sim_payload)
    assert run_res.status_code == 200
    sim_out = run_res.json()
    run_id = sim_out["run_id"]

    # 2. Verify presence in history list
    hist_res = client.get("/api/v1/history")
    assert hist_res.status_code == 200
    records = hist_res.json()
    ids = [r["id"] for r in records]
    assert run_id in ids

    # 3. Retrieve specific detail
    det_res = client.get(f"/api/v1/history/{run_id}")
    assert det_res.status_code == 200
    assert det_res.json()["output"]["run_id"] == run_id

    # 4. Download saved PDF
    pdf_res = client.get(f"/api/v1/reports/pdf/{run_id}")
    assert pdf_res.status_code == 200
    assert pdf_res.content[:4] == b"%PDF"

    # 5. Download saved CSV
    csv_res = client.get(f"/api/v1/reports/csv/{run_id}")
    assert csv_res.status_code == 200
    assert "AGRISIM AI" in csv_res.text

    # 6. Delete simulation
    del_res = client.delete(f"/api/v1/history/{run_id}")
    assert del_res.status_code == 200

    # 7. Verify 404 after deletion
    det_after = client.get(f"/api/v1/history/{run_id}")
    assert det_after.status_code == 404

# 14. Support for all 14 major Indian crops across both engines
def test_all_14_crops_simulated_successfully():
    all_14_crops = [
        "wheat", "rice", "cotton", "sugarcane", "maize", "chickpea",
        "mustard", "soybean", "groundnut", "tomato", "potato", "onion",
        "pearl_millet", "sorghum"
    ]

    for crop in all_14_crops:
        payload = {
            "crop_type": crop,
            "farm_area": 3.0,
            "sowing_date": "2026-11-15",
            "irrigation_depth_mm": 280.0,
            "nitrogen_kg_ha": 100.0,
            "phosphorus_kg_ha": 50.0,
            "potassium_kg_ha": 40.0
        }
        res = client.post("/api/v1/simulation/modular/run", json=payload)
        assert res.status_code == 200, f"Modular simulation failed for crop '{crop}': {res.text}"
        data = res.json()
        assert data["estimated_yield_kg_ha"] > 0.0
        assert data["crop_id"] in [crop, "pearl_millet", "sorghum"]
