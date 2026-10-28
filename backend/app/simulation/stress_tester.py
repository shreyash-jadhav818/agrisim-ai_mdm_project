"""
AgriSim AI - Weather & Climate Stress Testing Framework
Evaluates crop and farm financial resilience against climate extremes:
heatwaves during anthesis, mid-season monsoon breaks, terminal heat, and excess deluge.
"""

import copy
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from app.schemas.stress_test import StressTestInput, StressTestResult, StressScenarioOutcome
from app.simulation.crop_data import CROP_DATABASE
from app.simulation.weather_data import generate_daily_weather
from app.simulation.engine import run_simulation

STRESS_SCENARIOS = {
    "heatwave_anthesis": {
        "id": "heatwave_anthesis",
        "name": "Heatwave at Flowering / Anthesis",
        "severity": "Severe",
        "description": "7-day heatwave (+5.5°C daytime maximum) during the critical flowering stage, inducing pollen sterility and floret abortion.",
        "mitigation_strategy": "Maintain light canopy sprinkler misting or pre-flowering irrigation to maintain microclimate humidity and prevent pollen desiccation."
    },
    "monsoon_break_drought": {
        "id": "monsoon_break_drought",
        "name": "21-Day Monsoon Break (Dry Spell)",
        "severity": "Extreme",
        "description": "Prolonged 3-week precipitation break with 0 mm rainfall and +2.0°C temperature anomaly during vegetative canopy expansion.",
        "mitigation_strategy": "Adopt plastic or crop-residue mulching to arrest soil surface evaporation; transition to deficit drip irrigation."
    },
    "terminal_heat": {
        "id": "terminal_heat",
        "name": "Terminal Heat Stress at Grain Filling",
        "severity": "Moderate",
        "description": "Early arrival of high summer temperatures (+4.0°C) during late dough stage causing forced ripening and grain shriveling.",
        "mitigation_strategy": "Advance sowing date by 10-14 days; select early-maturing, heat-tolerant varieties; apply potassium nitrate foliar spray."
    },
    "heavy_deluge_waterlogging": {
        "id": "heavy_deluge_waterlogging",
        "name": "Unseasonal Heavy Deluge (Waterlogging)",
        "severity": "Severe",
        "description": "Continuous 120 mm extreme rainfall across 48 hours causing soil saturation, root hypoxia, and nutrient leaching.",
        "mitigation_strategy": "Construct broad bed and furrow (BBF) systems with field drainage ditches; apply supplementary nitrogen top-dressing post-drainage."
    }
}

