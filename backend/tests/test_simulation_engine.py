import pytest
from app.schemas.simulation import SimulationInput, FarmProfileInput, IrrigationEvent, FertilizerApplication
from app.simulation.engine import run_simulation
from app.simulation.evapotranspiration import calculate_fao56_penman_monteith, calculate_hargreaves_samani
from app.simulation.crop_data import CROP_DATABASE
from app.simulation.soil_data import SOIL_DATABASE

def test_fao56_evapotranspiration():
    # Standard test case: warm dry day
    et0 = calculate_fao56_penman_monteith(
        tmin=15.0,
        tmax=30.0,
        rs=22.0,
        rh=45.0,
        u2=2.5,
        elevation_m=200.0
    )
    # Reference ET should typically be between 4.0 and 7.0 mm/day
    assert 4.0 <= et0 <= 7.0, f"Expected ET0 in reasonable range, got {et0}"

def test_hargreaves_samani():
    et0 = calculate_hargreaves_samani(
        tmin=15.0,
        tmax=30.0,
        ra=35.0
    )
    assert 3.5 <= et0 <= 7.5, f"Expected Hargreaves ET0 in reasonable range, got {et0}"

def test_crop_database_integrity():
    assert len(CROP_DATABASE) >= 12
    for crop_id, crop in CROP_DATABASE.items():
        assert "potential_yield_quintal_acre" in crop
        assert "stages" in crop
        assert len(crop["stages"]) == 4
        assert "msp_inr_per_quintal" in crop
        assert crop["total_gdd"] > 800.0

def test_soil_database_integrity():
    assert "Alluvial Loam" in SOIL_DATABASE
    assert "Black Cotton Soil (Vertisol)" in SOIL_DATABASE
    for name, s in SOIL_DATABASE.items():
        assert s["field_capacity_vol"] > s["wilting_point_vol"]
        assert s["saturation_vol"] > s["field_capacity_vol"]

def test_simulation_run_wheat():
    sim_input = SimulationInput(
        farm_profile=FarmProfileInput(
            name="Test Farm",
            state="Punjab",
            zone="Trans-Gangetic Plain",
            total_acres=5.0,
            soil_type="Alluvial Loam",
            irrigation_system="flood"
        ),
        crop_id="wheat",
        sowing_date="2026-11-15",
        mulching_used=False
    )
    res = run_simulation(sim_input)
    assert res.run_id.startswith("sim_")
    assert res.crop_name.startswith("Wheat")
    assert res.duration_days == 135
    assert len(res.daily_steps) == 135
    assert res.yield_quintal_acre > 10.0
    assert res.yield_quintal_acre <= res.potential_yield_quintal_acre
    assert res.net_profit_inr != 0.0
    assert res.water_productivity_kg_m3 > 0.3
    assert len(res.scientific_validation_notes) > 0
    print(f"Simulation test passed: Yield={res.yield_quintal_acre} q/acre, Profit=INR {res.net_profit_inr:.2f}")

def test_simulation_deficit_impact():
    # If we compare high irrigation vs 0 irrigation, yield should be significantly reduced
    base_input = SimulationInput(
        crop_id="wheat",
        farm_profile=FarmProfileInput(total_acres=1.0, zone="Trans-Gangetic Plain"),
        irrigation_schedule=[
            IrrigationEvent(day=20, amount_mm=60.0),
            IrrigationEvent(day=45, amount_mm=60.0),
            IrrigationEvent(day=70, amount_mm=60.0),
            IrrigationEvent(day=90, amount_mm=60.0)
        ]
    )
    res_irrigated = run_simulation(base_input)
    
    drought_input = SimulationInput(
        crop_id="wheat",
        farm_profile=FarmProfileInput(total_acres=1.0, zone="Trans-Gangetic Plain"),
        irrigation_schedule=[
            IrrigationEvent(day=20, amount_mm=5.0)  # Severe water deficit
        ]
    )
    res_drought = run_simulation(drought_input)
    
    assert res_irrigated.yield_quintal_acre > res_drought.yield_quintal_acre, "Irrigated crop should outyield drought crop"
    assert res_drought.yield_gap_pct > res_irrigated.yield_gap_pct
