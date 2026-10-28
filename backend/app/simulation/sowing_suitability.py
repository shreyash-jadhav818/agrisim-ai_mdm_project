"""
AgriSim AI - Sowing-Date Suitability Module
Quantifies phenological synchronization and yield suitability based on sowing calendar,
penalizing early emergence hazards and terminal heat/drought from delayed sowing.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Any, Tuple
from app.simulation.crop_parameters import CropParameters

@dataclass
class SowingSuitabilityResult:
    sowing_date: str
    day_of_year: int
    optimal_window_description: str
    is_within_optimal_window: bool
    days_deviation_from_optimum: int           # Negative = early, Positive = delayed, 0 = on-time
    sowing_suitability_factor: float          # 0.45 to 1.00
    yield_impact_pct: float                   # Percentage gain or penalty
    phenological_hazard: str

def evaluate_sowing_suitability(
    sowing_date_str: str,
    crop_params: CropParameters
) -> SowingSuitabilityResult:
    """
    Evaluates whether the provided sowing date matches crop-specific regional agronomic windows.
    """
    try:
        sow_dt = datetime.strptime(sowing_date_str.strip(), "%Y-%m-%d")
    except Exception:
        # Default fallback if non-standard date passed
        sow_dt = datetime(2026, 11, 15)
        
    sow_doy = sow_dt.timetuple().tm_yday
    year = sow_dt.year
    
    win = crop_params.optimal_sowing_window
    
    # Evaluate across adjacent calendar cycles (year-1, year, year+1) to accurately match winter Rabi seasons
    candidate_windows = []
    for yr in [year - 1, year, year + 1]:
        start_m = win["start_month"]
        start_d = win["start_day"]
        end_m = win["end_month"]
        end_d = win["end_day"]
        
        c_start = datetime(yr, start_m, start_d)
        end_yr = yr if start_m <= end_m else yr + 1
        c_end = datetime(end_yr, end_m, end_d)
        candidate_windows.append((c_start, c_end))
        
    # Find closest window
    best_window = None
    best_dev = 999999
    is_in_win = False
    
    for c_start, c_end in candidate_windows:
        if c_start <= sow_dt <= c_end:
            best_window = (c_start, c_end)
            best_dev = 0
            is_in_win = True
            break
        elif sow_dt < c_start:
            dev = -(c_start - sow_dt).days
            if abs(dev) < abs(best_dev):
                best_dev = dev
                best_window = (c_start, c_end)
        else:
            dev = (sow_dt - c_end).days
            if abs(dev) < abs(best_dev):
                best_dev = dev
                best_window = (c_start, c_end)
                
    start_dt, end_dt = best_window
    in_window = is_in_win
    dev_days = best_dev
    window_desc = f"{start_dt.strftime('%d %b')} to {end_dt.strftime('%d %b')}"

    
    if in_window:
        factor = 1.00
        hazard = "Optimal thermal alignment. Sowing within ideal window enables peak radiation interception during vegetative canopy expansion."
    elif dev_days < 0:
        # Early sowing: risk of high pre-season temperatures, pest build-up, or false monsoons
        days_early = abs(dev_days)
        # 0.6% penalty per day early up to 35% cap
        penalty = min(0.35, days_early * 0.006)
        factor = round(1.0 - penalty, 3)
        hazard = (
            f"Early sowing by {days_early} days. Crop may face elevated pre-monsoon heat, poor germination, "
            f"or early-season sucking pest incidence."
        )
    else:
        # Delayed sowing: risk of terminal heat stress during grain filling or winter cold shock
        days_late = dev_days
        # ICAR studies demonstrate 1.0% to 1.3% yield loss per day of delay past optimal window
        penalty = min(0.48, days_late * 0.011)
        factor = round(1.0 - penalty, 3)
        if crop_params.season == "Rabi":
            hazard = (
                f"Delayed sowing by {days_late} days past {end_dt.strftime('%d %b')}. "
                f"Pushes grain formation into hot March winds, causing forced ripening, shriveled grains, and reduced test-weight."
            )
        else:
            hazard = (
                f"Delayed sowing by {days_late} days. Shortens vegetative phase, increases risk of end-of-season drought during flowering."
            )
            
    yield_impact = round((factor - 1.0) * 100.0, 1)
    
    return SowingSuitabilityResult(
        sowing_date=sow_dt.strftime("%Y-%m-%d"),
        day_of_year=sow_doy,
        optimal_window_description=window_desc,
        is_within_optimal_window=in_window,
        days_deviation_from_optimum=dev_days,
        sowing_suitability_factor=factor,
        yield_impact_pct=yield_impact,
        phenological_hazard=hazard
    )
