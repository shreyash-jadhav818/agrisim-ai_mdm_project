"""
AgriSim AI - Agricultural Economics & Profit Engine
Calculates itemized cultivation costs (seeds, fertilizers, energy/diesel, labor, crop protection),
gross revenues based on MSP/market prices, net profits in INR, ROI, and water productivity metrics.
"""

from typing import Dict, Any, Optional
from app.simulation.crop_data import CROP_DATABASE

# Benchmark subsidized Indian fertilizer prices (INR per kg of nutrient equivalent)
# Urea 46% N ~ ₹270 / 45kg bag (~₹6.0/kg) -> ~₹13.0/kg N
# DAP 18:46:0 ~ ₹1350 / 50kg bag (~₹27.0/kg) -> ~₹58.7/kg P2O5
# MOP 0:0:60 ~ ₹1700 / 50kg bag (~₹34.0/kg) -> ~₹56.7/kg K2O
FERTILIZER_NUTRIENT_COST_PER_KG = {
    "N": 13.0,
    "P": 58.0,
    "K": 56.0
}

def calculate_cultivation_economics(
    crop_id: str,
    total_acres: float,
    actual_yield_quintal_acre: float,
    total_water_applied_mm: float,
    total_eta_mm: float,
    applied_n_kg_acre: float,
    applied_p_kg_acre: float,
    applied_k_kg_acre: float,
    mulching_used: bool = False,
    custom_price_per_quintal: Optional[float] = None,
    custom_seed_cost_acre: Optional[float] = None,
    custom_energy_cost_per_m3: Optional[float] = None
) -> Dict[str, Any]:
    """
    Computes full cultivation budget, gross revenue, net profit, and water productivity.
    """
    crop = CROP_DATABASE.get(crop_id, CROP_DATABASE["wheat"])
    econ_defaults = crop["economics"]
    
    # 1. Seed cost
    seed_cost_per_acre = custom_seed_cost_acre if custom_seed_cost_acre is not None else econ_defaults["seed_cost_acre"]
    
    # 2. Land preparation
    land_prep_per_acre = econ_defaults["land_prep_acre"]
    
    # 3. Fertilizer cost
    fert_n_cost = applied_n_kg_acre * FERTILIZER_NUTRIENT_COST_PER_KG["N"]
    fert_p_cost = applied_p_kg_acre * FERTILIZER_NUTRIENT_COST_PER_KG["P"]
    fert_k_cost = applied_k_kg_acre * FERTILIZER_NUTRIENT_COST_PER_KG["K"]
    fert_cost_per_acre = fert_n_cost + fert_p_cost + fert_k_cost + 400.0  # Zinc & micronutrient buffer
    
    # 4. Irrigation energy / pumping cost
    # 1 mm water over 1 acre = 4.04686 m3 of water
    water_applied_m3_per_acre = total_water_applied_mm * 4.04686
    energy_rate_m3 = custom_energy_cost_per_m3 if custom_energy_cost_per_m3 is not None else econ_defaults["energy_cost_per_m3"]
    irrigation_energy_cost_per_acre = water_applied_m3_per_acre * energy_rate_m3
    
    # 5. Crop protection
    crop_protection_per_acre = econ_defaults["crop_protection_acre"]
    
    # 6. Labor & Harvest
    labor_harvest_per_acre = econ_defaults["labor_harvest_acre"]
    
    # Mulching cost if enabled
    mulch_cost_per_acre = 1800.0 if mulching_used else 0.0
    
    # Total cultivation cost per acre
    total_cost_per_acre = (
        seed_cost_per_acre +
        land_prep_per_acre +
        fert_cost_per_acre +
        irrigation_energy_cost_per_acre +
        crop_protection_per_acre +
        labor_harvest_per_acre +
        mulch_cost_per_acre
    )
    
    # Total farm cultivation cost
    total_farm_cost = total_cost_per_acre * total_acres
    
    # 7. Revenue
    price_per_quintal = custom_price_per_quintal if custom_price_per_quintal is not None else crop["msp_inr_per_quintal"]
    gross_revenue_per_acre = actual_yield_quintal_acre * price_per_quintal
    total_farm_revenue = gross_revenue_per_acre * total_acres
    
    # 8. Net profit
    net_profit_per_acre = gross_revenue_per_acre - total_cost_per_acre
    total_farm_net_profit = total_farm_revenue - total_farm_cost
    
    # 9. Return on Investment (ROI)
    roi_pct = (total_farm_net_profit / max(1.0, total_farm_cost)) * 100.0
    
    # 10. Water productivity (kg of crop produced per m3 of actual evapotranspired water ETa)
    # Total crop produced in kg per acre = actual_yield_quintal_acre * 100 kg
    # Total water consumed ETa in m3 per acre = total_eta_mm * 4.04686
    total_grain_kg_per_acre = actual_yield_quintal_acre * 100.0
    total_water_consumed_m3_acre = total_eta_mm * 4.04686
    water_productivity_kg_m3 = total_grain_kg_per_acre / max(1.0, total_water_consumed_m3_acre)
    
    return {
        "costs_breakdown": {
            "seed_cost": round(seed_cost_per_acre * total_acres, 2),
            "land_prep_cost": round(land_prep_per_acre * total_acres, 2),
            "fertilizer_cost": round(fert_cost_per_acre * total_acres, 2),
            "irrigation_energy_cost": round(irrigation_energy_cost_per_acre * total_acres, 2),
            "crop_protection_cost": round(crop_protection_per_acre * total_acres, 2),
            "labor_harvest_cost": round(labor_harvest_per_acre * total_acres, 2),
            "total_cost": round(total_farm_cost, 2)
        },
        "costs_per_acre": {
            "seed_cost": round(seed_cost_per_acre, 2),
            "fertilizer_cost": round(fert_cost_per_acre, 2),
            "irrigation_energy_cost": round(irrigation_energy_cost_per_acre, 2),
            "total_cost": round(total_cost_per_acre, 2)
        },
        "gross_revenue_inr": round(total_farm_revenue, 2),
        "revenue_per_acre_inr": round(gross_revenue_per_acre, 2),
        "net_profit_inr": round(total_farm_net_profit, 2),
        "profit_per_acre_inr": round(net_profit_per_acre, 2),
        "price_per_quintal_inr": price_per_quintal,
        "roi_pct": round(roi_pct, 2),
        "water_consumed_m3_acre": round(total_water_consumed_m3_acre, 1),
        "water_productivity_kg_m3": round(water_productivity_kg_m3, 3)
    }
