"""
AgriSim AI - Dynamic Root-Zone Soil Water Balance Engine
Implements FAO-56 daily water balance model with variable root depth,
effective precipitation, irrigation application efficiencies, deep percolation,
transpiration reduction factor Ks, and aeration hypoxia penalties from excessive irrigation.
"""

import math
from typing import Dict, Any, Tuple, Optional
from app.simulation.unit_conversions import calculate_irrigation_volume_m3

# Irrigation application efficiencies based on ICAR & FAO standards
IRRIGATION_EFFICIENCIES: Dict[str, float] = {
    "drip": 0.92,
    "sprinkler": 0.80,
    "furrow": 0.65,
    "flood": 0.55,
    "rainfed": 1.00
}

class SoilWaterBalance:
    def __init__(
        self,
        soil_props: Dict[str, Any],
        root_depth_min_m: float,
        root_depth_max_m: float,
        p_base: float,
        mulching: bool = False,
        waterlogging_sensitivity: float = 0.50
    ):
        self.fc = float(soil_props.get("field_capacity_vol", 0.28))
        self.pwp = float(soil_props.get("wilting_point_vol", 0.13))
        self.sat = float(soil_props.get("saturation_vol", 0.46))
        self.awc_mm_per_m = (self.fc - self.pwp) * 1000.0
        self.ksat_mm_day = float(soil_props.get("ksat_mm_day", 350.0))
        
        self.root_min = root_depth_min_m
        self.root_max = root_depth_max_m
        self.p_base = p_base
        self.mulching = mulching
        self.waterlogging_sensitivity = waterlogging_sensitivity
        
        # Initial condition: Soil starts at ~85% available water capacity
        self.current_root_depth = self.root_min
        self.current_taw = self.awc_mm_per_m * self.current_root_depth
        self.dr = 0.15 * self.current_taw  # initial depletion
        self.consecutive_saturated_days = 0
        
    def step_daily(
        self,
        gdd_fraction: float,
        et0: float,
        kc: float,
        precip: float,
        irrigation_mm: float,
        irrigation_method: str = "drip"
    ) -> Dict[str, float]:
        """
        Executes one daily time step of the soil water balance.
        """
        # 1. Update root zone depth based on sigmoid progression of development
        root_growth_prog = min(1.0, max(0.0, 1.0 / (1.0 + math.exp(-6.0 * (gdd_fraction - 0.4)))))
        self.current_root_depth = self.root_min + (self.root_max - self.root_min) * root_growth_prog
        self.current_taw = max(5.0, self.awc_mm_per_m * self.current_root_depth)
        
        # 2. Potential Crop Evapotranspiration (ETc) = Total Crop Water Demand
        kc_effective = kc
        if self.mulching:
            kc_effective = max(0.25, kc * 0.88)
        etc = max(0.2, kc_effective * et0)
        
        # 3. Readily Available Water (RAW) with ETc adjustment (FAO-56 eq. 89)
        p_adj = self.p_base + 0.04 * (5.0 - etc)
        p_adj = min(0.80, max(0.15, p_adj))
        raw = p_adj * self.current_taw
        
        # 4. Transpiration Reduction Factor (Ks) (FAO-56 eq. 84)
        if self.dr <= raw:
            ks = 1.0
        elif self.dr < self.current_taw:
            ks = (self.current_taw - self.dr) / ((1.0 - p_adj) * self.current_taw)
            ks = max(0.0, min(1.0, ks))
        else:
            ks = 0.0
            
        # 5. Actual Evapotranspiration (ETa)
        eta = ks * etc
        
        # 6. Effective Rainfall (USDA-SCS empirical method)
        # Avoids double-counting: only counted when rainfall exceeds surface interception threshold
        if precip <= 4.0:
            p_eff = 0.0
        else:
            p_eff = min(precip, max(0.0, (precip - 4.0) * 0.78))
            
        # 7. Effective Irrigation (accounting for distribution uniformity & evaporation loss)
        eff = IRRIGATION_EFFICIENCIES.get(irrigation_method.lower(), 0.80)
        i_eff = irrigation_mm * eff
        
        # 8. Water Inflow and Deep Percolation (DP)
        total_inflow = p_eff + i_eff
        
        # If inflow exceeds current depletion, excess percolates below root zone
        if total_inflow > self.dr:
            dp = total_inflow - self.dr
            dr_new = 0.0
        else:
            dp = 0.0
            dr_new = self.dr - total_inflow
            
        # Add actual evapotranspiration
        dr_new = min(self.current_taw, dr_new + eta)
        self.dr = max(0.0, dr_new)
        
        # 9. Aeration Stress / Waterlogging from Excessive Irrigation
        # When deep percolation exceeds Ksat or soil moisture is at/above FC for multiple days
        daily_hypoxia_penalty = 0.0
        if total_inflow > self.ksat_mm_day:
            # Surface pooling and root suffocation
            daily_hypoxia_penalty = min(0.12, (total_inflow - self.ksat_mm_day) * 0.001 * self.waterlogging_sensitivity)
            self.consecutive_saturated_days += 1
        elif self.dr < 1.0:
            self.consecutive_saturated_days += 1
            if self.consecutive_saturated_days > 3:
                # Persistent anaerobic root zone impairs nutrient uptake and aerobic respiration
                daily_hypoxia_penalty = min(0.15, (self.consecutive_saturated_days - 3) * 0.02 * self.waterlogging_sensitivity)
        else:
            self.consecutive_saturated_days = max(0, self.consecutive_saturated_days - 1)
            
        # Calculate current volumetric soil water content (m3/m3)
        soil_water_vol = self.fc - (self.dr / (1000.0 * self.current_root_depth))
        soil_water_vol = max(self.pwp, min(self.sat, soil_water_vol))
        
        return {
            "root_depth_m": round(self.current_root_depth, 3),
            "taw_mm": round(self.current_taw, 1),
            "raw_mm": round(raw, 1),
            "etc_mm": round(etc, 2),
            "eta_mm": round(eta, 2),
            "water_stress_ks": round(ks, 3),
            "p_eff_mm": round(p_eff, 2),
            "i_eff_mm": round(i_eff, 2),
            "deep_percolation_mm": round(dp, 2),
            "soil_depletion_mm": round(self.dr, 2),
            "soil_water_vol": round(soil_water_vol, 4),
            "aeration_stress_penalty": round(daily_hypoxia_penalty, 4)
        }
