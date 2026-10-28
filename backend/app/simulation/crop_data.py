"""
AgriSim AI - Validated Crop Catalog & Agronomic Library
Based on FAO-56 Irrigation and Drainage Paper, FAO-33 Yield Response to Water,
and Indian Council of Agricultural Research (ICAR) & CACP agricultural benchmarks.
"""

from typing import Dict, Any

CROP_DATABASE: Dict[str, Dict[str, Any]] = {
    "wheat": {
        "id": "wheat",
        "name": "Wheat (Rabi)",
        "hindi_name": "गेहूं",
        "season": "Rabi",
        "duration_days": 135,
        "base_temp_c": 5.0,
        "opt_temp_c": 20.0,
        "max_temp_c": 32.0,
        "total_gdd": 1800.0,
        "potential_yield_quintal_acre": 22.0,  # ~5.5 tonnes/ha
        "msp_inr_per_quintal": 2275.0,        # Indian MSP benchmark
        "market_price_range_inr": [2200.0, 2650.0],
        "default_n_req_kg_acre": 50.0,        # ~125 kg N/ha
        "default_p_req_kg_acre": 25.0,        # ~60 kg P2O5/ha
        "default_k_req_kg_acre": 16.0,        # ~40 kg K2O/ha
        "root_depth_min_m": 0.25,
        "root_depth_max_m": 1.20,
        "allowable_depletion_p": 0.55,
        "cn": 0.045,
        "cp": 0.085,
        "ck": 0.110,
        "ky_total": 1.05,
        "stages": [
            {"name": "Initial (Crown Root)", "duration_days": 25, "gdd_fraction": 0.15, "kc": 0.40, "ky": 0.20, "description": "Germination and crown root initiation"},
            {"name": "Crop Development (Tillering/Jointing)", "duration_days": 35, "gdd_fraction": 0.28, "kc": 0.85, "ky": 0.60, "description": "Vegetative shoot and spike development"},
            {"name": "Mid-Season (Flowering/Anthesis)", "duration_days": 45, "gdd_fraction": 0.35, "kc": 1.15, "ky": 0.50, "description": "Flowering, pollination, and grain filling"},
            {"name": "Late Season (Maturity/Ripening)", "duration_days": 30, "gdd_fraction": 0.22, "kc": 0.30, "ky": 0.15, "description": "Dough stage to physiological maturity"}
        ],
        "economics": {
            "seed_cost_acre": 1800.0,
            "land_prep_acre": 2800.0,
            "crop_protection_acre": 1600.0,
            "labor_harvest_acre": 4500.0,
            "energy_cost_per_m3": 1.20
        },
        "description": "Staple cereal crop of North and Central India, highly responsive to timely irrigation during CRI and flowering stages."
    },
    "rice": {
        "id": "rice",
        "name": "Rice / Paddy (Kharif)",
        "hindi_name": "धान",
        "season": "Kharif",
        "duration_days": 130,
        "base_temp_c": 10.0,
        "opt_temp_c": 28.0,
        "max_temp_c": 38.0,
        "total_gdd": 2100.0,
        "potential_yield_quintal_acre": 26.0,  # ~6.5 tonnes/ha
        "msp_inr_per_quintal": 2300.0,
        "market_price_range_inr": [2250.0, 2750.0],
        "default_n_req_kg_acre": 48.0,
        "default_p_req_kg_acre": 24.0,
        "default_k_req_kg_acre": 20.0,
        "root_depth_min_m": 0.20,
        "root_depth_max_m": 0.70,
        "allowable_depletion_p": 0.20,        # Rice requires very high soil moisture
        "cn": 0.042,
        "cp": 0.080,
        "ck": 0.100,
        "ky_total": 1.10,
        "stages": [
            {"name": "Initial (Transplanting/Nursery)", "duration_days": 20, "gdd_fraction": 0.15, "kc": 1.05, "ky": 0.15, "description": "Transplanting shock and rooting"},
            {"name": "Crop Development (Tillering/Panicle)", "duration_days": 35, "gdd_fraction": 0.27, "kc": 1.15, "ky": 0.55, "description": "Active tillering and panicle initiation"},
            {"name": "Mid-Season (Heading/Grain Filling)", "duration_days": 45, "gdd_fraction": 0.38, "kc": 1.25, "ky": 0.60, "description": "Flowering and milk/dough development"},
            {"name": "Late Season (Ripening)", "duration_days": 30, "gdd_fraction": 0.20, "kc": 0.90, "ky": 0.10, "description": "Grain drying and maturation"}
        ],
        "economics": {
            "seed_cost_acre": 1500.0,
            "land_prep_acre": 3800.0,          # Includes puddling
            "crop_protection_acre": 2200.0,
            "labor_harvest_acre": 6200.0,      # Higher manual transplanting & harvest labor
            "energy_cost_per_m3": 1.10
        },
        "description": "Major Kharif staple in Indo-Gangetic and Coastal plains, high water consumer requiring precise water scheduling."
    },
    "cotton": {
        "id": "cotton",
        "name": "Cotton (Kharif)",
        "hindi_name": "कपास",
        "season": "Kharif",
        "duration_days": 165,
        "base_temp_c": 15.0,
        "opt_temp_c": 30.0,
        "max_temp_c": 40.0,
        "total_gdd": 2400.0,
        "potential_yield_quintal_acre": 12.0,  # ~3.0 tonnes/ha seed cotton
        "msp_inr_per_quintal": 7122.0,        # Medium staple MSP
        "market_price_range_inr": [6800.0, 8200.0],
        "default_n_req_kg_acre": 45.0,
        "default_p_req_kg_acre": 22.0,
        "default_k_req_kg_acre": 22.0,
        "root_depth_min_m": 0.30,
        "root_depth_max_m": 1.50,
        "allowable_depletion_p": 0.65,
        "cn": 0.040,
        "cp": 0.075,
        "ck": 0.095,
        "ky_total": 0.85,
        "stages": [
            {"name": "Initial (Vegetative Emergence)", "duration_days": 30, "gdd_fraction": 0.16, "kc": 0.45, "ky": 0.20, "description": "Seedling establishment"},
            {"name": "Crop Development (Square Formation)", "duration_days": 45, "gdd_fraction": 0.28, "kc": 0.80, "ky": 0.50, "description": "Square and flower bud formation"},
            {"name": "Mid-Season (Boll Setting & Growth)", "duration_days": 55, "gdd_fraction": 0.36, "kc": 1.15, "ky": 0.60, "description": "Peak flowering and boll development"},
            {"name": "Late Season (Boll Opening)", "duration_days": 35, "gdd_fraction": 0.20, "kc": 0.65, "ky": 0.25, "description": "Boll burst and fiber maturation"}
        ],
        "economics": {
            "seed_cost_acre": 2400.0,          # Bt cotton hybrid seeds
            "land_prep_acre": 2600.0,
            "crop_protection_acre": 3500.0,    # Pest management (bollworms, sucking pests)
            "labor_harvest_acre": 5800.0,      # Multiple pickings labor
            "energy_cost_per_m3": 1.30
        },
        "description": "Leading commercial cash crop of Gujarat, Maharashtra, and Telangana, deep-rooted but sensitive to waterlogging."
    },
    "sugarcane": {
        "id": "sugarcane",
        "name": "Sugarcane (Perennial)",
        "hindi_name": "गन्ना",
        "season": "Annual",
        "duration_days": 330,
        "base_temp_c": 12.0,
        "opt_temp_c": 32.0,
        "max_temp_c": 42.0,
        "total_gdd": 4200.0,
        "potential_yield_quintal_acre": 380.0, # ~95 tonnes/ha
        "msp_inr_per_quintal": 340.0,         # FRP (Fair and Remunerative Price)
        "market_price_range_inr": [330.0, 380.0],
        "default_n_req_kg_acre": 100.0,
        "default_p_req_kg_acre": 40.0,
        "default_k_req_kg_acre": 50.0,
        "root_depth_min_m": 0.30,
        "root_depth_max_m": 1.80,
        "allowable_depletion_p": 0.65,
        "cn": 0.035,
        "cp": 0.070,
        "ck": 0.085,
        "ky_total": 1.20,
        "stages": [
            {"name": "Initial (Germination & Tillering)", "duration_days": 60, "gdd_fraction": 0.18, "kc": 0.50, "ky": 0.30, "description": "Sprouting and sett germination"},
            {"name": "Crop Development (Grand Growth)", "duration_days": 110, "gdd_fraction": 0.35, "kc": 0.95, "ky": 0.70, "description": "Rapid stalk elongation"},
            {"name": "Mid-Season (Cane Elongation)", "duration_days": 110, "gdd_fraction": 0.35, "kc": 1.25, "ky": 0.65, "description": "Peak biomass and juice accumulation"},
            {"name": "Late Season (Ripening & Sugar Storing)", "duration_days": 50, "gdd_fraction": 0.12, "kc": 0.75, "ky": 0.20, "description": "Sucrose synthesis and moisture reduction"}
        ],
        "economics": {
            "seed_cost_acre": 5500.0,          # Setts
            "land_prep_acre": 4200.0,
            "crop_protection_acre": 2600.0,
            "labor_harvest_acre": 11000.0,     # Cutting and transport to mills
            "energy_cost_per_m3": 1.15
        },
        "description": "High biomass perennial cash crop in UP, Maharashtra and Tamil Nadu; highly responsive to drip fertigation."
    },
    "maize": {
        "id": "maize",
        "name": "Maize / Corn (Kharif/Rabi)",
        "hindi_name": "मक्का",
        "season": "Kharif",
        "duration_days": 105,
        "base_temp_c": 10.0,
        "opt_temp_c": 28.0,
        "max_temp_c": 36.0,
        "total_gdd": 1650.0,
        "potential_yield_quintal_acre": 28.0,
        "msp_inr_per_quintal": 2225.0,
        "market_price_range_inr": [2100.0, 2500.0],
        "default_n_req_kg_acre": 48.0,
        "default_p_req_kg_acre": 24.0,
        "default_k_req_kg_acre": 18.0,
        "root_depth_min_m": 0.25,
        "root_depth_max_m": 1.20,
        "allowable_depletion_p": 0.55,
        "cn": 0.048,
        "cp": 0.085,
        "ck": 0.105,
        "ky_total": 1.25,
        "stages": [
            {"name": "Initial (Seedling)", "duration_days": 20, "gdd_fraction": 0.18, "kc": 0.40, "ky": 0.20, "description": "Emergence to 4-leaf stage"},
            {"name": "Crop Development (Knee-high to Tasseling)", "duration_days": 30, "gdd_fraction": 0.28, "kc": 0.85, "ky": 0.60, "description": "Rapid stem extension and tasseling"},
            {"name": "Mid-Season (Silking & Grain Filling)", "duration_days": 35, "gdd_fraction": 0.35, "kc": 1.20, "ky": 0.80, "description": "Critical pollination and grain formation"},
            {"name": "Late Season (Black Layer / Maturity)", "duration_days": 20, "gdd_fraction": 0.19, "kc": 0.55, "ky": 0.20, "description": "Dent to harvest maturity"}
        ],
        "economics": {
            "seed_cost_acre": 2200.0,
            "land_prep_acre": 2400.0,
            "crop_protection_acre": 1800.0,
            "labor_harvest_acre": 3800.0,
            "energy_cost_per_m3": 1.25
        },
        "description": "Versatile C4 grain with high water productivity, critically sensitive to water deficit during silking."
    },
    "chickpea": {
        "id": "chickpea",
        "name": "Chickpea / Bengal Gram (Rabi)",
        "hindi_name": "चना",
        "season": "Rabi",
        "duration_days": 115,
        "base_temp_c": 7.0,
        "opt_temp_c": 22.0,
        "max_temp_c": 33.0,
        "total_gdd": 1450.0,
        "potential_yield_quintal_acre": 9.5,
        "msp_inr_per_quintal": 5440.0,
        "market_price_range_inr": [5300.0, 6200.0],
        "default_n_req_kg_acre": 10.0,         # Pulse fixes own N
        "default_p_req_kg_acre": 20.0,
        "default_k_req_kg_acre": 10.0,
        "root_depth_min_m": 0.20,
        "root_depth_max_m": 1.00,
        "allowable_depletion_p": 0.60,
        "cn": 0.090,
        "cp": 0.095,
        "ck": 0.120,
        "ky_total": 0.70,
        "stages": [
            {"name": "Initial (Seedling)", "duration_days": 20, "gdd_fraction": 0.17, "kc": 0.40, "ky": 0.15, "description": "Germination and branch initiation"},
            {"name": "Crop Development (Branching & Pre-Flowering)", "duration_days": 30, "gdd_fraction": 0.28, "kc": 0.75, "ky": 0.45, "description": "Canopy spread and floral bud initiation"},
            {"name": "Mid-Season (Pod Development)", "duration_days": 40, "gdd_fraction": 0.36, "kc": 1.05, "ky": 0.50, "description": "Pod set and seed growth"},
            {"name": "Late Season (Pod Maturation)", "duration_days": 25, "gdd_fraction": 0.19, "kc": 0.35, "ky": 0.15, "description": "Leaf yellowing and pod desiccation"}
        ],
        "economics": {
            "seed_cost_acre": 2100.0,
            "land_prep_acre": 2200.0,
            "crop_protection_acre": 1400.0,
            "labor_harvest_acre": 3500.0,
            "energy_cost_per_m3": 1.35
        },
        "description": "Major pulse crop fixing atmospheric nitrogen, drought tolerant but vulnerable to excessive moisture and pod borer."
    },
    "mustard": {
        "id": "mustard",
        "name": "Mustard / Rapeseed (Rabi)",
        "hindi_name": "सरसों",
        "season": "Rabi",
        "duration_days": 120,
        "base_temp_c": 5.0,
        "opt_temp_c": 21.0,
        "max_temp_c": 30.0,
        "total_gdd": 1500.0,
        "potential_yield_quintal_acre": 9.0,
        "msp_inr_per_quintal": 5650.0,
        "market_price_range_inr": [5400.0, 6400.0],
        "default_n_req_kg_acre": 32.0,
        "default_p_req_kg_acre": 16.0,
        "default_k_req_kg_acre": 12.0,
        "root_depth_min_m": 0.20,
        "root_depth_max_m": 1.10,
        "allowable_depletion_p": 0.60,
        "cn": 0.055,
        "cp": 0.090,
        "ck": 0.115,
        "ky_total": 0.75,
        "stages": [
            {"name": "Initial (Germination & Rosette)", "duration_days": 25, "gdd_fraction": 0.18, "kc": 0.35, "ky": 0.15, "description": "Rosette leaf formation"},
            {"name": "Crop Development (Stem Elongation)", "duration_days": 30, "gdd_fraction": 0.26, "kc": 0.80, "ky": 0.45, "description": "Branching and flower bud emergence"},
            {"name": "Mid-Season (Flowering & Siliqua)", "duration_days": 40, "gdd_fraction": 0.36, "kc": 1.10, "ky": 0.55, "description": "Intense flowering and siliqua pod formation"},
            {"name": "Late Season (Seed Filling)", "duration_days": 25, "gdd_fraction": 0.20, "kc": 0.40, "ky": 0.15, "description": "Pod ripening and oil synthesis"}
        ],
        "economics": {
            "seed_cost_acre": 900.0,
            "land_prep_acre": 2000.0,
            "crop_protection_acre": 1500.0,
            "labor_harvest_acre": 3200.0,
            "energy_cost_per_m3": 1.25
        },
        "description": "Primary winter oilseed crop in Rajasthan, Haryana and UP, low water footprint and high profit potential."
    },
    "soybean": {
        "id": "soybean",
        "name": "Soybean (Kharif)",
        "hindi_name": "सोयाबीन",
        "season": "Kharif",
        "duration_days": 100,
        "base_temp_c": 10.0,
        "opt_temp_c": 27.0,
        "max_temp_c": 36.0,
        "total_gdd": 1600.0,
        "potential_yield_quintal_acre": 11.0,
        "msp_inr_per_quintal": 4892.0,
        "market_price_range_inr": [4600.0, 5200.0],
        "default_n_req_kg_acre": 12.0,
        "default_p_req_kg_acre": 24.0,
        "default_k_req_kg_acre": 16.0,
        "root_depth_min_m": 0.20,
        "root_depth_max_m": 0.90,
        "allowable_depletion_p": 0.50,
        "cn": 0.085,
        "cp": 0.090,
        "ck": 0.110,
        "ky_total": 0.85,
        "stages": [
            {"name": "Initial (Emergence)", "duration_days": 18, "gdd_fraction": 0.17, "kc": 0.40, "ky": 0.15, "description": "Emergence to first trifoliate"},
            {"name": "Crop Development (Vegetative Canopy)", "duration_days": 27, "gdd_fraction": 0.27, "kc": 0.85, "ky": 0.50, "description": "Rapid trifoliate branching"},
            {"name": "Mid-Season (Pod Set & Bean Fill)", "duration_days": 35, "gdd_fraction": 0.36, "kc": 1.15, "ky": 0.60, "description": "Flowering and seed filling"},
            {"name": "Late Season (Maturity)", "duration_days": 20, "gdd_fraction": 0.20, "kc": 0.50, "ky": 0.15, "description": "Leaf drop and pod drydown"}
        ],
        "economics": {
            "seed_cost_acre": 2600.0,
            "land_prep_acre": 2200.0,
            "crop_protection_acre": 2000.0,
            "labor_harvest_acre": 3400.0,
            "energy_cost_per_m3": 1.30
        },
        "description": "Backbone pulse-oilseed of Madhya Pradesh and Maharashtra Vertisols, sensitive to early dry spells."
    },
    "groundnut": {
        "id": "groundnut",
        "name": "Groundnut / Peanut (Kharif/Summer)",
        "hindi_name": "मूंगफली",
        "season": "Kharif",
        "duration_days": 115,
        "base_temp_c": 12.0,
        "opt_temp_c": 28.0,
        "max_temp_c": 36.0,
        "total_gdd": 1750.0,
        "potential_yield_quintal_acre": 12.5,
        "msp_inr_per_quintal": 6783.0,
        "market_price_range_inr": [6500.0, 7400.0],
        "default_n_req_kg_acre": 10.0,
        "default_p_req_kg_acre": 20.0,
        "default_k_req_kg_acre": 20.0,
        "root_depth_min_m": 0.20,
        "root_depth_max_m": 0.90,
        "allowable_depletion_p": 0.50,
        "cn": 0.085,
        "cp": 0.090,
        "ck": 0.105,
        "ky_total": 0.70,
        "stages": [
            {"name": "Initial (Vegetative)", "duration_days": 22, "gdd_fraction": 0.18, "kc": 0.40, "ky": 0.15, "description": "Germination and seedling growth"},
            {"name": "Crop Development (Flowering & Pegging)", "duration_days": 33, "gdd_fraction": 0.28, "kc": 0.85, "ky": 0.60, "description": "Floral bloom and peg penetration into soil"},
            {"name": "Mid-Season (Pod Formation)", "duration_days": 40, "gdd_fraction": 0.36, "kc": 1.10, "ky": 0.50, "description": "Underground pod expansion"},
            {"name": "Late Season (Ripening)", "duration_days": 20, "gdd_fraction": 0.18, "kc": 0.60, "ky": 0.15, "description": "Shell hardening and kernel filling"}
        ],
        "economics": {
            "seed_cost_acre": 4200.0,          # High seed rate (kernels)
            "land_prep_acre": 2400.0,
            "crop_protection_acre": 1800.0,
            "labor_harvest_acre": 4600.0,      # Digging and pod plucking
            "energy_cost_per_m3": 1.25
        },
        "description": "High value oilseed cultivated in Gujarat, Andhra Pradesh and Tamil Nadu; critical moisture needed during pegging."
    },
    "tomato": {
        "id": "tomato",
        "name": "Tomato (Commercial)",
        "hindi_name": "टमाटर",
        "season": "Rabi",
        "duration_days": 125,
        "base_temp_c": 10.0,
        "opt_temp_c": 24.0,
        "max_temp_c": 35.0,
        "total_gdd": 1600.0,
        "potential_yield_quintal_acre": 160.0, # ~40 tonnes/ha
        "msp_inr_per_quintal": 1400.0,        # No MSP, benchmark market floor
        "market_price_range_inr": [1000.0, 3200.0],
        "default_n_req_kg_acre": 60.0,
        "default_p_req_kg_acre": 35.0,
        "default_k_req_kg_acre": 40.0,
        "root_depth_min_m": 0.20,
        "root_depth_max_m": 0.80,
        "allowable_depletion_p": 0.40,
        "cn": 0.045,
        "cp": 0.075,
        "ck": 0.090,
        "ky_total": 1.05,
        "stages": [
            {"name": "Initial (Transplanting)", "duration_days": 25, "gdd_fraction": 0.18, "kc": 0.60, "ky": 0.20, "description": "Seedling establishment"},
            {"name": "Crop Development (Flowering & First Fruit)", "duration_days": 35, "gdd_fraction": 0.28, "kc": 0.90, "ky": 0.55, "description": "Vigorous vine growth and first truss"},
            {"name": "Mid-Season (Main Fruiting & Harvest)", "duration_days": 45, "gdd_fraction": 0.38, "kc": 1.15, "ky": 0.65, "description": "Continuous fruit development and picking"},
            {"name": "Late Season (Late Harvest)", "duration_days": 20, "gdd_fraction": 0.16, "kc": 0.80, "ky": 0.20, "description": "Final truss ripening"}
        ],
        "economics": {
            "seed_cost_acre": 4500.0,          # F1 hybrid seeds
            "land_prep_acre": 3500.0,          # Staking/ridges
            "crop_protection_acre": 5200.0,    # Frequent fungicide/insecticide
            "labor_harvest_acre": 9500.0,      # Multiple pickings and grading
            "energy_cost_per_m3": 1.40
        },
        "description": "High return horticultural crop, sensitive to blossom end rot from moisture fluctuations and extreme heat."
    },
    "potato": {
        "id": "potato",
        "name": "Potato (Rabi)",
        "hindi_name": "आलू",
        "season": "Rabi",
        "duration_days": 105,
        "base_temp_c": 6.0,
        "opt_temp_c": 18.0,
        "max_temp_c": 28.0,
        "total_gdd": 1350.0,
        "potential_yield_quintal_acre": 140.0,
        "msp_inr_per_quintal": 1100.0,
        "market_price_range_inr": [900.0, 1800.0],
        "default_n_req_kg_acre": 60.0,
        "default_p_req_kg_acre": 35.0,
        "default_k_req_kg_acre": 45.0,
        "root_depth_min_m": 0.20,
        "root_depth_max_m": 0.60,
        "allowable_depletion_p": 0.35,        # Very sensitive to shallow water stress
        "cn": 0.040,
        "cp": 0.075,
        "ck": 0.085,
        "ky_total": 1.10,
        "stages": [
            {"name": "Initial (Sprouting & Emergence)", "duration_days": 20, "gdd_fraction": 0.18, "kc": 0.50, "ky": 0.20, "description": "Tuber sprouting and emergence"},
            {"name": "Crop Development (Tuber Initiation)", "duration_days": 30, "gdd_fraction": 0.28, "kc": 0.85, "ky": 0.60, "description": "Stolon formation and tuberization"},
            {"name": "Mid-Season (Tuber Bulking)", "duration_days": 35, "gdd_fraction": 0.36, "kc": 1.15, "ky": 0.70, "description": "Rapid tuber volume and starch synthesis"},
            {"name": "Late Season (Skin Set & Senescence)", "duration_days": 20, "gdd_fraction": 0.18, "kc": 0.70, "ky": 0.15, "description": "Vine killing and skin hardening"}
        ],
        "economics": {
            "seed_cost_acre": 14000.0,         # High seed tuber volume (12-15 quintals/acre)
            "land_prep_acre": 4000.0,
            "crop_protection_acre": 3800.0,
            "labor_harvest_acre": 7500.0,
            "energy_cost_per_m3": 1.30
        },
        "description": "High value tuber crop of UP, West Bengal and Punjab; requires cool night temperatures and uniform shallow moisture."
    },
    "onion": {
        "id": "onion",
        "name": "Onion (Rabi/Kharif)",
        "hindi_name": "प्याज",
        "season": "Rabi",
        "duration_days": 130,
        "base_temp_c": 8.0,
        "opt_temp_c": 22.0,
        "max_temp_c": 34.0,
        "total_gdd": 1650.0,
        "potential_yield_quintal_acre": 120.0,
        "msp_inr_per_quintal": 1600.0,
        "market_price_range_inr": [1200.0, 3500.0],
        "default_n_req_kg_acre": 45.0,
        "default_p_req_kg_acre": 25.0,
        "default_k_req_kg_acre": 30.0,
        "root_depth_min_m": 0.15,
        "root_depth_max_m": 0.50,
        "allowable_depletion_p": 0.30,        # Very shallow root system
        "cn": 0.050,
        "cp": 0.080,
        "ck": 0.095,
        "ky_total": 1.10,
        "stages": [
            {"name": "Initial (Transplanting)", "duration_days": 25, "gdd_fraction": 0.18, "kc": 0.65, "ky": 0.20, "description": "Seedling establishment"},
            {"name": "Crop Development (Foliage Growth)", "duration_days": 35, "gdd_fraction": 0.27, "kc": 0.85, "ky": 0.50, "description": "Leaf blade production"},
            {"name": "Mid-Season (Bulb Enlargement)", "duration_days": 45, "gdd_fraction": 0.37, "kc": 1.05, "ky": 0.70, "description": "Rapid bulb swelling"},
            {"name": "Late Season (Neck Fall & Curing)", "duration_days": 25, "gdd_fraction": 0.18, "kc": 0.70, "ky": 0.15, "description": "Neck collapse and outer scale curing"}
        ],
        "economics": {
            "seed_cost_acre": 4800.0,
            "land_prep_acre": 3200.0,
            "crop_protection_acre": 3000.0,
            "labor_harvest_acre": 8200.0,
            "energy_cost_per_m3": 1.35
        },
        "description": "Critical culinary bulb crop of Maharashtra (Nashik), MP and Gujarat, shallow rooted and sensitive to moisture stress during bulking."
    },
    "bajra": {
        "id": "bajra",
        "name": "Pearl Millet / Bajra (Kharif)",
        "hindi_name": "बाजरा",
        "season": "Kharif",
        "duration_days": 85,
        "base_temp_c": 12.0,
        "opt_temp_c": 32.0,
        "max_temp_c": 44.0,
        "total_gdd": 1400.0,
        "potential_yield_quintal_acre": 14.0,
        "msp_inr_per_quintal": 2625.0,
        "market_price_range_inr": [2450.0, 2900.0],
        "default_n_req_kg_acre": 25.0,
        "default_p_req_kg_acre": 12.0,
        "default_k_req_kg_acre": 10.0,
        "root_depth_min_m": 0.25,
        "root_depth_max_m": 1.30,
        "allowable_depletion_p": 0.65,
        "cn": 0.060,
        "cp": 0.095,
        "ck": 0.120,
        "ky_total": 0.60,
        "stages": [
            {"name": "Initial (Establishment)", "duration_days": 15, "gdd_fraction": 0.18, "kc": 0.35, "ky": 0.10, "description": "Rapid emergence"},
            {"name": "Crop Development (Tillering)", "duration_days": 25, "gdd_fraction": 0.28, "kc": 0.75, "ky": 0.40, "description": "Abundant tillering"},
            {"name": "Mid-Season (Heading & Grain Fill)", "duration_days": 30, "gdd_fraction": 0.36, "kc": 1.00, "ky": 0.50, "description": "Flowering and compact head filling"},
            {"name": "Late Season (Dough to Maturity)", "duration_days": 15, "gdd_fraction": 0.18, "kc": 0.40, "ky": 0.10, "description": "Grain drying"}
        ],
        "economics": {
            "seed_cost_acre": 800.0,
            "land_prep_acre": 1800.0,
            "crop_protection_acre": 900.0,
            "labor_harvest_acre": 2800.0,
            "energy_cost_per_m3": 1.20
        },
        "description": "Nutri-cereal (millet) of Rajasthan, Gujarat and Maharashtra; extremely drought-hardy and heat-tolerant."
    },
    "jowar": {
        "id": "jowar",
        "name": "Sorghum / Jowar (Kharif/Rabi)",
        "hindi_name": "ज्वार",
        "season": "Kharif",
        "duration_days": 105,
        "base_temp_c": 10.0,
        "opt_temp_c": 30.0,
        "max_temp_c": 40.0,
        "total_gdd": 1600.0,
        "potential_yield_quintal_acre": 16.0,
        "msp_inr_per_quintal": 3371.0,
        "market_price_range_inr": [3100.0, 3800.0],
        "default_n_req_kg_acre": 30.0,
        "default_p_req_kg_acre": 15.0,
        "default_k_req_kg_acre": 12.0,
        "root_depth_min_m": 0.25,
        "root_depth_max_m": 1.40,
        "allowable_depletion_p": 0.60,
        "cn": 0.055,
        "cp": 0.090,
        "ck": 0.115,
        "ky_total": 0.70,
        "stages": [
            {"name": "Initial (Seedling)", "duration_days": 20, "gdd_fraction": 0.18, "kc": 0.38, "ky": 0.15, "description": "Emergence to 5-leaf stage"},
            {"name": "Crop Development (Stem Growth)", "duration_days": 30, "gdd_fraction": 0.28, "kc": 0.78, "ky": 0.45, "description": "Panicle initiation in whorl"},
            {"name": "Mid-Season (Booting & Flowering)", "duration_days": 35, "gdd_fraction": 0.36, "kc": 1.05, "ky": 0.55, "description": "Flowering and grain development"},
            {"name": "Late Season (Physiological Maturity)", "duration_days": 20, "gdd_fraction": 0.18, "kc": 0.45, "ky": 0.15, "description": "Endosperm hardening"}
        ],
        "economics": {
            "seed_cost_acre": 900.0,
            "land_prep_acre": 1900.0,
            "crop_protection_acre": 1100.0,
            "labor_harvest_acre": 3000.0,
            "energy_cost_per_m3": 1.25
        },
        "description": "Climate-resilient cereal of Deccan Plateau with high fodder value and deep rooting capacity."
    }
}
