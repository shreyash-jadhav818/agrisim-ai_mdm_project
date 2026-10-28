"""
AgriSim AI - Weather Generation & Agro-Climatic Zone Climatology
Provides daily synthetic weather time series based on Indian Meteorological Department (IMD)
30-year climate normals for Indian agro-climatic zones.
"""

import math
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any, List

AGRO_CLIMATIC_ZONES: Dict[str, Dict[str, Any]] = {
    "Trans-Gangetic Plain": {
        "id": "Trans-Gangetic Plain",
        "name": "Trans-Gangetic Plain (Punjab & Haryana)",
        "latitude": 30.5,
        "elevation_m": 250.0,
        "annual_rainfall_mm": 650.0,
        "kharif_rain_share": 0.78,
        "rabi_rain_share": 0.15,
        "tmin_jan": 5.5, "tmax_jan": 19.5,
        "tmin_may": 25.0, "tmax_may": 41.5,
        "tmin_jul": 26.5, "tmax_jul": 35.0,
        "tmin_oct": 17.5, "tmax_oct": 32.5,
        "primary_crops": ["wheat", "rice", "cotton", "mustard", "potato"],
        "primary_soils": ["Alluvial Loam", "Sandy Loam"]
    },
    "Upper Gangetic Plain": {
        "id": "Upper Gangetic Plain",
        "name": "Upper Gangetic Plain (Western Uttar Pradesh)",
        "latitude": 28.0,
        "elevation_m": 200.0,
        "annual_rainfall_mm": 800.0,
        "kharif_rain_share": 0.82,
        "rabi_rain_share": 0.12,
        "tmin_jan": 7.0, "tmax_jan": 21.0,
        "tmin_may": 26.0, "tmax_may": 41.0,
        "tmin_jul": 27.0, "tmax_jul": 34.5,
        "tmin_oct": 18.0, "tmax_oct": 32.0,
        "primary_crops": ["sugarcane", "wheat", "rice", "potato", "mustard"],
        "primary_soils": ["Alluvial Loam", "Clay Loam"]
    },
    "Western Dry Region": {
        "id": "Western Dry Region",
        "name": "Western Dry Region (Rajasthan & North Gujarat)",
        "latitude": 26.5,
        "elevation_m": 220.0,
        "annual_rainfall_mm": 380.0,
        "kharif_rain_share": 0.88,
        "rabi_rain_share": 0.08,
        "tmin_jan": 7.5, "tmax_jan": 24.0,
        "tmin_may": 28.0, "tmax_may": 44.0,
        "tmin_jul": 28.0, "tmax_jul": 37.0,
        "tmin_oct": 19.5, "tmax_oct": 35.0,
        "primary_crops": ["bajra", "mustard", "chickpea", "groundnut", "cotton"],
        "primary_soils": ["Sandy Loam", "Alluvial Loam"]
    },
    "Western Plateau & Hills": {
        "id": "Western Plateau & Hills",
        "name": "Western Plateau & Hills (Maharashtra & MP Vertisols)",
        "latitude": 19.5,
        "elevation_m": 550.0,
        "annual_rainfall_mm": 850.0,
        "kharif_rain_share": 0.85,
        "rabi_rain_share": 0.10,
        "tmin_jan": 12.0, "tmax_jan": 29.5,
        "tmin_may": 24.5, "tmax_may": 39.5,
        "tmin_jul": 22.5, "tmax_jul": 29.5,
        "tmin_oct": 18.0, "tmax_oct": 31.5,
        "primary_crops": ["cotton", "soybean", "sugarcane", "onion", "jowar", "chickpea"],
        "primary_soils": ["Black Cotton Soil (Vertisol)", "Clay Loam"]
    },
    "Southern Plateau & Hills": {
        "id": "Southern Plateau & Hills",
        "name": "Southern Plateau & Hills (Telangana, Karnataka, AP)",
        "latitude": 16.0,
        "elevation_m": 450.0,
        "annual_rainfall_mm": 900.0,
        "kharif_rain_share": 0.75,
        "rabi_rain_share": 0.20,
        "tmin_jan": 16.0, "tmax_jan": 30.0,
        "tmin_may": 26.5, "tmax_may": 39.0,
        "tmin_jul": 23.5, "tmax_jul": 30.5,
        "tmin_oct": 21.0, "tmax_oct": 31.0,
        "primary_crops": ["cotton", "maize", "groundnut", "rice", "tomato"],
        "primary_soils": ["Red Sandy Loam", "Black Cotton Soil (Vertisol)"]
    }
}

