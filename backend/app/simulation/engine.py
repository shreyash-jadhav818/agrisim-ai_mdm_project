"""
AgriSim AI - Core Simulation Engine
Orchestrates daily crop phenology, FAO-56 Penman-Monteith reference ET,
dynamic root-zone soil water balance, nutrient dynamics, and economic calculations.
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from app.schemas.simulation import (
    SimulationInput,
    SimulationResult,
    DailySimulationStep,
    SimulationCostBreakdown,
    IrrigationEvent,
    FertilizerApplication
)
from app.simulation.crop_data import CROP_DATABASE
from app.simulation.soil_data import SOIL_DATABASE
from app.simulation.weather_data import generate_daily_weather, AGRO_CLIMATIC_ZONES
from app.simulation.evapotranspiration import calculate_fao56_penman_monteith, calculate_hargreaves_samani
from app.simulation.water_balance import SoilWaterBalance
from app.simulation.growth_engine import CropGrowthEngine
from app.simulation.economics import calculate_cultivation_economics

def get_default_irrigation_schedule(crop_id: str, duration_days: int) -> List[IrrigationEvent]:
    """Provides recommended ICAR baseline irrigation schedule if none specified."""
    if crop_id == "wheat":
        return [
            IrrigationEvent(day=21, amount_mm=60.0, method="flood"),  # CRI stage
            IrrigationEvent(day=45, amount_mm=55.0, method="flood"),  # Tillering
            IrrigationEvent(day=70, amount_mm=55.0, method="flood"),  # Late jointing
            IrrigationEvent(day=90, amount_mm=55.0, method="flood"),  # Flowering
            IrrigationEvent(day=108, amount_mm=50.0, method="flood")  # Grain filling
        ]
    elif crop_id == "rice":
        # Continuous shallow flooding / frequent irrigations
        events = []
        for d in range(10, duration_days - 15, 6):
            events.append(IrrigationEvent(day=d, amount_mm=45.0, method="flood"))
        return events
    elif crop_id in ["cotton", "sugarcane"]:
        events = []
        for d in range(20, duration_days - 20, 14):
            events.append(IrrigationEvent(day=d, amount_mm=50.0, method="drip"))
        return events
    else:
        # Generic 4 split irrigations
        return [
            IrrigationEvent(day=int(duration_days * 0.18), amount_mm=45.0, method="drip"),
            IrrigationEvent(day=int(duration_days * 0.40), amount_mm=50.0, method="drip"),
            IrrigationEvent(day=int(duration_days * 0.65), amount_mm=50.0, method="drip"),
            IrrigationEvent(day=int(duration_days * 0.82), amount_mm=40.0, method="drip")
        ]

def get_default_fertilizer_plan(crop_id: str) -> List[FertilizerApplication]:
    """Provides recommended ICAR nutrient doses if none specified."""
    crop = CROP_DATABASE.get(crop_id, CROP_DATABASE["wheat"])
    tot_n = crop["default_n_req_kg_acre"]
    tot_p = crop["default_p_req_kg_acre"]
    tot_k = crop["default_k_req_kg_acre"]
    
    # Basal + 2 split top dressings
    return [
        FertilizerApplication(day=1, n_kg_acre=round(tot_n * 0.4, 1), p_kg_acre=tot_p, k_kg_acre=tot_k, fertilizer_name="Basal (DAP + MOP + Urea)"),
        FertilizerApplication(day=25, n_kg_acre=round(tot_n * 0.3, 1), p_kg_acre=0.0, k_kg_acre=0.0, fertilizer_name="Top Dressing 1 (Urea)"),
        FertilizerApplication(day=55, n_kg_acre=round(tot_n * 0.3, 1), p_kg_acre=0.0, k_kg_acre=0.0, fertilizer_name="Top Dressing 2 (Urea)")
    ]

def run_simulation(
    sim_input: SimulationInput,
    scenario_name: str = "Baseline",
    weather_override: Optional[List[Dict[str, Any]]] = None
) -> SimulationResult:
    """
    Executes complete simulation run based on provided farm inputs.
    """
    crop_id = sim_input.crop_id.lower()
    if crop_id not in CROP_DATABASE:
        crop_id = "wheat"
    crop = CROP_DATABASE[crop_id]
    
    farm = sim_input.farm_profile
    soil_name = farm.soil_type
    if soil_name not in SOIL_DATABASE:
        soil_name = "Alluvial Loam"
    soil_props = SOIL_DATABASE[soil_name]
    
    duration_days = crop["duration_days"]
    zone_id = farm.zone
    
    # Generate or adopt daily weather
    if weather_override is not None and len(weather_override) >= duration_days:
        daily_weather = weather_override[:duration_days]
    else:
        daily_weather = generate_daily_weather(
            zone_id=zone_id,
            start_date_str=sim_input.sowing_date,
            duration_days=duration_days
        )
        
    # Prepare schedules
    irrigation_sched = sim_input.irrigation_schedule
    if not irrigation_sched:
        irrigation_sched = get_default_irrigation_schedule(crop_id, duration_days)
    irr_map = {item.day: item for item in irrigation_sched}
    
    fertilizer_plan = sim_input.fertilizer_plan
    if not fertilizer_plan:
        fertilizer_plan = get_default_fertilizer_plan(crop_id)
    fert_map = {item.day: item for item in fertilizer_plan}
    
    # Initialize simulation models
    growth_engine = CropGrowthEngine(crop_id=crop_id, soil_om_pct=sim_input.soil_organic_matter_pct)
    water_engine = SoilWaterBalance(
        soil_props=soil_props,
        root_depth_min_m=crop["root_depth_min_m"],
        root_depth_max_m=crop["root_depth_max_m"],
        p_base=crop["allowable_depletion_p"],
        mulching=sim_input.mulching_used
    )
    
    # Tracking accumulators
    cum_gdd = 0.0
    cum_biomass = 0.0
    total_precip = 0.0
    total_eff_rain = 0.0
    total_irr_applied = 0.0
    total_deep_perc = 0.0
    total_eta = 0.0
    total_etc = 0.0
    total_et0 = 0.0
    
    applied_n = sum(item.n_kg_acre for item in fertilizer_plan)
    applied_p = sum(item.p_kg_acre for item in fertilizer_plan)
    applied_k = sum(item.k_kg_acre for item in fertilizer_plan)
    
    # Track stage-specific water performance
    stage_water_summary = [
        {"stage_idx": i, "name": st["name"], "ky": st["ky"], "etc_sum": 0.0, "eta_sum": 0.0}
        for i, st in enumerate(crop["stages"])
    ]
    
    heat_stress_penalty = 0.0
    daily_steps: List[DailySimulationStep] = []
    
    # Simulation loop
    for day_idx in range(duration_days):
        day_num = day_idx + 1
        w = daily_weather[day_idx]
        
        # 1. GDD & Phenology
        daily_gdd = growth_engine.calculate_daily_gdd(w["tmin"], w["tmax"])
        cum_gdd += daily_gdd
        stage_idx, stage_info, gdd_fraction = growth_engine.determine_stage(cum_gdd)
        
        # 2. Reference Evapotranspiration ET0
        et0 = calculate_fao56_penman_monteith(
            tmin=w["tmin"],
            tmax=w["tmax"],
            rs=w["rs"],
            rh=w["rh"],
            u2=w["u2"]
        )
        total_et0 += et0
        
        # 3. Irrigation for the day
        irr_event = irr_map.get(day_num, None)
        irr_amount = irr_event.amount_mm if irr_event else 0.0
        irr_method = irr_event.method if irr_event else farm.irrigation_system
        total_irr_applied += irr_amount
        
        # 4. Soil Water Balance step
        wb_res = water_engine.step_daily(
            gdd_fraction=gdd_fraction,
            et0=et0,
            kc=stage_info["kc"],
            precip=w["precip"],
            irrigation_mm=irr_amount,
            irrigation_method=irr_method
        )
        
        total_precip += w["precip"]
        total_eff_rain += wb_res["p_eff_mm"]
        total_deep_perc += wb_res["deep_percolation_mm"]
        total_eta += wb_res["eta_mm"]
        total_etc += wb_res["etc_mm"]
        
        # Record stage accumulation
        stage_water_summary[stage_idx]["etc_sum"] += wb_res["etc_mm"]
        stage_water_summary[stage_idx]["eta_sum"] += wb_res["eta_mm"]
        
        # 5. Temperature Stress Check
        daily_heat_stress = 0.0
        if stage_idx == 2 and w["tmax"] > crop["opt_temp_c"] + 6.0:  # Mid-season flowering
            temp_excess = w["tmax"] - (crop["opt_temp_c"] + 6.0)
            daily_heat_stress = min(0.08, temp_excess * 0.015)
            heat_stress_penalty += daily_heat_stress
            
        # 6. Biomass accumulation approximation (Radiation Use Efficiency 1.8 g/MJ * PAR)
        par = w["rs"] * 0.48
        daily_biomass = par * 1.8 * wb_res["water_stress_ks"] * (1.0 - daily_heat_stress) * 4.047  # kg/acre
        cum_biomass += max(0.0, daily_biomass)
        
        daily_steps.append(DailySimulationStep(
            day=day_num,
            date=w["date"],
            stage_name=stage_info["name"],
            gdd_accumulated=round(cum_gdd, 1),
            et0_mm=et0,
            kc=stage_info["kc"],
            etc_mm=wb_res["etc_mm"],
            eta_mm=wb_res["eta_mm"],
            precipitation_mm=w["precip"],
            irrigation_mm=irr_amount,
            soil_depletion_mm=wb_res["soil_depletion_mm"],
            root_depth_m=wb_res["root_depth_m"],
            water_stress_ks=wb_res["water_stress_ks"],
            heat_stress_factor=round(1.0 - daily_heat_stress, 2),
            biomass_accumulated_kg_acre=round(cum_biomass, 1)
        ))
        
    # Cap heat stress penalty
    heat_stress_penalty = min(0.35, heat_stress_penalty)
    
    # Calculate final yield
    actual_yield_quintal_acre, yield_kg_ha, yield_meta = growth_engine.calculate_yield(
        stage_water_summary=stage_water_summary,
        applied_n=applied_n,
        applied_p=applied_p,
        applied_k=applied_k,
        heat_stress_penalty=heat_stress_penalty
    )
    
    # Calculate cultivation economics
    econ = calculate_cultivation_economics(
        crop_id=crop_id,
        total_acres=farm.total_acres,
        actual_yield_quintal_acre=actual_yield_quintal_acre,
        total_water_applied_mm=total_irr_applied,
        total_eta_mm=total_eta,
        applied_n_kg_acre=applied_n,
        applied_p_kg_acre=applied_p,
        applied_k_kg_acre=applied_k,
        mulching_used=sim_input.mulching_used,
        custom_price_per_quintal=sim_input.custom_price_per_quintal,
        custom_seed_cost_acre=sim_input.custom_seed_cost_per_acre,
        custom_energy_cost_per_m3=sim_input.electricity_or_diesel_cost_per_m3
    )
    
    # Diagnostic limiting factors
    limiting_factors = []
    # Water stress check
    for idx, s in enumerate(stage_water_summary):
        if s["etc_sum"] > 0:
            def_pct = (1.0 - s["eta_sum"] / s["etc_sum"]) * 100.0
            if def_pct > 18.0:
                limiting_factors.append(f"Water deficit of {def_pct:.1f}% during {s['name']}.")
                
    # Nutrient check
    nutr_det = yield_meta["nutrient_details"]
    if nutr_det["n_adequacy_pct"] < 90.0:
        limiting_factors.append(f"Nitrogen supply is at {nutr_det['n_adequacy_pct']}% of recommended requirement.")
    if nutr_det["p_adequacy_pct"] < 88.0:
        limiting_factors.append(f"Phosphorus supply is at {nutr_det['p_adequacy_pct']}% of recommended requirement.")
    if heat_stress_penalty > 0.05:
        limiting_factors.append(f"Thermal heat stress reduced potential yield by {heat_stress_penalty*100.0:.1f}%.")
    if not limiting_factors:
        limiting_factors.append("Optimal agronomic conditions achieved; water and nutrient stress kept below critical thresholds.")
        
    scientific_notes = [
        "Reference Evapotranspiration computed via FAO-56 Penman-Monteith Combination Equation.",
        "Root zone water depletion and crop water stress Ks calculated via FAO-56 Table 22 depletion fractions.",
        "Yield reduction factors Ky applied according to FAO-33 Stewart water-yield production functions.",
        "Nutrient response modeled via Mitscherlich-Baule law of diminishing returns for N, P, and K.",
        "Economic valuations utilize Government of India MSP benchmarks and standard domestic input tariff cards."
    ]
    
    cost_breakdown = SimulationCostBreakdown(
        seed_cost=econ["costs_breakdown"]["seed_cost"],
        land_prep_cost=econ["costs_breakdown"]["land_prep_cost"],
        fertilizer_cost=econ["costs_breakdown"]["fertilizer_cost"],
        irrigation_energy_cost=econ["costs_breakdown"]["irrigation_energy_cost"],
        crop_protection_cost=econ["costs_breakdown"]["crop_protection_cost"],
        labor_harvest_cost=econ["costs_breakdown"]["labor_harvest_cost"],
        total_cost=econ["costs_breakdown"]["total_cost"]
    )
    
    run_id = f"sim_{uuid.uuid4().hex[:10]}"
    
    return SimulationResult(
        run_id=run_id,
        scenario_name=scenario_name,
        crop_id=crop_id,
        crop_name=crop["name"],
        season=crop["season"],
        duration_days=duration_days,
        yield_quintal_acre=actual_yield_quintal_acre,
        yield_kg_ha=yield_kg_ha,
        potential_yield_quintal_acre=crop["potential_yield_quintal_acre"],
        yield_gap_pct=yield_meta["yield_gap_pct"],
        total_water_consumed_mm=round(total_eta, 1),
        total_water_consumed_m3_acre=econ["water_consumed_m3_acre"],
        total_irrigation_applied_mm=round(total_irr_applied, 1),
        total_rainfall_mm=round(total_precip, 1),
        effective_rainfall_mm=round(total_eff_rain, 1),
        deep_percolation_mm=round(total_deep_perc, 1),
        total_n_applied_kg_acre=round(applied_n, 1),
        total_p_applied_kg_acre=round(applied_p, 1),
        total_k_applied_kg_acre=round(applied_k, 1),
        water_productivity_kg_m3=econ["water_productivity_kg_m3"],
        costs=cost_breakdown,
        gross_revenue_inr=econ["gross_revenue_inr"],
        net_profit_inr=econ["net_profit_inr"],
        profit_per_acre_inr=econ["profit_per_acre_inr"],
        return_on_investment_roi_pct=econ["roi_pct"],
        daily_steps=daily_steps,
        limiting_factors=limiting_factors,
        scientific_validation_notes=scientific_notes
    )
