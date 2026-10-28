import React, { useState } from 'react';
import {
  FileText,
  FileDown,
  Table,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Droplets,
  DollarSign
} from 'lucide-react';
import { SimulationResult, WhatIfSuiteResult } from '../types';
import { downloadReportCsv, downloadReportPdf, downloadScenariosCsv } from '../services/api';

interface ReportsPageProps {
  currentResult: SimulationResult | null;
  whatIfSuite?: WhatIfSuiteResult | null;
  onNavigate: (tab: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ currentResult, whatIfSuite, onNavigate }) => {
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [downloadingCsv, setDownloadingCsv] = useState<boolean>(false);
  const [downloadingScenariosCsv, setDownloadingScenariosCsv] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
    if (!currentResult || downloadingPdf) return;
    setDownloadingPdf(true);
    setExportSuccess(null);
    setExportError(null);
    try {
      await downloadReportPdf(currentResult);
      setExportSuccess('Audit-grade PDF report successfully generated and downloaded.');
    } catch (e: any) {
      console.error('PDF export failed:', e);
      setExportError(e.message || 'PDF export failed. Ensure backend ReportLab is installed.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadCsv = async () => {
    if (!currentResult || downloadingCsv) return;
    setDownloadingCsv(true);
    setExportSuccess(null);
    setExportError(null);
    try {
      await downloadReportCsv(currentResult);
      setExportSuccess('Simulation daily telemetry CSV data sheet successfully exported.');
    } catch (e: any) {
      console.error('CSV export failed:', e);
      setExportError(e.message || 'CSV export failed.');
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handleDownloadScenariosCsv = async () => {
    if (!whatIfSuite || downloadingScenariosCsv) return;
    setDownloadingScenariosCsv(true);
    setExportSuccess(null);
    setExportError(null);
    try {
      await downloadScenariosCsv(whatIfSuite.scenarios, whatIfSuite.baseline);
      setExportSuccess('What-If scenario comparative matrix CSV exported successfully.');
    } catch (e: any) {
      console.error('Scenarios CSV export failed:', e);
      setExportError(e.message || 'Failed to export What-If scenarios.');
    } finally {
      setDownloadingScenariosCsv(false);
    }
  };

  if (!currentResult) {
    return (
      <div className="agri-card p-10 text-center max-w-xl mx-auto my-12 space-y-4">
        <FileText className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-xl font-bold text-white">No Active Simulation Report Available</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Execute a biophysical simulation run in the New Simulation Wizard to generate and download comprehensive audit reports.
        </p>
        <button
          onClick={() => onNavigate('new-simulation')}
          className="agri-btn-primary px-5 py-2.5 mt-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Launch Simulation Wizard</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Report Header Card */}
      <div className="agri-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#183a24] pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Agronomic Audit Report & Export Center
            </h3>
            <p className="text-xs text-slate-400">
              Download formal PDF advisory certificates and raw daily CSV telemetry for Run: <code className="text-emerald-300 font-mono">{currentResult.run_id}</code>
            </p>
          </div>
          <span className="text-xs text-emerald-400 font-semibold bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800">
            Model: AgriSim-YieldEngine-v2.0
          </span>
        </div>

        {exportSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportSuccess}</span>
          </div>
        )}

        {exportError && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        {/* Action Buttons for PDF and CSV */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* PDF Card */}
          <div className="p-5 rounded-2xl bg-[#091a10] border border-[#1b3d27] space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FileDown className="w-5 h-5 text-emerald-400" />
                <span>Executive Report (PDF)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Publication-grade PDF report detailing phenology, water balance, nutrient curves, itemized costs, and disclosures.
              </p>
            </div>
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="agri-btn-primary w-full py-2.5 text-xs"
            >
              {downloadingPdf ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Download Audit PDF</span>
                </>
              )}
            </button>
          </div>

          {/* CSV Card */}
          <div className="p-5 rounded-2xl bg-[#091a10] border border-[#1b3d27] space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Table className="w-5 h-5 text-cyan-400" />
                <span>Daily Telemetry (CSV)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Export day-by-day records (ET0, ETa, Ks stress, soil depletion, hypoxia) for statistical analysis in Excel or R.
              </p>
            </div>
            <button
              onClick={handleDownloadCsv}
              disabled={downloadingCsv}
              className="agri-btn-secondary w-full py-2.5 text-xs"
            >
              {downloadingCsv ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span>Exporting CSV...</span>
                </>
              ) : (
                <>
                  <Table className="w-4 h-4" />
                  <span>Download Data CSV</span>
                </>
              )}
            </button>
          </div>

          {/* What-If Scenarios CSV */}
          <div className="p-5 rounded-2xl bg-[#091a10] border border-[#1b3d27] space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Layers className="w-5 h-5 text-amber-400" />
                <span>What-If Scenarios (CSV)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Export comparative matrix comparing baseline against What-If scenarios with exact yield, water, cost, and profit deltas.
              </p>
            </div>
            <button
              onClick={handleDownloadScenariosCsv}
              disabled={downloadingScenariosCsv || !whatIfSuite}
              className="agri-btn-secondary w-full py-2.5 text-xs border-amber-800 hover:border-amber-500 disabled:opacity-40"
            >
              {downloadingScenariosCsv ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span>Exporting Scenarios...</span>
                </>
              ) : (
                <>
                  <Table className="w-4 h-4 text-amber-400" />
                  <span>Export Scenarios CSV</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Report Preview Metadata Summary */}
      <div className="agri-card p-6 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Certified Biophysical Provenance & Audit Metadata
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#08170e] border border-[#183923]">
            <span className="text-slate-500 block text-[10px]">Crop & Holding</span>
            <span className="font-bold text-white capitalize text-sm">{currentResult.crop_name}</span>
            <span className="text-slate-400 block text-[10px]">{currentResult.duration_days} day cycle</span>
          </div>

          <div className="p-3 rounded-xl bg-[#08170e] border border-[#183923]">
            <span className="text-slate-500 block text-[10px]">Modeled Yield</span>
            <span className="font-bold text-emerald-300 text-sm">{currentResult.yield_quintal_acre.toFixed(1)} q/ac</span>
            <span className="text-slate-400 block text-[10px]">({currentResult.yield_kg_ha.toFixed(0)} kg/ha)</span>
          </div>

          <div className="p-3 rounded-xl bg-[#08170e] border border-[#183923]">
            <span className="text-slate-500 block text-[10px]">Water Consumed</span>
            <span className="font-bold text-cyan-300 text-sm">
              {(currentResult.total_water_consumed_m3_acre * 5).toLocaleString(undefined, { maximumFractionDigits: 0 })} m³
            </span>
            <span className="text-slate-400 block text-[10px]">{currentResult.water_productivity_kg_m3.toFixed(2)} kg/m³</span>
          </div>

          <div className="p-3 rounded-xl bg-[#08170e] border border-[#183923]">
            <span className="text-slate-500 block text-[10px]">Net Return Realization</span>
            <span className="font-bold text-amber-300 text-sm">
              {currentResult.net_profit_inr > 0 ? `₹${currentResult.net_profit_inr.toLocaleString()}` : 'Not available'}
            </span>
            <span className="text-slate-400 block text-[10px]">ROI: {currentResult.return_on_investment_roi_pct.toFixed(1)}%</span>
          </div>
        </div>

        {/* Assumptions & Scientific Limitations */}
        <div className="pt-2 border-t border-[#183a24] space-y-2 text-xs">
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
            Scientific Equations & Methodological Governance:
          </span>
          <div className="space-y-1.5 text-slate-300 text-[11px]">
            <p>• <strong>Evapotranspiration:</strong> Standard FAO-56 Penman-Monteith dual crop coefficient formulation ($ET_c = K_c \times ET_0$).</p>
            <p>• <strong>Water Response Function:</strong> FAO-33 Stewart multi-stage sensitivity equation $(1 - Y_a/Y_m) = K_y \times (1 - ET_a/ET_c)$.</p>
            <p>• <strong>Nutrient Adequacy:</strong> Mitscherlich-Baule law of diminishing returns with upper-limit osmotic and vegetative lodging penalties.</p>
            <p>• <strong>Financial Calculations:</strong> Explicitly distinguishes partial variable input costs from total capital farm overheads.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
