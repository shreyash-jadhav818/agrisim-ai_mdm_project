import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Trash2,
  Eye,
  Calendar,
  Layers,
  Sprout,
  Droplets,
  DollarSign,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Sparkles,
  GitCompare,
  FileText,
  FileSpreadsheet,
  Download,
  CheckSquare,
  Square,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';
import { HistoryRecord, SimulationResult, HistoryCompareResult } from '../types';
import {
  fetchHistory,
  fetchHistoryDetail,
  deleteHistoryRecord,
  downloadSavedRunPdf,
  downloadSavedRunCsv,
  compareHistoryRuns
} from '../services/api';

interface SimulationHistoryPageProps {
  onRestoreSimulation: (detail: { input: any; output: SimulationResult }) => void;
  onNavigate: (tab: string) => void;
}

export const SimulationHistoryPage: React.FC<SimulationHistoryPageProps> = ({
  onRestoreSimulation,
  onNavigate
}) => {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [cropFilter, setCropFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'yield' | 'water' | 'profit'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Multi-run comparison state
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState<boolean>(false);
  const [compareLoading, setCompareLoading] = useState<boolean>(false);
  const [compareResult, setCompareResult] = useState<HistoryCompareResult | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  // Download states per run
  const [downloadingRunId, setDownloadingRunId] = useState<string | null>(null);
  const [downloadingType, setDownloadingType] = useState<'pdf' | 'csv' | null>(null);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const records = await fetchHistory();
      setHistory(records);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleOpenDetail = async (runId: string) => {
    try {
      const detail = await fetchHistoryDetail(runId);
      onRestoreSimulation(detail);
      onNavigate('scenarios');
    } catch (e) {
      console.error('Failed to open detail:', e);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteHistoryRecord(deleteTargetId);
      setHistory((prev) => prev.filter((r) => r.id !== deleteTargetId));
      setSelectedRunIds((prev) => prev.filter((id) => id !== deleteTargetId));
      setActionMessage('Simulation run successfully deleted from database.');
      setTimeout(() => setActionMessage(null), 3000);
      setDeleteTargetId(null);
    } catch (e) {
      console.error('Failed to delete:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleSelect = (runId: string) => {
    setSelectedRunIds((prev) => {
      if (prev.includes(runId)) {
        return prev.filter((id) => id !== runId);
      }
      if (prev.length >= 5) {
        setActionMessage('You can select a maximum of 5 runs for comparison.');
        setTimeout(() => setActionMessage(null), 3000);
        return prev;
      }
      return [...prev, runId];
    });
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredHistory.slice(0, 5).map((r) => r.id);
    setSelectedRunIds(visibleIds);
  };

  const handleClearSelection = () => {
    setSelectedRunIds([]);
  };

  const handleLaunchCompare = async () => {
    if (selectedRunIds.length < 2) {
      setActionMessage('Please select at least 2 simulation runs to compare.');
      setTimeout(() => setActionMessage(null), 3000);
      return;
    }
    setCompareModalOpen(true);
    setCompareLoading(true);
    setCompareError(null);
    try {
      const res = await compareHistoryRuns(selectedRunIds);
      setCompareResult(res);
    } catch (err: any) {
      setCompareError(err?.message || 'Failed to compare selected runs');
    } finally {
      setCompareLoading(false);
    }
  };

  const handleDownloadPdf = async (runId: string) => {
    setDownloadingRunId(runId);
    setDownloadingType('pdf');
    try {
      await downloadSavedRunPdf(runId);
    } catch (e) {
      console.error('Failed to download PDF:', e);
      setActionMessage('Error generating PDF report for saved run.');
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      setDownloadingRunId(null);
      setDownloadingType(null);
    }
  };

  const handleDownloadCsv = async (runId: string) => {
    setDownloadingRunId(runId);
    setDownloadingType('csv');
    try {
      await downloadSavedRunCsv(runId);
    } catch (e) {
      console.error('Failed to download CSV:', e);
      setActionMessage('Error generating CSV data for saved run.');
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      setDownloadingRunId(null);
      setDownloadingType(null);
    }
  };

  // Filter and sort
  const availableCrops = Array.from(new Set(history.map((h) => h.crop_id)));

  const filteredHistory = history
    .filter((h) => {
      const matchesSearch =
        h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.crop_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCrop = cropFilter === 'all' || h.crop_id.toLowerCase() === cropFilter.toLowerCase();
      return matchesSearch && matchesCrop;
    })
    .sort((a, b) => {
      let comp = 0;
      if (sortBy === 'date') {
        comp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'yield') {
        comp = a.yield_quintal_acre - b.yield_quintal_acre;
      } else if (sortBy === 'water') {
        comp = a.water_consumed_m3 - b.water_consumed_m3;
      } else if (sortBy === 'profit') {
        comp = a.profit_inr - b.profit_inr;
      }
      return sortOrder === 'desc' ? -comp : comp;
    });

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Bar */}
      <div className="agri-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#183a24] pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              Simulation Audit Vault & Comparative History
            </h3>
            <p className="text-xs text-slate-400">
              Persistent records of all biophysical executions stored in the SQLite database. Select 2 to 5 runs to perform comparative multi-run analysis.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-400 font-semibold bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800">
              {history.length} runs stored
            </span>
            {selectedRunIds.length > 0 && (
              <span className="text-xs text-amber-300 font-semibold bg-amber-950/70 px-2.5 py-1 rounded-full border border-amber-800/80">
                {selectedRunIds.length} selected
              </span>
            )}
          </div>
        </div>

        {actionMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Multi-Run Selection Action Banner */}
        {selectedRunIds.length > 0 && (
          <div className="p-3 rounded-xl bg-[#0b2615] border border-emerald-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-200">
              <GitCompare className="w-4 h-4 text-emerald-400" />
              <span>
                <strong>{selectedRunIds.length}</strong> {selectedRunIds.length === 1 ? 'run' : 'runs'} selected
                {selectedRunIds.length < 2 && ' (select at least 1 more to compare)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearSelection}
                className="px-2.5 py-1 rounded-lg bg-black/40 text-slate-300 hover:text-white transition-colors"
              >
                Clear Selection
              </button>
              <button
                onClick={handleLaunchCompare}
                disabled={selectedRunIds.length < 2}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 shadow transition-all ${
                  selectedRunIds.length >= 2
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                    : 'bg-emerald-950 text-slate-500 border border-emerald-900 cursor-not-allowed'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Compare {selectedRunIds.length} Runs</span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          {/* Search Box (6 cols) */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by simulation name or crop..."
              className="agri-input pl-9"
            />
          </div>

          {/* Crop Filter (3 cols) */}
          <div className="sm:col-span-3">
            <select
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              className="agri-input capitalize"
            >
              <option value="all">All Crops ({availableCrops.length})</option>
              {availableCrops.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By (3 cols) */}
          <div className="sm:col-span-3 flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="agri-input flex-1"
            >
              <option value="date">Sort by Date</option>
              <option value="yield">Sort by Yield</option>
              <option value="water">Sort by Water</option>
              <option value="profit">Sort by Net Return</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2.5 rounded-xl bg-[#08150d] border border-[#1d3d28] text-slate-300 hover:text-white"
              title={`Toggle sort order (${sortOrder})`}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* History Records Table or Empty State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading audit records from SQLite database...</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="agri-card p-12 text-center max-w-lg mx-auto space-y-4">
          <History className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-white">No Simulation Records Found</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            {searchTerm || cropFilter !== 'all'
              ? 'No historical runs matched your filter criteria.'
              : 'You have not executed any simulations yet. Use the New Simulation Wizard to run your first trial.'}
          </p>
          <button
            onClick={() => onNavigate('new-simulation')}
            className="agri-btn-primary px-5 py-2.5 mt-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Simulation Wizard</span>
          </button>
        </div>
      ) : (
        <div className="agri-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#08180e] border-b border-[#183922] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3 text-center w-10">
                    <button
                      onClick={
                        selectedRunIds.length === Math.min(filteredHistory.length, 5)
                          ? handleClearSelection
                          : handleSelectAllVisible
                      }
                      title="Select top 5 for comparison"
                      className="hover:text-emerald-400"
                    >
                      {selectedRunIds.length > 0 &&
                      selectedRunIds.length === Math.min(filteredHistory.length, 5) ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Simulation Title</th>
                  <th className="py-3 px-3">Crop & Season</th>
                  <th className="py-3 px-3">Sowing Date</th>
                  <th className="py-3 px-3">Harvest Yield</th>
                  <th className="py-3 px-3">Water Consumed</th>
                  <th className="py-3 px-3">Modeled Cost</th>
                  <th className="py-3 px-3">Net Profit</th>
                  <th className="py-3 px-3 text-right">Actions & Exports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#143420] text-slate-300">
                {filteredHistory.map((rec) => {
                  const isSelected = selectedRunIds.includes(rec.id);
                  const isThisPdfDownloading =
                    downloadingRunId === rec.id && downloadingType === 'pdf';
                  const isThisCsvDownloading =
                    downloadingRunId === rec.id && downloadingType === 'csv';

                  return (
                    <tr
                      key={rec.id}
                      className={`hover:bg-[#0c2215] transition-colors ${
                        isSelected ? 'bg-[#0f2c1a]/60' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleToggleSelect(rec.id)}
                          className="hover:text-emerald-300 transition-colors"
                          title={isSelected ? 'Deselect run' : 'Select run for comparison'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-400">
                        {new Date(rec.created_at).toLocaleString([], {
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-white truncate max-w-[170px]">
                        {rec.name}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-emerald-400 capitalize">{rec.crop_id}</span>
                        <span className="text-[10px] text-slate-500 block">{rec.season}</span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-300">
                        {rec.sowing_date}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap font-bold text-white">
                        {rec.yield_quintal_acre.toFixed(1)} q/ac
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-cyan-300">
                        {rec.water_consumed_m3.toLocaleString()} m³
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        ₹{rec.total_cost_inr.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap font-bold text-amber-300">
                        {rec.profit_inr > 0 ? `₹${rec.profit_inr.toLocaleString()}` : 'Not available'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Open Result */}
                          <button
                            onClick={() => handleOpenDetail(rec.id)}
                            className="px-2 py-1 rounded-lg bg-[#143721] hover:bg-emerald-600 hover:text-white text-emerald-300 transition-colors flex items-center gap-1 font-medium text-[11px]"
                            title="Open simulation in Scenario Explorer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Open</span>
                          </button>

                          {/* Direct PDF Export */}
                          <button
                            onClick={() => handleDownloadPdf(rec.id)}
                            disabled={isThisPdfDownloading}
                            className="p-1.5 rounded-lg bg-[#0b1f13] border border-[#1d3d28] hover:border-emerald-700 text-slate-300 hover:text-emerald-300 transition-colors"
                            title="Download PDF Executive Report for this saved run"
                          >
                            {isThisPdfDownloading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </button>

                          {/* Direct CSV Export */}
                          <button
                            onClick={() => handleDownloadCsv(rec.id)}
                            disabled={isThisCsvDownloading}
                            className="p-1.5 rounded-lg bg-[#0b1f13] border border-[#1d3d28] hover:border-emerald-700 text-slate-300 hover:text-emerald-300 transition-colors"
                            title="Download Daily Telemetry CSV for this saved run"
                          >
                            {isThisCsvDownloading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                            ) : (
                              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTargetId(rec.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Delete simulation from database"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Multi-Run Comparison Modal */}
      {compareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="agri-card max-w-5xl w-full max-h-[90vh] flex flex-col border-emerald-600/50 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#183a24] bg-[#07170e] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
                  <GitCompare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Multi-Run Comparative Agronomic Audit
                  </h3>
                  <p className="text-xs text-slate-400">
                    Side-by-side performance delta evaluation across {selectedRunIds.length} historical simulation runs
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {compareLoading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-xs text-slate-400">Comparing selected simulation runs...</p>
                </div>
              ) : compareError ? (
                <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{compareError}</span>
                </div>
              ) : compareResult ? (
                <div className="space-y-5">
                  {/* Executive Summary */}
                  <div className="p-4 rounded-xl bg-[#0b2615] border border-emerald-800/80 flex items-start gap-3">
                    <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                        Comparative Summary & Delta Baseline
                      </h4>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {compareResult.summary}
                      </p>
                    </div>
                  </div>

                  {/* Comparison Matrix Table */}
                  <div className="rounded-xl border border-[#1a3f28] overflow-hidden bg-[#07160d]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0c2215] border-b border-[#183a24] text-slate-400 font-semibold uppercase text-[10px]">
                          <tr>
                            <th className="py-3 px-4">Metric / Parameter</th>
                            {compareResult.compared_runs.map((r, i) => (
                              <th key={r.id} className="py-3 px-4 whitespace-nowrap">
                                <div className="space-y-0.5">
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    <span>Run #{i + 1}</span>
                                    {r.is_baseline && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-300 border border-emerald-700">
                                        Baseline
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-normal truncate max-w-[140px]">
                                    {r.name}
                                  </div>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#13321f] text-slate-300">
                          {/* Crop & Season */}
                          <tr>
                            <td className="py-3 px-4 font-semibold text-slate-400">Crop & Season</td>
                            {compareResult.compared_runs.map((r) => (
                              <td key={r.id} className="py-3 px-4 capitalize font-semibold text-emerald-400">
                                {r.crop_id} <span className="text-slate-500 font-normal">({r.season})</span>
                              </td>
                            ))}
                          </tr>

                          {/* Execution Date */}
                          <tr>
                            <td className="py-3 px-4 font-semibold text-slate-400">Recorded Timestamp</td>
                            {compareResult.compared_runs.map((r) => (
                              <td key={r.id} className="py-3 px-4 text-slate-400 text-[11px]">
                                {new Date(r.created_at).toLocaleDateString([], {
                                  month: 'short',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                            ))}
                          </tr>

                          {/* Yield (Quintals/Acre) */}
                          <tr className="bg-[#0a1f13]/40">
                            <td className="py-3 px-4 font-semibold text-white">Harvest Yield</td>
                            {compareResult.compared_runs.map((r) => (
                              <td key={r.id} className="py-3 px-4 font-bold text-white whitespace-nowrap">
                                <div>{r.yield_quintal_acre.toFixed(1)} q/ac</div>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {r.yield_kg_ha.toLocaleString()} kg/ha
                                </div>
                                {!r.is_baseline && (
                                  <span
                                    className={`inline-flex items-center gap-0.5 text-[10px] font-semibold mt-0.5 px-1.5 py-0.5 rounded ${
                                      r.yield_delta_pct >= 0
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                                    }`}
                                  >
                                    {r.yield_delta_pct >= 0 ? '+' : ''}
                                    {r.yield_delta_pct.toFixed(1)}%
                                  </span>
                                )}
                              </td>
                            ))}
                          </tr>

                          {/* Water Consumed */}
                          <tr>
                            <td className="py-3 px-4 font-semibold text-cyan-300">Total Water Consumed</td>
                            {compareResult.compared_runs.map((r) => (
                              <td key={r.id} className="py-3 px-4 text-cyan-300 font-semibold whitespace-nowrap">
                                <div>{r.water_consumed_m3.toLocaleString()} m³</div>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {r.water_applied_mm.toFixed(0)} mm depth
                                </div>
                                {!r.is_baseline && (
                                  <span
                                    className={`inline-flex items-center gap-0.5 text-[10px] font-semibold mt-0.5 px-1.5 py-0.5 rounded ${
                                      r.water_delta_pct <= 0
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                                    }`}
                                  >
                                    {r.water_delta_pct > 0 ? '+' : ''}
                                    {r.water_delta_pct.toFixed(1)}%
                                  </span>
                                )}
                              </td>
                            ))}
                          </tr>

                          {/* Water Productivity */}
                          <tr>
                            <td className="py-3 px-4 font-semibold text-slate-400">Water Productivity</td>
                            {compareResult.compared_runs.map((r) => (
                              <td key={r.id} className="py-3 px-4 font-semibold text-slate-200">
                                {r.water_productivity_kg_m3.toFixed(2)} kg/m³
                              </td>
                            ))}
                          </tr>

                          {/* Total Cost */}
                          <tr>
                            <td className="py-3 px-4 font-semibold text-slate-400">Cultivation Cost</td>
                            {compareResult.compared_runs.map((r) => (
                              <td key={r.id} className="py-3 px-4 text-slate-200 font-semibold">
                                ₹{r.total_cost_inr.toLocaleString()}
                              </td>
                            ))}
                          </tr>

                          {/* Gross Revenue */}
                          <tr>
                            <td className="py-3 px-4 font-semibold text-slate-400">Gross Revenue</td>
                            {compareResult.compared_runs.map((r) => (
                              <td key={r.id} className="py-3 px-4 text-slate-200 font-semibold">
                                ₹{r.revenue_inr.toLocaleString()}
                              </td>
                            ))}
                          </tr>

                          {/* Net Profit */}
                          <tr className="bg-[#0a1f13]/60">
                            <td className="py-3 px-4 font-semibold text-amber-300">Modeled Net Profit</td>
                            {compareResult.compared_runs.map((r) => (
                              <td key={r.id} className="py-3 px-4 font-bold text-amber-300 whitespace-nowrap">
                                <div>₹{r.profit_inr.toLocaleString()}</div>
                                {!r.is_baseline && (
                                  <span
                                    className={`inline-flex items-center gap-0.5 text-[10px] font-semibold mt-0.5 px-1.5 py-0.5 rounded ${
                                      r.profit_delta_pct >= 0
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                                    }`}
                                  >
                                    {r.profit_delta_pct >= 0 ? '+' : ''}
                                    {r.profit_delta_pct.toFixed(1)}%
                                  </span>
                                )}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#183a24] bg-[#07170e] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setCompareModalOpen(false)}
                className="agri-btn-secondary px-5 py-2 text-xs"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="agri-card p-6 max-w-md w-full space-y-4 border-rose-900/60">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="text-base font-bold text-white">Delete Simulation Record?</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete simulation run <code className="text-rose-300 font-mono">{deleteTargetId}</code>?
              This will permanently delete this record from the SQLite database.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="agri-btn-secondary px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
