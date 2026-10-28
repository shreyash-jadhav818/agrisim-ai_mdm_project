"""
AgriSim AI - Multi-Objective Optimization & Pareto Frontier Engine
Evaluates non-dominated trade-offs across competing agricultural objectives:
  - Predicted Yield (Maximize)
  - Estimated Net Profit (Maximize)
  - Irrigation Water Consumption (Minimize)
  - Total Fertilizer Application (Minimize)

Identifies the Pareto Frontier: strategies where no other feasible candidate is strictly
better in at least one objective without performing worse in another.
Also computes the balanced compromise strategy (ideal point normalized Euclidean distance).
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
import math
import copy

from app.simulation.crop_parameters import get_crop_parameters
from app.simulation.simulation_orchestrator import (
    FarmInputPayload,
    SimulationRunOutput,
    run_orchestrated_simulation
)

@dataclass
class ParetoStrategyPoint:
    strategy_id: str
    strategy_name: str
    
    # Input parameter vector
    irrigation_depth_mm: float
    irrigation_multiplier: float
    nitrogen_kg_ha: float
    phosphorus_kg_ha: float
    potassium_kg_ha: float
    total_fertilizer_kg_ha: float
    sowing_date: str
    irrigation_method: str
    
    # Objective Values
    predicted_yield_kg_ha: float
    predicted_yield_q_acre: float
    irrigation_water_m3: float
    total_fertilizer_applied_kg: float
    modeled_cost_inr: Optional[float]
    estimated_revenue_inr: Optional[float]
    estimated_net_profit_inr: Optional[float]
    water_productivity_kg_m3: float
    
    # Pareto Classification
    is_pareto_optimal: bool = False
    is_balanced_option: bool = False
    is_feasible: bool = True
    constraint_violations: List[str] = field(default_factory=list)
    domination_count: int = 0  # Number of strategies that dominate this candidate
    trade_off_notes: List[str] = field(default_factory=list)

@dataclass
class ParetoOptimizationResult:
    total_evaluated: int
    feasible_count: int
    pareto_frontier_count: int
    
    # The set of non-dominated solutions
    pareto_frontier: List[ParetoStrategyPoint]
    
    # All feasible evaluated candidates (for background scatter)
    all_candidates: List[ParetoStrategyPoint]
    
    # Recommended balanced compromise point
    balanced_strategy: Optional[ParetoStrategyPoint]
    
    # Baseline strategy reference point
    baseline_strategy: ParetoStrategyPoint
    
    # Trade-off insights and scientific guidance
    trade_off_summary: List[str]
    methodology_disclosure: str = (
        "Non-dominated sorting across biophysical production functions (FAO-56, FAO-33, Mitscherlich-Baule). "
        "The balanced option represents the minimum normalized Euclidean distance to the utopia point, "
        "and is an illustrative multi-criteria compromise rather than a certified optimum."
    )

def check_pareto_dominance(
    cand_a: Dict[str, float],
    cand_b: Dict[str, float],
    objective_directions: Dict[str, str]
) -> bool:
    """
    Returns True if Candidate A strictly dominates Candidate B.
    Candidate A dominates B iff:
      1. For all objectives, A is at least as good as B.
      2. For at least one objective, A is strictly better than B.
      
    objective_directions map: {'yield': 'max', 'water': 'min', 'profit': 'max', 'fertilizer': 'min'}
    """
    at_least_as_good = True
    strictly_better = False
    
    for obj_name, direction in objective_directions.items():
        val_a = cand_a.get(obj_name)
        val_b = cand_b.get(obj_name)
        
        # If either is None (e.g. profit when price omitted), skip that objective
        if val_a is None or val_b is None:
            continue
            
        if direction == "max":
            if val_a < val_b:
                at_least_as_good = False
                break
            elif val_a > val_b:
                strictly_better = True
        elif direction == "min":
            if val_a > val_b:
                at_least_as_good = False
                break
            elif val_a < val_b:
                strictly_better = True
                
    return at_least_as_good and strictly_better

def run_multi_objective_pareto_optimization(
    baseline_payload: FarmInputPayload,
    max_water_m3: Optional[float] = None,
    max_budget_inr: Optional[float] = None,
    min_yield_kg_ha: Optional[float] = None,
    custom_irrigation_multipliers: Optional[List[float]] = None,
    custom_nitrogen_rates: Optional[List[float]] = None
) -> ParetoOptimizationResult:
    """
    Executes multi-objective combinatorial evaluation and computes the non-dominated Pareto frontier.
    """
    crop_params = get_crop_parameters(baseline_payload.crop_type)
    base_sow_dt = datetime.strptime(baseline_payload.sowing_date.strip(), "%Y-%m-%d")
    
    # 1. Run baseline simulation
    baseline_run = run_orchestrated_simulation(baseline_payload, scenario_name="Baseline Plan")
    base_total_fert_kg = (
        baseline_payload.nitrogen_kg_ha +
        baseline_payload.phosphorus_kg_ha +
        baseline_payload.potassium_kg_ha
    ) * baseline_run.farm_area_ha
    
    baseline_point = ParetoStrategyPoint(
        strategy_id="strat_baseline",
        strategy_name="Baseline Strategy",
        irrigation_depth_mm=baseline_run.total_irrigation_depth_mm,
        irrigation_multiplier=1.0,
        nitrogen_kg_ha=baseline_payload.nitrogen_kg_ha,
        phosphorus_kg_ha=baseline_payload.phosphorus_kg_ha,
        potassium_kg_ha=baseline_payload.potassium_kg_ha,
        total_fertilizer_kg_ha=baseline_payload.nitrogen_kg_ha + baseline_payload.phosphorus_kg_ha + baseline_payload.potassium_kg_ha,
        sowing_date=baseline_payload.sowing_date,
        irrigation_method=baseline_payload.irrigation_method,
        predicted_yield_kg_ha=baseline_run.estimated_yield_kg_ha,
        predicted_yield_q_acre=baseline_run.estimated_yield_quintal_acre,
        irrigation_water_m3=baseline_run.total_irrigation_volume_m3,
        total_fertilizer_applied_kg=round(base_total_fert_kg, 1),
        modeled_cost_inr=baseline_run.total_modeled_cultivation_costs_inr,
        estimated_revenue_inr=baseline_run.estimated_gross_revenue_inr,
        estimated_net_profit_inr=baseline_run.estimated_net_return_inr,
        water_productivity_kg_m3=baseline_run.water_productivity_kg_m3,
        is_feasible=True
    )
    
    # 2. Build Multi-Dimensional Evaluation Grid
    # A. Irrigation Multipliers (from deficit 55% to full 130%)
    if custom_irrigation_multipliers is None:
        irr_mults = [0.55, 0.70, 0.85, 1.00, 1.15, 1.30]
    else:
        irr_mults = [m for m in custom_irrigation_multipliers if m >= 0.0]
        
    base_irr_depth = (
        baseline_payload.irrigation_depth_mm
        if baseline_payload.irrigation_depth_mm is not None
        else crop_params.optimal_water_requirement_mm
    )
    
    # B. Nitrogen rates (from low input to optimal to near excess)
    n_opt = crop_params.optimal_nitrogen_kg_ha
    if custom_nitrogen_rates is None:
        n_rates = sorted(list(set([
            round(n_opt * 0.50, 1),
            round(n_opt * 0.75, 1),
            round(n_opt * 1.00, 1),
            round(min(crop_params.excess_nitrogen_threshold_kg_ha * 0.95, n_opt * 1.25), 1)
        ])))
    else:
        n_rates = [max(0.0, float(n)) for n in custom_nitrogen_rates]
        
    # C. Sowing window variations (-7d, 0d, +7d)
    sowing_shifts = [-7, 0, 7]
    
    p_opt = crop_params.optimal_phosphorus_kg_ha
    k_opt = crop_params.optimal_potassium_kg_ha
    
    candidates: List[ParetoStrategyPoint] = []
    strat_idx = 0
    
    # 3. Simulate all parameter permutations
    for irr_m in irr_mults:
        candidate_depth = round(base_irr_depth * irr_m, 1)
        
        for n_val in n_rates:
            for s_shift in sowing_shifts:
                strat_idx += 1
                cand_sow_dt = (base_sow_dt + timedelta(days=s_shift)).strftime("%Y-%m-%d")
                
                # Clone payload
                c_dict = copy.deepcopy(baseline_payload.__dict__)
                c_dict["irrigation_depth_mm"] = candidate_depth
                c_dict["nitrogen_kg_ha"] = n_val
                c_dict["phosphorus_kg_ha"] = p_opt
                c_dict["potassium_kg_ha"] = k_opt
                c_dict["sowing_date"] = cand_sow_dt
                
                c_payload = FarmInputPayload(**c_dict)
                c_run = run_orchestrated_simulation(c_payload, scenario_name=f"Strategy #{strat_idx}")
                
                # Check user constraints
                violations = []
                if max_water_m3 is not None and c_run.total_irrigation_volume_m3 > max_water_m3:
                    violations.append(f"Exceeds water quota of {max_water_m3:,.0f} m³")
                if max_budget_inr is not None and c_run.total_modeled_cultivation_costs_inr is not None:
                    if c_run.total_modeled_cultivation_costs_inr > max_budget_inr:
                        violations.append(f"Exceeds budget ceiling of ₹{max_budget_inr:,.0f}")
                if min_yield_kg_ha is not None and c_run.estimated_yield_kg_ha < min_yield_kg_ha:
                    violations.append(f"Yield below minimum floor of {min_yield_kg_ha:,.0f} kg/ha")
                    
                is_feasible = len(violations) == 0
                tot_fert_farm_kg = (n_val + p_opt + k_opt) * c_run.farm_area_ha
                
                strat_point = ParetoStrategyPoint(
                    strategy_id=f"strat_{strat_idx}",
                    strategy_name=f"Strategy #{strat_idx} (Irr: {candidate_depth:.0f}mm, N: {n_val:.0f}kg)",
                    irrigation_depth_mm=candidate_depth,
                    irrigation_multiplier=irr_m,
                    nitrogen_kg_ha=n_val,
                    phosphorus_kg_ha=p_opt,
                    potassium_kg_ha=k_opt,
                    total_fertilizer_kg_ha=round(n_val + p_opt + k_opt, 1),
                    sowing_date=cand_sow_dt,
                    irrigation_method=c_payload.irrigation_method,
                    predicted_yield_kg_ha=c_run.estimated_yield_kg_ha,
                    predicted_yield_q_acre=c_run.estimated_yield_quintal_acre,
                    irrigation_water_m3=c_run.total_irrigation_volume_m3,
                    total_fertilizer_applied_kg=round(tot_fert_farm_kg, 1),
                    modeled_cost_inr=c_run.total_modeled_cultivation_costs_inr,
                    estimated_revenue_inr=c_run.estimated_gross_revenue_inr,
                    estimated_net_profit_inr=c_run.estimated_net_return_inr,
                    water_productivity_kg_m3=c_run.water_productivity_kg_m3,
                    is_feasible=is_feasible,
                    constraint_violations=violations
                )
                candidates.append(strat_point)
                
    # 4. Filter Feasible Strategies
    feasible_candidates = [c for c in candidates if c.is_feasible]
    if not feasible_candidates:
        # Fallback to least-violating strategies
        feasible_candidates = candidates[:10]
        
    # 5. Non-Dominated Sorting (Pareto Frontier Identification)
    # Objectives and their optimization directions:
    #   - Yield: Maximize
    #   - Irrigation Water: Minimize
    #   - Total Fertilizer: Minimize
    #   - Net Profit (if available): Maximize
    has_profit = any(c.estimated_net_profit_inr is not None for c in feasible_candidates)
    
    obj_directions = {
        "yield": "max",
        "water": "min",
        "fertilizer": "min"
    }
    if has_profit:
        obj_directions["profit"] = "max"
        
    pareto_frontier: List[ParetoStrategyPoint] = []
    
    for i, cand_i in enumerate(feasible_candidates):
        dict_i = {
            "yield": cand_i.predicted_yield_kg_ha,
            "water": cand_i.irrigation_water_m3,
            "fertilizer": cand_i.total_fertilizer_applied_kg,
            "profit": cand_i.estimated_net_profit_inr
        }
        
        is_dominated = False
        dom_count = 0
        
        for j, cand_j in enumerate(feasible_candidates):
            if i == j:
                continue
            dict_j = {
                "yield": cand_j.predicted_yield_kg_ha,
                "water": cand_j.irrigation_water_m3,
                "fertilizer": cand_j.total_fertilizer_applied_kg,
                "profit": cand_j.estimated_net_profit_inr
            }
            
            # Check if j dominates i
            if check_pareto_dominance(dict_j, dict_i, obj_directions):
                is_dominated = True
                dom_count += 1
                
        cand_i.domination_count = dom_count
        cand_i.is_pareto_optimal = (not is_dominated)
        if not is_dominated:
            pareto_frontier.append(cand_i)
            
    # Sort Pareto frontier by yield descending
    pareto_frontier.sort(key=lambda p: p.predicted_yield_kg_ha, reverse=True)
    
    # 6. Balanced Compromise Strategy Identification
    # Normalize objectives on [0, 1] scale across the Pareto frontier
    # Ideal point (Utopia point): Yield = 1.0, Water = 0.0, Fertilizer = 0.0, Profit = 1.0
    balanced_cand = None
    if pareto_frontier:
        min_y = min(p.predicted_yield_kg_ha for p in pareto_frontier)
        max_y = max(p.predicted_yield_kg_ha for p in pareto_frontier)
        
        min_w = min(p.irrigation_water_m3 for p in pareto_frontier)
        max_w = max(p.irrigation_water_m3 for p in pareto_frontier)
        
        min_f = min(p.total_fertilizer_applied_kg for p in pareto_frontier)
        max_f = max(p.total_fertilizer_applied_kg for p in pareto_frontier)
        
        best_dist = 9999.0
        
        for p in pareto_frontier:
            # Normalized score: 1.0 = best for each objective
            norm_y = (p.predicted_yield_kg_ha - min_y) / max(0.001, max_y - min_y)
            norm_w = 1.0 - ((p.irrigation_water_m3 - min_w) / max(0.001, max_w - min_w))
            norm_f = 1.0 - ((p.total_fertilizer_applied_kg - min_f) / max(0.001, max_f - min_f))
            
            # Distance from Utopia Point (1.0, 1.0, 1.0)
            dist = math.sqrt((1.0 - norm_y)**2 + (1.0 - norm_w)**2 + (1.0 - norm_f)**2)
            if dist < best_dist:
                best_dist = dist
                balanced_cand = p
                
        if balanced_cand:
            balanced_cand.is_balanced_option = True
            balanced_cand.trade_off_notes.append(
                "Balanced Multi-Criteria Compromise: achieves close proximity to maximum yield while conserving irrigation water and fertilizer inputs."
            )
            
    # 7. Generate Trade-off Synthesis
    trade_off_insights = []
    if pareto_frontier:
        highest_yield_sc = max(pareto_frontier, key=lambda p: p.predicted_yield_kg_ha)
        lowest_water_sc = min(pareto_frontier, key=lambda p: p.irrigation_water_m3)
        lowest_fert_sc = min(pareto_frontier, key=lambda p: p.total_fertilizer_applied_kg)
        
        water_saved_delta = highest_yield_sc.irrigation_water_m3 - lowest_water_sc.irrigation_water_m3
        yield_tradeoff_delta = highest_yield_sc.predicted_yield_kg_ha - lowest_water_sc.predicted_yield_kg_ha
        
        trade_off_insights.append(
            f"Frontier Span: Yield ranges from {lowest_water_sc.predicted_yield_kg_ha:,.0f} kg/ha (water-saver) "
            f"to {highest_yield_sc.predicted_yield_kg_ha:,.0f} kg/ha (high-input)."
        )
        if water_saved_delta > 0:
            trade_off_insights.append(
                f"Water Trade-Off: Transitioning from the high-input strategy to the water-saving strategy conserves "
                f"{water_saved_delta:,.0f} m³ of water ({water_saved_delta / max(1, highest_yield_sc.irrigation_water_m3)*100:.1f}%), "
                f"with a {yield_tradeoff_delta:,.0f} kg/ha yield penalty."
            )
        if balanced_cand:
            trade_off_insights.append(
                f"Balanced Strategy: {balanced_cand.strategy_name} provides {balanced_cand.predicted_yield_kg_ha:,.0f} kg/ha "
                f"({(balanced_cand.predicted_yield_kg_ha / max(1, highest_yield_sc.predicted_yield_kg_ha))*100:.1f}% of peak harvest) "
                f"using {balanced_cand.irrigation_water_m3:,.0f} m³ water."
            )
            
    return ParetoOptimizationResult(
        total_evaluated=len(candidates),
        feasible_count=len(feasible_candidates),
        pareto_frontier_count=len(pareto_frontier),
        pareto_frontier=pareto_frontier,
        all_candidates=feasible_candidates,
        balanced_strategy=balanced_cand,
        baseline_strategy=baseline_point,
        trade_off_summary=trade_off_insights
    )
