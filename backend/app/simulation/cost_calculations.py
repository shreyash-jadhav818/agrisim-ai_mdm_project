"""
AgriSim AI - Cost & Profit Calculations Module
Implements transparent financial accounting in Indian Rupees (INR / ₹).
Calculates gross revenue = harvest * selling_price, and net return = revenue - costs.
Critically, only calculates financial metrics when inputs are supplied and distinguishes
partial modeled costs from total farm expenditures without fabricating missing data.
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List

@dataclass
class CostAccountingResult:
    currency: str = "INR"
    crop_selling_price_per_quintal: Optional[float] = None
    estimated_gross_revenue_inr: Optional[float] = None
    revenue_per_hectare_inr: Optional[float] = None
    revenue_per_acre_inr: Optional[float] = None
    
    # Cost Breakdown
    modeled_fertilizer_cost_inr: Optional[float] = None
    modeled_irrigation_cost_inr: Optional[float] = None
    other_production_costs_inr: Optional[float] = None
    total_modeled_cultivation_costs_inr: Optional[float] = None
    cost_per_hectare_inr: Optional[float] = None
    cost_per_acre_inr: Optional[float] = None
    is_partial_modeled_cost: bool = False
    
    # Net Returns
    estimated_net_return_inr: Optional[float] = None
    net_return_per_hectare_inr: Optional[float] = None
    net_return_per_acre_inr: Optional[float] = None
    return_on_investment_roi_pct: Optional[float] = None
    
    financial_notes: List[str] = field(default_factory=list)

def calculate_farm_finances(
    harvest_quintals: float,
    farm_area_ha: float,
    farm_area_acres: float,
    crop_selling_price_per_quintal: Optional[float] = None,
    total_n_applied_kg: float = 0.0,
    total_p_applied_kg: float = 0.0,
    total_k_applied_kg: float = 0.0,
    water_applied_m3: float = 0.0,
    user_fertilizer_cost_total: Optional[float] = None,
    user_irrigation_cost_total: Optional[float] = None,
    other_production_costs_total: Optional[float] = None,
    unit_fertilizer_cost_per_kg_n: float = 13.0,
    unit_fertilizer_cost_per_kg_p: float = 58.0,
    unit_fertilizer_cost_per_kg_k: float = 56.0,
    unit_water_pumping_cost_per_m3: float = 1.20
) -> CostAccountingResult:
    """
    Computes transparent cost and return calculations without fabricating missing prices or costs.
    """
    notes: List[str] = []
    
    # 1. Gross Revenue Calculation (harvest * crop_selling_price)
    gross_revenue: Optional[float] = None
    rev_ha: Optional[float] = None
    rev_ac: Optional[float] = None
    
    if crop_selling_price_per_quintal is not None and crop_selling_price_per_quintal > 0:
        gross_revenue = round(harvest_quintals * crop_selling_price_per_quintal, 2)
        rev_ha = round(gross_revenue / max(0.001, farm_area_ha), 2)
        rev_ac = round(gross_revenue / max(0.001, farm_area_acres), 2)
        notes.append(f"Gross revenue calculated at user-configured selling price of ₹{crop_selling_price_per_quintal:,.2f}/quintal.")
    else:
        notes.append("Crop selling price not supplied; gross revenue and net return cannot be computed without financial assumptions.")
        
    # 2. Fertilizer Cost Calculation
    fertilizer_cost: Optional[float] = None
    if user_fertilizer_cost_total is not None and user_fertilizer_cost_total >= 0:
        fertilizer_cost = round(user_fertilizer_cost_total, 2)
        notes.append(f"Fertilizer cost supplied directly by user: ₹{fertilizer_cost:,.2f}.")
    elif total_n_applied_kg > 0 or total_p_applied_kg > 0 or total_k_applied_kg > 0:
        # Computed from physical quantities and unit input tariffs
        calc_fert = (
            total_n_applied_kg * unit_fertilizer_cost_per_kg_n +
            total_p_applied_kg * unit_fertilizer_cost_per_kg_p +
            total_k_applied_kg * unit_fertilizer_cost_per_kg_k
        )
        fertilizer_cost = round(calc_fert, 2)
        notes.append(f"Modeled fertilizer cost computed from nutrient dosages (N @ ₹{unit_fertilizer_cost_per_kg_n}/kg, P @ ₹{unit_fertilizer_cost_per_kg_p}/kg, K @ ₹{unit_fertilizer_cost_per_kg_k}/kg).")
        
    # 3. Irrigation Cost Calculation
    irrigation_cost: Optional[float] = None
    if user_irrigation_cost_total is not None and user_irrigation_cost_total >= 0:
        irrigation_cost = round(user_irrigation_cost_total, 2)
        notes.append(f"Irrigation cost supplied directly by user: ₹{irrigation_cost:,.2f}.")
    elif water_applied_m3 > 0:
        calc_irr = water_applied_m3 * unit_water_pumping_cost_per_m3
        irrigation_cost = round(calc_irr, 2)
        notes.append(f"Modeled irrigation energy cost computed for {water_applied_m3:,.0f} m³ water @ ₹{unit_water_pumping_cost_per_m3:.2f}/m³.")
        
    # 4. Other Production Costs (seeds, labor, land prep)
    other_costs: Optional[float] = None
    if other_production_costs_total is not None and other_production_costs_total >= 0:
        other_costs = round(other_production_costs_total, 2)
        notes.append(f"Other operational expenses (seeds, labor, tillage) supplied: ₹{other_costs:,.2f}.")
    else:
        notes.append("Other operational costs (seeds, labor, tillage) not provided; cost metrics represent partial modeled operating costs.")
        
    # 5. Total Modeled Cultivation Costs
    # Sum components that exist
    cost_components = [c for c in [fertilizer_cost, irrigation_cost, other_costs] if c is not None]
    total_costs: Optional[float] = None
    cost_ha: Optional[float] = None
    cost_ac: Optional[float] = None
    is_partial: bool = other_costs is None
    
    if cost_components:
        total_costs = round(sum(cost_components), 2)
        cost_ha = round(total_costs / max(0.001, farm_area_ha), 2)
        cost_ac = round(total_costs / max(0.001, farm_area_acres), 2)
        if is_partial:
            notes.append("Note: Modeled cultivation cost is PARTIAL (excludes unsupplied labor/seed overhead).")
            
    # 6. Estimated Modeled Net Return = Gross Revenue - Modeled Costs
    net_return: Optional[float] = None
    net_ha: Optional[float] = None
    net_ac: Optional[float] = None
    roi_pct: Optional[float] = None
    
    if gross_revenue is not None and total_costs is not None:
        net_return = round(gross_revenue - total_costs, 2)
        net_ha = round(net_return / max(0.001, farm_area_ha), 2)
        net_ac = round(net_return / max(0.001, farm_area_acres), 2)
        roi_pct = round((net_return / max(1.0, total_costs)) * 100.0, 1)
        notes.append(f"Estimated modeled net return: ₹{net_return:,.2f} (ROI: {roi_pct:.1f}%).")
    else:
        notes.append("Net return omitted because revenue or cost parameters were incomplete.")
        
    return CostAccountingResult(
        currency="INR",
        crop_selling_price_per_quintal=crop_selling_price_per_quintal,
        estimated_gross_revenue_inr=gross_revenue,
        revenue_per_hectare_inr=rev_ha,
        revenue_per_acre_inr=rev_ac,
        modeled_fertilizer_cost_inr=fertilizer_cost,
        modeled_irrigation_cost_inr=irrigation_cost,
        other_production_costs_inr=other_costs,
        total_modeled_cultivation_costs_inr=total_costs,
        cost_per_hectare_inr=cost_ha,
        cost_per_acre_inr=cost_ac,
        is_partial_modeled_cost=is_partial,
        estimated_net_return_inr=net_return,
        net_return_per_hectare_inr=net_ha,
        net_return_per_acre_inr=net_ac,
        return_on_investment_roi_pct=roi_pct,
        financial_notes=notes
    )
