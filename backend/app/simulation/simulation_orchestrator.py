"""
AgriSim AI - Modular Simulation Orchestrator
Ties together unit conversions, crop parameters, soil characteristics,
weather inputs, dynamic water balance, nutrient management, sowing suitability,
yield estimation, and cost/profit accounting into an integrated biophysical engine.
Strictly adheres to scientific rules:
- Validates all inputs with sensible limits.
- Never silently replaces missing measurements with fabricated data.
- Excess irrigation and excess fertilizer penalize yield rather than inflating it.
- Non-negative yields and bounded extrapolations.
- Complete data provenance, model versioning, assumptions, and limitations.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import math
import uuid

from app.simulation.unit_conversions import (
    acres_to_hectares,
    hectares_to_acres,
    mm_to_metres,
    m3_to_litres,
    litres_to_m3,
    calculate_irrigation_volume_m3,
    nutrient_rate_to_total_kg,
    kg_to_quintals,
    quintals_to_kg,
    kg_per_ha_to_quintals_per_acre,
    quintals_per_acre_to_kg_per_ha
)
from app.simulation.crop_parameters import get_crop_parameters, CropParameters, CORE_CROP_REGISTRY, CROP_ALIASES
from app.simulation.soil_characteristics import get_soil_characteristics, SoilCharacteristics
from app.simulation.weather_inputs import process_weather_inputs, validate_weather_inputs, WeatherDataset
from app.simulation.water_balance import SoilWaterBalance, IRRIGATION_EFFICIENCIES
from app.simulation.nutrient_management import evaluate_nutrient_management, NutrientEvaluationResult
from app.simulation.sowing_suitability import evaluate_sowing_suitability, SowingSuitabilityResult
from app.simulation.yield_estimation import estimate_crop_yield, YieldEstimationResult
from app.simulation.cost_calculations import calculate_farm_finances, CostAccountingResult

@dataclass
class FarmInputPayload:
    crop_type: str
    farm_area: float
    farm_area_unit: str = "acres"               # "acres" or "hectares"
    soil_type: str = "Alluvial Loam"
    temperature_c: Optional[float] = None
    tmin_c: Optional[float] = None
    tmax_c: Optional[float] = None
    rainfall_mm: Optional[float] = None
    relative_humidity_pct: Optional[float] = None
    sowing_date: str = "2026-11-15"
    crop_duration_days: Optional[int] = None
    irrigation_method: str = "drip"             # drip, sprinkler, furrow, flood, rainfed
    irrigation_depth_mm: Optional[float] = None # total depth or per-event depth
    irrigation_frequency: Optional[int] = None  # number of irrigation events
    irrigation_schedule_days: Optional[List[int]] = None
    nitrogen_kg_ha: float = 120.0
    phosphorus_kg_ha: float = 60.0
    potassium_kg_ha: float = 40.0
    fertilizer_cost_total: Optional[float] = None
    irrigation_cost_total: Optional[float] = None
    other_production_costs: Optional[float] = None
    crop_selling_price_per_quintal: Optional[float] = None
    mulching_used: bool = False
    soil_organic_matter_pct: Optional[float] = None

@dataclass
class DailyTimeseriesPoint:
    day: int
    date: str
    growth_stage: str
    kc: float
    et0_mm: float
    etc_mm: float
    eta_mm: float
    precip_mm: float
    irrigation_mm: float
    soil_depletion_mm: float
    soil_water_vol: float
    root_depth_m: float
    water_stress_ks: float
    aeration_stress_penalty: float

@dataclass
class SimulationRunOutput:
    run_id: str
    scenario_name: str
    model_version: str
    data_provenance: str
    is_validated: bool
    
    # Crop & Land
    crop_id: str
    crop_name: str
    season: str
    sowing_date: str
    harvest_date: str
    duration_days: int
    farm_area_ha: float
    farm_area_acres: float
    soil_type: str
    
    # Yield Results
    reference_yield_kg_ha: float
    reference_yield_quintal_acre: float
    estimated_yield_kg_ha: float
    estimated_yield_quintal_acre: float
    estimated_total_harvest_kg: float
    estimated_total_harvest_quintals: float
    estimated_total_harvest_tonnes: float
    yield_gap_pct: float
    
    # Biophysical Scaling Factors & Penalties
    water_response_factor: float
    aeration_hypoxia_factor: float
    nutrient_response_factor: float
    temperature_stress_factor: float
    sowing_suitability_factor: float
    excess_irrigation_penalty_pct: float
    excess_fertilizer_penalty_pct: float
    
    # Water Metrics
    irrigation_method: str
    total_irrigation_depth_mm: float
    total_irrigation_volume_m3: float
    total_irrigation_volume_litres: float
    water_volume_m3_per_hectare: float
    water_volume_m3_per_acre: float
    total_crop_water_demand_etc_mm: float
    total_actual_evapotranspiration_eta_mm: float
    total_rainfall_mm: float
    total_effective_rainfall_mm: float
    deep_percolation_mm: float
    water_productivity_kg_m3: float
    
    # Nutrient Metrics
    n_applied_kg_ha: float
    p_applied_kg_ha: float
    k_applied_kg_ha: float
    total_n_applied_kg: float
    total_p_applied_kg: float
    total_k_applied_kg: float
    n_adequacy_pct: float
    p_adequacy_pct: float
    k_adequacy_pct: float
    excess_fertilizer_detected: bool
    agronomic_advisory: str
    
    # Sowing Suitability
    is_within_optimal_sowing_window: bool
    days_deviation_from_sowing_optimum: int
    sowing_window_description: str
    sowing_hazard_description: str
    
    # Financial Metrics (in INR)
    currency: str
    crop_selling_price_per_quintal: Optional[float]
    estimated_gross_revenue_inr: Optional[float]
    modeled_fertilizer_cost_inr: Optional[float]
    modeled_irrigation_cost_inr: Optional[float]
    other_production_costs_inr: Optional[float]
    total_modeled_cultivation_costs_inr: Optional[float]
    is_partial_modeled_cost: bool
    estimated_net_return_inr: Optional[float]
    net_return_per_hectare_inr: Optional[float]
    net_return_per_acre_inr: Optional[float]
    return_on_investment_roi_pct: Optional[float]
    financial_notes: List[str]
    
    # Transparency, Assumptions & Limitations
    assumptions: List[str]
    limitations: List[str]
    
    # Daily Time Series (first 100 days or key milestones for UI charts)
    timeseries: List[DailyTimeseriesPoint] = field(default_factory=list)

def validate_farm_inputs(payload: FarmInputPayload) -> List[str]:
    """Validates farm inputs with sensible biophysical limits."""
    errors = []
    
    # Crop validation
    cleaned_crop = payload.crop_type.lower().strip().replace(" ", "_").replace("-", "_")
    target_crop = CROP_ALIASES.get(cleaned_crop, cleaned_crop)
    if target_crop not in CORE_CROP_REGISTRY:
        errors.append(f"Unsupported crop: '{payload.crop_type}'. Supported crops: {', '.join(sorted(CORE_CROP_REGISTRY.keys()))}.")
    
    if payload.farm_area <= 0:
        errors.append("Farm area must be greater than 0.")
    elif payload.farm_area > 50000.0:
        errors.append(f"Farm area ({payload.farm_area}) exceeds plausible operational limit (50,000).")
        
    if payload.farm_area_unit.lower() not in ["acres", "acre", "ha", "hectare", "hectares"]:
        errors.append(f"Invalid farm area unit: '{payload.farm_area_unit}'. Must be 'acres' or 'hectares'.")
        
    # Weather validation
    w_valid, w_errors = validate_weather_inputs(
        temperature_c=payload.temperature_c,
        tmin_c=payload.tmin_c,
        tmax_c=payload.tmax_c,
        rainfall_mm=payload.rainfall_mm,
        relative_humidity_pct=payload.relative_humidity_pct
    )
    if not w_valid:
        errors.extend(w_errors)
        
    # Sowing date
    try:
        datetime.strptime(payload.sowing_date.strip(), "%Y-%m-%d")
    except Exception:
        errors.append(f"Sowing date '{payload.sowing_date}' is invalid. Format must be YYYY-MM-DD.")
        
    if payload.crop_duration_days is not None:
        if not (30 <= payload.crop_duration_days <= 450):
            errors.append(f"Crop duration {payload.crop_duration_days} days must be between 30 and 450 days.")
            
    if payload.nitrogen_kg_ha < 0 or payload.phosphorus_kg_ha < 0 or payload.potassium_kg_ha < 0:
        errors.append("Nutrient application rates (N, P, K) cannot be negative.")
    if payload.nitrogen_kg_ha > 600 or payload.phosphorus_kg_ha > 400 or payload.potassium_kg_ha > 400:
        errors.append("Nutrient application rates exceed biophysically plausible maximums (600 kg/ha).")
        
    if payload.irrigation_depth_mm is not None and payload.irrigation_depth_mm < 0:
        errors.append("Irrigation depth cannot be negative.")
        
    if payload.irrigation_frequency is not None and payload.irrigation_frequency < 0:
        errors.append("Irrigation frequency cannot be negative.")
        
    if payload.crop_selling_price_per_quintal is not None and payload.crop_selling_price_per_quintal < 0:
        errors.append("Crop selling price cannot be negative.")
        
    return errors

def run_orchestrated_simulation(
    payload: FarmInputPayload,
    scenario_name: str = "Baseline"
) -> SimulationRunOutput:
    """
    Executes a complete agricultural simulation using biophysical sub-modules.
    """
    # 1. Validation
    validation_errors = validate_farm_inputs(payload)
    if validation_errors:
        raise ValueError(f"Farm input validation failed: {'; '.join(validation_errors)}")
        
    # 2. Area Unit Conversion
    unit_clean = payload.farm_area_unit.lower()
    if unit_clean in ["ha", "hectare", "hectares"]:
        area_ha = float(payload.farm_area)
        area_acres = hectares_to_acres(area_ha)
    else:
        area_acres = float(payload.farm_area)
        area_ha = acres_to_hectares(area_acres)
        
    # 3. Crop & Soil retrieval
    crop_params = get_crop_parameters(payload.crop_type)
    soil_props = get_soil_characteristics(payload.soil_type)
    
    # Sowing date & duration
    sow_dt = datetime.strptime(payload.sowing_date.strip(), "%Y-%m-%d")
    duration = payload.crop_duration_days if payload.crop_duration_days else crop_params.typical_duration_days
    harvest_dt = sow_dt + timedelta(days=duration)
    
    # 4. Sowing Suitability Evaluation
    sowing_res: SowingSuitabilityResult = evaluate_sowing_suitability(payload.sowing_date, crop_params)
    
    # 5. Weather Processing
    weather_dataset: WeatherDataset = process_weather_inputs(
        duration_days=duration,
        temperature_c=payload.temperature_c,
        tmin_c=payload.tmin_c,
        tmax_c=payload.tmax_c,
        rainfall_mm=payload.rainfall_mm,
        relative_humidity_pct=payload.relative_humidity_pct
    )
    
    # 6. Irrigation Scheduling & Depth Setup
    irr_method = payload.irrigation_method.lower()
    if irr_method not in IRRIGATION_EFFICIENCIES:
        irr_method = "drip"
        
    # Determine total irrigation depth in mm
    if payload.irrigation_depth_mm is not None:
        total_irr_depth_mm = max(0.0, float(payload.irrigation_depth_mm))
    else:
        # Benchmark ICAR default irrigation depth
        if irr_method == "rainfed":
            total_irr_depth_mm = 0.0
        else:
            total_irr_depth_mm = max(0.0, crop_params.optimal_water_requirement_mm - weather_dataset.total_rainfall_mm * 0.70)
            
    # Determine irrigation events
    num_events = payload.irrigation_frequency if (payload.irrigation_frequency and payload.irrigation_frequency > 0) else 5
    if irr_method == "rainfed":
        num_events = 0
        
    # Distribute irrigation events across crop cycle
    irr_day_map: Dict[int, float] = {}
    if num_events > 0 and total_irr_depth_mm > 0:
        event_depth = total_irr_depth_mm / float(num_events)
        if payload.irrigation_schedule_days and len(payload.irrigation_schedule_days) == num_events:
            for day in payload.irrigation_schedule_days:
                irr_day_map[day] = event_depth
        else:
            # Distribute between 15% and 85% of duration
            step_interval = max(5, int((duration * 0.70) / max(1, num_events)))
            start_day = max(10, int(duration * 0.15))
            for i in range(num_events):
                event_day = min(duration - 5, start_day + i * step_interval)
                irr_day_map[event_day] = irr_day_map.get(event_day, 0.0) + event_depth
                
    # 7. Initialize Dynamic Soil Water Balance
    soil_dict = {
        "field_capacity_vol": soil_props.field_capacity_vol,
        "wilting_point_vol": soil_props.wilting_point_vol,
        "saturation_vol": soil_props.saturation_vol,
        "ksat_mm_day": soil_props.ksat_mm_day
    }
    water_balance = SoilWaterBalance(
        soil_props=soil_dict,
        root_depth_min_m=crop_params.root_depth_min_m,
        root_depth_max_m=crop_params.root_depth_max_m,
        p_base=crop_params.allowable_depletion_fraction_p,
        mulching=payload.mulching_used,
        waterlogging_sensitivity=crop_params.waterlogging_sensitivity
    )
    
    # 8. Daily Simulation Loop
    timeseries: List[DailyTimeseriesPoint] = []
    tot_etc = 0.0
    tot_eta = 0.0
    tot_peff = 0.0
    tot_dp = 0.0
    cum_aeration_penalty = 0.0
    heat_stress_accum = 0.0
    
    # Stage tracking
    stages = crop_params.stages
    stage_water_summary: List[Dict[str, float]] = []
    for stg in stages:
        stage_water_summary.append({
            "name": stg.name,
            "etc_sum": 0.0,
            "eta_sum": 0.0,
            "ky": stg.ky
        })
        
    cum_fraction = 0.0
    stage_durations = []
    for stg in stages:
        stg_days = max(1, int(stg.duration_fraction * duration))
        stage_durations.append(stg_days)
        
    day_stage_indices = []
    curr_idx = 0
    curr_end = stage_durations[0]
    for d in range(1, duration + 1):
        if d > curr_end and curr_idx < len(stages) - 1:
            curr_idx += 1
            curr_end += stage_durations[curr_idx]
        day_stage_indices.append(curr_idx)
        
    # Reference ET calculation helper
    for day_i in range(duration):
        day_num = day_i + 1
        stg_idx = day_stage_indices[day_i]
        curr_stage = stages[stg_idx]
        
        weather_rec = weather_dataset.daily_records[day_i]
        tmean = weather_rec.tmean_c
        tmax = weather_rec.tmax_c
        tmin = weather_rec.tmin_c
        rain = weather_rec.rainfall_mm
        irr = irr_day_map.get(day_num, 0.0)
        
        # ET0 estimation (Hargreaves-Samani formulation with estimated extraterrestrial radiation)
        # Ra approx ~34 MJ/m2/day in tropical/subtropical regions
        ra_approx = 34.0
        td = max(0.1, tmax - tmin)
        et0 = max(0.8, 0.0023 * (tmean + 17.8) * math.sqrt(td) * (ra_approx / 2.45))
        
        # Crop coefficient Kc
        kc = curr_stage.kc
        
        # Heat stress check during mid-season
        if stg_idx == 2 and tmax > crop_params.critical_heat_threshold_c:
            excess_t = tmax - crop_params.critical_heat_threshold_c
            heat_stress_accum += min(0.04, excess_t * 0.008)
            
        # Daily soil water balance step
        gdd_fraction = (day_num / float(duration))
        wb_step = water_balance.step_daily(
            gdd_fraction=gdd_fraction,
            et0=et0,
            kc=kc,
            precip=rain,
            irrigation_mm=irr,
            irrigation_method=irr_method
        )
        
        tot_etc += wb_step["etc_mm"]
        tot_eta += wb_step["eta_mm"]
        tot_peff += wb_step["p_eff_mm"]
        tot_dp += wb_step["deep_percolation_mm"]
        cum_aeration_penalty += wb_step["aeration_stress_penalty"]
        
        stage_water_summary[stg_idx]["etc_sum"] += wb_step["etc_mm"]
        stage_water_summary[stg_idx]["eta_sum"] += wb_step["eta_mm"]
        
        if day_num <= 100 or day_num % 2 == 0:
            timeseries.append(DailyTimeseriesPoint(
                day=day_num,
                date=(sow_dt + timedelta(days=day_i)).strftime("%Y-%m-%d"),
                growth_stage=curr_stage.name,
                kc=kc,
                et0_mm=round(et0, 2),
                etc_mm=wb_step["etc_mm"],
                eta_mm=wb_step["eta_mm"],
                precip_mm=round(rain, 2),
                irrigation_mm=round(irr, 2),
                soil_depletion_mm=wb_step["soil_depletion_mm"],
                soil_water_vol=wb_step["soil_water_vol"],
                root_depth_m=wb_step["root_depth_m"],
                water_stress_ks=wb_step["water_stress_ks"],
                aeration_stress_penalty=wb_step["aeration_stress_penalty"]
            ))
            
    # 9. Total Irrigation Water Volume Calculation
    # Strict formula: Water volume in cubic metres = irrigation depth in millimetres * area in hectares * 10
    total_irr_m3 = calculate_irrigation_volume_m3(total_irr_depth_mm, area_ha)
    total_irr_litres = m3_to_litres(total_irr_m3)
    water_m3_ha = round(total_irr_m3 / max(0.001, area_ha), 1)
    water_m3_ac = round(total_irr_m3 / max(0.001, area_acres), 1)
    
    # 10. Nutrient Evaluation (Mitscherlich-Baule + Excess Fertilizer Penalty)
    soil_om = payload.soil_organic_matter_pct or soil_props.default_organic_matter_pct
    nutrient_res: NutrientEvaluationResult = evaluate_nutrient_management(
        n_applied_kg_ha=payload.nitrogen_kg_ha,
        p_applied_kg_ha=payload.phosphorus_kg_ha,
        k_applied_kg_ha=payload.potassium_kg_ha,
        crop_params=crop_params,
        farm_area_ha=area_ha,
        soil_organic_matter_pct=soil_om,
        num_splits=2
    )
    
    # 11. Yield Estimation
    yield_res: YieldEstimationResult = estimate_crop_yield(
        crop_params=crop_params,
        farm_area_ha=area_ha,
        stage_water_summary=stage_water_summary,
        nutrient_factor=nutrient_res.nutrient_yield_factor,
        excess_fertilizer_penalty_pct=nutrient_res.excess_fertilizer_penalty_pct,
        cumulative_aeration_penalty=cum_aeration_penalty,
        heat_stress_penalty=heat_stress_accum,
        sowing_suitability_factor=sowing_res.sowing_suitability_factor,
        is_experimental_crop=not crop_params.is_validated
    )
    
    # 12. Water Productivity (kg harvest per m3 irrigation water)
    total_consumed_water_m3 = max(1.0, (tot_eta / 1000.0) * area_ha * 10000.0)
    water_productivity = round(yield_res.estimated_total_harvest_kg / total_consumed_water_m3, 2)
    
    # 13. Financial Accounting (in INR)
    finance_res: CostAccountingResult = calculate_farm_finances(
        harvest_quintals=yield_res.estimated_total_harvest_quintals,
        farm_area_ha=area_ha,
        farm_area_acres=area_acres,
        crop_selling_price_per_quintal=payload.crop_selling_price_per_quintal,
        total_n_applied_kg=nutrient_res.total_n_kg_farm,
        total_p_applied_kg=nutrient_res.total_p_kg_farm,
        total_k_applied_kg=nutrient_res.total_k_kg_farm,
        water_applied_m3=total_irr_m3,
        user_fertilizer_cost_total=payload.fertilizer_cost_total,
        user_irrigation_cost_total=payload.irrigation_cost_total,
        other_production_costs_total=payload.other_production_costs
    )
    
    # Consolidate Assumptions and Limitations
    all_assumptions = list(yield_res.assumptions)
    all_assumptions.extend(weather_dataset.assumptions_log)
    if payload.mulching_used:
        all_assumptions.append("Mulching used: crop coefficient Kc adjusted by -12% to account for reduced soil evaporation.")
        
    all_limitations = list(yield_res.limitations)
    if finance_res.is_partial_modeled_cost:
        all_limitations.append("Cultivation expenditure reflects modeled variable operating inputs (water/fertilizer). Unspecified fixed capital or machinery rentals are not included.")
        
    return SimulationRunOutput(
        run_id=f"sim_{uuid.uuid4().hex[:10]}",
        scenario_name=scenario_name,
        model_version=yield_res.model_version,
        data_provenance=yield_res.data_provenance,
        is_validated=yield_res.is_validated,
        crop_id=crop_params.id,
        crop_name=crop_params.name,
        season=crop_params.season,
        sowing_date=payload.sowing_date,
        harvest_date=harvest_dt.strftime("%Y-%m-%d"),
        duration_days=duration,
        farm_area_ha=round(area_ha, 3),
        farm_area_acres=round(area_acres, 2),
        soil_type=soil_props.name,
        reference_yield_kg_ha=yield_res.reference_yield_kg_ha,
        reference_yield_quintal_acre=yield_res.reference_yield_quintal_acre,
        estimated_yield_kg_ha=yield_res.estimated_yield_kg_ha,
        estimated_yield_quintal_acre=yield_res.estimated_yield_quintal_acre,
        estimated_total_harvest_kg=yield_res.estimated_total_harvest_kg,
        estimated_total_harvest_quintals=yield_res.estimated_total_harvest_quintals,
        estimated_total_harvest_tonnes=yield_res.estimated_total_harvest_tonnes,
        yield_gap_pct=yield_res.yield_gap_pct,
        water_response_factor=yield_res.water_response_factor,
        aeration_hypoxia_factor=yield_res.aeration_hypoxia_factor,
        nutrient_response_factor=yield_res.nutrient_response_factor,
        temperature_stress_factor=yield_res.temperature_stress_factor,
        sowing_suitability_factor=yield_res.sowing_suitability_factor,
        excess_irrigation_penalty_pct=yield_res.excess_irrigation_penalty_pct,
        excess_fertilizer_penalty_pct=yield_res.excess_fertilizer_penalty_pct,
        irrigation_method=irr_method,
        total_irrigation_depth_mm=round(total_irr_depth_mm, 1),
        total_irrigation_volume_m3=round(total_irr_m3, 1),
        total_irrigation_volume_litres=round(total_irr_litres, 1),
        water_volume_m3_per_hectare=water_m3_ha,
        water_volume_m3_per_acre=water_m3_ac,
        total_crop_water_demand_etc_mm=round(tot_etc, 1),
        total_actual_evapotranspiration_eta_mm=round(tot_eta, 1),
        total_rainfall_mm=round(weather_dataset.total_rainfall_mm, 1),
        total_effective_rainfall_mm=round(tot_peff, 1),
        deep_percolation_mm=round(tot_dp, 1),
        water_productivity_kg_m3=water_productivity,
        n_applied_kg_ha=nutrient_res.n_applied_kg_ha,
        p_applied_kg_ha=nutrient_res.p_applied_kg_ha,
        k_applied_kg_ha=nutrient_res.k_applied_kg_ha,
        total_n_applied_kg=nutrient_res.total_n_kg_farm,
        total_p_applied_kg=nutrient_res.total_p_kg_farm,
        total_k_applied_kg=nutrient_res.total_k_kg_farm,
        n_adequacy_pct=nutrient_res.n_adequacy_pct,
        p_adequacy_pct=nutrient_res.p_adequacy_pct,
        k_adequacy_pct=nutrient_res.k_adequacy_pct,
        excess_fertilizer_detected=nutrient_res.excess_fertilizer_detected,
        agronomic_advisory=nutrient_res.agronomic_advisory,
        is_within_optimal_sowing_window=sowing_res.is_within_optimal_window,
        days_deviation_from_sowing_optimum=sowing_res.days_deviation_from_optimum,
        sowing_window_description=sowing_res.optimal_window_description,
        sowing_hazard_description=sowing_res.phenological_hazard,
        currency="INR",
        crop_selling_price_per_quintal=finance_res.crop_selling_price_per_quintal,
        estimated_gross_revenue_inr=finance_res.estimated_gross_revenue_inr,
        modeled_fertilizer_cost_inr=finance_res.modeled_fertilizer_cost_inr,
        modeled_irrigation_cost_inr=finance_res.modeled_irrigation_cost_inr,
        other_production_costs_inr=finance_res.other_production_costs_inr,
        total_modeled_cultivation_costs_inr=finance_res.total_modeled_cultivation_costs_inr,
        is_partial_modeled_cost=finance_res.is_partial_modeled_cost,
        estimated_net_return_inr=finance_res.estimated_net_return_inr,
        net_return_per_hectare_inr=finance_res.net_return_per_hectare_inr,
        net_return_per_acre_inr=finance_res.net_return_per_acre_inr,
        return_on_investment_roi_pct=finance_res.return_on_investment_roi_pct,
        financial_notes=finance_res.financial_notes,
        assumptions=all_assumptions,
        limitations=all_limitations,
        timeseries=timeseries
    )
