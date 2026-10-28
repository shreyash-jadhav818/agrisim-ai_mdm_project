"""
AgriSim AI - Professional Simulation & Audit Report Generation Engine
Exports comprehensive CSV datasets and publication-grade PDF audit reports
using ReportLab with agronomic charts, cost accounting, scenario comparisons,
optimization insights, and scientific disclosures.
"""

import io
import csv
from datetime import datetime
from typing import Dict, Any, List, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.schemas.simulation import SimulationResult
from app.schemas.ai import ExplainableRecommendation

def generate_csv_report(sim: SimulationResult) -> str:
    """
    Generates a full structured CSV report containing summary metrics and daily time-series.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    
    # 1. Header & Metadata
    writer.writerow(["AGRISIM AI - AGRICULTURAL DIGITAL TWIN SIMULATION REPORT"])
    writer.writerow(["Generated At", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
    writer.writerow(["Run ID", sim.run_id])
    writer.writerow(["Scenario", sim.scenario_name])
    writer.writerow(["Crop", sim.crop_name])
    writer.writerow(["Season", sim.season])
    writer.writerow(["Duration (Days)", sim.duration_days])
    writer.writerow([])
    
    # 2. Executive Metrics
    writer.writerow(["EXECUTIVE PERFORMANCE METRICS"])
    writer.writerow(["Metric", "Value", "Unit"])
    writer.writerow(["Estimated Yield", f"{sim.yield_quintal_acre:.2f}", "Quintals / Acre"])
    writer.writerow(["Yield (Metric)", f"{sim.yield_kg_ha:.1f}", "kg / Hectare"])
    writer.writerow(["Potential Yield", f"{sim.potential_yield_quintal_acre:.1f}", "Quintals / Acre"])
    writer.writerow(["Yield Gap", f"{sim.yield_gap_pct:.1f}", "%"])
    writer.writerow(["Water Consumed (ETa)", f"{sim.total_water_consumed_mm:.1f}", "mm"])
    writer.writerow(["Water Consumed (Volume)", f"{sim.total_water_consumed_m3_acre:.1f}", "m3 / Acre"])
    writer.writerow(["Irrigation Water Applied", f"{sim.total_irrigation_applied_mm:.1f}", "mm"])
    writer.writerow(["Total Rainfall", f"{sim.total_rainfall_mm:.1f}", "mm"])
    writer.writerow(["Effective Rainfall", f"{sim.effective_rainfall_mm:.1f}", "mm"])
    writer.writerow(["Deep Percolation Loss", f"{sim.deep_percolation_mm:.1f}", "mm"])
    writer.writerow(["Water Productivity", f"{sim.water_productivity_kg_m3:.3f}", "kg crop / m3 water"])
    writer.writerow(["Nitrogen Applied (N)", f"{sim.total_n_applied_kg_acre:.1f}", "kg / Acre"])
    writer.writerow(["Phosphorus Applied (P2O5)", f"{sim.total_p_applied_kg_acre:.1f}", "kg / Acre"])
    writer.writerow(["Potassium Applied (K2O)", f"{sim.total_k_applied_kg_acre:.1f}", "kg / Acre"])
    writer.writerow(["Gross Revenue", f"{sim.gross_revenue_inr:,.2f}", "INR"])
    writer.writerow(["Total Cultivation Cost", f"{sim.costs.total_cost:,.2f}", "INR"])
    writer.writerow(["Net Operating Profit", f"{sim.net_profit_inr:,.2f}", "INR"])
    writer.writerow(["Profit Per Acre", f"{sim.profit_per_acre_inr:,.2f}", "INR / Acre"])
    writer.writerow(["Return on Investment (ROI)", f"{sim.return_on_investment_roi_pct:.1f}", "%"])
    writer.writerow([])
    
    # 3. Itemized Cultivation Costs
    writer.writerow(["CULTIVATION EXPENDITURE BREAKDOWN (INR)"])
    writer.writerow(["Expense Category", "Cost (INR)"])
    writer.writerow(["Seeds & Seed Treatment", f"{sim.costs.seed_cost:,.2f}"])
    writer.writerow(["Land Preparation & Tillage", f"{sim.costs.land_prep_cost:,.2f}"])
    writer.writerow(["Fertilizers & Nutrients", f"{sim.costs.fertilizer_cost:,.2f}"])
    writer.writerow(["Irrigation Pumping Energy / Diesel", f"{sim.costs.irrigation_energy_cost:,.2f}"])
    writer.writerow(["Crop Protection (Pesticides / Weed)", f"{sim.costs.crop_protection_cost:,.2f}"])
    writer.writerow(["Labor & Mechanized Harvesting", f"{sim.costs.labor_harvest_cost:,.2f}"])
    writer.writerow(["Total Cost", f"{sim.costs.total_cost:,.2f}"])
    writer.writerow([])
    
    # 4. Daily Phenological Time Series
    writer.writerow(["DAILY SIMULATION TIME-SERIES"])
    writer.writerow([
        "Day", "Date", "Growth Stage", "Cum GDD (°C-day)", "ET0 (mm)", "Crop Coeff (Kc)",
        "ETc (mm)", "ETa (mm)", "Precipitation (mm)", "Irrigation (mm)", "Water Stress (Ks)",
        "Root Depth (m)", "Soil Depletion (mm)", "Cum Biomass (kg/acre)"
    ])
    for step in sim.daily_steps:
        writer.writerow([
            step.day,
            step.date,
            step.stage_name,
            step.gdd_accumulated,
            step.et0_mm,
            step.kc,
            step.etc_mm,
            step.eta_mm,
            step.precipitation_mm,
            step.irrigation_mm,
            step.water_stress_ks,
            step.root_depth_m,
            step.soil_depletion_mm,
            step.biomass_accumulated_kg_acre
        ])
        
    return output.getvalue()

def generate_scenario_comparison_csv(
    scenarios: List[Dict[str, Any]],
    baseline: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generates CSV export specifically for What-If scenario comparisons.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["AGRISIM AI - WHAT-IF SCENARIO COMPARISON EXPORT"])
    writer.writerow(["Exported At", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
    writer.writerow([])

    writer.writerow([
        "Scenario Name", "Yield (kg/ha)", "Yield (q/acre)", "Yield Delta (%)",
        "Water (m³)", "Water Delta (%)", "Total Fert (kg/ha)",
        "Cultivation Cost (INR)", "Net Profit (INR)", "Profit Delta (%)"
    ])

    if baseline:
        b_name = baseline.get("name") or baseline.get("scenario_name") or "Baseline Plan"
        b_y_kg = baseline.get("yield_kg_ha") or 0.0
        b_y_q = baseline.get("yield_q_acre") or 0.0
        b_w = baseline.get("water_m3") or 0.0
        b_f = baseline.get("n_kg_ha") or 0.0
        b_c = baseline.get("total_cost_inr") or baseline.get("cost_inr") or 0.0
        b_p = baseline.get("net_return_inr") or baseline.get("profit_inr") or 0.0

        writer.writerow([
            b_name, f"{b_y_kg:,.1f}", f"{b_y_q:.2f}", "0.0%",
            f"{b_w:,.1f}", "0.0%", f"{b_f:.1f}",
            f"{b_c:,.2f}", f"{b_p:,.2f}", "0.0%"
        ])

    for sc in scenarios:
        s_name = sc.get("name") or sc.get("scenario_name") or "Scenario"
        s_y_kg = sc.get("yield_kg_ha") or sc.get("estimated_yield_kg_ha") or 0.0
        s_y_q = sc.get("yield_q_acre") or sc.get("estimated_yield_quintal_acre") or 0.0
        s_y_d = sc.get("yield_delta_pct") or 0.0
        s_w = sc.get("water_m3") or sc.get("irrigation_water_consumption_m3") or 0.0
        s_w_d = sc.get("water_delta_pct") or 0.0
        s_f = sc.get("n_kg_ha") or sc.get("total_n_applied_kg") or 0.0
        s_c = sc.get("total_cost_inr") or sc.get("modeled_cultivation_costs_inr") or 0.0
        s_p = sc.get("net_return_inr") or sc.get("estimated_net_return_inr") or 0.0
        s_p_d = sc.get("net_return_delta_pct") or 0.0

        writer.writerow([
            s_name, f"{s_y_kg:,.1f}", f"{s_y_q:.2f}", f"{s_y_d:+.1f}%",
            f"{s_w:,.1f}", f"{s_w_d:+.1f}%", f"{s_f:.1f}",
            f"{s_c:,.2f}", f"{s_p:,.2f}", f"{s_p_d:+.1f}%"
        ])

    return output.getvalue()

def generate_pdf_report(
    sim: SimulationResult,
    recommendation: Optional[ExplainableRecommendation] = None,
    scenarios: Optional[List[Dict[str, Any]]] = None,
    stress_test: Optional[Dict[str, Any]] = None,
    risk_analysis: Optional[Dict[str, Any]] = None
) -> bytes:
    """
    Generates a publication-grade, audit-ready PDF report incorporating all sections:
      A. Header & Metadata
      B. Farm Profile & Input Regimen
      C. Baseline Performance & Itemized Economics
      D. Scenario Comparison Matrix (if provided)
      E. Optimization & Climate Resilience Assessment
      F. 7-Section Explainable AI Recommendations
      G. Scientific Transparency & Methodology Disclosures
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    primary_green = colors.HexColor("#1b5e20")
    accent_emerald = colors.HexColor("#2e7d32")
    light_bg = colors.HexColor("#f1f8e9")
    amber_accent = colors.HexColor("#b45309")
    text_dark = colors.HexColor("#1f2937")
    
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=primary_green
    )
    
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#4b5563")
    )
    
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=accent_emerald,
        spaceBefore=10,
        spaceAfter=4
    )

    subsection_heading = ParagraphStyle(
        "SubSectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=primary_green,
        spaceBefore=6,
        spaceAfter=2
    )
    
    body_style = ParagraphStyle(
        "DocBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=text_dark
    )

    callout_style = ParagraphStyle(
        "DocCallout",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1e3a24")
    )
    
    elements = []
    
    # Section A: Header Banner & Metadata
    gen_time = datetime.now().strftime("%d %b %Y, %I:%M %p")
    elements.append(Paragraph("AgriSim AI — Agricultural Digital Twin Simulation Audit Report", title_style))
    elements.append(Paragraph(
        f"Generated: {gen_time} | Simulation Run ID: <b>{sim.run_id}</b> | Model Version: <b>AgriSim-YieldEngine-v2.0</b>",
        subtitle_style
    ))
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=primary_green, spaceAfter=10))
    
    # Section B: Farm Profile & Operational Regimen
    elements.append(Paragraph("A. Farm Profile & Input Parameters", section_heading))
    profile_data = [
        [
            Paragraph(f"<b>Crop:</b> {sim.crop_name}", body_style),
            Paragraph(f"<b>Season:</b> {sim.season}", body_style),
            Paragraph(f"<b>Duration:</b> {sim.duration_days} Days", body_style),
            Paragraph(f"<b>Rainfall:</b> {sim.total_rainfall_mm:.1f} mm", body_style)
        ],
        [
            Paragraph(f"<b>Irrigation Applied:</b> {sim.total_irrigation_applied_mm:.1f} mm", body_style),
            Paragraph(f"<b>Effective Rain:</b> {sim.effective_rainfall_mm:.1f} mm", body_style),
            Paragraph(f"<b>Nutrients:</b> {sim.total_n_applied_kg_acre:.0f}N - {sim.total_p_applied_kg_acre:.0f}P - {sim.total_k_applied_kg_acre:.0f}K kg/ac", body_style),
            Paragraph(f"<b>Deep Percolation:</b> {sim.deep_percolation_mm:.1f} mm", body_style)
        ]
    ]
    profile_table = Table(profile_data, colWidths=[135, 135, 135, 135])
    profile_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), light_bg),
        ("PADDING", (0, 0), (-1, -1), 4.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#c8e6c9"))
    ]))
    elements.append(profile_table)
    elements.append(Spacer(1, 10))
    
    # Section C: Baseline Results & Itemized Economics
    elements.append(Paragraph("B. Baseline Production & Economic Accounting", section_heading))
    scorecard_data = [
        ["Performance Parameter", "Simulated Metric", "Unit", "Agronomic / Financial Benchmark"],
        ["Estimated Harvest Yield", f"{sim.yield_quintal_acre:.1f} q/acre ({sim.yield_kg_ha:,.0f} kg/ha)", "Yield", f"Reference Potential: {sim.potential_yield_quintal_acre:.1f} q/acre"],
        ["Yield Gap", f"{sim.yield_gap_pct:.1f}%", "Deficit", "0% (Genetic maximum under zero stress)"],
        ["Crop Water Consumed (ETa)", f"{sim.total_water_consumed_mm:.1f} mm", "Water", f"Gross applied: {sim.total_irrigation_applied_mm:.1f} mm"],
        ["Water Productivity", f"{sim.water_productivity_kg_m3:.2f} kg / m³", "Efficiency", "Benchmark: 0.8 - 1.5 kg / m³"],
        ["Total Cultivation Expenditure", f"INR {sim.costs.total_cost:,.2f}", "Cost", "Sum of seeds, labor, fertilizer, pumping"],
        ["Estimated Gross Revenue", f"INR {sim.gross_revenue_inr:,.2f}", "Revenue", "Based on regional selling price"],
        ["Net Operating Profit", f"INR {sim.net_profit_inr:,.2f}", "Profit", f"INR {sim.profit_per_acre_inr:,.0f} / acre (ROI: {sim.return_on_investment_roi_pct:.1f}%)"]
    ]
    score_table = Table(scorecard_data, colWidths=[160, 130, 80, 170])
    score_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), primary_green),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, light_bg]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE")
    ]))
    elements.append(score_table)
    elements.append(Spacer(1, 10))
    
    # Section D: Scenario Comparison Matrix (if provided)
    if scenarios and len(scenarios) > 0:
        elements.append(Paragraph("C. What-If Strategy Comparison Matrix", section_heading))
        sc_headers = ["Strategy Name", "Yield (kg/ha)", "Yield Δ", "Water (m³)", "Water Δ", "Net Profit (INR)", "Profit Δ"]
        sc_rows = [sc_headers]
        for sc in scenarios[:5]:
            name = sc.get("name") or sc.get("scenario_name") or "Scenario"
            y_val = sc.get("yield_kg_ha") or sc.get("estimated_yield_kg_ha") or 0.0
            y_d = sc.get("yield_delta_pct") or 0.0
            w_val = sc.get("water_m3") or sc.get("irrigation_water_consumption_m3") or 0.0
            w_d = sc.get("water_delta_pct") or 0.0
            p_val = sc.get("net_return_inr") or sc.get("estimated_net_return_inr") or 0.0
            p_d = sc.get("net_return_delta_pct") or 0.0
            
            sc_rows.append([
                Paragraph(name[:24], body_style),
                f"{y_val:,.0f}",
                f"{y_d:+.1f}%",
                f"{w_val:,.0f}",
                f"{w_d:+.1f}%",
                f"INR {p_val:,.0f}" if p_val else "N/A",
                f"{p_d:+.1f}%" if p_d else "-"
            ])
            
        sc_table = Table(sc_rows, colWidths=[150, 65, 55, 65, 55, 90, 60])
        sc_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), accent_emerald),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, light_bg]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
            ("PADDING", (0, 0), (-1, -1), 3.5),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE")
        ]))
        elements.append(sc_table)
        elements.append(Spacer(1, 10))

    # Section E: Optimization & Climate Stress Overview (if provided)
    if stress_test:
        elements.append(Paragraph("D. Climate Resilience & Stress Assessment", section_heading))
        res_score = stress_test.get("resilience_score", "N/A")
        res_rating = stress_test.get("resilience_rating", "Evaluated")
        vuln = stress_test.get("most_vulnerable_scenario", "Thermal and drought shock")
        advisory = stress_test.get("executive_advisory", "")
        
        elements.append(Paragraph(
            f"<b>Resilience Index:</b> {res_score}/100 ({res_rating}) | <b>Primary Vulnerability:</b> {vuln}",
            body_style
        ))
        if advisory:
            elements.append(Paragraph(f"<i>{advisory}</i>", callout_style))
        elements.append(Spacer(1, 8))

    # Section F: 7-Section Explainable Recommendations
    elements.append(Paragraph("E. Explainable AI & Agronomic Advisory", section_heading))
    if recommendation:
        rec = recommendation
        elements.append(Paragraph("1. Actionable Recommendation:", subsection_heading))
        elements.append(Paragraph(rec.recommendation, body_style))
        
        elements.append(Paragraph("2. Biophysical & Economic Reasoning:", subsection_heading))
        elements.append(Paragraph(rec.reasoning, body_style))
        
        elements.append(Paragraph("3. Operational Trade-offs:", subsection_heading))
        elements.append(Paragraph(rec.trade_offs, body_style))
        
        elements.append(Paragraph("4. Practical Next Steps for Farmer:", subsection_heading))
        for step in rec.practical_next_steps[:4]:
            elements.append(Paragraph(f"• {step}", body_style))
    else:
        # Fallback to simulation limiting factors
        for factor in sim.limiting_factors:
            elements.append(Paragraph(f"• <b>Diagnostic Alert:</b> {factor}", body_style))
    elements.append(Spacer(1, 8))

    # Section G: Scientific Transparency & Methodology Disclosures
    elements.append(Paragraph("F. Scientific Transparency & Disclaimers", section_heading))
    elements.append(Paragraph(
        "<b>Model Methodology:</b> Calculations utilize FAO-56 Penman-Monteith potential evapotranspiration, "
        "FAO-33 Stewart yield response functions, and Mitscherlich-Baule nutrient saturation curves validated with ICAR benchmarks.",
        body_style
    ))
    elements.append(Paragraph(
        "<b>Notice:</b> AgriSim AI generates mathematical decision-support estimates. Real-world crop harvest and net operating returns "
        "depend on in-situ microclimates, seed germination rates, localized soil variability, and operational farming execution.",
        callout_style
    ))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
