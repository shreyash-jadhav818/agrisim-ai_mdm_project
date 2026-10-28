"""
AgriSim AI - Validated Soil Database for Indian Agricultural Soil Orders
Data references: FAO-56 Table 19, USDA Natural Resources Conservation Service (NRCS),
and ICAR-National Bureau of Soil Survey and Land Use Planning (NBSS&LUP).
"""

from typing import Dict, Any

SOIL_DATABASE: Dict[str, Dict[str, Any]] = {
    "Alluvial Loam": {
        "id": "Alluvial Loam",
        "name": "Alluvial Loam",
        "hindi_name": "जलोढ़ दोमट मिट्टी",
        "description": "Fertile, deep silt-loam found across the Indo-Gangetic Plains (Punjab, Haryana, UP, Bihar, West Bengal). Ideal porosity and balanced drainage.",
        "field_capacity_vol": 0.28,      # m3/m3 (28% vol)
        "wilting_point_vol": 0.13,       # m3/m3 (13% vol)
        "saturation_vol": 0.46,          # m3/m3 (46% vol)
        "available_water_mm_per_m": 150.0, # (0.28 - 0.13) * 1000 = 150 mm/m
        "ksat_mm_day": 350.0,            # Moderate-fast infiltration
        "default_om_pct": 0.75,          # Typical organic matter % in plains
        "bulk_density_g_cm3": 1.35,
        "curve_number": 72
    },
    "Black Cotton Soil (Vertisol)": {
        "id": "Black Cotton Soil (Vertisol)",
        "name": "Black Cotton Soil (Vertisol)",
        "hindi_name": "काली कपास मिट्टी (रेगुर)",
        "description": "Rich in montmorillonite clay found in Maharashtra, MP, Gujarat and Karnataka. Exceptional water holding capacity, but swells when wet and shrinks/cracks when dry.",
        "field_capacity_vol": 0.38,
        "wilting_point_vol": 0.20,
        "saturation_vol": 0.52,
        "available_water_mm_per_m": 180.0,
        "ksat_mm_day": 60.0,             # Slow drainage, prone to waterlogging
        "default_om_pct": 0.90,
        "bulk_density_g_cm3": 1.45,
        "curve_number": 82
    },
    "Red Sandy Loam": {
        "id": "Red Sandy Loam",
        "name": "Red Sandy Loam",
        "hindi_name": "लाल बलुई दोमट मिट्टी",
        "description": "Rich in iron oxides, predominant in Tamil Nadu, Telangana, Andhra Pradesh, and Odisha. Free draining, moderate fertility, benefits greatly from mulching.",
        "field_capacity_vol": 0.22,
        "wilting_point_vol": 0.10,
        "saturation_vol": 0.42,
        "available_water_mm_per_m": 120.0,
        "ksat_mm_day": 550.0,            # High percolation rate
        "default_om_pct": 0.50,
        "bulk_density_g_cm3": 1.48,
        "curve_number": 68
    },
    "Clay Loam": {
        "id": "Clay Loam",
        "name": "Clay Loam",
        "hindi_name": "चिकनी दोमट मिट्टी",
        "description": "Fine-textured balanced soil widespread in deltaic regions and lower river basins. Strong nutrient retention and high moisture buffering.",
        "field_capacity_vol": 0.32,
        "wilting_point_vol": 0.16,
        "saturation_vol": 0.48,
        "available_water_mm_per_m": 160.0,
        "ksat_mm_day": 180.0,
        "default_om_pct": 1.10,
        "bulk_density_g_cm3": 1.38,
        "curve_number": 78
    },
    "Sandy Loam": {
        "id": "Sandy Loam",
        "name": "Sandy Loam",
        "hindi_name": "बलुई दोमट मिट्टी",
        "description": "Light coarse soil prevalent in arid/semi-arid tracts of Rajasthan, Haryana and North Gujarat. Warm soil, fast root penetration, requires frequent light irrigation.",
        "field_capacity_vol": 0.18,
        "wilting_point_vol": 0.08,
        "saturation_vol": 0.40,
        "available_water_mm_per_m": 100.0,
        "ksat_mm_day": 850.0,
        "default_om_pct": 0.35,
        "bulk_density_g_cm3": 1.55,
        "curve_number": 64
    },
    "Silty Clay": {
        "id": "Silty Clay",
        "name": "Silty Clay",
        "hindi_name": "गाद चिकनी मिट्टी",
        "description": "Heavy floodplain soil with high silt and clay fraction. Outstanding moisture retention, well suited for wetland rice and sugarcane.",
        "field_capacity_vol": 0.36,
        "wilting_point_vol": 0.20,
        "saturation_vol": 0.50,
        "available_water_mm_per_m": 160.0,
        "ksat_mm_day": 100.0,
        "default_om_pct": 1.20,
        "bulk_density_g_cm3": 1.40,
        "curve_number": 80
    }
}
