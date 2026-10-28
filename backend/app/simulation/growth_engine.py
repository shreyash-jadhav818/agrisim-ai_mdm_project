"""
AgriSim AI - Phenological Growth & Crop Yield Engine
Combines GDD phenology, FAO-33 multi-stage water-yield response,
Mitscherlich-Baule law of nutrient diminishing returns, and thermal stress response.
"""

import math
from typing import Dict, Any, List, Tuple
from app.simulation.crop_data import CROP_DATABASE

class CropGrowthEngine:
    def __init__(self, crop_id: str, soil_om_pct: float = 0.8):
        if crop_id not in CROP_DATABASE:
            crop_id = "wheat"
        self.crop = CROP_DATABASE[crop_id]
        self.soil_om = max(0.2, min(3.0, soil_om_pct))
        
        # Basal soil nutrient reserves available based on organic matter
        self.n_soil = self.soil_om * 18.0  # kg N/acre
        self.p_soil = self.soil_om * 8.0   # kg P2O5/acre
        self.k_soil = self.soil_om * 12.0  # kg K2O/acre
        
        self.total_gdd = self.crop["total_gdd"]
        self.base_temp = self.crop["base_temp_c"]
        self.opt_temp = self.crop["opt_temp_c"]
        self.max_temp = self.crop["max_temp_c"]
        self.stages = self.crop["stages"]
        
    def determine_stage(self, cum_gdd: float) -> Tuple[int, Dict[str, Any], float]:
        """
        Determines current phenological stage index and properties based on accumulated GDD.
        """
        gdd_fraction = min(1.0, max(0.0, cum_gdd / self.total_gdd))
        running_fraction = 0.0
        
        for idx, stage in enumerate(self.stages):
            running_fraction += stage["gdd_fraction"]
            if gdd_fraction <= running_fraction or idx == len(self.stages) - 1:
                return idx, stage, gdd_fraction
                
        return len(self.stages) - 1, self.stages[-1], 1.0

    def calculate_daily_gdd(self, tmin: float, tmax: float) -> float:
        """
        Calculates daily growing degree days with base temperature threshold.
        """
        tmean = (tmax + tmin) / 2.0
        if tmean <= self.base_temp:
            return 0.0
        gdd = tmean - self.base_temp
        return float(gdd)

    def calculate_nutrient_factor(
        self,
        applied_n: float,
        applied_p: float,
        applied_k: float
    ) -> Tuple[float, Dict[str, float]]:
        """
        Calculates yield response factor using Mitscherlich-Baule Law:
        Y = (1 - e^(-cN * N)) * (1 - e^(-cP * P)) * (1 - e^(-cK * K))
        Normalized against standard recommended dose response.
        """
        cn = self.crop.get("cn", 0.045)
        cp = self.crop.get("cp", 0.085)
        ck = self.crop.get("ck", 0.110)
        
        # Uptake efficiencies (split applications increase uptake efficiency)
        eff_n = 0.65
        eff_p = 0.35
        eff_k = 0.70
        
        tot_n = self.n_soil + applied_n * eff_n
        tot_p = self.p_soil + applied_p * eff_p
        tot_k = self.k_soil + applied_k * eff_k
        
        resp_n = 1.0 - math.exp(-cn * tot_n)
        resp_p = 1.0 - math.exp(-cp * tot_p)
        resp_k = 1.0 - math.exp(-ck * tot_k)
        
        # Reference at 100% recommended dose
        rec_n = self.n_soil + self.crop["default_n_req_kg_acre"] * eff_n
        rec_p = self.p_soil + self.crop["default_p_req_kg_acre"] * eff_p
        rec_k = self.k_soil + self.crop["default_k_req_kg_acre"] * eff_k
        
        rec_resp_n = 1.0 - math.exp(-cn * rec_n)
        rec_resp_p = 1.0 - math.exp(-cp * rec_p)
        rec_resp_k = 1.0 - math.exp(-ck * rec_k)
        
        actual_multi = resp_n * resp_p * resp_k
        optimal_multi = rec_resp_n * rec_resp_p * rec_resp_k
        
        nutrient_ratio = min(1.08, actual_multi / optimal_multi)
        
        details = {
            "n_adequacy_pct": round(min(100.0, (resp_n / rec_resp_n) * 100.0), 1),
            "p_adequacy_pct": round(min(100.0, (resp_p / rec_resp_p) * 100.0), 1),
            "k_adequacy_pct": round(min(100.0, (resp_k / rec_resp_k) * 100.0), 1),
            "nutrient_multiplier": round(nutrient_ratio, 3)
        }
        return round(nutrient_ratio, 3), details

    def calculate_yield(
        self,
        stage_water_summary: List[Dict[str, float]],
        applied_n: float,
        applied_p: float,
        applied_k: float,
        heat_stress_penalty: float = 0.0
    ) -> Tuple[float, float, Dict[str, Any]]:
        """
        Calculates final estimated crop yield using Stewart FAO-33 multi-stage model:
        (1 - Yw/Ym) = sum(Ky_stage * (1 - ETa_stage / ETc_stage))
        Yield_final = Ym * (Yw/Ym) * NutrientFactor * (1 - heat_stress_penalty)
        """
        pot_yield = self.crop["potential_yield_quintal_acre"]
        
        # 1. Multi-stage water yield reduction
        stage_water_yield_factors = []
        for stage_stat in stage_water_summary:
            etc_sum = max(1.0, stage_stat.get("etc_sum", 1.0))
            eta_sum = stage_stat.get("eta_sum", etc_sum)
            ky = stage_stat.get("ky", 0.5)
            
            water_deficit_ratio = max(0.0, 1.0 - (eta_sum / etc_sum))
            # FAO-33 multiplicative formula per stage
            stage_rel_yield = max(0.20, 1.0 - ky * water_deficit_ratio)
            stage_water_yield_factors.append(stage_rel_yield)
            
        # Product across growth stages
        water_yield_factor = 1.0
        for f in stage_water_yield_factors:
            water_yield_factor *= f
        water_yield_factor = max(0.15, min(1.0, water_yield_factor))
        
        # 2. Nutrient factor
        nutr_factor, nutr_details = self.calculate_nutrient_factor(applied_n, applied_p, applied_k)
        
        # 3. Thermal stress factor
        temp_factor = max(0.60, min(1.0, 1.0 - heat_stress_penalty))
        
        # 4. Final actual yield
        actual_yield = pot_yield * water_yield_factor * nutr_factor * temp_factor
        actual_yield = round(max(1.0, actual_yield), 2)
        
        # Convert to kg/ha (1 quintal/acre = 247.105 kg/ha)
        yield_kg_ha = round(actual_yield * 247.105, 1)
        
        metadata = {
            "potential_yield_quintal_acre": pot_yield,
            "actual_yield_quintal_acre": actual_yield,
            "yield_kg_ha": yield_kg_ha,
            "water_factor": round(water_yield_factor, 3),
            "nutrient_factor": nutr_factor,
            "temp_factor": round(temp_factor, 3),
            "nutrient_details": nutr_details,
            "yield_gap_pct": round(max(0.0, (1.0 - actual_yield / pot_yield) * 100.0), 1)
        }
        return actual_yield, yield_kg_ha, metadata
