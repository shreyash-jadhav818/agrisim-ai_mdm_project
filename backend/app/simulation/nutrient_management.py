"""
AgriSim AI - Nutrient Management Module
Models crop nutritional adequacy via the Mitscherlich-Baule Law of Diminishing Returns.
Crucially penalizes excessive fertilizer application (lodging, vegetative rank, osmotic burn)
and bounds outputs against impossible extrapolations.
"""

from dataclasses import dataclass
from typing import Dict, Any, Tuple
import math
from app.simulation.crop_parameters import CropParameters
from app.simulation.unit_conversions import nutrient_rate_to_total_kg

@dataclass
class NutrientEvaluationResult:
    n_applied_kg_ha: float
    p_applied_kg_ha: float
    k_applied_kg_ha: float
    total_n_kg_farm: float
    total_p_kg_farm: float
    total_k_kg_farm: float
    n_adequacy_pct: float
    p_adequacy_pct: float
    k_adequacy_pct: float
    nutrient_yield_factor: float
    excess_fertilizer_detected: bool
    excess_fertilizer_penalty_pct: float
    agronomic_advisory: str

def evaluate_nutrient_management(
    n_applied_kg_ha: float,
    p_applied_kg_ha: float,
    k_applied_kg_ha: float,
    crop_params: CropParameters,
    farm_area_ha: float,
    soil_organic_matter_pct: float = 0.75,
    num_splits: int = 2
) -> NutrientEvaluationResult:
    """
    Evaluates nutrient response curves and detects deficiency or toxicity/excess.
    
    Parameters:
    - n_applied_kg_ha: Nitrogen applied (kg N/ha)
    - p_applied_kg_ha: Phosphorus applied (kg P2O5/ha)
    - k_applied_kg_ha: Potassium applied (kg K2O/ha)
    - crop_params: Crop-specific agronomic parameter model
    - farm_area_ha: Farm size in hectares
    - soil_organic_matter_pct: Soil OM % indicating native mineralization
    - num_splits: Number of fertilizer split applications (1 to 4)
    """
    # 1. Non-negativity validation
    n_app = max(0.0, float(n_applied_kg_ha))
    p_app = max(0.0, float(p_applied_kg_ha))
    k_app = max(0.0, float(k_applied_kg_ha))
    om = max(0.1, min(4.0, float(soil_organic_matter_pct)))
    
    # Total nutrient quantities over the entire farm area
    total_n_farm = nutrient_rate_to_total_kg(n_app, farm_area_ha)
    total_p_farm = nutrient_rate_to_total_kg(p_app, farm_area_ha)
    total_k_farm = nutrient_rate_to_total_kg(k_app, farm_area_ha)
    
    # 2. Basal soil mineral supply derived from organic matter
    n_soil = om * 28.0  # kg N/ha
    p_soil = om * 14.0  # kg P2O5/ha
    k_soil = om * 20.0  # kg K2O/ha
    
    # 3. Nutrient Uptake Efficiency (split applications curb volatilization and leaching)
    # 1 split = 50% N efficiency, 3 splits = 70% N efficiency
    eff_n = min(0.75, 0.48 + 0.08 * min(3, num_splits))
    eff_p = 0.35  # P fixation in soil is high
    eff_k = 0.70  # K absorption efficiency
    
    eff_avail_n = n_soil + n_app * eff_n
    eff_avail_p = p_soil + p_app * eff_p
    eff_avail_k = k_soil + k_app * eff_k
    
    # 4. Mitscherlich-Baule Law of Diminishing Returns
    # Response = 1 - e^(-c * X)
    cn = crop_params.nitrogen_response_coeff
    cp = crop_params.phosphorus_response_coeff
    ck = crop_params.potassium_response_coeff
    
    resp_n = 1.0 - math.exp(-cn * eff_avail_n)
    resp_p = 1.0 - math.exp(-cp * eff_avail_p)
    resp_k = 1.0 - math.exp(-ck * eff_avail_k)
    
    # Reference response at 100% recommended dose
    rec_n_avail = n_soil + crop_params.optimal_nitrogen_kg_ha * eff_n
    rec_p_avail = p_soil + crop_params.optimal_phosphorus_kg_ha * eff_p
    rec_k_avail = k_soil + crop_params.optimal_potassium_kg_ha * eff_k
    
    rec_resp_n = 1.0 - math.exp(-cn * rec_n_avail)
    rec_resp_p = 1.0 - math.exp(-cp * rec_p_avail)
    rec_resp_k = 1.0 - math.exp(-ck * rec_k_avail)
    
    actual_product = resp_n * resp_p * resp_k
    optimal_product = rec_resp_n * rec_resp_p * rec_resp_k
    
    # Raw nutrient sufficiency ratio
    raw_factor = actual_product / max(0.001, optimal_product)
    
    # 5. Model Excessive Fertilizer Penalty
    # Excessive Nitrogen promotes:
    # - Stem elongation & lodging in wheat/rice/maize
    # - Excessive vegetative canopy with boll shedding in cotton
    # - Delayed maturity and sugar reduction in sugarcane
    # - In pulse crops (chickpea/soybean), excessive N suppresses rhizobial nodulation
    excess_n = max(0.0, n_app - crop_params.excess_nitrogen_threshold_kg_ha)
    lodging_penalty = min(0.35, excess_n * crop_params.excess_fertilizer_sensitivity)
    
    # High combined salt index penalty when total mineral fertilizer exceeds osmotic limit
    total_mineral_rate = n_app + p_app + k_app
    osmotic_penalty = 0.0
    if total_mineral_rate > 420.0:
        excess_total = total_mineral_rate - 420.0
        osmotic_penalty = min(0.25, excess_total * 0.0012)
        
    total_penalty = min(0.40, lodging_penalty + osmotic_penalty)
    excess_detected = total_penalty > 0.02
    
    # Final normalized nutrient factor bounded between 0.20 and 1.02
    nutrient_factor = min(1.02, raw_factor) * (1.0 - total_penalty)
    nutrient_factor = max(0.20, min(1.02, nutrient_factor))
    
    # Adequacy percentages
    n_adeq = min(100.0, (resp_n / max(0.01, rec_resp_n)) * 100.0)
    p_adeq = min(100.0, (resp_p / max(0.01, rec_resp_p)) * 100.0)
    k_adeq = min(100.0, (resp_k / max(0.01, rec_resp_k)) * 100.0)
    
    # Diagnostic advisory
    advisories = []
    if excess_detected:
        if lodging_penalty > 0:
            advisories.append(
                f"Excess Nitrogen applied ({n_app:.0f} kg/ha vs threshold {crop_params.excess_nitrogen_threshold_kg_ha:.0f} kg/ha) "
                f"causing a {lodging_penalty * 100:.1f}% yield loss due to stem lodging, vegetative rankness, or nodulation suppression."
            )
        if osmotic_penalty > 0:
            advisories.append(
                f"Total fertilizer application ({total_mineral_rate:.0f} kg/ha) exceeds root osmotic tolerance, causing transient chemical salt stress."
            )
    else:
        if n_adeq < 80.0:
            advisories.append(f"Nitrogen deficiency detected ({n_adeq:.0f}% adequacy); limits chloroplastic biomass synthesis.")
        if p_adeq < 80.0:
            advisories.append(f"Phosphorus deficiency ({p_adeq:.0f}% adequacy) impairs root development and energy transfer.")
        if k_adeq < 80.0:
            advisories.append(f"Potassium deficiency ({k_adeq:.0f}% adequacy) reduces stomatal regulation and drought resilience.")
        if not advisories:
            advisories.append("Nutrient application closely matches optimal agronomic recommendations without toxic excess.")
            
    return NutrientEvaluationResult(
        n_applied_kg_ha=round(n_app, 1),
        p_applied_kg_ha=round(p_app, 1),
        k_applied_kg_ha=round(k_app, 1),
        total_n_kg_farm=round(total_n_farm, 1),
        total_p_kg_farm=round(total_p_farm, 1),
        total_k_kg_farm=round(total_k_farm, 1),
        n_adequacy_pct=round(n_adeq, 1),
        p_adequacy_pct=round(p_adeq, 1),
        k_adequacy_pct=round(k_adeq, 1),
        nutrient_yield_factor=round(nutrient_factor, 3),
        excess_fertilizer_detected=excess_detected,
        excess_fertilizer_penalty_pct=round(total_penalty * 100.0, 1),
        agronomic_advisory=" ".join(advisories)
    )