def run_stress_testing_battery(stress_input: StressTestInput) -> StressTestResult:
    """
    Runs complete stress testing suite against baseline farm parameters.
    """
    base_sim = stress_input.base_simulation
    crop_id = base_sim.crop_id.lower()
    crop = CROP_DATABASE.get(crop_id, CROP_DATABASE["wheat"])
    duration = crop["duration_days"]
    
    # 1. Run Baseline
    baseline = run_simulation(base_sim, scenario_name="Baseline Normal")
    base_yield = baseline.yield_quintal_acre
    base_profit = baseline.net_profit_inr
    
    # Generate baseline weather
    base_weather = generate_daily_weather(
        zone_id=base_sim.farm_profile.zone,
        start_date_str=base_sim.sowing_date,
        duration_days=duration
    )
    
    scenario_ids = stress_input.scenario_ids or list(STRESS_SCENARIOS.keys())
    outcomes: List[StressScenarioOutcome] = []
    
    for s_id in scenario_ids:
        meta = STRESS_SCENARIOS.get(s_id, STRESS_SCENARIOS["heatwave_anthesis"])
        weather_mod = copy.deepcopy(base_weather)
        
        # Apply specific shock
        if s_id == "heatwave_anthesis":
            # Apply around flowering: ~55% to ~65% of crop cycle
            f_start = int(duration * 0.52)
            f_end = min(duration, f_start + 8)
            for d in range(f_start, f_end):
                weather_mod[d]["tmax"] += 5.5
                weather_mod[d]["tmean"] += 3.5
                weather_mod[d]["rh"] = max(15.0, weather_mod[d]["rh"] - 20.0)
            critical_impact = "High floret sterility and spikelet burn during pollination."
            
        elif s_id == "monsoon_break_drought":
            # 21 day zero rain dry spell from day 35 to 56
            d_start = int(duration * 0.28)
            d_end = min(duration, d_start + 21)
            for d in range(d_start, d_end):
                weather_mod[d]["precip"] = 0.0
                weather_mod[d]["tmax"] += 2.5
                weather_mod[d]["rh"] = max(25.0, weather_mod[d]["rh"] - 18.0)
            critical_impact = "Severe root-zone moisture depletion below RAW leading to stomatal closure and vegetative stunting."
            
        elif s_id == "terminal_heat":
            # Terminal heat in final 20 days
            t_start = max(0, duration - 22)
            for d in range(t_start, duration):
                weather_mod[d]["tmax"] += 4.5
                weather_mod[d]["tmean"] += 3.0
            critical_impact = "Premature senescence reducing test-weight and individual grain filling duration."
            
        elif s_id == "heavy_deluge_waterlogging":
            # 120 mm deluge over 2 days during mid growth
            w_day = int(duration * 0.45)
            weather_mod[w_day]["precip"] = 75.0
            weather_mod[w_day + 1]["precip"] = 55.0
            critical_impact = "Root zone saturation, root hypoxia, and transient nitrogen leaching."
        else:
            critical_impact = "General climate shock impact."
            
        # Run simulation under stressed weather
        stressed_sim = run_simulation(base_sim, scenario_name=meta["name"], weather_override=weather_mod)
        
        yield_loss_pct = max(0.0, ((base_yield - stressed_sim.yield_quintal_acre) / max(0.1, base_yield)) * 100.0)
        profit_loss_inr = max(0.0, base_profit - stressed_sim.net_profit_inr)
        
        outcomes.append(StressScenarioOutcome(
            scenario_id=s_id,
            scenario_name=meta["name"],
            description=meta["description"],
            severity=meta["severity"],
            yield_quintal_acre=stressed_sim.yield_quintal_acre,
            yield_loss_pct=round(yield_loss_pct, 1),
            profit_loss_inr=round(profit_loss_inr, 2),
            critical_impact=critical_impact,
            mitigation_strategy=meta["mitigation_strategy"],
            simulation_result=stressed_sim
        ))
        
    # Calculate composite resilience score (0-100)
    # Average yield retention under all shocks
    avg_loss = sum(o.yield_loss_pct for o in outcomes) / max(1, len(outcomes))
    resilience_score = max(0.0, min(100.0, 100.0 - avg_loss * 2.2))
    
    if resilience_score >= 80.0:
        rating = "Excellent Resilience"
    elif resilience_score >= 65.0:
        rating = "Moderate Resilience"
    elif resilience_score >= 50.0:
        rating = "Vulnerable to Shocks"
    else:
        rating = "High Climate Vulnerability"
        
    vulnerability_summary = (
        f"Under severe climate shocks, your current management practices demonstrate a resilience score of {resilience_score:.1f}/100 ({rating}). "
        f"The greatest vulnerability is {max(outcomes, key=lambda x: x.yield_loss_pct).scenario_name} causing a projected yield drop of {max(outcomes, key=lambda x: x.yield_loss_pct).yield_loss_pct:.1f}%."
    )
    
    return StressTestResult(
        crop_name=crop["name"],
        baseline_yield=base_yield,
        baseline_profit=base_profit,
        outcomes=outcomes,
        resilience_score=round(resilience_score, 1),
        resilience_rating=rating,
        vulnerability_summary=vulnerability_summary
    )
