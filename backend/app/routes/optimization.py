from fastapi import APIRouter, HTTPException
from dataclasses import asdict
from app.schemas.optimization import OptimizationInput, OptimizationResult, ParetoOptimizationInput
from app.schemas.simulation import GridOptimizationInput
from app.simulation.optimizer import optimize_farming_strategy
from app.simulation.grid_optimizer import run_constrained_grid_search
from app.simulation.pareto_optimizer import run_multi_objective_pareto_optimization
from app.simulation.simulation_orchestrator import FarmInputPayload

router = APIRouter(prefix="/optimize", tags=["Optimization"])

@router.post("", response_model=OptimizationResult)
def run_optimization(opt_input: OptimizationInput):
    """
    Executes constrained optimization using SciPy to find optimal irrigation timing
    and nutrient application dosages under water, budget, or yield constraints.
    """
    try:
        return optimize_farming_strategy(opt_input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

@router.post("/grid")
def run_grid_optimization(grid_input: GridOptimizationInput):
    """
    Executes a constrained grid-search optimizer across candidate parameter ranges
    for:
      - 'estimated_yield' (maximizes harvest kg/ha)
      - 'estimated_net_return' (maximizes profit margin in INR)
      - 'lower_water' (minimizes irrigation water m3 subject to target yield)
    """
    try:
        payload = FarmInputPayload(**grid_input.baseline_input.model_dump())
        result = run_constrained_grid_search(
            baseline_payload=payload,
            objective=grid_input.objective,
            max_water_m3=grid_input.max_water_m3,
            max_budget_inr=grid_input.max_budget_inr,
            min_yield_kg_ha=grid_input.min_yield_kg_ha,
            irrigation_multipliers=grid_input.irrigation_multipliers,
            nitrogen_levels_kg_ha=grid_input.nitrogen_levels_kg_ha,
            sowing_shifts_days=grid_input.sowing_shifts_days
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grid optimization failed: {str(e)}")

@router.post("/pareto")
def run_pareto_optimization(pareto_input: ParetoOptimizationInput):
    """
    Executes multi-objective combinatorial evaluation and computes the non-dominated Pareto frontier
    across competing objectives: Yield (max), Water Consumption (min), Fertilizer Application (min),
    and Net Profit (max). Also identifies the balanced compromise strategy.
    """
    try:
        payload = FarmInputPayload(**pareto_input.baseline_input.model_dump())
        result = run_multi_objective_pareto_optimization(
            baseline_payload=payload,
            max_water_m3=pareto_input.max_water_m3,
            max_budget_inr=pareto_input.max_budget_inr,
            min_yield_kg_ha=pareto_input.min_yield_kg_ha,
            custom_irrigation_multipliers=pareto_input.custom_irrigation_multipliers,
            custom_nitrogen_rates=pareto_input.custom_nitrogen_rates
        )
        return asdict(result)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pareto optimization failed: {str(e)}")


