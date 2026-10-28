from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.simulation.crop_data import CROP_DATABASE
from app.simulation.soil_data import SOIL_DATABASE
from app.simulation.weather_data import AGRO_CLIMATIC_ZONES

router = APIRouter(prefix="/crops", tags=["Crops & Soils"])

@router.get("", response_model=List[Dict[str, Any]])
def list_crops():
    """Lists all available validated Indian crops in the catalog."""
    return list(CROP_DATABASE.values())

@router.get("/{crop_id}", response_model=Dict[str, Any])
def get_crop(crop_id: str):
    """Retrieves detailed agronomic parameters and stage data for a crop."""
    crop = CROP_DATABASE.get(crop_id.lower())
    if not crop:
        raise HTTPException(status_code=404, detail=f"Crop '{crop_id}' not found")
    return crop

@router.get("/data/soils", response_model=List[Dict[str, Any]])
def list_soils():
    """Lists validated Indian agricultural soils with hydraulic properties."""
    return list(SOIL_DATABASE.values())

@router.get("/data/zones", response_model=List[Dict[str, Any]])
def list_zones():
    """Lists major Indian agro-climatic zones and climatological anchors."""
    return list(AGRO_CLIMATIC_ZONES.values())
