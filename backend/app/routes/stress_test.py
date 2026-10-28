from fastapi import APIRouter, HTTPException
from dataclasses import asdict
from app.schemas.stress_test import StressTestInput, StressTestResult, WeatherStressBatteryInput
from app.simulation.stress_tester import run_stress_testing_battery
from app.simulation.weather_stress_engine import run_weather_stress_testing_battery
from app.simulation.simulation_orchestrator import FarmInputPayload

router = APIRouter(prefix="/stress-test", tags=["Stress Testing"])

@router.post("", response_model=StressTestResult)
def execute_stress_tests(stress_input: StressTestInput):
    """
    Evaluates farm resilience against extreme weather events (heatwaves, drought breaks, deluges).
    """
    try:
        return run_stress_testing_battery(stress_input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stress testing failed: {str(e)}")

@router.post("/battery")
def execute_weather_stress_battery(input_data: WeatherStressBatteryInput):
    """
    Executes a comprehensive battery of 6 hypothetical weather shocks against baseline management:
      1. Normal Climatological Baseline
      2. Lower Rainfall (-35%)
      3. Severe Drought Stress (-70%)
      4. Extreme Heatwave (+3.5°C)
      5. Excess Deluge & Waterlogging (+80%)
      6. Combined Heat & Drought Stress
    """
    try:
        payload = FarmInputPayload(**input_data.baseline_input.model_dump())
        result = run_weather_stress_testing_battery(payload)
        return asdict(result)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Weather stress battery failed: {str(e)}")

