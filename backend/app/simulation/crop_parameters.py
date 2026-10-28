"""
AgriSim AI - Configurable Crop Parameters
Separates agronomic crop definitions from calculation logic according to FAO-56,
FAO-33, and ICAR (Indian Council of Agricultural Research) agronomic standards.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List

@dataclass
class CropStageParameters:
    name: str
    duration_fraction: float
    kc: float
    ky: float
    description: str

@dataclass
class CropParameters:
    id: str
    name: str
    hindi_name: str
    botanical_name: str
    season: str                                # Kharif, Rabi, Annual
    reference_yield_kg_ha: float               # Potential yield under optimal water/nutrient
    reference_yield_quintal_acre: float
    typical_duration_days: int
    base_temperature_c: float                  # Tbase for GDD accumulation
    optimal_temperature_c: float               # Topt for vegetative and grain growth
    max_temperature_c: float                   # Tmax upper biological limit
    critical_heat_threshold_c: float           # Threshold temperature causing floret sterility
    growing_degree_days_total: float           # Total accumulated GDD to physiological maturity
    kc_initial: float                          # FAO-56 crop coefficient initial stage
    kc_mid: float                              # FAO-56 crop coefficient mid-season
    kc_late: float                             # FAO-56 crop coefficient end stage
    ky_total: float                            # FAO-33 seasonal yield response factor
    optimal_water_requirement_mm: float        # Benchmark total seasonal crop water requirement
    min_water_requirement_mm: float            # Absolute minimum water threshold for survival
    root_depth_min_m: float                    # Initial root zone depth (metres)
    root_depth_max_m: float                    # Maximum effective rooting depth (metres)
    allowable_depletion_fraction_p: float      # FAO-56 Table 22 soil water depletion fraction
    optimal_nitrogen_kg_ha: float              # Recommended nitrogen dose (kg N/ha)
    optimal_phosphorus_kg_ha: float            # Recommended phosphorus dose (kg P2O5/ha)
    optimal_potassium_kg_ha: float             # Recommended potassium dose (kg K2O/ha)
    nitrogen_response_coeff: float             # Mitscherlich-Baule c_N response factor
    phosphorus_response_coeff: float           # Mitscherlich-Baule c_P response factor
    potassium_response_coeff: float            # Mitscherlich-Baule c_K response factor
    excess_nitrogen_threshold_kg_ha: float     # Threshold above which vegetative lodging occurs
    excess_fertilizer_sensitivity: float       # Yield penalty rate per unit excess nutrient
    waterlogging_sensitivity: float            # Susceptibility to soil hypoxia (0 = immune, 1 = severe)
    optimal_sowing_window: Dict[str, int]      # Sowing calendar: start_month, start_day, end_month, end_day
    stages: List[CropStageParameters] = field(default_factory=list)
    is_validated: bool = True
    data_provenance: str = "FAO Irrigation and Drainage Paper 56, FAO-33, ICAR Benchmark Data"
    model_version: str = "AgriSim-Crop-v1.2"

# 10 Core Indian Crops supported with validated agronomic parameters
CORE_CROP_REGISTRY: Dict[str, CropParameters] = {
    "rice": CropParameters(
        id="rice",
        name="Rice / Paddy",
        hindi_name="धान",
        botanical_name="Oryza sativa",
        season="Kharif",
        reference_yield_kg_ha=6200.0,
        reference_yield_quintal_acre=25.1,
        typical_duration_days=130,
        base_temperature_c=10.0,
        optimal_temperature_c=28.0,
        max_temperature_c=38.0,
        critical_heat_threshold_c=36.0,
        growing_degree_days_total=2100.0,
        kc_initial=1.05,
        kc_mid=1.20,
        kc_late=0.90,
        ky_total=1.10,
        optimal_water_requirement_mm=1150.0,
        min_water_requirement_mm=650.0,
        root_depth_min_m=0.20,
        root_depth_max_m=0.70,
        allowable_depletion_fraction_p=0.20,
        optimal_nitrogen_kg_ha=120.0,
        optimal_phosphorus_kg_ha=60.0,
        optimal_potassium_kg_ha=50.0,
        nitrogen_response_coeff=0.042,
        phosphorus_response_coeff=0.080,
        potassium_response_coeff=0.100,
        excess_nitrogen_threshold_kg_ha=180.0,
        excess_fertilizer_sensitivity=0.0020,
        waterlogging_sensitivity=0.05,         # Rice thrives in flooded/puddled conditions
        optimal_sowing_window={"start_month": 6, "start_day": 10, "end_month": 7, "end_day": 15},
        stages=[
            CropStageParameters("Initial (Transplanting)", 0.16, 1.05, 0.15, "Transplanting & rooting"),
            CropStageParameters("Development (Tillering)", 0.27, 1.15, 0.55, "Rapid tillering & panicle initiation"),
            CropStageParameters("Mid-Season (Heading/Grain Fill)", 0.37, 1.25, 0.60, "Flowering & dough development"),
            CropStageParameters("Late Season (Ripening)", 0.20, 0.90, 0.10, "Grain drydown to harvest")
        ]
    ),
    "wheat": CropParameters(
        id="wheat",
        name="Wheat",
        hindi_name="गेहूं",
        botanical_name="Triticum aestivum",
        season="Rabi",
        reference_yield_kg_ha=5400.0,
        reference_yield_quintal_acre=21.8,
        typical_duration_days=135,
        base_temperature_c=5.0,
        optimal_temperature_c=20.0,
        max_temperature_c=32.0,
        critical_heat_threshold_c=31.0,        # Terminal heat during anthesis reduces test weight
        growing_degree_days_total=1800.0,
        kc_initial=0.40,
        kc_mid=1.15,
        kc_late=0.30,
        ky_total=1.05,
        optimal_water_requirement_mm=450.0,
        min_water_requirement_mm=220.0,
        root_depth_min_m=0.25,
        root_depth_max_m=1.20,
        allowable_depletion_fraction_p=0.55,
        optimal_nitrogen_kg_ha=120.0,
        optimal_phosphorus_kg_ha=60.0,
        optimal_potassium_kg_ha=40.0,
        nitrogen_response_coeff=0.045,
        phosphorus_response_coeff=0.085,
        potassium_response_coeff=0.110,
        excess_nitrogen_threshold_kg_ha=165.0, # Excessive N causes lodging and rust susceptibility
        excess_fertilizer_sensitivity=0.0025,
        waterlogging_sensitivity=0.65,
        optimal_sowing_window={"start_month": 11, "start_day": 1, "end_month": 11, "end_day": 25},
        stages=[
            CropStageParameters("Initial (Crown Root)", 0.15, 0.40, 0.20, "Crown root initiation (CRI)"),
            CropStageParameters("Development (Tillering/Jointing)", 0.28, 0.85, 0.60, "Vegetative shoot elongation"),
            CropStageParameters("Mid-Season (Anthesis/Flowering)", 0.35, 1.15, 0.50, "Flowering & grain filling"),
            CropStageParameters("Late Season (Ripening)", 0.22, 0.30, 0.15, "Dough to maturity")
        ]
    ),
    "maize": CropParameters(
        id="maize",
        name="Maize / Corn",
        hindi_name="मक्का",
        botanical_name="Zea mays",
        season="Kharif",
        reference_yield_kg_ha=6800.0,
        reference_yield_quintal_acre=27.5,
        typical_duration_days=105,
        base_temperature_c=10.0,
        optimal_temperature_c=28.0,
        max_temperature_c=36.0,
        critical_heat_threshold_c=35.0,
        growing_degree_days_total=1650.0,
        kc_initial=0.40,
        kc_mid=1.20,
        kc_late=0.55,
        ky_total=1.25,
        optimal_water_requirement_mm=550.0,
        min_water_requirement_mm=300.0,
        root_depth_min_m=0.25,
        root_depth_max_m=1.20,
        allowable_depletion_fraction_p=0.55,
        optimal_nitrogen_kg_ha=120.0,
        optimal_phosphorus_kg_ha=60.0,
        optimal_potassium_kg_ha=45.0,
        nitrogen_response_coeff=0.048,
        phosphorus_response_coeff=0.085,
        potassium_response_coeff=0.105,
        excess_nitrogen_threshold_kg_ha=180.0,
        excess_fertilizer_sensitivity=0.0020,
        waterlogging_sensitivity=0.75,         # Highly vulnerable to waterlogging at seedling stage
        optimal_sowing_window={"start_month": 6, "start_day": 20, "end_month": 7, "end_day": 20},
        stages=[
            CropStageParameters("Initial (Seedling)", 0.18, 0.40, 0.20, "Emergence to 4-leaf stage"),
            CropStageParameters("Development (Knee-high/Tasseling)", 0.28, 0.85, 0.60, "Stem elongation & tassel emergence"),
            CropStageParameters("Mid-Season (Silking & Grain Fill)", 0.35, 1.20, 0.80, "Pollination & kernel formation"),
            CropStageParameters("Late Season (Maturity)", 0.19, 0.55, 0.20, "Dent stage to black layer")
        ]
    ),
    "soybean": CropParameters(
        id="soybean",
        name="Soybean",
        hindi_name="सोयाबीन",
        botanical_name="Glycine max",
        season="Kharif",
        reference_yield_kg_ha=2700.0,
        reference_yield_quintal_acre=10.9,
        typical_duration_days=100,
        base_temperature_c=10.0,
        optimal_temperature_c=27.0,
        max_temperature_c=36.0,
        critical_heat_threshold_c=35.0,
        growing_degree_days_total=1600.0,
        kc_initial=0.40,
        kc_mid=1.15,
        kc_late=0.50,
        ky_total=0.85,
        optimal_water_requirement_mm=480.0,
        min_water_requirement_mm=260.0,
        root_depth_min_m=0.20,
        root_depth_max_m=0.90,
        allowable_depletion_fraction_p=0.50,
        optimal_nitrogen_kg_ha=30.0,           # Fixes atmospheric N
        optimal_phosphorus_kg_ha=60.0,
        optimal_potassium_kg_ha=40.0,
        nitrogen_response_coeff=0.085,
        phosphorus_response_coeff=0.090,
        potassium_response_coeff=0.110,
        excess_nitrogen_threshold_kg_ha=80.0,  # Excessive N suppresses nodulation
        excess_fertilizer_sensitivity=0.0035,
        waterlogging_sensitivity=0.70,
        optimal_sowing_window={"start_month": 6, "start_day": 15, "end_month": 7, "end_day": 10},
        stages=[
            CropStageParameters("Initial (Emergence)", 0.17, 0.40, 0.15, "Emergence to 1st trifoliate"),
            CropStageParameters("Development (Canopy Growth)", 0.27, 0.85, 0.50, "Vegetative branching"),
            CropStageParameters("Mid-Season (Pod Set & Seed Fill)", 0.36, 1.15, 0.60, "Flowering & seed growth"),
            CropStageParameters("Late Season (Maturity)", 0.20, 0.50, 0.15, "Pod yellowing and leaf fall")
        ]
    ),
    "cotton": CropParameters(
        id="cotton",
        name="Cotton",
        hindi_name="कपास",
        botanical_name="Gossypium hirsutum",
        season="Kharif",
        reference_yield_kg_ha=2900.0,          # Seed cotton
        reference_yield_quintal_acre=11.7,
        typical_duration_days=165,
        base_temperature_c=15.0,
        optimal_temperature_c=30.0,
        max_temperature_c=40.0,
        critical_heat_threshold_c=39.0,
        growing_degree_days_total=2400.0,
        kc_initial=0.45,
        kc_mid=1.15,
        kc_late=0.65,
        ky_total=0.85,
        optimal_water_requirement_mm=700.0,
        min_water_requirement_mm=380.0,
        root_depth_min_m=0.30,
        root_depth_max_m=1.50,
        allowable_depletion_fraction_p=0.65,
        optimal_nitrogen_kg_ha=110.0,
        optimal_phosphorus_kg_ha=55.0,
        optimal_potassium_kg_ha=55.0,
        nitrogen_response_coeff=0.040,
        phosphorus_response_coeff=0.075,
        potassium_response_coeff=0.095,
        excess_nitrogen_threshold_kg_ha=170.0, # Excessive N causes excessive vegetative rank growth
        excess_fertilizer_sensitivity=0.0022,
        waterlogging_sensitivity=0.80,         # Very sensitive to root suffocation
        optimal_sowing_window={"start_month": 5, "start_day": 15, "end_month": 6, "end_day": 20},
        stages=[
            CropStageParameters("Initial (Seedling)", 0.16, 0.45, 0.20, "Emergence to squaring"),
            CropStageParameters("Development (Squaring)", 0.28, 0.80, 0.50, "Square & flower bud formation"),
            CropStageParameters("Mid-Season (Boll Setting)", 0.36, 1.15, 0.60, "Peak bloom and boll development"),
            CropStageParameters("Late Season (Boll Opening)", 0.20, 0.65, 0.25, "Boll dehiscence and fiber drying")
        ]
    ),
    "sugarcane": CropParameters(
        id="sugarcane",
        name="Sugarcane",
        hindi_name="गन्ना",
        botanical_name="Saccharum officinarum",
        season="Annual",
        reference_yield_kg_ha=92000.0,         # Fresh cane stalks
        reference_yield_quintal_acre=372.3,
        typical_duration_days=330,
        base_temperature_c=12.0,
        optimal_temperature_c=32.0,
        max_temperature_c=42.0,
        critical_heat_threshold_c=41.0,
        growing_degree_days_total=4200.0,
        kc_initial=0.50,
        kc_mid=1.25,
        kc_late=0.75,
        ky_total=1.20,
        optimal_water_requirement_mm=1600.0,
        min_water_requirement_mm=850.0,
        root_depth_min_m=0.30,
        root_depth_max_m=1.80,
        allowable_depletion_fraction_p=0.65,
        optimal_nitrogen_kg_ha=250.0,
        optimal_phosphorus_kg_ha=100.0,
        optimal_potassium_kg_ha=120.0,
        nitrogen_response_coeff=0.035,
        phosphorus_response_coeff=0.070,
        potassium_response_coeff=0.085,
        excess_nitrogen_threshold_kg_ha=350.0, # Excessive N lowers juice sucrose purity
        excess_fertilizer_sensitivity=0.0015,
        waterlogging_sensitivity=0.30,
        optimal_sowing_window={"start_month": 2, "start_day": 1, "end_month": 3, "end_day": 15},
        stages=[
            CropStageParameters("Initial (Germination/Tillering)", 0.18, 0.50, 0.30, "Sprouting & tillering"),
            CropStageParameters("Development (Grand Growth)", 0.35, 0.95, 0.70, "Rapid internode elongation"),
            CropStageParameters("Mid-Season (Cane Elongation)", 0.35, 1.25, 0.65, "Peak biomass and juice storage"),
            CropStageParameters("Late Season (Ripening)", 0.12, 0.75, 0.20, "Sucrose synthesis and curing")
        ]
    ),
    "groundnut": CropParameters(
        id="groundnut",
        name="Groundnut / Peanut",
        hindi_name="मूंगफली",
        botanical_name="Arachis hypogaea",
        season="Kharif",
        reference_yield_kg_ha=3100.0,
        reference_yield_quintal_acre=12.5,
        typical_duration_days=115,
        base_temperature_c=12.0,
        optimal_temperature_c=28.0,
        max_temperature_c=36.0,
        critical_heat_threshold_c=36.0,
        growing_degree_days_total=1750.0,
        kc_initial=0.40,
        kc_mid=1.10,
        kc_late=0.60,
        ky_total=0.70,
        optimal_water_requirement_mm=520.0,
        min_water_requirement_mm=280.0,
        root_depth_min_m=0.20,
        root_depth_max_m=0.90,
        allowable_depletion_fraction_p=0.50,
        optimal_nitrogen_kg_ha=25.0,
        optimal_phosphorus_kg_ha=50.0,
        optimal_potassium_kg_ha=50.0,
        nitrogen_response_coeff=0.085,
        phosphorus_response_coeff=0.090,
        potassium_response_coeff=0.105,
        excess_nitrogen_threshold_kg_ha=70.0,
        excess_fertilizer_sensitivity=0.0030,
        waterlogging_sensitivity=0.65,
        optimal_sowing_window={"start_month": 6, "start_day": 15, "end_month": 7, "end_day": 15},
        stages=[
            CropStageParameters("Initial (Vegetative)", 0.18, 0.40, 0.15, "Emergence & seedling growth"),
            CropStageParameters("Development (Flowering/Pegging)", 0.28, 0.85, 0.60, "Peg penetration into soil"),
            CropStageParameters("Mid-Season (Pod Development)", 0.36, 1.10, 0.50, "Underground pod enlargement"),
            CropStageParameters("Late Season (Ripening)", 0.18, 0.60, 0.15, "Shell hardening & kernel filling")
        ]
    ),
    "chickpea": CropParameters(
        id="chickpea",
        name="Chickpea / Bengal Gram",
        hindi_name="चना",
        botanical_name="Cicer arietinum",
        season="Rabi",
        reference_yield_kg_ha=2350.0,
        reference_yield_quintal_acre=9.5,
        typical_duration_days=115,
        base_temperature_c=7.0,
        optimal_temperature_c=22.0,
        max_temperature_c=33.0,
        critical_heat_threshold_c=32.0,
        growing_degree_days_total=1450.0,
        kc_initial=0.40,
        kc_mid=1.05,
        kc_late=0.35,
        ky_total=0.70,
        optimal_water_requirement_mm=320.0,
        min_water_requirement_mm=160.0,
        root_depth_min_m=0.20,
        root_depth_max_m=1.00,
        allowable_depletion_fraction_p=0.60,
        optimal_nitrogen_kg_ha=25.0,
        optimal_phosphorus_kg_ha=50.0,
        optimal_potassium_kg_ha=25.0,
        nitrogen_response_coeff=0.090,
        phosphorus_response_coeff=0.095,
        potassium_response_coeff=0.120,
        excess_nitrogen_threshold_kg_ha=60.0,
        excess_fertilizer_sensitivity=0.0040,
        waterlogging_sensitivity=0.85,         # Extremely sensitive to standing water (wilt & collar rot)
        optimal_sowing_window={"start_month": 10, "start_day": 15, "end_month": 11, "end_day": 10},
        stages=[
            CropStageParameters("Initial (Seedling)", 0.17, 0.40, 0.15, "Germination & branching"),
            CropStageParameters("Development (Pre-Flowering)", 0.28, 0.75, 0.45, "Canopy spread & floral buds"),
            CropStageParameters("Mid-Season (Pod Development)", 0.36, 1.05, 0.50, "Pod setting & seed growth"),
            CropStageParameters("Late Season (Maturity)", 0.19, 0.35, 0.15, "Pod desiccation to harvest")
        ]
    ),
    "sorghum": CropParameters(
        id="sorghum",
        name="Sorghum / Jowar",
        hindi_name="ज्वार",
        botanical_name="Sorghum bicolor",
        season="Kharif",
        reference_yield_kg_ha=3950.0,
        reference_yield_quintal_acre=16.0,
        typical_duration_days=105,
        base_temperature_c=10.0,
        optimal_temperature_c=30.0,
        max_temperature_c=40.0,
        critical_heat_threshold_c=38.0,
        growing_degree_days_total=1600.0,
        kc_initial=0.38,
        kc_mid=1.05,
        kc_late=0.45,
        ky_total=0.70,
        optimal_water_requirement_mm=450.0,
        min_water_requirement_mm=220.0,
        root_depth_min_m=0.25,
        root_depth_max_m=1.40,
        allowable_depletion_fraction_p=0.60,
        optimal_nitrogen_kg_ha=80.0,
        optimal_phosphorus_kg_ha=40.0,
        optimal_potassium_kg_ha=30.0,
        nitrogen_response_coeff=0.055,
        phosphorus_response_coeff=0.090,
        potassium_response_coeff=0.115,
        excess_nitrogen_threshold_kg_ha=130.0,
        excess_fertilizer_sensitivity=0.0025,
        waterlogging_sensitivity=0.55,
        optimal_sowing_window={"start_month": 6, "start_day": 20, "end_month": 7, "end_day": 15},
        stages=[
            CropStageParameters("Initial (Seedling)", 0.18, 0.38, 0.15, "Emergence to 5-leaf"),
            CropStageParameters("Development (Stem Extension)", 0.28, 0.78, 0.45, "Rapid vegetative growth"),
            CropStageParameters("Mid-Season (Booting & Flowering)", 0.36, 1.05, 0.55, "Head emergence & pollination"),
            CropStageParameters("Late Season (Ripening)", 0.18, 0.45, 0.15, "Grain filling & physiological maturity")
        ]
    ),
    "pearl_millet": CropParameters(
        id="pearl_millet",
        name="Pearl Millet / Bajra",
        hindi_name="बाजरा",
        botanical_name="Pennisetum glaucum",
        season="Kharif",
        reference_yield_kg_ha=3450.0,
        reference_yield_quintal_acre=14.0,
        typical_duration_days=85,
        base_temperature_c=12.0,
        optimal_temperature_c=32.0,
        max_temperature_c=44.0,
        critical_heat_threshold_c=42.0,
        growing_degree_days_total=1400.0,
        kc_initial=0.35,
        kc_mid=1.00,
        kc_late=0.40,
        ky_total=0.60,
        optimal_water_requirement_mm=350.0,
        min_water_requirement_mm=180.0,
        root_depth_min_m=0.25,
        root_depth_max_m=1.30,
        allowable_depletion_fraction_p=0.65,
        optimal_nitrogen_kg_ha=60.0,
        optimal_phosphorus_kg_ha=30.0,
        optimal_potassium_kg_ha=25.0,
        nitrogen_response_coeff=0.060,
        phosphorus_response_coeff=0.095,
        potassium_response_coeff=0.120,
        excess_nitrogen_threshold_kg_ha=110.0,
        excess_fertilizer_sensitivity=0.0028,
        waterlogging_sensitivity=0.60,
        optimal_sowing_window={"start_month": 6, "start_day": 25, "end_month": 7, "end_day": 20},
        stages=[
            CropStageParameters("Initial (Establishment)", 0.18, 0.35, 0.10, "Rapid emergence"),
            CropStageParameters("Development (Tillering)", 0.28, 0.75, 0.40, "Tillering & panicle initiation"),
            CropStageParameters("Mid-Season (Heading & Grain Fill)", 0.36, 1.00, 0.50, "Compact head flowering"),
            CropStageParameters("Late Season (Maturity)", 0.18, 0.40, 0.10, "Hard dough to harvest")
        ]
    ),
    "mustard": CropParameters(
        id="mustard",
        name="Mustard / Rapeseed",
        hindi_name="सरसों",
        botanical_name="Brassica juncea",
        season="Rabi",
        reference_yield_kg_ha=2200.0,
        reference_yield_quintal_acre=8.9,
        typical_duration_days=120,
        base_temperature_c=5.0,
        optimal_temperature_c=21.0,
        max_temperature_c=30.0,
        critical_heat_threshold_c=28.0,
        growing_degree_days_total=1500.0,
        kc_initial=0.35,
        kc_mid=1.10,
        kc_late=0.40,
        ky_total=0.75,
        optimal_water_requirement_mm=380.0,
        min_water_requirement_mm=220.0,
        root_depth_min_m=0.20,
        root_depth_max_m=1.10,
        allowable_depletion_fraction_p=0.60,
        optimal_nitrogen_kg_ha=80.0,
        optimal_phosphorus_kg_ha=40.0,
        optimal_potassium_kg_ha=30.0,
        nitrogen_response_coeff=0.055,
        phosphorus_response_coeff=0.090,
        potassium_response_coeff=0.115,
        excess_nitrogen_threshold_kg_ha=140.0,
        excess_fertilizer_sensitivity=0.0030,
        waterlogging_sensitivity=0.80,
        optimal_sowing_window={"start_month": 10, "start_day": 10, "end_month": 11, "end_day": 5},
        stages=[
            CropStageParameters("Initial (Rosette)", 0.18, 0.35, 0.15, "Rosette leaf formation"),
            CropStageParameters("Development (Stem)", 0.26, 0.80, 0.45, "Branching & flower bud emergence"),
            CropStageParameters("Mid-Season (Flowering & Siliqua)", 0.36, 1.10, 0.55, "Siliqua pod formation"),
            CropStageParameters("Late Season (Seed Filling)", 0.20, 0.40, 0.15, "Pod drydown & oil synthesis")
        ]
    ),
    "tomato": CropParameters(
        id="tomato",
        name="Tomato",
        hindi_name="टमाटर",
        botanical_name="Solanum lycopersicum",
        season="Rabi",
        reference_yield_kg_ha=40000.0,
        reference_yield_quintal_acre=161.9,
        typical_duration_days=125,
        base_temperature_c=10.0,
        optimal_temperature_c=24.0,
        max_temperature_c=35.0,
        critical_heat_threshold_c=34.0,
        growing_degree_days_total=1600.0,
        kc_initial=0.60,
        kc_mid=1.15,
        kc_late=0.80,
        ky_total=1.05,
        optimal_water_requirement_mm=550.0,
        min_water_requirement_mm=350.0,
        root_depth_min_m=0.20,
        root_depth_max_m=0.80,
        allowable_depletion_fraction_p=0.40,
        optimal_nitrogen_kg_ha=150.0,
        optimal_phosphorus_kg_ha=90.0,
        optimal_potassium_kg_ha=100.0,
        nitrogen_response_coeff=0.045,
        phosphorus_response_coeff=0.075,
        potassium_response_coeff=0.090,
        excess_nitrogen_threshold_kg_ha=250.0,
        excess_fertilizer_sensitivity=0.0022,
        waterlogging_sensitivity=0.85,
        optimal_sowing_window={"start_month": 10, "start_day": 1, "end_month": 11, "end_day": 20},
        stages=[
            CropStageParameters("Initial (Transplanting)", 0.18, 0.60, 0.20, "Seedling establishment"),
            CropStageParameters("Development (Vegetative & Bloom)", 0.28, 0.90, 0.55, "First flower truss"),
            CropStageParameters("Mid-Season (Fruiting)", 0.38, 1.15, 0.65, "Main fruit development & picking"),
            CropStageParameters("Late Season (Ripening)", 0.16, 0.80, 0.20, "Final harvest picking")
        ]
    ),
    "potato": CropParameters(
        id="potato",
        name="Potato",
        hindi_name="आलू",
        botanical_name="Solanum tuberosum",
        season="Rabi",
        typical_duration_days=105,
        reference_yield_kg_ha=25000.0,
        reference_yield_quintal_acre=101.2,
        base_temperature_c=7.0,
        optimal_temperature_c=19.0,
        max_temperature_c=30.0,
        critical_heat_threshold_c=28.0,
        growing_degree_days_total=1350.0,
        kc_initial=0.50,
        kc_mid=1.15,
        kc_late=0.75,
        ky_total=1.10,
        optimal_water_requirement_mm=500.0,
        min_water_requirement_mm=300.0,
        root_depth_min_m=0.20,
        root_depth_max_m=0.60,
        allowable_depletion_fraction_p=0.35,
        optimal_nitrogen_kg_ha=140.0,
        optimal_phosphorus_kg_ha=80.0,
        optimal_potassium_kg_ha=100.0,
        nitrogen_response_coeff=0.045,
        phosphorus_response_coeff=0.075,
        potassium_response_coeff=0.085,
        excess_nitrogen_threshold_kg_ha=220.0,
        excess_fertilizer_sensitivity=0.0025,
        waterlogging_sensitivity=0.90,
        optimal_sowing_window={"start_month": 10, "start_day": 15, "end_month": 11, "end_day": 10},
        stages=[
            CropStageParameters("Initial (Sprouting & Emergence)", 0.18, 0.50, 0.20, "Eye sprouting to emergence"),
            CropStageParameters("Development (Tuber Initiation)", 0.28, 0.85, 0.60, "Stolon swelling & tuber init"),
            CropStageParameters("Mid-Season (Tuber Bulking)", 0.38, 1.15, 0.70, "Rapid underground bulking"),
            CropStageParameters("Late Season (Skin Set & Senescence)", 0.16, 0.75, 0.15, "Haulm yellowing & skin setting")
        ]
    ),
    "onion": CropParameters(
        id="onion",
        name="Onion",
        hindi_name="प्याज",
        botanical_name="Allium cepa",
        season="Rabi",
        typical_duration_days=130,
        reference_yield_kg_ha=24000.0,
        reference_yield_quintal_acre=97.1,
        base_temperature_c=8.0,
        optimal_temperature_c=22.0,
        max_temperature_c=34.0,
        critical_heat_threshold_c=32.0,
        growing_degree_days_total=1550.0,
        kc_initial=0.50,
        kc_mid=1.05,
        kc_late=0.75,
        ky_total=1.00,
        optimal_water_requirement_mm=500.0,
        min_water_requirement_mm=300.0,
        root_depth_min_m=0.15,
        root_depth_max_m=0.50,
        allowable_depletion_fraction_p=0.30,
        optimal_nitrogen_kg_ha=100.0,
        optimal_phosphorus_kg_ha=50.0,
        optimal_potassium_kg_ha=60.0,
        nitrogen_response_coeff=0.048,
        phosphorus_response_coeff=0.080,
        potassium_response_coeff=0.095,
        excess_nitrogen_threshold_kg_ha=180.0,
        excess_fertilizer_sensitivity=0.0028,
        waterlogging_sensitivity=0.88,
        optimal_sowing_window={"start_month": 10, "start_day": 20, "end_month": 11, "end_day": 30},
        stages=[
            CropStageParameters("Initial (Transplanting)", 0.18, 0.50, 0.15, "Transplanting establishment"),
            CropStageParameters("Development (Vegetative)", 0.28, 0.80, 0.45, "Foliage growth & leaf formation"),
            CropStageParameters("Mid-Season (Bulb Swelling)", 0.38, 1.05, 0.65, "Underground bulb expansion"),
            CropStageParameters("Late Season (Neck Fall & Maturity)", 0.16, 0.75, 0.15, "Tops drying and neck falling")
        ]
    )
}

# Alias mappings for flexible input matching
CROP_ALIASES = {
    "bajra": "pearl_millet",
    "jowar": "sorghum",
    "paddy": "rice",
    "corn": "maize",
    "gram": "chickpea",
    "sarson": "mustard",
    "aloo": "potato",
    "aalu": "potato",
    "tamatar": "tomato",
    "pyaz": "onion"
}

def get_crop_parameters(crop_id: str, custom_overrides: Optional[Dict[str, Any]] = None, strict: bool = False) -> CropParameters:
    """
    Retrieves crop parameters with optional user-supplied parameter overrides.
    Maintains clean separation between crop agronomic definitions and simulation calculations.
    """
    cleaned_id = crop_id.lower().strip().replace(" ", "_").replace("-", "_")
    target_id = CROP_ALIASES.get(cleaned_id, cleaned_id)
    
    if target_id not in CORE_CROP_REGISTRY:
        if strict:
            raise ValueError(f"Unsupported crop '{crop_id}'. Supported crops: {', '.join(sorted(CORE_CROP_REGISTRY.keys()))}.")
        # Fallback to wheat with documented warning
        base_params = CORE_CROP_REGISTRY["wheat"]
    else:
        base_params = CORE_CROP_REGISTRY[target_id]
        
    if not custom_overrides:
        return base_params
        
    # Apply user overrides in a clean copy
    overridden_dict = {k: getattr(base_params, k) for k in base_params.__dict__}
    for key, val in custom_overrides.items():
        if key in overridden_dict and val is not None:
            overridden_dict[key] = val
            
    return CropParameters(**overridden_dict)
