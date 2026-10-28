"""
AgriSim AI - Monte Carlo Risk & Uncertainty Engine
Simulates hundreds of stochastic weather and market price iterations to quantify
financial risk, Value-at-Risk (VaR 95%), Expected Shortfall, and probability of loss.
"""

import numpy as np
from typing import Dict, Any, List
from app.schemas.risk import MonteCarloRiskInput, MonteCarloRiskResult, DistributionBin
from app.simulation.crop_data import CROP_DATABASE
from app.simulation.engine import run_simulation
from app.simulation.weather_data import generate_daily_weather

def run_monte_carlo_risk_analysis(risk_input: MonteCarloRiskInput) -> MonteCarloRiskResult:
    """
    Executes Monte Carlo stochastic simulation over rainfall, temperature, and price volatility.
    """
    base_sim = risk_input.base_simulation
    crop_id = base_sim.crop_id.lower()
    crop = CROP_DATABASE.get(crop_id, CROP_DATABASE["wheat"])
    duration = crop["duration_days"]
    iterations = risk_input.iterations
    
    # 1. Base simulation for reference
    baseline = run_simulation(base_sim, scenario_name="Baseline")
    base_yield = baseline.yield_quintal_acre
    base_price = base_sim.custom_price_per_quintal or crop["msp_inr_per_quintal"]
    acres = base_sim.farm_profile.total_acres
    base_cost = baseline.costs.total_cost
    
    # Generate reference weather
    ref_weather = generate_daily_weather(
        zone_id=base_sim.farm_profile.zone,
        start_date_str=base_sim.sowing_date,
        duration_days=duration
    )
    
    # Pre-generate stochastic variates
    np.random.seed(101)
    
    # Rainfall multiplier: log-normal with mean ~1.0
    rain_sigma = (risk_input.rainfall_volatility_pct / 100.0) * 0.8
    rain_multipliers = np.random.lognormal(mean=-0.5 * rain_sigma**2, sigma=rain_sigma, size=iterations)
    
    # Temperature anomaly: normal distribution
    temp_anomalies = np.random.normal(loc=0.0, scale=risk_input.temperature_anomaly_c, size=iterations)
    
    # Market price multiplier: log-normal
    price_sigma = (risk_input.price_volatility_pct / 100.0) * 0.7
    price_multipliers = np.random.lognormal(mean=-0.5 * price_sigma**2, sigma=price_sigma, size=iterations)
    
    simulated_yields = []
    simulated_profits = []
    
    # Baseline water applied and natural rainfall
    tot_irr_mm = baseline.total_irrigation_applied_mm
    tot_ref_rain_mm = baseline.total_rainfall_mm
    
    for i in range(iterations):
        r_mult = rain_multipliers[i]
        t_ano = temp_anomalies[i]
        p_mult = price_multipliers[i]
        
        # Effective rainfall shift
        stoch_rain = tot_ref_rain_mm * r_mult
        rain_diff = stoch_rain - tot_ref_rain_mm
        
        # Water deficit/surplus effect on yield
        # If irrigation is high (e.g. drip/flood), rainfall deficit is partially buffered
        buffer_ratio = min(1.0, tot_irr_mm / max(1.0, baseline.total_water_consumed_mm))
        net_water_shock_pct = (rain_diff / max(50.0, baseline.total_water_consumed_mm)) * (1.0 - 0.6 * buffer_ratio)
        water_yield_mod = max(0.40, min(1.10, 1.0 + net_water_shock_pct * 0.7))
        
        # Temperature shock effect: extreme heat dampens yield
        heat_penalty = max(0.0, t_ano * 0.04) if t_ano > 0 else 0.0
        temp_yield_mod = max(0.60, 1.0 - heat_penalty)
        
        # Simulated yield
        sim_yield = float(base_yield * water_yield_mod * temp_yield_mod)
        sim_yield = max(1.5, min(crop["potential_yield_quintal_acre"] * 1.05, sim_yield))
        
        # Simulated price and revenue
        sim_price = float(base_price * p_mult)
        sim_revenue = sim_yield * sim_price * acres
        
        # Simulated cost (slight pumping energy adjustment based on rainfall)
        cost_mod = 1.0 - 0.08 * (r_mult - 1.0)
        sim_cost = base_cost * max(0.90, min(1.15, cost_mod))
        
        sim_profit = sim_revenue - sim_cost
        
        simulated_yields.append(sim_yield)
        simulated_profits.append(sim_profit)
        
    yields_arr = np.array(simulated_yields)
    profits_arr = np.array(simulated_profits)
    
    # Statistical quantiles
    mean_y = float(np.mean(yields_arr))
    std_y = float(np.std(yields_arr))
    p10_y = float(np.percentile(yields_arr, 10))
    p50_y = float(np.percentile(yields_arr, 50))
    p90_y = float(np.percentile(yields_arr, 90))
    
    mean_p = float(np.mean(profits_arr))
    std_p = float(np.std(profits_arr))
    p10_p = float(np.percentile(profits_arr, 10))
    p50_p = float(np.percentile(profits_arr, 50))
    p90_p = float(np.percentile(profits_arr, 90))
    
    # Loss probability (Net profit < 0)
    loss_count = int(np.sum(profits_arr < 0))
    loss_prob_pct = (loss_count / iterations) * 100.0
    
    # Value at Risk (VaR 95%): worst 5th percentile profit
    var_95 = float(np.percentile(profits_arr, 5))
    tail_losses = profits_arr[profits_arr <= var_95]
    expected_shortfall_95 = float(np.mean(tail_losses)) if len(tail_losses) > 0 else var_95
    
    # Histograms
    num_bins = 12
    y_counts, y_edges = np.histogram(yields_arr, bins=num_bins)
    yield_bins = []
    for j in range(num_bins):
        yield_bins.append(DistributionBin(
            bin_start=round(float(y_edges[j]), 2),
            bin_end=round(float(y_edges[j+1]), 2),
            bin_center=round(float((y_edges[j] + y_edges[j+1]) / 2.0), 2),
            count=int(y_counts[j]),
            frequency_pct=round(float((y_counts[j] / iterations) * 100.0), 1)
        ))
        
    p_counts, p_edges = np.histogram(profits_arr, bins=num_bins)
    profit_bins = []
    for j in range(num_bins):
        profit_bins.append(DistributionBin(
            bin_start=round(float(p_edges[j]), 2),
            bin_end=round(float(p_edges[j+1]), 2),
            bin_center=round(float((p_edges[j] + p_edges[j+1]) / 2.0), 2),
            count=int(p_counts[j]),
            frequency_pct=round(float((p_counts[j] / iterations) * 100.0), 1)
        ))
        
    if loss_prob_pct <= 5.0:
        risk_rating = "Low Risk Profile"
    elif loss_prob_pct <= 18.0:
        risk_rating = "Moderate Risk Profile"
    elif loss_prob_pct <= 35.0:
        risk_rating = "Elevated Risk Profile"
    else:
        risk_rating = "High Risk / Speculative"
        
    summary = (
        f"Across {iterations} stochastic climate and market price simulations, mean net profit is projected at ₹{mean_p:,.0f} "
        f"(90% confidence range: ₹{p10_p:,.0f} to ₹{p90_p:,.0f}). The probability of experiencing a net financial loss is {loss_prob_pct:.1f}%. "
        f"At 95% confidence, Value-at-Risk (VaR 95%) is ₹{var_95:,.0f}."
    )
    
    return MonteCarloRiskResult(
        iterations=iterations,
        mean_yield=round(mean_y, 2),
        std_yield=round(std_y, 2),
        p10_yield=round(p10_y, 2),
        p50_yield=round(p50_y, 2),
        p90_yield=round(p90_y, 2),
        mean_profit=round(mean_p, 2),
        std_profit=round(std_p, 2),
        p10_profit=round(p10_p, 2),
        p50_profit=round(p50_p, 2),
        p90_profit=round(p90_p, 2),
        loss_probability_pct=round(loss_prob_pct, 1),
        value_at_risk_95_inr=round(var_95, 2),
        expected_shortfall_95_inr=round(expected_shortfall_95, 2),
        yield_distribution=yield_bins,
        profit_distribution=profit_bins,
        risk_rating=risk_rating,
        risk_executive_summary=summary
    )