def generate_daily_weather(
    zone_id: str,
    start_date_str: str,
    duration_days: int,
    seed: int = 42,
    rainfall_multiplier: float = 1.0,
    temp_anomaly: float = 0.0
) -> List[Dict[str, float]]:
    """
    Generates a realistic daily weather sequence for the given zone and duration.
    Calculates tmin, tmax, tmean, solar radiation (Rs), relative humidity, wind speed,
    and precipitation based on latitude, day-of-year, and IMD monthly temperature anchors.
    """
    zone = AGRO_CLIMATIC_ZONES.get(zone_id, AGRO_CLIMATIC_ZONES["Trans-Gangetic Plain"])
    start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
    np.random.seed(seed)
    
    daily_records = []
    
    for day in range(duration_days):
        current_date = start_date + timedelta(days=day)
        doy = current_date.timetuple().tm_yday
        month = current_date.month
        
        # Continuous sinusoidal annual cycle for temperatures
        # Peak heat in late May (DOY ~ 145), coolest in mid January (DOY ~ 15)
        phase = 2.0 * math.pi * (doy - 15) / 365.25
        tmin_base = (zone["tmin_jan"] + zone["tmin_may"]) / 2.0 - ((zone["tmin_may"] - zone["tmin_jan"]) / 2.0) * math.cos(phase)
        tmax_base = (zone["tmax_jan"] + zone["tmax_may"]) / 2.0 - ((zone["tmax_may"] - zone["tmax_jan"]) / 2.0) * math.cos(phase)
        
        # Monsoon cooling dampens daytime peak in July-August
        if 160 <= doy <= 260:
            monsoon_dip = 4.0 * math.sin(math.pi * (doy - 160) / 100.0)
            tmax_base -= monsoon_dip
            tmin_base += 1.5
            
        # Daily stochastic variation
        tmin = float(tmin_base + np.random.normal(0, 1.2) + temp_anomaly)
        tmax = float(tmax_base + np.random.normal(0, 1.5) + temp_anomaly)
        if tmax <= tmin + 2.0:
            tmax = tmin + 4.0
        tmean = (tmax + tmin) / 2.0
        
        # Extraterrestrial solar radiation (Ra) from latitude and DOY
        lat_rad = math.radians(zone["latitude"])
        solar_decl = 0.409 * math.sin((2.0 * math.pi / 365.0) * doy - 1.39)
        ws = math.acos(max(-1.0, min(1.0, -math.tan(lat_rad) * math.tan(solar_decl))))
        dr = 1.0 + 0.033 * math.cos(2.0 * math.pi * doy / 365.0)
        
        # Ra in MJ/m2/day
        ra = (24.0 * 60.0 / math.pi) * 0.0820 * dr * (
            ws * math.sin(lat_rad) * math.sin(solar_decl) +
            math.cos(lat_rad) * math.cos(solar_decl) * math.sin(ws)
        )
        
        # Solar radiation Rs from Hargreaves formula adjusted for cloudiness
        kr = 0.17  # interior region coefficient
        rs = kr * math.sqrt(max(0.1, tmax - tmin)) * ra
        
        # Precipitation simulation (Monsoon active June-Sept DOY 155-270, Western disturbances Dec-Feb)
        precip = 0.0
        is_monsoon = 155 <= doy <= 270
        is_winter_rain = doy <= 55 or doy >= 340
        
        if is_monsoon:
            rain_prob = 0.35  # ~35% rainy days in monsoon
            if np.random.rand() < rain_prob:
                # Gamma distribution for rainfall event depth
                precip = float(np.random.gamma(shape=1.6, scale=14.0) * rainfall_multiplier)
        elif is_winter_rain:
            rain_prob = 0.09
            if np.random.rand() < rain_prob:
                precip = float(np.random.gamma(shape=1.2, scale=8.0) * rainfall_multiplier)
        else:
            # Pre/post monsoon dry spell
            if np.random.rand() < 0.03:
                precip = float(np.random.gamma(shape=1.0, scale=6.0) * rainfall_multiplier)
                
        # Relative humidity and wind speed
        if precip > 0:
            rh = float(min(98.0, 75.0 + np.random.uniform(5, 20)))
            rs *= 0.65  # overcast reduction
        elif is_monsoon:
            rh = float(min(92.0, 68.0 + np.random.uniform(0, 15)))
        else:
            rh = float(max(20.0, 48.0 - (tmax - 28.0) * 1.5 + np.random.normal(0, 5)))
            
        u2 = float(max(0.5, 2.0 + np.random.normal(0, 0.6)))  # wind speed at 2m in m/s
        
        daily_records.append({
            "day": day + 1,
            "date": current_date.strftime("%Y-%m-%d"),
            "doy": doy,
            "tmin": round(tmin, 2),
            "tmax": round(tmax, 2),
            "tmean": round(tmean, 2),
            "rs": round(rs, 2),
            "ra": round(ra, 2),
            "rh": round(rh, 1),
            "u2": round(u2, 2),
            "precip": round(precip, 2)
        })
        
    return daily_records
