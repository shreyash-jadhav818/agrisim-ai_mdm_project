import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Droplets,
  DollarSign,
  Sprout,
  Award,
  Layers,
  ArrowRight,
  Clock,
  Sparkles,
  BarChart3,
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { HistoryRecord, SimulationResult } from '../types';
import { fetchHistory, fetchHistoryDetail } from '../services/api';

interface OverviewPageProps {
  currentResult: SimulationResult | null;
  onNavigate: (tab: string) => void;
  onRestoreSimulation: (detail: { input: any; output: SimulationResult }) => void;
  onLaunchDemo?: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  currentResult,
  onNavigate,
  onRestoreSimulation,
  onLaunchDemo
}) => {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [bestObjective, setBestObjective] = useState<'yield' | 'profit' | 'water'>('yield');

  useEffect(() => {
    async function load() {
      try {
        const records = await fetchHistory();
        setHistory(records);
      } catch (e) {
        console.error('Failed to load history for overview:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Determine latest simulation metrics
  const latestRun = history.length > 0 ? history[0] : null;

  // Best-performing scenario from history
  let bestScenarioRecord: HistoryRecord | null = null;
  if (history.length > 0) {
    if (bestObjective === 'yield') {
      bestScenarioRecord = [...history].sort((a, b) => b.yield_quintal_acre - a.yield_quintal_acre)[0];
    } else if (bestObjective === 'profit') {
      bestScenarioRecord = [...history].sort((a, b) => b.profit_inr - a.profit_inr)[0];
    } else {
      bestScenarioRecord = [...history].sort((a, b) => a.water_consumed_m3 - b.water_consumed_m3)[0];
    }
  }

  // Chart datasets from history (or fallback to currentResult)
  const chartData = history.slice(0, 6).reverse().map((h) => ({
    name: `${h.crop_id.toUpperCase()} (${h.sowing_date.slice(5)})`,
    yield_q: Math.round(h.yield_quintal_acre * 10) / 10,
    water_m3: Math.round(h.water_consumed_m3),
    cost_inr: Math.round(h.total_cost_inr),
    profit_inr: Math.round(h.profit_inr),
    productivity: Math.round(h.water_productivity_kg_m3 * 100) / 100
  }));

  const handleOpenRecord = async (runId: string) => {
    try {
      const detail = await fetchHistoryDetail(runId);
      onRestoreSimulation(detail);
      onNavigate('scenarios');
    } catch (e) {
      console.error('Failed to open history detail:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Aggregating biophysical telemetry from database...</p>
      </div>
    );
  }

  // Empty state when no simulations exist
  if (history.length === 0 && !currentResult) {
    return (
      <div className="agri-card p-10 text-center max-w-2xl mx-auto my-12 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-950/40">
          <Sprout className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">Welcome to AgriSim AI</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Your AI-powered digital twin and What-If simulator is ready. Run your first simulation to model crop water demand, Mitscherlich-Baule nutrition, and harvest economics.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('new-simulation')}
            className="agri-btn-primary px-6 py-3 text-sm shadow-xl w-full sm:w-auto"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Simulation Wizard</span>
          </button>
          {onLaunchDemo && (
            <button
              onClick={onLaunchDemo}
              className="px-5 py-3 rounded-xl bg-[#0e2518] hover:bg-[#163824] border border-amber-600/50 text-amber-300 font-semibold text-sm transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Run Instant Demo (Illustrative)</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-[#183622] text-left text-xs text-slate-400">
          <div className="p-3 rounded-xl bg-[#09180e] border border-[#163821]">
            <span className="font-semibold text-emerald-300 block mb-1">FAO-56 Water Balance</span>
            Dynamic root-zone soil water depletion and aeration hypoxia.
          </div>
          <div className="p-3 rounded-xl bg-[#09180e] border border-[#163821]">
            <span className="font-semibold text-emerald-300 block mb-1">8 What-If Scenarios</span>
            Independent evaluations of deficit irrigation, N-P-K, and sowing shifts.
          </div>
          <div className="p-3 rounded-xl bg-[#09180e] border border-[#163821]">
            <span className="font-semibold text-emerald-300 block mb-1">Transparent Economics</span>
            Calculated in INR (₹) without fabricating missing costs or prices.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Saved Runs */}
        <div className="agri-card p-5 space-y-2 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Saved Simulations</span>
            <span className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {history.length} <span className="text-xs font-normal text-slate-400">runs</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            SQLite audit vault active
          </div>
        </div>

        {/* Metric 2: Latest Yield */}
        <div className="agri-card p-5 space-y-2 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Latest Estimated Yield</span>
            <span className="p-1.5 rounded-lg bg-green-950/80 text-green-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {latestRun ? `${latestRun.yield_quintal_acre.toFixed(1)} q/ac` : currentResult ? `${currentResult.yield_quintal_acre.toFixed(1)} q/ac` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span className="capitalize text-emerald-300 font-semibold truncate">
              {latestRun ? latestRun.crop_id : currentResult?.crop_name}
            </span>
            <span>{latestRun ? latestRun.sowing_date : '2026-11-15'}</span>
          </div>
        </div>

        {/* Metric 3: Latest Water Consumption */}
        <div className="agri-card p-5 space-y-2 border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Water Consumed</span>
            <span className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400">
              <Droplets className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {latestRun
              ? `${latestRun.water_consumed_m3.toLocaleString(undefined, { maximumFractionDigits: 0 })} m³`
              : currentResult
              ? `${(currentResult.total_water_consumed_m3_acre * 5).toLocaleString(undefined, { maximumFractionDigits: 0 })} m³`
              : 'N/A'}
          </div>
          <div className="text-[11px] text-cyan-300 font-medium truncate">
            {latestRun ? `${latestRun.water_productivity_kg_m3.toFixed(2)} kg/m³ productivity` : 'FAO-56 root zone'}
          </div>
        </div>

        {/* Metric 4: Latest Net Return */}
        <div className="agri-card p-5 space-y-2 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Modeled Net Return</span>
            <span className="p-1.5 rounded-lg bg-amber-950/80 text-amber-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {latestRun && latestRun.profit_inr > 0
              ? `₹${latestRun.profit_inr.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : currentResult && currentResult.net_profit_inr > 0
              ? `₹${currentResult.net_profit_inr.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : 'Not available'}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {latestRun && latestRun.profit_inr > 0
              ? `Cost: ₹${latestRun.total_cost_inr.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : 'Selling price required for net return'}
          </div>
        </div>
      </div>

      {/* Best-Performing Strategy Spotlight Card */}
      {bestScenarioRecord && (
        <div className="agri-card p-6 bg-gradient-to-br from-[#0c2617] via-[#091b10] to-[#07160d] border-[#1d472c] space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#183a24] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-amber-400">
                  Best-Performing Saved Strategy
                </span>
                <h3 className="text-base font-bold text-white">
                  {bestScenarioRecord.name} ({bestScenarioRecord.crop_id.toUpperCase()})
                </h3>
              </div>
            </div>

            {/* Objective Selector */}
            <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
              <span className="text-slate-400">Objective:</span>
              <div className="flex rounded-lg bg-[#07150c] p-1 border border-[#1b3d27]">
                <button
                  onClick={() => setBestObjective('yield')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                    bestObjective === 'yield' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Highest Yield
                </button>
                <button
                  onClick={() => setBestObjective('profit')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                    bestObjective === 'profit' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Max Profit
                </button>
                <button
                  onClick={() => setBestObjective('water')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                    bestObjective === 'water' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Lowest Water
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#07170e]/80 border border-[#183923]">
              <span className="text-slate-400 block text-[11px]">Harvest Yield</span>
              <span className="text-sm font-bold text-emerald-300">
                {bestScenarioRecord.yield_quintal_acre.toFixed(1)} q/acre
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#07170e]/80 border border-[#183923]">
              <span className="text-slate-400 block text-[11px]">Irrigation Water</span>
              <span className="text-sm font-bold text-cyan-300">
                {bestScenarioRecord.water_consumed_m3.toLocaleString()} m³
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#07170e]/80 border border-[#183923]">
              <span className="text-slate-400 block text-[11px]">Modeled Cost</span>
              <span className="text-sm font-bold text-slate-200">
                ₹{bestScenarioRecord.total_cost_inr.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#07170e]/80 border border-[#183923]">
              <span className="text-slate-400 block text-[11px]">Net Return</span>
              <span className="text-sm font-bold text-amber-300">
                {bestScenarioRecord.profit_inr > 0 ? `₹${bestScenarioRecord.profit_inr.toLocaleString()}` : 'Not available'}
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => handleOpenRecord(bestScenarioRecord.id)}
              className="agri-btn-secondary py-1.5 px-3 text-xs"
            >
              <span>Inspect Full Result In Scenarios</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive Charts Grid */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Yield Comparison */}
          <div className="agri-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Yield Comparison Across Recent Runs
                </h4>
                <p className="text-[11px] text-slate-400">Harvest output in quintals per acre</p>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#163823" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#091b10', borderColor: '#1d442b', borderRadius: '12px' }}
                    itemStyle={{ color: '#86efac' }}
                  />
                  <Bar dataKey="yield_q" fill="#10b981" radius={[6, 6, 0, 0]} name="Yield (q/acre)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Water Consumption Comparison */}
          <div className="agri-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-cyan-400" />
                  Irrigation Water Consumption
                </h4>
                <p className="text-[11px] text-slate-400">Total water delivered over seasonal duration (m³)</p>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#163823" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#091b10', borderColor: '#1d442b', borderRadius: '12px' }}
                    itemStyle={{ color: '#38bdf8' }}
                  />
                  <Bar dataKey="water_m3" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Water (m³)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Cultivation Cost vs Profit */}
          <div className="agri-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  Cost vs. Estimated Net Profit (INR ₹)
                </h4>
                <p className="text-[11px] text-slate-400">Transparent comparison of input overhead vs return</p>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#163823" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#091b10', borderColor: '#1d442b', borderRadius: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Bar dataKey="cost_inr" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Cost (₹)" />
                  <Bar dataKey="profit_inr" fill="#10b981" radius={[6, 6, 0, 0]} name="Net Return (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Water Productivity Trend */}
          <div className="agri-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Water Productivity Efficiency (kg/m³)
                </h4>
                <p className="text-[11px] text-slate-400">Crop biomass harvested per cubic metre of irrigation water</p>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#163823" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#091b10', borderColor: '#1d442b', borderRadius: '12px' }}
                    itemStyle={{ color: '#a7f3d0' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="productivity"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10b981' }}
                    name="Productivity (kg/m³)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Recent Simulation History Table */}
      {history.length > 0 && (
        <div className="agri-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Recent Simulation History
              </h4>
              <p className="text-xs text-slate-400">Database-backed records from past executions</p>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>View All History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#091b10] border-b border-[#1b3d27] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Simulation Name</th>
                  <th className="py-2.5 px-3">Crop</th>
                  <th className="py-2.5 px-3">Yield</th>
                  <th className="py-2.5 px-3">Water</th>
                  <th className="py-2.5 px-3">Cost</th>
                  <th className="py-2.5 px-3">Net Profit</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#153420] text-slate-300">
                {history.slice(0, 5).map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#0e2518] transition-colors">
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(rec.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-medium text-white truncate max-w-[160px]">
                      {rec.name}
                    </td>
                    <td className="py-3 px-3 capitalize font-semibold text-emerald-300">
                      {rec.crop_id}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">
                      {rec.yield_quintal_acre.toFixed(1)} q/ac
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {rec.water_consumed_m3.toLocaleString()} m³
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      ₹{rec.total_cost_inr.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-medium text-amber-300">
                      {rec.profit_inr > 0 ? `₹${rec.profit_inr.toLocaleString()}` : 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpenRecord(rec.id)}
                        className="px-2.5 py-1 rounded-lg bg-[#143521] hover:bg-emerald-600 hover:text-white text-emerald-300 text-xs font-medium transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
