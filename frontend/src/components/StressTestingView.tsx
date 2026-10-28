import React, { useState } from 'react';
import {
  ShieldAlert,
  Flame,
  CloudRain,
  Sun,
  Droplets,
  AlertTriangle,
  Play,
  CheckCircle2,
  TrendingDown,
  Info,
  Layers,
  ThermometerSnowflake,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { SimulationInput, WeatherStressBatteryResult, WeatherShockScenarioResult, ModularFarmInput } from '../types';
import { executeWeatherStressBattery } from '../services/api';

interface StressTestingViewProps {
  baseSimulation: SimulationInput;
}

export const StressTestingView: React.FC<StressTestingViewProps> = ({ baseSimulation }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [batteryResult, setBatteryResult] = useState<WeatherStressBatteryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cards' | 'chart' | 'table'>('cards');

  const handleRunStressTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const modularPayload: ModularFarmInput = {
        crop_type: baseSimulation.crop_id,
        farm_area: baseSimulation.farm_profile.total_acres,
        farm_area_unit: 'acres',
        soil_type: baseSimulation.farm_profile.soil_type,
        irrigation_method: baseSimulation.farm_profile.irrigation_system,
        sowing_date: baseSimulation.sowing_date || '2026-11-15',
        nitrogen_kg_ha: 120.0,
        phosphorus_kg_ha: 60.0,
        potassium_kg_ha: 40.0,
        irrigation_depth_mm: 380.0,
        crop_selling_price_per_quintal: baseSimulation.custom_price_per_quintal || 2275.0,
        mulching_used: baseSimulation.mulching_used || false
      };

      const res = await executeWeatherStressBattery(modularPayload);
      setBatteryResult(res);
    } catch (err: any) {
      console.error('Weather stress battery error:', err);
      setError(err.message || 'Weather stress testing failed');
    } finally {
      setLoading(false);
    }
  };

  const getScenarioIcon = (id: string) => {
    switch (id) {
      case 'heat_stress': return <Flame className="w-5 h-5 text-rose-400" />;
      case 'drought_stress': return <Sun className="w-5 h-5 text-amber-400" />;
      case 'lower_rainfall': return <Droplets className="w-5 h-5 text-yellow-400" />;
      case 'excess_deluge': return <CloudRain className="w-5 h-5 text-cyan-400" />;
      case 'combined_heat_drought': return <AlertTriangle className="w-5 h-5 text-purple-400" />;
      default: return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'baseline': return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'moderate': return 'bg-yellow-950 text-yellow-300 border-yellow-800';
      case 'severe': return 'bg-orange-950 text-orange-300 border-orange-800';
      case 'extreme': return 'bg-rose-950 text-rose-300 border-rose-800';
      default: return 'bg-cyan-950 text-cyan-300 border-cyan-800';
    }
  };

  const getResilienceRatingColor = (rating: string) => {
    if (rating.includes('High')) return 'text-emerald-400 border-emerald-500 bg-emerald-950/60';
    if (rating.includes('Moderate')) return 'text-amber-400 border-amber-500 bg-amber-950/60';
    if (rating.includes('Vulnerable')) return 'text-orange-400 border-orange-500 bg-orange-950/60';
    return 'text-rose-400 border-rose-500 bg-rose-950/60';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="agri-card p-5 border-l-4 border-l-rose-500">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Systematic Climate Extreme Stress-Testing Battery</span>
            </h2>
            <p className="text-xs text-slate-400">
              Evaluates biophysical yield resilience, soil infiltration, root hypoxia, and financial risk across 6 systematic weather shocks.
            </p>
          </div>

          <button
            onClick={handleRunStressTests}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-rose-950/40 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            <span>Execute 6-Shock Stress Battery</span>
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {batteryResult && (
        <div className="space-y-6">
          {/* Resilience Scorecard Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`agri-card p-5 border-l-4 flex items-center gap-4 ${getResilienceRatingColor(batteryResult.resilience_rating)}`}>
              <div className="w-16 h-16 rounded-2xl bg-[#08180f] border border-current flex items-center justify-center font-black text-2xl font-mono">
                {batteryResult.resilience_score}
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Climate Resilience Index</span>
                <div className="text-base font-extrabold text-white mt-0.5">{batteryResult.resilience_rating}</div>
                <div className="text-[11px] text-slate-300 mt-1">Crop: {batteryResult.crop_name}</div>
              </div>
            </div>

            <div className="agri-card p-5 border-l-4 border-l-amber-500 col-span-2 space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Executive Advisory & Vulnerability Diagnosis</span>
              <p className="text-xs text-slate-200 leading-relaxed">
                {batteryResult.executive_advisory}
              </p>
              <div className="text-[11px] text-amber-300 font-semibold flex items-center gap-1.5 pt-1">
                <span>Primary Risk Trigger:</span>
                <span className="text-white bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                  {batteryResult.most_vulnerable_scenario}
                </span>
              </div>
            </div>
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-2 border-b border-[#183923] pb-2 text-xs">
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'cards' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              Scenario Cards Grid
            </button>
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'chart' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              Yield & Profit Comparison Chart
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'table' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              Physiological Diagnostics Table
            </button>
          </div>

          {/* TAB 1: SCENARIO CARDS GRID */}
          {activeTab === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batteryResult.scenarios.map((sc) => {
                const isNegative = sc.yield_delta_pct < 0;
                return (
                  <div
                    key={sc.scenario_id}
                    className="agri-card p-5 space-y-3.5 border border-[#1b3d27] hover:border-emerald-700/60 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-[#08180f] border border-[#1d492c]">
                            {getScenarioIcon(sc.scenario_id)}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white leading-tight">{sc.scenario_name}</h4>
                            <span className="text-[10px] text-slate-400 block">{sc.description}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${getSeverityBadgeColor(sc.severity)}`}>
                          {sc.severity}
                        </span>
                      </div>

                      {/* Yield Delta metric */}
                      <div className="p-3 rounded-xl bg-[#06140b] border border-[#14341e] flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Harvest Yield</span>
                          <span className="text-base font-black text-white">
                            {sc.estimated_yield_kg_ha.toLocaleString()} <span className="text-xs font-normal text-slate-400">kg/ha</span>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Yield Delta</span>
                          <span className={`font-bold text-sm ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {sc.yield_delta_pct > 0 ? '+' : ''}{sc.yield_delta_pct.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Hydrology & Diagnostics */}
                      <div className="grid grid-cols-3 gap-1.5 text-[10px] bg-[#08180f] p-2 rounded-lg border border-[#183a24] text-slate-300">
                        <div>
                          <span className="text-slate-500 block">Gross Rain</span>
                          <span className="font-semibold text-white">{sc.gross_rainfall_mm} mm</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Eff. Rain</span>
                          <span className="font-semibold text-cyan-300">{sc.effective_rainfall_mm} mm</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Percolation</span>
                          <span className="font-semibold text-slate-300">{sc.deep_percolation_mm} mm</span>
                        </div>
                      </div>

                      {/* Financial Impact */}
                      {sc.estimated_net_return_inr !== undefined && (
                        <div className="flex items-center justify-between text-[11px] text-slate-300 px-1">
                          <span>Net Return:</span>
                          <span className="font-bold text-amber-300">
                            {sc.estimated_net_return_inr !== null ? `₹${sc.estimated_net_return_inr.toLocaleString()}` : 'N/A'}
                            {sc.profit_delta_inr !== undefined && sc.profit_delta_inr !== null && (
                              <span className={`text-[10px] ml-1.5 ${sc.profit_delta_inr < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                ({sc.profit_delta_inr < 0 ? '' : '+'}{sc.profit_delta_inr.toLocaleString()})
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {/* Vulnerability triggers */}
                      <div className="text-[10px] text-slate-300">
                        <span className="text-slate-500 block font-semibold mb-0.5">Stress Diagnostic:</span>
                        <span className="text-amber-200/90">{sc.vulnerability_trigger}</span>
                      </div>
                    </div>

                    {/* Mitigation advisory */}
                    <div className="pt-2 border-t border-[#163821] text-[11px] text-slate-300">
                      <span className="text-emerald-400 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">
                        Mitigation Advisory:
                      </span>
                      <p className="text-slate-300 text-[10px] leading-relaxed">{sc.mitigation_advisory}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: CHART COMPARISON */}
          {activeTab === 'chart' && (
            <div className="agri-card p-6 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart className="w-4 h-4 text-emerald-400" />
                Comparative Harvest Yield across Tested Weather Shocks
              </h4>
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={batteryResult.scenarios.map((s) => ({
                      name: s.scenario_name.split('(')[0],
                      yield: s.estimated_yield_kg_ha,
                      delta: s.yield_delta_pct
                    }))}
                    margin={{ top: 10, right: 20, bottom: 25, left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#163922" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#06170d] border border-emerald-700/60 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                              <span className="font-bold text-white block">{data.name}</span>
                              <span className="text-emerald-400">Yield: {data.yield.toLocaleString()} kg/ha</span>
                              <span className="text-slate-400 block">Delta: {data.delta > 0 ? '+' : ''}{data.delta.toFixed(1)}%</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="yield" name="Yield (kg/ha)" radius={[4, 4, 0, 0]}>
                      {batteryResult.scenarios.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.scenario_id === 'normal_weather' ? '#10b981' : entry.yield_delta_pct < -25 ? '#f43f5e' : '#f59e0b'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB 3: DIAGNOSTICS TABLE */}
          {activeTab === 'table' && (
            <div className="agri-card p-5 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Comprehensive Biophysical Factor Decomposition
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#091b10] border-b border-[#1b3d27] text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Scenario</th>
                      <th className="py-2.5 px-3">Yield (kg/ha)</th>
                      <th className="py-2.5 px-3">Yield Delta</th>
                      <th className="py-2.5 px-3">Water Stress (Ks)</th>
                      <th className="py-2.5 px-3">Root Hypoxia</th>
                      <th className="py-2.5 px-3">Temp Stress</th>
                      <th className="py-2.5 px-3">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#153420] text-slate-300">
                    {batteryResult.scenarios.map((sc) => (
                      <tr key={sc.scenario_id} className="hover:bg-[#0c2214]">
                        <td className="py-2.5 px-3 font-semibold text-white">{sc.scenario_name}</td>
                        <td className="py-2.5 px-3 font-bold text-white">{sc.estimated_yield_kg_ha.toLocaleString()}</td>
                        <td className={`py-2.5 px-3 font-bold ${sc.yield_delta_pct < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {sc.yield_delta_pct > 0 ? '+' : ''}{sc.yield_delta_pct.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-cyan-300">{sc.water_response_factor.toFixed(2)}</td>
                        <td className="py-2.5 px-3">{sc.aeration_hypoxia_factor.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-amber-300">{sc.temperature_stress_factor.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-slate-200">
                          {sc.estimated_net_return_inr ? `₹${sc.estimated_net_return_inr.toLocaleString()}` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Scientific Methodology Disclosure */}
          <div className="p-3.5 rounded-xl bg-[#07170e] border border-[#1b3e26] text-xs text-slate-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong>Methodology Disclosure:</strong> {batteryResult.methodology_disclosure}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
