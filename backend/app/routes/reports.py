import json
from fastapi import APIRouter, HTTPException, Response
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from app.schemas.simulation import SimulationResult
from app.schemas.ai import ExplainableRecommendation
from app.simulation.report_generator import (
    generate_pdf_report,
    generate_csv_report,
    generate_scenario_comparison_csv
)
from app.database.session import get_db

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

class ScenarioComparisonExportRequest(BaseModel):
    scenarios: List[Dict[str, Any]]
    baseline: Optional[Dict[str, Any]] = None

class ComprehensiveReportRequest(BaseModel):
    simulation_result: SimulationResult
    recommendation: Optional[ExplainableRecommendation] = None
    scenarios: Optional[List[Dict[str, Any]]] = None
    stress_test: Optional[Dict[str, Any]] = None
    risk_analysis: Optional[Dict[str, Any]] = None

@router.post("/pdf")
def download_pdf_report(sim: SimulationResult):
    """
    Generates and returns an audit-grade PDF report for the provided simulation result.
    """
    try:
        pdf_bytes = generate_pdf_report(sim)
        filename = f"agrisim_report_{sim.crop_id}_{sim.run_id}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

@router.post("/comprehensive-pdf")
def download_comprehensive_pdf(payload: ComprehensiveReportRequest):
    """
    Generates full multi-section PDF report with scenarios, recommendations, and resilience diagnostics.
    """
    try:
        pdf_bytes = generate_pdf_report(
            sim=payload.simulation_result,
            recommendation=payload.recommendation,
            scenarios=payload.scenarios,
            stress_test=payload.stress_test,
            risk_analysis=payload.risk_analysis
        )
        filename = f"agrisim_full_audit_{payload.simulation_result.crop_id}_{payload.simulation_result.run_id}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comprehensive PDF generation failed: {str(e)}")

@router.post("/csv")
def download_csv_report(sim: SimulationResult):
    """
    Generates and returns a CSV data sheet containing summary and daily simulation steps.
    """
    try:
        csv_text = generate_csv_report(sim)
        filename = f"agrisim_data_{sim.crop_id}_{sim.run_id}.csv"
        
        return Response(
            content=csv_text,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV generation failed: {str(e)}")

@router.post("/scenarios-csv")
def download_scenarios_comparison_csv(payload: ScenarioComparisonExportRequest):
    """
    Generates and returns a CSV comparing What-If scenarios against baseline.
    """
    try:
        csv_text = generate_scenario_comparison_csv(payload.scenarios, payload.baseline)
        filename = "agrisim_scenario_comparison.csv"
        return Response(
            content=csv_text,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scenarios CSV export failed: {str(e)}")

@router.get("/pdf/{run_id}")
def download_saved_run_pdf(run_id: str):
    """
    Generates and returns a PDF report directly from a saved simulation run in SQLite.
    """
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("SELECT output_data FROM simulation_runs WHERE id = ?", (run_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found in history")
        
        try:
            output_dict = json.loads(row["output_data"])
            sim = SimulationResult(**output_dict)
            pdf_bytes = generate_pdf_report(sim)
            filename = f"agrisim_saved_{sim.crop_id}_{run_id}.pdf"
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Saved run PDF generation failed: {str(e)}")

@router.get("/csv/{run_id}")
def download_saved_run_csv(run_id: str):
    """
    Generates and returns a CSV export directly from a saved simulation run in SQLite.
    """
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("SELECT output_data FROM simulation_runs WHERE id = ?", (run_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found in history")
        
        try:
            output_dict = json.loads(row["output_data"])
            sim = SimulationResult(**output_dict)
            csv_text = generate_csv_report(sim)
            filename = f"agrisim_saved_{sim.crop_id}_{run_id}.csv"
            return Response(
                content=csv_text,
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Saved run CSV generation failed: {str(e)}")
