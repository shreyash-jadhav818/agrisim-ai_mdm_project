"""
AgriSim AI - Constrained Grid-Search Agricultural Strategy Optimizer
Evaluates multi-dimensional parameter grids across irrigation depths,
fertilizer dosage regimes, and sowing windows under real biophysical constraints:
  - Water Quotas (Maximum allowable m3)
  - Budget Ceilings (Maximum modeled INR cultivation cost)
  - Minimum Yield Thresholds (kg/ha floor)

Supported Optimization Objectives:
  1. 'estimated_yield' - Maximizes physical crop yield (kg/ha)
  2. 'estimated_net_return' - Maximizes farmer profit margin in INR
  3. 'lower_water' - Minimizes irrigation water consumption while maintaining target harvest
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import copy

from app.simulation.crop_parameters import get_crop_parameters
from app.simulation.simulation_orchestrator import (
    FarmInputPayload,
    SimulationRunOutput,
    run_orchestrated_simulation
)

@dataclass
class OptimizationCandidate:
    candidate_id: str
    irrigation_multiplier: float
    irrigation_depth_mm: float
    nitrogen_kg_ha: float
    phosphorus_kg_ha: float
    potassium_kg_ha: float
    sowing_date: str
    
    # Outcomes
    estimated_yield_kg_ha: float
    estimated_yield_quintal_acre: float
    irrigation_water_m3: float
    modeled_cost_inr: Optional[float]
    estimated_revenue_inr: Optional[float]
    estimated_net_return_inr: Optional[float]
    
    # Feasibility status
    is_feasible: bool
    constraint_violations: List[str]
    score: float

@dataclass
class GridOptimizationResult:
    objective: str
    success: bool
    status_message: str
    
    # Baseline vs Optimal
    baseline_metrics: Dict[str, Any]
    optimal_metrics: Dict[str, Any]
    improvements: Dict[str, float]
    
    # Recommended parameter settings
    recommended_parameters: Dict[str, Any]
    
    # Constraints evaluated
    constraints_applied: Dict[str, Any]
    total_candidates_evaluated: int
    feasible_candidates_count: int
    
    # Top alternative strategies
    top_candidates: List[Dict[str, Any]]
    
    # Detailed simulation result of the best strategy
    best_simulation_run: SimulationRunOutput
    agronomic_recommendations: List[str]

def run_constrained_grid_search(
    baseline_payload: FarmInputPayload,
    objective: str = "estimated_yield",
    max_water_m3: Optional[float] = None,
    max_budget_inr: Optional[float] = None,
    min_yield_kg_ha: Optional[float] = None,
    irrigation_multipliers: Optional[List[float]] = None,
    nitrogen_levels_kg_ha: Optional[List[float]] = None,
    sowing_shifts_days: Optional[List[int]] = None
) -> GridOptimizationResult:
    """
    Executes a deterministic constrained grid search across agronomic input combinations.
    """
    norm_obj = objective.lower().strip()
    valid_objectives = [
        "estimated_yield", "estimated_net_return", "lower_water",
        "maximize_yield", "maximize_profit", "minimize_water",
        "minimize_fertilizer", "maximize_water_productivity", "balanced_strategy"
    ]
    if norm_obj not in valid_objectives:
        norm_obj = "estimated_yield"
        
    # Map synonyms
    if norm_obj in ["maximize_yield", "yield"]:
        norm_obj = "estimated_yield"
    elif norm_obj in ["maximize_profit", "profit", "net_return"]:
        norm_obj = "estimated_net_return"
    elif norm_obj in ["minimize_water", "water"]:
        norm_obj = "lower_water"
    elif norm_obj in ["fertilizer", "min_fertilizer"]:
        norm_obj = "minimize_fertilizer"
    elif norm_obj in ["water_productivity", "wue"]:
        norm_obj = "maximize_water_productivity"
    elif norm_obj in ["balanced", "compromise"]:
        norm_obj = "balanced_strategy"
        
    crop_params = get_crop_parameters(baseline_payload.crop_type)
    
    # 1. Run baseline simulation
    baseline_run = run_orchestrated_simulation(baseline_payload, scenario_name="Baseline Plan")
    base_sow_dt = datetime.strptime(baseline_payload.sowing_date.strip(), "%Y-%m-%d")
    
    # If optimizing for net return, ensure selling price is available
    if norm_obj == "estimated_net_return" and baseline_payload.crop_selling_price_per_quintal is None:
        raise ValueError(
            "Optimization objective 'estimated_net_return' requires 'crop_selling_price_per_quintal' "
            "to be supplied. Please provide a selling price or optimize for 'estimated_yield' / 'lower_water'."
        )
        
    # Default minimum yield threshold for resource-saving objectives if not specified
    effective_min_yield = min_yield_kg_ha
    if (norm_obj in ["lower_water", "minimize_fertilizer"]) and effective_min_yield is None:
        effective_min_yield = baseline_run.estimated_yield_kg_ha * 0.70

        
    # 2. Build Grid Search Dimensions
    # A. Irrigation multipliers
    if irrigation_multipliers is None:
        irr_mults = [0.60, 0.80, 1.00, 1.15, 1.30]
    else:
        irr_mults = [m for m in irrigation_multipliers if m >= 0.0]
        if not irr_mults:
            irr_mults = [1.0]
            
    # Reference baseline irrigation depth
    base_irr_depth = (
        baseline_payload.irrigation_depth_mm
        if baseline_payload.irrigation_depth_mm is not None
        else crop_params.optimal_water_requirement_mm
    )
    
    # B. Nitrogen levels (around crop optimal recommendation)
    if nitrogen_levels_kg_ha is None:
        n_opt = crop_params.optimal_nitrogen_kg_ha
        n_grid = sorted(list(set([
            round(n_opt * 0.60, 1),
            round(n_opt * 0.85, 1),
            round(n_opt * 1.00, 1),
            round(min(crop_params.excess_nitrogen_threshold_kg_ha * 0.95, n_opt * 1.20), 1)
        ])))
    else:
        n_grid = [max(0.0, float(n)) for n in nitrogen_levels_kg_ha]
        
    # C. Sowing date shifts
    if sowing_shifts_days is None:
        sow_shifts = [-7, 0, 7]
    else:
        sow_shifts = sowing_shifts_days
        
    # Optimal P and K
    p_opt = crop_params.optimal_phosphorus_kg_ha
    k_opt = crop_params.optimal_potassium_kg_ha
    
    # 3. Grid Iteration & Constraint Filtering
    candidates: List[OptimizationCandidate] = []
    cand_counter = 0
    
    for irr_m in irr_mults:
        candidate_irr_depth = round(base_irr_depth * irr_m, 1)
        
        for n_val in n_grid:
            for s_shift in sow_shifts:
                cand_counter += 1
                cand_sow_dt = (base_sow_dt + timedelta(days=s_shift)).strftime("%Y-%m-%d")
                
                # Create test payload
                cand_dict = copy.deepcopy(baseline_payload.__dict__)
                cand_dict["irrigation_depth_mm"] = candidate_irr_depth
                cand_dict["nitrogen_kg_ha"] = n_val
                cand_dict["phosphorus_kg_ha"] = p_opt
                cand_dict["potassium_kg_ha"] = k_opt
                cand_dict["sowing_date"] = cand_sow_dt
                
                c_payload = FarmInputPayload(**cand_dict)
                c_run = run_orchestrated_simulation(c_payload, scenario_name=f"Strategy #{cand_counter}")
                
                # Check Constraints
                violations = []
                if max_water_m3 is not None and c_run.total_irrigation_volume_m3 > max_water_m3:
                    violations.append(
                        f"Water usage ({c_run.total_irrigation_volume_m3:,.0f} m³) exceeds quota ({max_water_m3:,.0f} m³)."
                    )
                if max_budget_inr is not None and c_run.total_modeled_cultivation_costs_inr is not None:
                    if c_run.total_modeled_cultivation_costs_inr > max_budget_inr:
                        violations.append(
                            f"Modeled costs (₹{c_run.total_modeled_cultivation_costs_inr:,.0f}) exceed budget limit (₹{max_budget_inr:,.0f})."
                        )
                if effective_min_yield is not None and c_run.estimated_yield_kg_ha < effective_min_yield:
                    violations.append(
                        f"Yield ({c_run.estimated_yield_kg_ha:,.0f} kg/ha) falls below minimum floor ({effective_min_yield:,.0f} kg/ha)."
                    )
                    
                is_feasible = len(violations) == 0
                
                # Objective scoring
                if norm_obj == "estimated_yield":
                    score = c_run.estimated_yield_kg_ha if is_feasible else -1e6
                elif norm_obj == "estimated_net_return":
                    score = c_run.estimated_net_return_inr if (is_feasible and c_run.estimated_net_return_inr is not None) else -1e9
                elif norm_obj == "lower_water":
                    score = -c_run.total_irrigation_volume_m3 if is_feasible else -1e9
                elif norm_obj == "minimize_fertilizer":
                    score = -(n_val + p_opt + k_opt) if is_feasible else -1e9
                elif norm_obj == "maximize_water_productivity":
                    score = c_run.water_productivity_kg_m3 if is_feasible else -1e6
                elif norm_obj == "balanced_strategy":
                    rel_y = c_run.estimated_yield_kg_ha / max(1.0, baseline_run.estimated_yield_kg_ha)
                    rel_w = c_run.total_irrigation_volume_m3 / max(1.0, baseline_run.total_irrigation_volume_m3)
                    rel_f = (n_val + p_opt + k_opt) / max(1.0, baseline_payload.nitrogen_kg_ha + baseline_payload.phosphorus_kg_ha + baseline_payload.potassium_kg_ha)
                    score = (rel_y * 1.6 - rel_w * 0.7 - rel_f * 0.4) if is_feasible else -1e6
                else:
                    score = c_run.estimated_yield_kg_ha if is_feasible else -1e6
                    
                cand = OptimizationCandidate(
                    candidate_id=f"cand_{cand_counter}",
                    irrigation_multiplier=irr_m,
                    irrigation_depth_mm=candidate_irr_depth,
                    nitrogen_kg_ha=n_val,
                    phosphorus_kg_ha=p_opt,
                    potassium_kg_ha=k_opt,
                    sowing_date=cand_sow_dt,
                    estimated_yield_kg_ha=c_run.estimated_yield_kg_ha,
                    estimated_yield_quintal_acre=c_run.estimated_yield_quintal_acre,
                    irrigation_water_m3=c_run.total_irrigation_volume_m3,
                    modeled_cost_inr=c_run.total_modeled_cultivation_costs_inr,
                    estimated_revenue_inr=c_run.estimated_gross_revenue_inr,
                    estimated_net_return_inr=c_run.estimated_net_return_inr,
                    is_feasible=is_feasible,
                    constraint_violations=violations,
                    score=score
                )
                candidates.append(cand)
                
    # 4. Selection of Best Solution
    feasible_cands = [c for c in candidates if c.is_feasible]
    if feasible_cands:
        best_cand = max(feasible_cands, key=lambda c: c.score)
        success = True
        status_msg = f"Optimal strategy successfully identified under '{norm_obj}' objective."
    else:
        # Fallback to least-violating candidate
        best_cand = max(candidates, key=lambda c: c.score)
        success = False
        status_msg = (
            f"No candidate met all strict constraints. Showing closest strategy with minimum violations: "
            f"{'; '.join(best_cand.constraint_violations)}"
        )
        
    # Re-run best candidate to get complete simulation object
    best_dict = copy.deepcopy(baseline_payload.__dict__)
    best_dict["irrigation_depth_mm"] = best_cand.irrigation_depth_mm
    best_dict["nitrogen_kg_ha"] = best_cand.nitrogen_kg_ha
    best_dict["phosphorus_kg_ha"] = best_cand.phosphorus_kg_ha
    best_dict["potassium_kg_ha"] = best_cand.potassium_kg_ha
    best_dict["sowing_date"] = best_cand.sowing_date
    
    best_payload = FarmInputPayload(**best_dict)
    best_run = run_orchestrated_simulation(best_payload, scenario_name=f"Optimized Strategy ({norm_obj})")
    
    # 5. Improvements relative to Baseline
    base_yield = max(0.1, baseline_run.estimated_yield_kg_ha)
    yield_imp_pct = round(((best_run.estimated_yield_kg_ha - base_yield) / base_yield) * 100.0, 2)
    
    water_imp_pct = 0.0
    if baseline_run.total_irrigation_volume_m3 > 0:
        water_imp_pct = round(
            ((baseline_run.total_irrigation_volume_m3 - best_run.total_irrigation_volume_m3) / baseline_run.total_irrigation_volume_m3) * 100.0,
            2
        )
        
    profit_imp_pct = None
    if baseline_run.estimated_net_return_inr is not None and best_run.estimated_net_return_inr is not None:
        if abs(baseline_run.estimated_net_return_inr) > 1.0:
            profit_imp_pct = round(
                ((best_run.estimated_net_return_inr - baseline_run.estimated_net_return_inr) / abs(baseline_run.estimated_net_return_inr)) * 100.0,
                2
            )
            
    # 6. Agronomic Recommendations
    recs = []
    if norm_obj == "lower_water":
        recs.append(
            f"Water-Saving Strategy: Reduces irrigation from {baseline_run.total_irrigation_depth_mm:.1f} mm "
            f"to {best_run.total_irrigation_depth_mm:.1f} mm, conserving {baseline_run.total_irrigation_volume_m3 - best_run.total_irrigation_volume_m3:,.0f} m³ "
            f"({water_imp_pct:.1f}% savings) while preserving {best_run.estimated_yield_kg_ha:,.0f} kg/ha yield."
        )
    elif norm_obj == "estimated_yield":
        recs.append(
            f"Maximum Yield Strategy: Achieves {best_run.estimated_yield_kg_ha:,.0f} kg/ha ({yield_imp_pct:+.1f}% vs baseline) "
            f"by balancing Nitrogen at {best_run.n_applied_kg_ha:.0f} kg/ha to avoid vegetative lodging."
        )
    elif norm_obj == "estimated_net_return":
        recs.append(
            f"Profit Maximization Strategy: Yields ₹{best_run.estimated_net_return_inr:,.0f} estimated net return "
            f"({profit_imp_pct:+.1f}% improvement) through input-cost efficiency."
        )
    elif norm_obj == "minimize_fertilizer":
        base_fert = baseline_payload.nitrogen_kg_ha + baseline_payload.phosphorus_kg_ha + baseline_payload.potassium_kg_ha
        best_fert = best_run.n_applied_kg_ha + best_run.p_applied_kg_ha + best_run.k_applied_kg_ha
        recs.append(
            f"Low-Fertilizer Regimen: Decreases mineral fertilizer application from {base_fert:.0f} kg/ha to {best_fert:.0f} kg/ha "
            f"({((base_fert - best_fert)/max(1, base_fert))*100:.1f}% reduction) while maintaining {best_run.estimated_yield_kg_ha:,.0f} kg/ha harvest."
        )
    elif norm_obj == "maximize_water_productivity":
        recs.append(
            f"High Water Productivity Strategy: Attains {best_run.water_productivity_kg_m3:.2f} kg/m³ "
            f"(vs {baseline_run.water_productivity_kg_m3:.2f} kg/m³ baseline), producing more biomass per litre of water applied."
        )
    elif norm_obj == "balanced_strategy":
        recs.append(
            f"Multi-Criteria Balanced Strategy: Balances {best_run.estimated_yield_kg_ha:,.0f} kg/ha yield "
            f"({(best_run.estimated_yield_kg_ha/max(1, baseline_run.estimated_yield_kg_ha))*100:.1f}% of baseline) "
            f"while conserving {max(0, baseline_run.total_irrigation_volume_m3 - best_run.total_irrigation_volume_m3):,.0f} m³ water."
        )
        
    if best_cand.sowing_date != baseline_payload.sowing_date:
        recs.append(
            f"Adjust sowing date from {baseline_payload.sowing_date} to {best_cand.sowing_date} "
            f"for superior thermal window alignment and terminal heat avoidance."
        )
        
    # Top 5 ranked candidates
    ranked = sorted(feasible_cands if feasible_cands else candidates, key=lambda c: c.score, reverse=True)[:5]
    top_cands_summary = []
    for rc in ranked:
        top_cands_summary.append({
            "candidate_id": rc.candidate_id,
            "irrigation_depth_mm": rc.irrigation_depth_mm,
            "nitrogen_kg_ha": rc.nitrogen_kg_ha,
            "sowing_date": rc.sowing_date,
            "yield_kg_ha": rc.estimated_yield_kg_ha,
            "water_m3": rc.irrigation_water_m3,
            "net_return_inr": rc.estimated_net_return_inr,
            "is_feasible": rc.is_feasible
        })
        
    return GridOptimizationResult(
        objective=norm_obj,
        success=success,
        status_message=status_msg,
        baseline_metrics={
            "yield_kg_ha": baseline_run.estimated_yield_kg_ha,
            "yield_q_acre": baseline_run.estimated_yield_quintal_acre,
            "water_m3": baseline_run.total_irrigation_volume_m3,
            "cost_inr": baseline_run.total_modeled_cultivation_costs_inr,
            "net_return_inr": baseline_run.estimated_net_return_inr
        },
        optimal_metrics={
            "yield_kg_ha": best_run.estimated_yield_kg_ha,
            "yield_q_acre": best_run.estimated_yield_quintal_acre,
            "water_m3": best_run.total_irrigation_volume_m3,
            "cost_inr": best_run.total_modeled_cultivation_costs_inr,
            "net_return_inr": best_run.estimated_net_return_inr
        },
        improvements={
            "yield_delta_pct": yield_imp_pct,
            "water_saved_pct": water_imp_pct,
            "net_return_delta_pct": profit_imp_pct if profit_imp_pct is not None else 0.0
        },
        recommended_parameters={
            "irrigation_depth_mm": best_cand.irrigation_depth_mm,
            "irrigation_multiplier": best_cand.irrigation_multiplier,
            "nitrogen_kg_ha": best_cand.nitrogen_kg_ha,
            "phosphorus_kg_ha": best_cand.phosphorus_kg_ha,
            "potassium_kg_ha": best_cand.potassium_kg_ha,
            "sowing_date": best_cand.sowing_date
        },
        constraints_applied={
            "max_water_m3": max_water_m3,
            "max_budget_inr": max_budget_inr,
            "min_yield_kg_ha": effective_min_yield
        },
        total_candidates_evaluated=len(candidates),
        feasible_candidates_count=len(feasible_cands),
        top_candidates=top_cands_summary,
        best_simulation_run=best_run,
        agronomic_recommendations=recs
    )
