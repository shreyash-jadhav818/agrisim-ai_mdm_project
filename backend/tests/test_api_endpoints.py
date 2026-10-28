import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.simulation import SimulationInput, FarmProfileInput, IrrigationEvent, FertilizerApplication

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "AgriSim AI"

def test_get_crops():
    response = client.get("/api/v1/crops")
    assert response.status_code == 200
    crops = response.json()
    assert len(crops) >= 12
    crop_ids = [c["id"] for c in crops]
    assert "wheat" in crop_ids
    assert "rice" in crop_ids
    assert "cotton" in crop_ids

def test_get_soils_and_zones():
    soils_resp = client.get("/api/v1/crops/data/soils")
    assert soils_resp.status_code == 200
    assert len(soils_resp.json()) >= 4
    
    zones_resp = client.get("/api/v1/crops/data/zones")
    assert zones_resp.status_code == 200
    assert len(zones_resp.json()) >= 4

def test_run_simulation_api():
    payload = {
        "farm_profile": {
            "name": "Ludhiana Test Farm",
            "state": "Punjab",
            "zone": "Trans-Gangetic Plain",
            "total_acres": 4.0,
            "soil_type": "Alluvial Loam",
            "irrigation_system": "drip"
        },
        "crop_id": "wheat",
        "sowing_date": "2026-11-10",
        "mulching_used": False,
        "irrigation_schedule": [
            {"day": 21, "amount_mm": 50.0, "method": "drip"},
            {"day": 45, "amount_mm": 50.0, "method": "drip"},
            {"day": 75, "amount_mm": 55.0, "method": "drip"},
            {"day": 95, "amount_mm": 45.0, "method": "drip"}
        ],
        "fertilizer_plan": [
            {"day": 1, "n_kg_acre": 20.0, "p_kg_acre": 25.0, "k_kg_acre": 16.0, "fertilizer_name": "Basal"},
            {"day": 25, "n_kg_acre": 15.0, "p_kg_acre": 0.0, "k_kg_acre": 0.0, "fertilizer_name": "Top 1"},
            {"day": 55, "n_kg_acre": 15.0, "p_kg_acre": 0.0, "k_kg_acre": 0.0, "fertilizer_name": "Top 2"}
        ]
    }
    response = client.post("/api/v1/simulation/run", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["run_id"].startswith("sim_")
    assert res["yield_quintal_acre"] > 10.0
    assert res["net_profit_inr"] > 0.0
    assert len(res["daily_steps"]) == 135
    assert len(res["scientific_validation_notes"]) >= 3

def test_scenario_comparison_api():
    base_payload = {
        "farm_profile": {
            "name": "Comparison Farm",
            "state": "Punjab",
            "zone": "Trans-Gangetic Plain",
            "total_acres": 5.0,
            "soil_type": "Alluvial Loam",
            "irrigation_system": "flood"
        },
        "crop_id": "wheat",
        "sowing_date": "2026-11-10",
        "mulching_used": False
    }
    payload = {
        "base_simulation": base_payload,
        "scenarios": [
            {"name": "With Plastic Mulch", "mulching_used": True},
            {"name": "Drip Irrigation", "irrigation_system": "drip"}
        ]
    }
    response = client.post("/api/v1/simulation/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "baseline" in data
    assert len(data["scenarios"]) == 2
    assert len(data["key_insights"]) >= 1

def test_stress_test_api():
    payload = {
        "base_simulation": {
            "farm_profile": {
                "name": "Stress Test Farm",
                "state": "Punjab",
                "zone": "Trans-Gangetic Plain",
                "total_acres": 2.0,
                "soil_type": "Alluvial Loam",
                "irrigation_system": "drip"
            },
            "crop_id": "wheat",
            "sowing_date": "2026-11-15"
        },
        "scenario_ids": ["heatwave_anthesis", "monsoon_break_drought"]
    }
    response = client.post("/api/v1/stress-test", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert "resilience_score" in res
    assert len(res["outcomes"]) == 2
    for out in res["outcomes"]:
        assert out["yield_loss_pct"] >= 0.0

def test_risk_analysis_api():
    payload = {
        "base_simulation": {
            "farm_profile": {
                "name": "Risk Farm",
                "state": "Punjab",
                "zone": "Trans-Gangetic Plain",
                "total_acres": 3.0,
                "soil_type": "Alluvial Loam",
                "irrigation_system": "drip"
            },
            "crop_id": "wheat",
            "sowing_date": "2026-11-15"
        },
        "iterations": 100,
        "rainfall_volatility_pct": 20.0,
        "temperature_anomaly_c": 1.5,
        "price_volatility_pct": 15.0
    }
    response = client.post("/api/v1/risk/monte-carlo", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["iterations"] == 100
    assert "value_at_risk_95_inr" in res
    assert len(res["yield_distribution"]) > 0

def test_optimization_api():
    payload = {
        "base_simulation": {
            "farm_profile": {
                "name": "Opt Farm",
                "state": "Punjab",
                "zone": "Trans-Gangetic Plain",
                "total_acres": 3.0,
                "soil_type": "Alluvial Loam",
                "irrigation_system": "drip"
            },
            "crop_id": "wheat",
            "sowing_date": "2026-11-15"
        },
        "objective": "maximize_profit",
        "max_water_allowable_mm": 240.0
    }
    response = client.post("/api/v1/optimize", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert len(res["optimal_schedule"]) == 4
    assert len(res["recommendations"]) >= 2

def test_reports_csv_and_pdf():
    # Run a quick sim to get result payload
    sim_input = {
        "farm_profile": {
            "name": "Report Farm",
            "state": "Punjab",
            "zone": "Trans-Gangetic Plain",
            "total_acres": 2.0,
            "soil_type": "Alluvial Loam",
            "irrigation_system": "drip"
        },
        "crop_id": "wheat",
        "sowing_date": "2026-11-15"
    }
    sim_resp = client.post("/api/v1/simulation/run", json=sim_input)
    sim_data = sim_resp.json()
    
    # Test CSV
    csv_resp = client.post("/api/v1/reports/csv", json=sim_data)
    assert csv_resp.status_code == 200
    assert "AGRISIM AI" in csv_resp.text
    
    # Test PDF
    pdf_resp = client.post("/api/v1/reports/pdf", json=sim_data)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert len(pdf_resp.content) > 1000

def test_history_api():
    history_resp = client.get("/api/v1/history")
    assert history_resp.status_code == 200
    items = history_resp.json()
    assert len(items) >= 1
    first_id = items[0]["id"]
    
    detail_resp = client.get(f"/api/v1/history/{first_id}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == first_id
