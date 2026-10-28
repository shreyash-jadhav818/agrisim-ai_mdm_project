"""
AgriSim AI - Soil Characteristics Module
Defines physical and hydraulic soil properties according to FAO-56 and USDA NRCS standards.
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional

@dataclass
class SoilCharacteristics:
    id: str
    name: str
    hindi_name: str
    description: str
    field_capacity_vol: float             # m3/m3 (volumetric water content at -33 kPa)
    wilting_point_vol: float              # m3/m3 (volumetric water content at -1500 kPa)
    saturation_vol: float                 # m3/m3 (total porosity / volumetric water at 0 kPa)
    available_water_capacity_mm_per_m: float # (field_capacity - wilting_point) * 1000
    ksat_mm_day: float                    # Saturated hydraulic conductivity (mm/day)
    default_organic_matter_pct: float     # Typical organic matter % in root zone
    bulk_density_g_cm3: float             # Dry bulk density (g/cm3)
    curve_number: int                     # USDA-SCS Runoff Curve Number for hydrological soil group
    drainage_rate_coeff: float            # Fractional daily drainage rate of gravitational water above FC

    def validate(self):
        """Validates physical and hydraulic consistency of soil parameters."""
        if not (0.02 <= self.wilting_point_vol < self.field_capacity_vol < self.saturation_vol <= 0.65):
            raise ValueError(
                f"Invalid hydraulic parameters: PWP ({self.wilting_point_vol}) must be < FC "
                f"({self.field_capacity_vol}) < SAT ({self.saturation_vol})."
            )
        if self.ksat_mm_day <= 0:
            raise ValueError("Saturated hydraulic conductivity (Ksat) must be positive.")

SOIL_REGISTRY: Dict[str, SoilCharacteristics] = {
    "Alluvial Loam": SoilCharacteristics(
        id="Alluvial Loam",
        name="Alluvial Loam",
        hindi_name="जलोढ़ दोमट",
        description="Deep, balanced silt-loam widespread across the Indo-Gangetic Plains. Optimal root aeration and moisture retention.",
        field_capacity_vol=0.28,
        wilting_point_vol=0.13,
        saturation_vol=0.46,
        available_water_capacity_mm_per_m=150.0,
        ksat_mm_day=350.0,
        default_organic_matter_pct=0.75,
        bulk_density_g_cm3=1.35,
        curve_number=72,
        drainage_rate_coeff=0.60
    ),
    "Black Cotton Soil (Vertisol)": SoilCharacteristics(
        id="Black Cotton Soil (Vertisol)",
        name="Black Cotton Soil (Vertisol)",
        hindi_name="काली कपास मिट्टी",
        description="Montmorillonite-rich heavy clay of Maharashtra, MP, and Gujarat. High moisture capacity, but poor internal drainage.",
        field_capacity_vol=0.38,
        wilting_point_vol=0.20,
        saturation_vol=0.52,
        available_water_capacity_mm_per_m=180.0,
        ksat_mm_day=60.0,
        default_organic_matter_pct=0.90,
        bulk_density_g_cm3=1.45,
        curve_number=82,
        drainage_rate_coeff=0.25
    ),
    "Red Sandy Loam": SoilCharacteristics(
        id="Red Sandy Loam",
        name="Red Sandy Loam",
        hindi_name="लाल बलुई दोमट",
        description="Permeable iron-rich soil typical of Southern India (Telangana, AP, Karnataka). Free-draining with moderate water holding.",
        field_capacity_vol=0.22,
        wilting_point_vol=0.10,
        saturation_vol=0.42,
        available_water_capacity_mm_per_m=120.0,
        ksat_mm_day=550.0,
        default_organic_matter_pct=0.50,
        bulk_density_g_cm3=1.48,
        curve_number=68,
        drainage_rate_coeff=0.75
    ),
    "Clay Loam": SoilCharacteristics(
        id="Clay Loam",
        name="Clay Loam",
        hindi_name="चिकनी दोमट",
        description="Fine-textured soil of deltaic river valleys and coastal zones with strong nutrient adsorption capacity.",
        field_capacity_vol=0.32,
        wilting_point_vol=0.16,
        saturation_vol=0.48,
        available_water_capacity_mm_per_m=160.0,
        ksat_mm_day=180.0,
        default_organic_matter_pct=1.10,
        bulk_density_g_cm3=1.38,
        curve_number=78,
        drainage_rate_coeff=0.40
    ),
    "Sandy Loam": SoilCharacteristics(
        id="Sandy Loam",
        name="Sandy Loam",
        hindi_name="बलुई दोमट",
        description="Coarse-textured warm soil of semi-arid tracts (Rajasthan, Haryana). High percolation requiring frequent light irrigations.",
        field_capacity_vol=0.18,
        wilting_point_vol=0.08,
        saturation_vol=0.40,
        available_water_capacity_mm_per_m=100.0,
        ksat_mm_day=850.0,
        default_organic_matter_pct=0.35,
        bulk_density_g_cm3=1.55,
        curve_number=64,
        drainage_rate_coeff=0.85
    ),
    "Silty Clay": SoilCharacteristics(
        id="Silty Clay",
        name="Silty Clay",
        hindi_name="गाद चिकनी मिट्टी",
        description="Heavy floodplain soil with slow infiltration, highly retentive for paddy rice.",
        field_capacity_vol=0.36,
        wilting_point_vol=0.20,
        saturation_vol=0.50,
        available_water_capacity_mm_per_m=160.0,
        ksat_mm_day=100.0,
        default_organic_matter_pct=1.20,
        bulk_density_g_cm3=1.40,
        curve_number=80,
        drainage_rate_coeff=0.30
    )
}

SOIL_ALIASES = {
    "alluvial": "Alluvial Loam",
    "black cotton": "Black Cotton Soil (Vertisol)",
    "black": "Black Cotton Soil (Vertisol)",
    "vertisol": "Black Cotton Soil (Vertisol)",
    "red loam": "Red Sandy Loam",
    "red": "Red Sandy Loam",
    "clay loam": "Clay Loam",
    "sandy loam": "Sandy Loam",
    "sandy": "Sandy Loam",
    "silty clay": "Silty Clay"
}

def get_soil_characteristics(soil_name: str, overrides: Optional[Dict[str, Any]] = None) -> SoilCharacteristics:
    """
    Retrieves soil physical properties with optional parameter customization.
    """
    clean_name = soil_name.strip()
    target_name = clean_name
    
    # Try alias lookup
    if clean_name.lower() in SOIL_ALIASES:
        target_name = SOIL_ALIASES[clean_name.lower()]
    elif clean_name not in SOIL_REGISTRY:
        for reg_key in SOIL_REGISTRY:
            if clean_name.lower() in reg_key.lower():
                target_name = reg_key
                break
        else:
            target_name = "Alluvial Loam"
            
    base = SOIL_REGISTRY[target_name]
    if not overrides:
        return base
        
    base_dict = {k: getattr(base, k) for k in base.__dict__}
    for k, v in overrides.items():
        if k in base_dict and v is not None:
            base_dict[k] = v
            
    soil = SoilCharacteristics(**base_dict)
    soil.validate()
    return soil
