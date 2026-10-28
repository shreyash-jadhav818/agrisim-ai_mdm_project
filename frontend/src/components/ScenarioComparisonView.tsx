import React, { useState } from 'react';
import {
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Droplets,
  DollarSign,
  Wheat,
  Play,
  Check,
  Sparkles,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { SimulationInput, ScenarioComparisonResult } from '../types';
import { executeScenarioComparison } from '../services/api';

interface ScenarioComparisonViewProps {
  baseSimulation: SimulationInput;
}

export const ScenarioComparisonView: React.FC<ScenarioComparisonViewProps> = ({ baseSimulation }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [comparisonResult, setComparisonResult] = useState<ScenarioComparisonResult | null>(null);

  // Available scenario toggles
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([
    'drip_conversion',
    'mulching_applied',
    'deficit_irrigation'
  ]);

  const SCENARIO_TEMPLATES = [
    {
      id: 'drip_conversion',
      name: 'High-Efficiency Drip Irrigation',
      desc: 'Convert from flood/furrow to micro-drip (92% application efficiency)',
      overrides: { irrigation_system: 'drip' }
    },
    {
      id: 'mulching_applied',
      name: 'Surface Plastic / Residue Mulch',
      desc: 'Arrests non-productive soil evaporation, saving 25% moisture',
      overrides: { mulching_used: true }
    },
    {
      id: 'deficit_irrigation',
      name: 'Regulated Deficit Irrigation (RDI)',
      desc: 'Apply 20% lower irrigation depths while protecting critical flowering stage',
      overrides: {
        irrigation_schedule: baseSimulation.irrigation_schedule.map(evt => ({
          ...evt,
          amount_mm: Math.round(evt.amount_mm * 0.8)
        }))
      }
    },
    {
      id: 'delayed_sowing',
      name: 'Delayed Sowing (+15 Days)',
      desc: 'Shifts sowing date later into the season to assess temperature shift impact',
      overrides: {
        sowing_date: new Date(new Date(baseSimulation.sowing_date).getTime() + 15 * 86400000).toISOString().split('T')[0]
      }
    }
  ];

  const handleToggleScenario = (id: string) => {
    if (selectedScenarios.includes(id)) {
      setSelectedScenarios(selectedScenarios.filter(s => s !== id));
    } else {
      setSelectedScenarios([...selectedScenarios, id]);
    }
  };

  const handleRunComparison = async () => {
    setLoading(true);
    try {
      const activeTemplates = SCENARIO_TEMPLATES.filter(t => selectedScenarios.includes(t.id));
      const scenarioPayload = activeTemplates.map(t => ({
        name: t.name,
        ...t.overrides
      }));
      const res = await executeScenarioComparison(baseSimulation, scenarioPayload);
      setComparisonResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart comparison data if result exists
  const chartData = comparisonResult
    ? [
        {
          name: 'Baseline',
          yield: comparisonResult.baseline.yield_quintal_acre,
          water: comparisonResult.baseline.total_water_consumed_mm,
          profit: comparisonResult.baseline.net_profit_inr / 1000,
        },
        ...comparisonResult.scenarios.map((sc) => ({
          name: sc.scenario_name.split(' (')[0],
          yield: sc.yield_quintal_acre,
          water: sc.result.total_water_consumed_mm,
          profit: sc.net_profit_inr / 1000,
        })),
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header & Launcher Card */}
      <div className="agri-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-emerald-400" />
              <span>Multi-Scenario What-If Comparative Matrix</span>
            </h2>
            <p className="text-xs text-slate-400">
              Simulate and compare alternative management decisions side-by-side against your current baseline
            </p>
          </div>

          <button
            onClick={handleRunComparison}
            disabled={loading || selectedScenarios.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            <span>Simulate {selectedScenarios.length} Scenarios</span>
          </button>
        </div>

        {/* Scenario Selection Checkbox Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {SCENARIO_TEMPLATES.map((tmpl) => {
            const isChecked = selectedScenarios.includes(tmpl.id);
            return (
              <div
                key={tmpl.id}
                onClick={() => handleToggleScenario(tmpl.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isChecked
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs">{tmpl.name}</span>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-700 bg-slate-900'
                  }`}>
                    {isChecked && <Check className="w-3 h-3" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{tmpl.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison Results Table & Analytics */}
      {comparisonResult ? (
        <div className="space-y-6">
          {/* Key Insights Ticker */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-slate-200 space-y-1.5">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Comparative Strategy Insights</span>
            </div>
            {comparisonResult.key_insights.map((ins, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>{ins}</span>
              </div>
            ))}
          </div>

          {/* Side-by-Side Comparison Table */}
          <div className="agri-card overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Comparative Metrics & Delta Performance
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5 font-bold">Scenario Strategy</th>
                    <th className="p-3.5 font-bold">Yield (q/ac)</th>
                    <th className="p-3.5 font-bold">Yield Delta</th>
                    <th className="p-3.5 font-bold">Water (mm)</th>
                    <th className="p-3.5 font-bold">Water Delta</th>
                    <th className="p-3.5 font-bold">Total Cost (₹)</th>
                    <th className="p-3.5 font-bold">Net Profit (₹)</th>
                    <th className="p-3.5 font-bold">Profit Delta</th>
                    <th className="p-3.5 font-bold">Water Prod.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {/* Baseline Row */}
                  <tr className="bg-slate-900/60 font-semibold">
                    <td className="p-3.5 text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span>{comparisonResult.baseline.scenario_name}</span>
                    </td>
                    <td className="p-3.5 font-mono text-white">{comparisonResult.baseline.yield_quintal_acre.toFixed(1)}</td>
                    <td className="p-3.5 text-slate-400 font-mono">-</td>
                    <td className="p-3.5 font-mono text-white">{comparisonResult.baseline.total_water_consumed_mm.toFixed(0)}</td>
                    <td className="p-3.5 text-slate-400 font-mono">-</td>
                    <td className="p-3.5 font-mono text-white">₹{comparisonResult.baseline.costs.total_cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="p-3.5 font-mono text-emerald-400">₹{comparisonResult.baseline.net_profit_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="p-3.5 text-slate-400 font-mono">-</td>
                    <td className="p-3.5 font-mono text-white">{comparisonResult.baseline.water_productivity_kg_m3.toFixed(2)} kg/m³</td>
                  </tr>

                  {/* Scenarios Rows */}
                  {comparisonResult.scenarios.map((sc, idx) => {
                    const isProfitUp = sc.profit_delta_pct >= 0;
                    const isWaterDown = sc.water_delta_pct <= 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 text-white font-medium flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>{sc.scenario_name}</span>
                        </td>
                        <td className="p-3.5 font-mono text-white">{sc.yield_quintal_acre.toFixed(1)}</td>
                        <td className="p-3.5 font-mono">
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            sc.yield_delta_pct >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {sc.yield_delta_pct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {sc.yield_delta_pct > 0 ? `+${sc.yield_delta_pct}%` : `${sc.yield_delta_pct}%`}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-white">{sc.result.total_water_consumed_mm.toFixed(0)}</td>
                        <td className="p-3.5 font-mono">
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            isWaterDown ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {sc.water_delta_pct <= 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {sc.water_delta_pct > 0 ? `+${sc.water_delta_pct}%` : `${sc.water_delta_pct}%`}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-white">₹{sc.total_cost_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="p-3.5 font-mono font-bold text-white">₹{sc.net_profit_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="p-3.5 font-mono">
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            isProfitUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {isProfitUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {sc.profit_delta_pct > 0 ? `+${sc.profit_delta_pct}%` : `${sc.profit_delta_pct}%`}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-cyan-400">{sc.water_productivity_kg_m3.toFixed(2)} kg/m³</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bar Chart Comparison */}
          <div className="agri-card p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
              Visual Strategy Comparison: Net Profit (₹k) vs Yield (q/ac)
            </h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 10 }} label={{ value: 'Net Profit (₹ Thousands)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{ fontSize: 10 }} label={{ value: 'Yield (q/ac)', angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar yAxisId="left" dataKey="profit" name="Net Profit (₹k)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="yield" name="Yield (q/acre)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="agri-card p-10 text-center space-y-3">
          <BarChart2 className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No Comparison Simulated Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Select one or more alternative strategy presets above and click &quot;Simulate Scenarios&quot; to evaluate comparative yield, water savings, and ROI.
          </p>
        </div>
      )}
    </div>
  );
};
