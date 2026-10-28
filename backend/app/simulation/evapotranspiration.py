"""
AgriSim AI - Evapotranspiration Engine (FAO-56 Penman-Monteith & Hargreaves-Samani)
Implements standard FAO Irrigation and Drainage Paper No. 56 equations.
"""

import math

def calculate_fao56_penman_monteith(
    tmin: float,
    tmax: float,
    rs: float,
    rh: float,
    u2: float,
    elevation_m: float = 250.0
) -> float:
    """
    Calculates reference evapotranspiration (ET0) in mm/day using the standard
    FAO-56 Penman-Monteith equation.
    
    Parameters:
    - tmin: Minimum daily air temperature (°C)
    - tmax: Maximum daily air temperature (°C)
    - rs: Solar radiation (MJ/m2/day)
    - rh: Mean relative humidity (%)
    - u2: Wind speed at 2 m height (m/s)
    - elevation_m: Station elevation above sea level (meters)
    """
    tmean = (tmax + tmin) / 2.0
    
    # 1. Atmospheric pressure (kPa) based on elevation
    patm = 101.3 * math.pow((293.0 - 0.0065 * elevation_m) / 293.0, 5.26)
    
    # 2. Psychrometric constant gamma (kPa/°C)
    gamma = 0.000665 * patm
    
    # 3. Saturation vapor pressure es (kPa)
    e_tmax = 0.6108 * math.exp((17.27 * tmax) / (tmax + 237.3))
    e_tmin = 0.6108 * math.exp((17.27 * tmin) / (tmin + 237.3))
    es = (e_tmax + e_tmin) / 2.0
    
    # 4. Actual vapor pressure ea (kPa)
    ea = es * (rh / 100.0)
    
    # 5. Slope of saturation vapor pressure curve delta (kPa/°C)
    delta = (4098.0 * (0.6108 * math.exp((17.27 * tmean) / (tmean + 237.3)))) / math.pow(tmean + 237.3, 2)
    
    # 6. Net solar radiation Rns (MJ/m2/day) with albedo alpha = 0.23 (reference grass)
    rns = (1.0 - 0.23) * rs
    
    # 7. Clear sky solar radiation Rso (MJ/m2/day)
    # Approximation Rso = (0.75 + 2e-5 * elevation) * Ra
    # For daily net longwave radiation Rnl:
    sigma = 4.903e-9  # Stefan-Boltzmann constant MJ/K4/m2/day
    tmax_k = tmax + 273.16
    tmin_k = tmin + 273.16
    temp_term = sigma * ((tmax_k**4 + tmin_k**4) / 2.0)
    vapor_term = 0.34 - 0.14 * math.sqrt(max(0.01, ea))
    cloud_term = max(0.2, min(1.0, 1.35 * min(1.0, rs / max(1.0, 0.75 * rs + 5.0)) - 0.35))
    rnl = temp_term * vapor_term * cloud_term
    
    # Net radiation Rn
    rn = max(0.0, rns - rnl)
    g = 0.0  # Daily soil heat flux is negligible
    
    # 8. FAO-56 Penman-Monteith combination equation
    numerator = 0.408 * delta * (rn - g) + gamma * (900.0 / (tmean + 273.0)) * u2 * (es - ea)
    denominator = delta + gamma * (1.0 + 0.34 * u2)
    
    et0 = numerator / denominator
    return round(max(0.5, float(et0)), 2)

def calculate_hargreaves_samani(
    tmin: float,
    tmax: float,
    ra: float
) -> float:
    """
    Calculates reference ET0 using the Hargreaves-Samani method.
    ET0 = 0.0023 * (Tmean + 17.8) * (Tmax - Tmin)^0.5 * Ra
    Where Ra is converted from MJ/m2/day to equivalent water depth mm/day (/ 2.45).
    """
    tmean = (tmax + tmin) / 2.0
    td = max(0.1, tmax - tmin)
    ra_mm = ra / 2.45
    et0 = 0.0023 * (tmean + 17.8) * math.sqrt(td) * ra_mm
    return round(max(0.5, float(et0)), 2)
