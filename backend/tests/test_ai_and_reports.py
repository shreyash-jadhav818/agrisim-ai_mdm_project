"""
AgriSim AI - Automated Regression Test Suite for AI Advisor, Reports, and History
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

from app.schemas.simulation import (
    SimulationResult,
    SimulationCostBreakdown,
    DailySimulationStep
)
from app.schemas.ai import (
    AdvisorExplanationRequest,
    ChatRequest,
    ChatMessage
)
from app.simulation.ai_advisor import (
    safe_pct_change,
    check_ai_provider_status,
    generate_7_section_recommendation,
    explain_farm_decisions,
    conversational_farm_assistant
)
from app.simulation.report_generator import (
    generate_csv_report,
    generate_pdf_report,
    generate_scenario_comparison_csv
)

client = TestClient(app)

def create_mock_simulation_result() -> SimulationResult:
    """Helper to create a populated valid SimulationResult."""
    return SimulationResult(
        run_id="run_test_audit_001",
        scenario_name="Optimal Rabi Wheat",
        crop_id="wheat",
        crop_name="Wheat (Rabi)",
        season="Rabi",
        duration_days=130,
        yield_quintal_acre=16.5,
        yield_kg_ha=4077.0,
        potential_yield_quintal_acre=18.0,
        yield_gap_pct=8.3,
        total_water_consumed_mm=380.0,
        total_water_consumed_m3_acre=1538.0,
        total_irrigation_applied_mm=320.0,
        total_rainfall_mm=110.0,
        effective_rainfall_mm=85.0,
        deep_percolation_mm=25.0,
        total_n_applied_kg_acre=48.0,
        total_p_applied_kg_acre=24.0,
        total_k_applied_kg_acre=16.0,
        water_productivity_kg_m3=1.07,
        costs=SimulationCostBreakdown(
            seed_cost=2500.0,
            land_prep_cost=3000.0,
            fertilizer_cost=4500.0,
            irrigation_energy_cost=2200.0,
            crop_protection_cost=1800.0,
            labor_harvest_cost=5000.0,
            total_cost=19000.0
        ),
        gross_revenue_inr=56306.0,
        net_profit_inr=37306.0,
        profit_per_acre_inr=37306.0,
        return_on_investment_roi_pct=196.3,
        daily_steps=[
            DailySimulationStep(
                day=1, date="2026-11-15", stage_name="Initial", gdd_accumulated=12.0,
                et0_mm=2.5, kc=0.4, etc_mm=1.0, eta_mm=1.0, precipitation_mm=0.0,
                irrigation_mm=0.0, soil_depletion_mm=5.0, root_depth_m=0.3,
                water_stress_ks=1.0, heat_stress_factor=1.0, biomass_accumulated_kg_acre=10.0
            )
        ],
        limiting_factors=["Minor terminal heat stress during anthesis"],
        scientific_validation_notes=["FAO-56 Penman-Monteith potential evapotranspiration validated"]
    )

def test_safe_pct_change_logic():
    """Verifies that safe_pct_change handles division by zero and nulls safely."""
    assert safe_pct_change(120, 100) == 20.0
    assert safe_pct_change(80, 100) == -20.0
    assert safe_pct_change(100, 0.0) == 0.0
    assert safe_pct_change(None, 100) == 0.0
    assert safe_pct_change(100, None) == 0.0
    assert safe_pct_change(0, 0) == 0.0

def test_ai_provider_status_and_fallback():
    """Verifies provider detection and setup instructions."""
    status = check_ai_provider_status()
    assert status.provider_mode in ["local_ollama", "external_ai", "rule_based"]
    assert status.active_provider != ""
    assert "AgriSim AI" in status.setup_instructions

def test_7_section_explainable_recommendation_structure():
    """Verifies that the generated recommendation contains all 7 mandatory sections."""
    sim = create_mock_simulation_result()
    req = AdvisorExplanationRequest(
        baseline_simulation=sim,
        recommended_strategy={
            "strategy_name": "Regulated Deficit Drip",
            "predicted_yield_kg_ha": 3950.0,
            "irrigation_water_m3": 1200.0,
            "nitrogen_kg_ha": 110.0,
            "irrigation_depth_mm": 280.0,
            "sowing_date": "2026-11-10",
            "estimated_net_profit_inr": 41000.0
        }
    )
    rec = generate_7_section_recommendation(req)

    # 1. Recommendation
    assert len(rec.recommendation) > 20
    assert "Wheat" in rec.recommendation or "Regulated Deficit Drip" in rec.recommendation

    # 2. Reasoning
    assert len(rec.reasoning) > 30

    # 3. Expected Impact
    assert "yield_delta_kg_ha" in rec.expected_impact
    assert "water_savings_m3" in rec.expected_impact
    assert "profit_delta_inr" in rec.expected_impact
    assert rec.expected_impact["water_savings_m3"] >= 0

    # 4. Trade-offs
    assert len(rec.trade_offs) > 10

    # 5. Assumptions
    assert len(rec.assumptions) >= 3
    assert any("FAO-56" in a for a in rec.assumptions)

    # 6. Uncertainty & Limitations
    assert len(rec.uncertainty_and_limitations) >= 2
    assert any("moisture" in u.lower() for u in rec.uncertainty_and_limitations)

    # 7. Practical Next Steps
    assert len(rec.practical_next_steps) >= 3
    assert any("soil" in s.lower() for s in rec.practical_next_steps)

    # Disclaimer
    assert "estimate" in rec.disclaimer.lower()

def test_conversational_farm_assistant_grounded_responses():
    """Verifies that the conversational assistant answers standard questions grounded in context."""
    context = {
        "crop_name": "Wheat",
        "farm_area": 5.0,
        "farm_area_unit": "acres",
        "soil_type": "Alluvial Loam",
        "baseline_yield_kg_ha": 3800.0,
        "baseline_water_m3": 4200.0,
        "baseline_profit_inr": 36000.0,
        "primary_vulnerability_factor": "Terminal Heatwave Stress",
        "resilience_score": 82.5
    }

    # Query 1: Water savings
    res1 = conversational_farm_assistant(ChatRequest(
        message="How much water could this strategy save?",
        context=context
    ))
    assert "m³" in res1.reply
    assert len(res1.suggested_followups) == 3

    # Query 2: Pareto frontier explanation
    res2 = conversational_farm_assistant(ChatRequest(
        message="Explain the Pareto frontier in simple language",
        context=context
    ))
    assert "pareto" in res2.reply.lower() or "trade-off" in res2.reply.lower()

    # Query 3: Farm risks
    res3 = conversational_farm_assistant(ChatRequest(
        message="What are the biggest risks for this farm?",
        context=context
    ))
    assert "risk" in res3.reply.lower() or "heat" in res3.reply.lower() or "82.5" in res3.reply

    # Query 4: Out of scope
    res4 = conversational_farm_assistant(ChatRequest(
        message="What is the price of crypto bitcoin?",
        context=context
    ))
    assert "outside" in res4.reply.lower() or "scope" in res4.reply.lower()

def test_pdf_report_generation_valid_bytes():
    """Verifies that generate_pdf_report produces valid non-empty PDF bytes."""
    sim = create_mock_simulation_result()
    pdf_bytes = generate_pdf_report(sim)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")

def test_csv_report_generation():
    """Verifies that generate_csv_report produces standard CSV headers and rows."""
    sim = create_mock_simulation_result()
    csv_str = generate_csv_report(sim)
    assert "AGRISIM AI" in csv_str
    assert "Run ID" in csv_str
    assert "run_test_audit_001" in csv_str
    assert "Wheat (Rabi)" in csv_str

def test_scenario_comparison_csv_export():
    """Verifies What-If scenario comparison CSV export."""
    scenarios = [
        {"name": "Deficit Drip", "yield_kg_ha": 3850.0, "yield_delta_pct": -2.5, "water_m3": 2800.0, "water_delta_pct": -20.0, "net_return_inr": 38000.0, "net_return_delta_pct": 5.0},
        {"name": "High Nutrient", "yield_kg_ha": 4200.0, "yield_delta_pct": 6.3, "water_m3": 3600.0, "water_delta_pct": 2.8, "net_return_inr": 39500.0, "net_return_delta_pct": 9.1}
    ]
    baseline = {"name": "Baseline Plan", "yield_kg_ha": 3950.0, "yield_q_acre": 16.0, "water_m3": 3500.0, "n_kg_ha": 120.0, "total_cost_inr": 18000.0, "net_return_inr": 36200.0}
    csv_str = generate_scenario_comparison_csv(scenarios, baseline)
    assert "WHAT-IF SCENARIO COMPARISON" in csv_str
    assert "Deficit Drip" in csv_str
    assert "High Nutrient" in csv_str

def test_api_ai_provider_status_endpoint():
    """Verifies GET /api/v1/ai/provider-status"""
    res = client.get("/api/v1/ai/provider-status")
    assert res.status_code == 200
    data = res.json()
    assert "provider_mode" in data
    assert "active_provider" in data
    assert "setup_instructions" in data

def test_api_ai_advisor_explain_endpoint():
    """Verifies POST /api/v1/ai/advisor-explain"""
    sim = create_mock_simulation_result()
    res = client.post("/api/v1/ai/advisor-explain", json={
        "baseline_simulation": sim.model_dump(),
        "recommended_strategy": {
            "strategy_name": "Balanced Strategy #1",
            "predicted_yield_kg_ha": 4050.0,
            "irrigation_water_m3": 3100.0,
            "nitrogen_kg_ha": 115.0,
            "irrigation_depth_mm": 310.0,
            "sowing_date": "2026-11-15",
            "estimated_net_profit_inr": 42000.0
        }
    })
    assert res.status_code == 200
    data = res.json()
    assert "recommendation_card" in data
    assert "expected_impact" in data["recommendation_card"]
    assert "practical_next_steps" in data["recommendation_card"]
    assert len(data["recommendation_card"]["practical_next_steps"]) >= 3

def test_api_ai_chat_endpoint():
    """Verifies POST /api/v1/ai/chat"""
    res = client.post("/api/v1/ai/chat", json={
        "message": "Why is this strategy better than my baseline?",
        "history": [],
        "context": {
            "crop_name": "Wheat",
            "baseline_yield_kg_ha": 3800.0,
            "baseline_water_m3": 4000.0
        }
    })
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert len(data["reply"]) > 20
    assert "suggested_followups" in data

def test_api_pdf_report_download():
    """Verifies POST /api/v1/reports/pdf returns application/pdf."""
    sim = create_mock_simulation_result()
    res = client.post("/api/v1/reports/pdf", json=sim.model_dump())
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF")

def test_api_csv_report_download():
    """Verifies POST /api/v1/reports/csv returns text/csv."""
    sim = create_mock_simulation_result()
    res = client.post("/api/v1/reports/csv", json=sim.model_dump())
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert b"AGRISIM AI" in res.content

def test_api_scenario_comparison_csv_download():
    """Verifies POST /api/v1/reports/scenarios-csv returns text/csv."""
    payload = {
        "scenarios": [
            {"name": "Scenario A", "yield_kg_ha": 3500.0, "yield_delta_pct": 5.0, "water_m3": 3000.0, "water_delta_pct": -10.0}
        ],
        "baseline": {"name": "Baseline", "yield_kg_ha": 3330.0, "water_m3": 3330.0}
    }
    res = client.post("/api/v1/reports/scenarios-csv", json=payload)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert b"Scenario A" in res.content
