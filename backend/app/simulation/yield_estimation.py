"""
AgriSim AI - Yield Estimation Module
Combines reference yield potential, FAO-33 Stewart multi-stage water production functions,
Mitscherlich-Baule nutrient adequacy, thermal heat shock, and sowing date suitability.
Strictly prevents negative yields, impossible outputs, and uncontrolled extrapolation,
and penalizes both under-resourcing and excessive irrigation / fertilizer inputs.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from app.simulation.crop_parameters import CropParameters
from app.simulation.unit_conversions import (
    kg_per_ha_to_quintals_per_acre,
    quintals_to_kg,
    kg_to_quintals
)

@dataclass
class YieldEstimationResult:
    crop_id: str
    crop_name: str
    reference_yield_kg_ha: float
    reference_yield_quintal_acre: float
    estimated_yield_kg_ha: float
    estimated_yield_quintal_acre: float
    estimated_total_harvest_kg: float
    estimated_total_harvest_quintals: float
    estimated_total_harvest_tonnes: float
    yield_gap_pct: float
    water_response_factor: float
    aeration_hypoxia_factor: float
    nutrient_response_factor: float
    temperature_stress_factor: float
    sowing_suitability_factor: float
    excess_irrigation_penalty_pct: float
    excess_fertilizer_penalty_pct: float
    model_version: str
    assumptions: List[str] = field(default_factory=list)
    limitations: List[str] = field(default_factory=list)
    data_provenance: str = "FAO Irrigation and Drainage Paper 56, FAO-33, ICAR Benchmark Data"
    is_validated: bool = True

def estimate_crop_yield(
    crop_params: CropParameters,
    farm_area_ha: float,
    stage_water_summary: List[Dict[str, float]],
    nutrient_factor: float,
    excess_fertilizer_penalty_pct: float = 0.0,
    cumulative_aeration_penalty: float = 0.0,
    heat_stress_penalty: float = 0.0,
    sowing_suitability_factor: float = 1.0,
    is_experimental_crop: bool = False
) -> YieldEstimationResult:
    """
    Computes final harvest yield by applying biophysical production functions.
    
    Formula:
      Yield_ha = Reference_Yield * (Water_Factor * Aeration_Factor) * Nutrient_Factor * Temp_Factor * Sowing_Factor
    """
    ref_yield_kg_ha = crop_params.reference_yield_kg_ha
    assumptions = []
    limitations = []
    
    # 1. Multi-Stage Water Yield Response (FAO-33 Stewart Equation)
    # (1 - Ya/Ym) = Ky * (1 - ETa/ETc)
    stage_water_factors = []
    for s in stage_water_summary:
        etc = max(1.0, s.get("etc_sum", 1.0))
        eta = s.get("eta_sum", etc)
        ky = s.get("ky", 0.5)
        
        deficit_ratio = max(0.0, 1.0 - (eta / etc))
        stage_rel_yield = max(0.15, 1.0 - ky * deficit_ratio)
        stage_water_factors.append(stage_rel_yield)
        
    water_factor = 1.0
    for factor in stage_water_factors:
        water_factor *= factor
    water_factor = max(0.12, min(1.0, water_factor))
    
    # 2. Aeration / Hypoxia Factor (Excessive Irrigation Penalty)
    # Roots need aerobic soil pores. Long waterlogging causes root death and denitrification
    capped_aeration_penalty = min(0.35, cumulative_aeration_penalty)
    aeration_factor = max(0.65, 1.0 - capped_aeration_penalty)
    if capped_aeration_penalty > 0.03:
        assumptions.append(
            f"Excess irrigation / slow drainage induced soil waterlogging causing a {capped_aeration_penalty*100:.1f}% aeration penalty."
        )
        
    # 3. Nutrient Factor (Mitscherlich-Baule with excess fertilizer penalty already incorporated)
    nutr_factor = max(0.20, min(1.02, nutrient_factor))
    if excess_fertilizer_penalty_pct > 0:
        assumptions.append(
            f"Excess fertilizer application resulted in a {excess_fertilizer_penalty_pct:.1f}% penalty (stem lodging/vegetative rankness)."
        )
        
    # 4. Thermal Stress Factor
    capped_heat_penalty = min(0.40, heat_stress_penalty)
    temp_factor = max(0.60, 1.0 - capped_heat_penalty)
    if capped_heat_penalty > 0.02:
        assumptions.append(f"Daytime heat extremes reduced pollination efficiency by {capped_heat_penalty*100:.1f}%.")
        
    # 5. Sowing Suitability Factor
    sow_factor = max(0.50, min(1.0, sowing_suitability_factor))
    if sow_factor < 0.98:
        assumptions.append(f"Sub-optimal sowing date alignment reduced potential yield by {(1.0 - sow_factor)*100:.1f}%.")
        
    # 6. Final Yield Calculation with Non-Negativity and Extrapolation Safeguards
    combined_scaling = water_factor * aeration_factor * nutr_factor * temp_factor * sow_factor
    
    # Prevent negative yields and uncontrolled upper extrapolation (> 1.15x potential)
    raw_yield_kg_ha = ref_yield_kg_ha * combined_scaling
    final_yield_kg_ha = max(0.0, min(ref_yield_kg_ha * 1.15, raw_yield_kg_ha))
    
    # Convert to standard units
    yield_q_acre = kg_per_ha_to_quintals_per_acre(final_yield_kg_ha)
    total_harvest_kg = final_yield_kg_ha * farm_area_ha
    total_harvest_quintals = total_harvest_kg / 100.0
    total_harvest_tonnes = total_harvest_kg / 1000.0
    
    yield_gap_pct = max(0.0, ((ref_yield_kg_ha - final_yield_kg_ha) / max(1.0, ref_yield_kg_ha)) * 100.0)
    
    # Transparency disclosures
    model_version = "AgriSim-YieldEngine-v2.0"
    if is_experimental_crop or not crop_params.is_validated:
        is_validated = False
        data_provenance = "Experimental / Illustrative Model Parameters (Not Peer-Validated Field Trials)"
        limitations.append("Experimental crop parameters: outputs are illustrative scenarios and should not be treated as certified agricultural guarantees.")
    else:
        is_validated = True
        data_provenance = crop_params.data_provenance
        limitations.append("Biophysical model captures principal abiotic drivers (water, nutrients, temperature, sowing date). Extreme pest outbreaks or hail storms are excluded.")
        
    return YieldEstimationResult(
        crop_id=crop_params.id,
        crop_name=crop_params.name,
        reference_yield_kg_ha=round(ref_yield_kg_ha, 1),
        reference_yield_quintal_acre=round(crop_params.reference_yield_quintal_acre, 1),
        estimated_yield_kg_ha=round(final_yield_kg_ha, 1),
        estimated_yield_quintal_acre=round(yield_q_acre, 2),
        estimated_total_harvest_kg=round(total_harvest_kg, 1),
        estimated_total_harvest_quintals=round(total_harvest_quintals, 2),
        estimated_total_harvest_tonnes=round(total_harvest_tonnes, 3),
        yield_gap_pct=round(yield_gap_pct, 1),
        water_response_factor=round(water_factor, 3),
        aeration_hypoxia_factor=round(aeration_factor, 3),
        nutrient_response_factor=round(nutr_factor, 3),
        temperature_stress_factor=round(temp_factor, 3),
        sowing_suitability_factor=round(sow_factor, 3),
        excess_irrigation_penalty_pct=round(capped_aeration_penalty * 100.0, 1),
        excess_fertilizer_penalty_pct=round(excess_fertilizer_penalty_pct, 1),
        model_version=model_version,
        assumptions=assumptions,
        limitations=limitations,
        data_provenance=data_provenance,
        is_validated=is_validated
    )
