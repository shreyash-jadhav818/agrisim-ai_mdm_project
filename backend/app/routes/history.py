import json
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from app.database.session import get_db

router = APIRouter(prefix="/history", tags=["History & Persistence"])

class HistoryCompareRequest(BaseModel):
    run_ids: List[str] = Field(..., min_length=2, max_length=5, description="List of 2 to 5 run IDs to compare")

@router.get("", response_model=List[Dict[str, Any]])
def get_simulation_history(limit: int = 50):
    """Retrieves list of past simulation runs from SQLite database."""
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("""
        SELECT id, farm_profile_id, name, crop_id, season, sowing_date,
               yield_quintal_acre, water_consumed_m3, total_cost_inr, revenue_inr,
               profit_inr, water_productivity_kg_m3, created_at
        FROM simulation_runs
        ORDER BY created_at DESC
        LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        
        history_list = []
        for r in rows:
            history_list.append({
                "id": r["id"],
                "farm_profile_id": r["farm_profile_id"],
                "name": r["name"],
                "crop_id": r["crop_id"],
                "season": r["season"],
                "sowing_date": r["sowing_date"],
                "yield_quintal_acre": r["yield_quintal_acre"],
                "water_consumed_m3": r["water_consumed_m3"],
                "total_cost_inr": r["total_cost_inr"],
                "revenue_inr": r["revenue_inr"],
                "profit_inr": r["profit_inr"],
                "water_productivity_kg_m3": r["water_productivity_kg_m3"],
                "created_at": r["created_at"]
            })
        return history_list

@router.get("/{run_id}", response_model=Dict[str, Any])
def get_simulation_detail(run_id: str):
    """Retrieves full simulation payload and results for a previous run."""
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("""
        SELECT id, input_data, output_data, created_at
        FROM simulation_runs
        WHERE id = ?
        """, (run_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Simulation run '{run_id}' not found")
            
        try:
            inp = json.loads(row["input_data"])
        except Exception:
            inp = {}
            
        try:
            try:
                out = json.loads(row["output_data"])
            except Exception:
                out = {}
        except Exception:
            out = {}
            
        return {
            "id": row["id"],
            "created_at": row["created_at"],
            "input": inp,
            "output": out
        }

@router.post("/compare")
def compare_saved_simulations(payload: HistoryCompareRequest):
    """
    Compares 2 to 5 saved simulation runs side-by-side with calculated deltas and trade-offs.
    """
    runs = []
    with get_db() as db:
        cursor = db.cursor()
        for rid in payload.run_ids:
            cursor.execute("SELECT id, name, crop_id, season, output_data, created_at FROM simulation_runs WHERE id = ?", (rid,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"Run '{rid}' not found")
            try:
                out = json.loads(row["output_data"])
            except Exception:
                out = {}
            runs.append({
                "id": row["id"],
                "name": row["name"],
                "crop_id": row["crop_id"],
                "season": row["season"],
                "created_at": row["created_at"],
                "yield_quintal_acre": out.get("yield_quintal_acre", 0.0),
                "yield_kg_ha": out.get("yield_kg_ha", 0.0),
                "water_consumed_m3": out.get("total_water_consumed_m3_acre", 0.0) * 2.471,
                "water_applied_mm": out.get("total_irrigation_applied_mm", 0.0),
                "total_cost_inr": out.get("costs", {}).get("total_cost", 0.0),
                "revenue_inr": out.get("gross_revenue_inr", 0.0),
                "profit_inr": out.get("net_profit_inr", 0.0),
                "water_productivity_kg_m3": out.get("water_productivity_kg_m3", 0.0)
            })

    base = runs[0]
    comparisons = []
    for r in runs:
        y_delta_pct = round(((r["yield_quintal_acre"] - base["yield_quintal_acre"]) / max(0.1, base["yield_quintal_acre"])) * 100.0, 1) if base["yield_quintal_acre"] else 0.0
        w_delta_pct = round(((r["water_consumed_m3"] - base["water_consumed_m3"]) / max(0.1, base["water_consumed_m3"])) * 100.0, 1) if base["water_consumed_m3"] else 0.0
        p_delta_pct = round(((r["profit_inr"] - base["profit_inr"]) / max(0.1, abs(base["profit_inr"]))) * 100.0, 1) if base["profit_inr"] else 0.0

        comparisons.append({
            **r,
            "yield_delta_pct": y_delta_pct,
            "water_delta_pct": w_delta_pct,
            "profit_delta_pct": p_delta_pct,
            "is_baseline": r["id"] == base["id"]
        })

    return {
        "baseline_run_id": base["id"],
        "compared_runs": comparisons,
        "summary": f"Compared {len(runs)} simulation runs. Baseline '{base['name']}' ({base['crop_id']}) achieved {base['yield_quintal_acre']:.1f} q/acre."
    }

@router.delete("/{run_id}")
def delete_simulation(run_id: str):
    """Deletes a simulation run from history."""
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("DELETE FROM simulation_runs WHERE id = ?", (run_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Run ID not found")
        return {"status": "deleted", "id": run_id}
