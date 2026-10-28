import React, { useState } from 'react';
import {
  X,
  FileText,
  FileSpreadsheet,
  Download,
  CheckCircle,
  ShieldCheck,
  Wheat
} from 'lucide-react';
import { SimulationResult } from '../types';
import { downloadReportPdf, downloadReportCsv } from '../services/api';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: SimulationResult;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  result
}) => {
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [downloadingCsv, setDownloadingCsv] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await downloadReportPdf(result);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadCsv = async () => {
    setDownloadingCsv(true);
    try {
      await downloadReportCsv(result);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingCsv(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Export Simulation Audit Report</h3>
              <p className="text-[11px] text-slate-400">Run ID: {result.run_id} ({result.crop_name})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Quick Summary Pill */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between font-mono">
            <div>
              <span className="text-slate-400 block text-[10px] font-sans">Estimated Harvest</span>
              <span className="text-emerald-400 font-bold">{result.yield_quintal_acre.toFixed(1)} q/ac</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-sans">Net Operating Profit</span>
              <span className="text-white font-bold">₹{result.net_profit_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-sans">Water Consumed</span>
              <span className="text-blue-400 font-bold">{result.total_water_consumed_mm.toFixed(0)} mm</span>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            {/* PDF Report Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Executive PDF Decision Report</h4>
                  <p className="text-[11px] text-slate-400">Formatted with scorecard tables, expense breakdown, and agronomic disclosures</p>
                </div>
              </div>
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
              >
                {downloadingPdf ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Download PDF</span>
              </button>
            </div>

            {/* CSV Dataset Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Complete Raw CSV Time-Series</h4>
                  <p className="text-[11px] text-slate-400">Includes day-by-day GDD, ET0, Kc, ETa, Ks, depletion, and biomass rows</p>
                </div>
              </div>
              <button
                onClick={handleDownloadCsv}
                disabled={downloadingCsv}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
              >
                {downloadingCsv ? (
                  <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Download CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-center">
          <p className="text-[11px] text-slate-500">
            Reports generated under FAO-56 and Government of India agricultural guidelines.
          </p>
        </div>
      </div>
    </div>
  );
};
