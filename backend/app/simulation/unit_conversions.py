"""
AgriSim AI - Tested Agricultural Unit Conversions
Implements verified conversion functions for land area, water depths,
volumes, and nutrient quantities according to standard agricultural engineering metrics.
"""

from typing import Union

# Exact conversion factor: 1 acre = 0.40468564224 hectares (International Acre)
ACRE_TO_HECTARE_FACTOR: float = 0.40468564224
HECTARE_TO_ACRE_FACTOR: float = 1.0 / ACRE_TO_HECTARE_FACTOR  # ~2.4710538

def acres_to_hectares(acres: float) -> float:
    """
    Converts land area from acres to hectares.
    Formula: hectares = acres * 0.40468564
    """
    if acres < 0:
        raise ValueError("Area cannot be negative.")
    return float(acres * ACRE_TO_HECTARE_FACTOR)

def hectares_to_acres(hectares: float) -> float:
    """
    Converts land area from hectares to acres.
    Formula: acres = hectares * 2.4710538
    """
    if hectares < 0:
        raise ValueError("Area cannot be negative.")
    return float(hectares * HECTARE_TO_ACRE_FACTOR)

def millimeters_to_meters(mm: float) -> float:
    """
    Converts linear depth from millimetres to metres.
    Formula: metres = millimetres / 1000.0
    """
    if mm < 0:
        raise ValueError("Depth cannot be negative.")
    return float(mm / 1000.0)

def meters_to_millimeters(meters: float) -> float:
    """
    Converts linear depth from metres to millimetres.
    """
    if meters < 0:
        raise ValueError("Depth cannot be negative.")
    return float(meters * 1000.0)

def cubic_meters_to_liters(m3: float) -> float:
    """
    Converts water volume from cubic metres (m3) to litres (L).
    Formula: litres = m3 * 1000.0
    """
    if m3 < 0:
        raise ValueError("Volume cannot be negative.")
    return float(m3 * 1000.0)

def liters_to_cubic_meters(liters: float) -> float:
    """
    Converts water volume from litres (L) to cubic metres (m3).
    Formula: m3 = litres / 1000.0
    """
    if liters < 0:
        raise ValueError("Volume cannot be negative.")
    return float(liters / 1000.0)

# Aliases supporting alternative naming and British / SI spellings
mm_to_metres = millimeters_to_meters
metres_to_mm = meters_to_millimeters
m3_to_litres = cubic_meters_to_liters
litres_to_m3 = liters_to_cubic_meters



def calculate_irrigation_volume_m3(depth_mm: float, area_ha: float) -> float:
    """
    Calculates total irrigation water volume in cubic metres applied over a land area in hectares.
    
    Mathematical derivation:
      1 hectare = 10,000 m2
      1 mm depth = 0.001 m
      Volume = depth (m) * area (m2) = (depth_mm * 0.001) * (area_ha * 10,000)
             = depth_mm * area_ha * 10.0 m3
             
    Therefore:
      Water volume in cubic metres = irrigation depth in millimetres * area in hectares * 10.
    """
    if depth_mm < 0:
        raise ValueError("Irrigation depth cannot be negative.")
    if area_ha < 0:
        raise ValueError("Area cannot be negative.")
    return float(depth_mm * area_ha * 10.0)

def nutrient_rate_to_total_kg(rate_kg_per_ha: float, area_ha: float) -> float:
    """
    Converts nutrient application rate (kg/ha) to total nutrient quantity (kg) for the farm.
    Formula: total_kg = rate_kg_per_ha * area_ha
    """
    if rate_kg_per_ha < 0 or area_ha < 0:
        raise ValueError("Application rate and area cannot be negative.")
    return float(rate_kg_per_ha * area_ha)

def quintals_to_kg(quintals: float) -> float:
    """
    Converts mass from Indian agricultural quintals to kilograms.
    1 quintal = 100 kg.
    """
    if quintals < 0:
        raise ValueError("Quantity cannot be negative.")
    return float(quintals * 100.0)

def kg_to_quintals(kg: float) -> float:
    """
    Converts mass from kilograms to Indian agricultural quintals.
    """
    if kg < 0:
        raise ValueError("Quantity cannot be negative.")
    return float(kg / 100.0)

def kg_per_ha_to_quintals_per_acre(kg_ha: float) -> float:
    """
    Converts crop yield from kg/ha to quintals/acre.
    1 ha = 2.47105 acres, 1 quintal = 100 kg
    q/acre = (kg/ha / 100) / 2.47105 = kg/ha * 0.00404686
    """
    if kg_ha < 0:
        raise ValueError("Yield cannot be negative.")
    return float((kg_ha / 100.0) * ACRE_TO_HECTARE_FACTOR)

def quintals_per_acre_to_kg_per_ha(q_acre: float) -> float:
    """
    Converts crop yield from quintals/acre to kg/ha.
    kg/ha = q_acre * 100 * 2.4710538 = q_acre * 247.10538
    """
    if q_acre < 0:
        raise ValueError("Yield cannot be negative.")
    return float(q_acre * 100.0 * HECTARE_TO_ACRE_FACTOR)
