from fastapi import APIRouter, HTTPException
from dataclasses import asdict
from app.schemas.risk import MonteCarloRiskInput, MonteCarloRiskResult, RiskSensitivityInput
from app.simulation.risk_engine import run_monte_carlo_risk_analysis
from app.simulation.risk_sensitivity_engine import run_risk_sensitivity_analysis
from app.simulation.simulation_orchestrator import FarmInputPayload

router = APIRouter(prefix="/risk", tags=["Risk Analysis"])

@router.post("/monte-carlo", response_model=MonteCarloRiskResult)
def execute_risk_analysis(risk_input: MonteCarloRiskInput):
    """
    Executes Monte Carlo risk simulation across hundreds of stochastic climate and market price samples.
    """
    try:
        return run_monte_carlo_risk_analysis(risk_input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk analysis failed: {str(e)}")

@router.post("/sensitivity")
def execute_risk_sensitivity(input_data: RiskSensitivityInput):
    """
    Executes deterministic scenario-based sensitivity analysis across critical agronomic and market variables:
      - Rainfall variability (+/- 50%)
      - Temperature anomalies (-2°C to +4°C)
      - Fertilizer cost inflation (0% to +50%)
      - Crop selling price fluctuations (+/- 30%)
      - Sowing date shifts (+/- 14 days)
    Returns tornado rankings, compound bounding scenarios (Worst-Case, Baseline, Best-Case),
    and targeted farmer mitigations.
    """
    try:
        payload = FarmInputPayload(**input_data.baseline_input.model_dump())
        result = run_risk_sensitivity_analysis(
            baseline_payload=payload,
            rainfall_variation_pct=input_data.rainfall_variation_pct,
            temperature_anomaly_c=input_data.temperature_anomaly_c,
            fertilizer_inflation_pct=input_data.fertilizer_inflation_pct,
            price_volatility_pct=input_data.price_volatility_pct,
            sowing_shift_days=input_data.sowing_shift_days
        )
        return asdict(result)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk sensitivity analysis failed: {str(e)}")

