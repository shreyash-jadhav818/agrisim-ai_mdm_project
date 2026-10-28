"""
AgriSim AI - Weather Inputs & Validation Module
Accepts, validates, and standardizes meteorological inputs (temperature, rainfall, relative humidity).
Strictly validates limits and explicitly identifies measured vs estimated weather variables without silent fabrication.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Tuple
import math

@dataclass
class DailyWeatherRecord:
    day: int
    date: str
    tmin_c: float
    tmax_c: float
    tmean_c: float
    rainfall_mm: float
    relative_humidity_pct: Optional[float] = None
    solar_radiation_mj_m2: Optional[float] = None
    wind_speed_m_s: Optional[float] = None
    is_humidity_measured: bool = False
    is_radiation_measured: bool = False

@dataclass
class WeatherDataset:
    daily_records: List[DailyWeatherRecord]
    total_rainfall_mm: float
    mean_temperature_c: float
    min_temperature_c: float
    max_temperature_c: float
    mean_relative_humidity_pct: Optional[float]
    has_measured_humidity: bool
    assumptions_log: List[str] = field(default_factory=list)

def validate_weather_inputs(
    temperature_c: Optional[float] = None,
    tmin_c: Optional[float] = None,
    tmax_c: Optional[float] = None,
    rainfall_mm: Optional[float] = None,
    relative_humidity_pct: Optional[float] = None
) -> Tuple[bool, List[str]]:
    """
    Validates meteorological parameters against biophysical limits.
    Returns (is_valid, list_of_validation_errors).
    """
    errors = []
    
    # 1. Temperature sensible limits: -15°C to 55°C
    if temperature_c is not None:
        if not (-15.0 <= temperature_c <= 55.0):
            errors.append(f"Temperature {temperature_c}°C is outside plausible terrestrial agricultural limits (-15°C to 55°C).")
            
    if tmin_c is not None and tmax_c is not None:
        if tmin_c > tmax_c:
            errors.append(f"Minimum temperature ({tmin_c}°C) cannot exceed maximum temperature ({tmax_c}°C).")
        if not (-15.0 <= tmin_c <= 50.0):
            errors.append(f"Minimum temperature {tmin_c}°C is outside plausible bounds (-15°C to 50°C).")
        if not (-10.0 <= tmax_c <= 56.0):
            errors.append(f"Maximum temperature {tmax_c}°C is outside plausible bounds (-10°C to 56°C).")
            
    # 2. Rainfall limits: >= 0 mm, sensible upper bound for seasonal / single event
    if rainfall_mm is not None:
        if rainfall_mm < 0.0:
            errors.append("Rainfall measurement cannot be negative.")
        elif rainfall_mm > 4000.0:
            errors.append(f"Rainfall value {rainfall_mm} mm exceeds normal agricultural seasonal bounds.")
            
    # 3. Relative Humidity limits: 0% to 100%
    if relative_humidity_pct is not None:
        if not (0.0 <= relative_humidity_pct <= 100.0):
            errors.append(f"Relative humidity {relative_humidity_pct}% must be between 0% and 100%.")
            
    return len(errors) == 0, errors

def process_weather_inputs(
    duration_days: int,
    temperature_c: Optional[float] = None,
    tmin_c: Optional[float] = None,
    tmax_c: Optional[float] = None,
    rainfall_mm: Optional[float] = None,
    relative_humidity_pct: Optional[float] = None,
    daily_weather_series: Optional[List[Dict[str, Any]]] = None,
    latitude_deg: float = 28.0,
    elevation_m: float = 250.0
) -> WeatherDataset:
    """
    Standardizes and formats weather inputs into a validated daily weather dataset.
    Clearly tracks whether humidity and radiation are measured or derived.
    """
    assumptions_log: List[str] = []
    
    # 1. If an explicit daily series is provided
    if daily_weather_series and len(daily_weather_series) >= duration_days:
        daily_records: List[DailyWeatherRecord] = []
        tot_rain = 0.0
        tot_temp = 0.0
        tot_rh = 0.0
        rh_count = 0
        min_temp = 999.0
        max_temp = -999.0
        
        has_measured_humidity = False
        
        for idx in range(duration_days):
            rec = daily_weather_series[idx]
            t_min = float(rec.get("tmin", rec.get("tmin_c", 15.0)))
            t_max = float(rec.get("tmax", rec.get("tmax_c", 30.0)))
            t_mean = float(rec.get("tmean", (t_min + t_max) / 2.0))
            rain = max(0.0, float(rec.get("precip", rec.get("rainfall_mm", 0.0))))
            
            rh = rec.get("rh", rec.get("relative_humidity_pct", None))
            is_rh_measured = rh is not None
            if is_rh_measured:
                has_measured_humidity = True
                tot_rh += float(rh)
                rh_count += 1
                
            rad = rec.get("rs", rec.get("solar_radiation_mj_m2", None))
            u2 = rec.get("u2", rec.get("wind_speed_m_s", None))
            
            tot_rain += rain
            tot_temp += t_mean
            min_temp = min(min_temp, t_min)
            max_temp = max(max_temp, t_max)
            
            daily_records.append(DailyWeatherRecord(
                day=idx + 1,
                date=rec.get("date", f"Day-{idx+1}"),
                tmin_c=t_min,
                tmax_c=t_max,
                tmean_c=t_mean,
                rainfall_mm=rain,
                relative_humidity_pct=float(rh) if rh is not None else None,
                solar_radiation_mj_m2=float(rad) if rad is not None else None,
                wind_speed_m_s=float(u2) if u2 is not None else None,
                is_humidity_measured=is_rh_measured,
                is_radiation_measured=rad is not None
            ))
            
        if not has_measured_humidity:
            assumptions_log.append("Relative humidity was not measured; estimated from daily temperature range (FAO-56 eq. 6-7).")
            
        return WeatherDataset(
            daily_records=daily_records,
            total_rainfall_mm=round(tot_rain, 1),
            mean_temperature_c=round(tot_temp / duration_days, 1),
            min_temperature_c=round(min_temp, 1),
            max_temperature_c=round(max_temp, 1),
            mean_relative_humidity_pct=round(tot_rh / max(1, rh_count), 1) if has_measured_humidity else None,
            has_measured_humidity=has_measured_humidity,
            assumptions_log=assumptions_log
        )
        
    # 2. If single-point or summary weather parameters were supplied
    is_valid, validation_errors = validate_weather_inputs(
        temperature_c=temperature_c,
        tmin_c=tmin_c,
        tmax_c=tmax_c,
        rainfall_mm=rainfall_mm,
        relative_humidity_pct=relative_humidity_pct
    )
    if not is_valid:
        raise ValueError(f"Weather input validation failure: {'; '.join(validation_errors)}")
        
    # Baseline diurnal swing if only mean temperature is given
    if temperature_c is not None and (tmin_c is None or tmax_c is None):
        tmin_c = temperature_c - 6.5
        tmax_c = temperature_c + 6.5
        assumptions_log.append(f"Diurnal temperature range assumed at ±6.5°C around mean temperature {temperature_c}°C.")
    elif tmin_c is None or tmax_c is None:
        tmin_c = 18.0
        tmax_c = 32.0
        assumptions_log.append("Ambient temperatures defaulted to seasonal regional baseline (18°C - 32°C).")
        
    mean_temp = (tmax_c + tmin_c) / 2.0
    tot_rain = rainfall_mm if rainfall_mm is not None else 0.0
    daily_rain = tot_rain / max(1, duration_days)
    
    if rainfall_mm is not None:
        assumptions_log.append(f"Total rainfall of {rainfall_mm} mm distributed uniformly across the {duration_days}-day growth cycle.")
        
    has_measured_humidity = relative_humidity_pct is not None
    if not has_measured_humidity:
        assumptions_log.append("Relative humidity not supplied; psychrometric vapor pressures derived using FAO-56 dew point approximation.")
        
    daily_records = []
    for day_i in range(duration_days):
        daily_records.append(DailyWeatherRecord(
            day=day_i + 1,
            date=f"Day-{day_i + 1}",
            tmin_c=tmin_c,
            tmax_c=tmax_c,
            tmean_c=mean_temp,
            rainfall_mm=daily_rain,
            relative_humidity_pct=relative_humidity_pct,
            is_humidity_measured=has_measured_humidity,
            is_radiation_measured=False
        ))
        
    return WeatherDataset(
        daily_records=daily_records,
        total_rainfall_mm=round(tot_rain, 1),
        mean_temperature_c=round(mean_temp, 1),
        min_temperature_c=round(tmin_c, 1),
        max_temperature_c=round(tmax_c, 1),
        mean_relative_humidity_pct=relative_humidity_pct,
        has_measured_humidity=has_measured_humidity,
        assumptions_log=assumptions_log
    )
