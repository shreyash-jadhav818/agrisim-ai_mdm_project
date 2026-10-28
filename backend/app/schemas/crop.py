from pydantic import BaseModel
from typing import List, Optional

class CropStage(BaseModel):
    name: str
    duration_days: int
    kc: float
    ky: float
    description: str

class CropCatalogItem(BaseModel):
    id: str
    name: str
    hindi_name: str
    season: str  # Rabi, Kharif, Zaid
    duration_days: int
    base_temp_c: float
    opt_temp_c: float
    max_temp_c: float
    total_gdd: float
    potential_yield_quintal_acre: float
    msp_inr_per_quintal: float
    market_price_range_inr: List[float]
    default_n_req_kg_acre: float
    default_p_req_kg_acre: float
    default_k_req_kg_acre: float
    root_depth_min_m: float
    root_depth_max_m: float
    allowable_depletion_p: float
    stages: List[CropStage]
    description: str

class SoilTypeInfo(BaseModel):
    id: str
    name: str
    hindi_name: str
    description: str
    field_capacity_vol: float  # m3/m3
    wilting_point_vol: float   # m3/m3
    saturation_vol: float      # m3/m3
    available_water_capacity_mm_per_m: float
    ksat_mm_day: float

class AgroClimaticZoneInfo(BaseModel):
    id: str
    name: str
    states: List[str]
    annual_rainfall_mm: float
    mean_temp_c: float
    primary_crops: List[str]
    primary_soils: List[str]
