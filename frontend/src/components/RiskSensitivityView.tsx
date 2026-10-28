import React, { useState } from 'react';
import {
  ShieldAlert,
  Sliders,
  Play,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Info,
  DollarSign,
  CloudRain,
  Thermometer,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import {
  SimulationInput,
  RiskSensitivityResult,
  ModularFarmInput,
  FarmerRiskMitigation
} from '../types';
import { executeRiskSensitivity } from '../services/api';

interface RiskSensitivityViewProps {
  baseSimulation: SimulationInput;
}

export const RiskSensitivityView: React.FC<RiskSensitivityViewProps> = ({ baseSimulation }) => {
  const [rainfallVar, setRainfallVar] = useState<number>(50);
  const [tempAnomaly, setTempAnomaly] = useState<number>(4.0);
  const [fertilizerInflation, setFertilizerInflation] = useState<number>(50);
  const [priceVol, setPriceVol] = useState<number>(30);
  const [sowingShift, setSowingShift] = useState<number>(14);

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<RiskSensitivityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunSensitivity = async () => {
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

      const res = await executeRiskSensitivity({
        baseline_input: modularPayload,
        rainfall_variation_pct: rainfallVar,
        temperature_anomaly_c: tempAnomaly,
        fertilizer_inflation_pct: fertilizerInflation,
        price_volatility_pct: priceVol,
        sowing_shift_days: sowingShift
      });
      setResult(res);
    } catch (err: any) {
      console.error('Risk sensitivity error:', err);
      setError(err.message || 'Risk sensitivity analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Parameter Adjustment Card */}
      <div className="agri-card p-5 space-y-4 border-l-4 border-l-amber-500">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#183a24] pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <span>Sensitivity Bounds & Multi-Variable Stress Factors</span>
            </h3>
            <p className="text-xs text-slate-400">
              Perturbs seasonal rainfall, thermal shock, sowing windows, fertilizer inflation, and crop price swings
            </p>
          </div>

          <button
            onClick={handleRunSensitivity}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-amber-950/40 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            <span>Execute Tornado Sensitivity Analysis</span>
          </button>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 p-4 rounded-xl bg-[#07160d] border border-[#163821] text-xs">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300 font-semibold flex items-center gap-1">
                <CloudRain className="w-3.5 h-3.5 text-cyan-400" /> Rain Swing
              </span>
              <span className="font-mono text-cyan-400 font-bold">±{rainfallVar}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="80"
              step="5"
              value={rainfallVar}
              onChange={(e) => setRainfallVar(parseInt(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300 font-semibold flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" /> Heat Anomaly
              </span>
              <span className="font-mono text-amber-400 font-bold">+{tempAnomaly.toFixed(1)}°C</span>
            </div>
            <input
              type="range"
              min="1"
              max="7"
              step="0.5"
              value={tempAnomaly}
              onChange={(e) => setTempAnomaly(parseFloat(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Sowing Shift
              </span>
              <span className="font-mono text-emerald-400 font-bold">±{sowingShift}d</span>
            </div>
            <input
              type="range"
              min="3"
              max="28"
              step="1"
              value={sowingShift}
              onChange={(e) => setSowingShift(parseInt(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300 font-semibold flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-rose-400" /> Fert Inflation
              </span>
              <span className="font-mono text-rose-400 font-bold">+{fertilizerInflation}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={fertilizerInflation}
              onChange={(e) => setFertilizerInflation(parseInt(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300 font-semibold flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-yellow-400" /> Price Volatility
              </span>
              <span className="font-mono text-yellow-400 font-bold">±{priceVol}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={priceVol}
              onChange={(e) => setPriceVol(parseInt(e.target.value))}
              className="w-full accent-yellow-500"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="agri-card p-5 border-l-4 border-l-emerald-500 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Executive Risk Synthesis</span>
              <span className="text-xs bg-amber-950 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-800 font-bold">
                Primary Vulnerability: {result.primary_vulnerability_factor}
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">{result.executive_risk_summary}</p>
          </div>

          {/* Tornado Chart & Ranking */}
          <div className="agri-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#183923] pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-amber-400" />
                  Sensitivity Tornado Chart: Elasticity Impact Swings
                </h4>
                <p className="text-xs text-slate-400">
                  Ranks input variables by the magnitude of modeled harvest yield swing (kg/ha) across evaluated bounds
                </p>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={result.tornado_sensitivities.map((item) => ({
                    name: item.parameter_label,
                    swing: item.yield_swing_kg_ha,
                    profitSwing: item.profit_swing_inr,
                    category: item.sensitivity_category
                  }))}
                  margin={{ top: 10, right: 30, left: 160, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#163922" />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} unit=" kg/ha" />
                  <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fill: '#cbd5e1' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#06170d] border border-emerald-700/60 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                            <span className="font-bold text-white block">{data.name}</span>
                            <span className="text-amber-400">Yield Swing: {data.swing.toLocaleString()} kg/ha</span>
                            {data.profitSwing && (
                              <span className="text-emerald-400 block">Profit Swing: ₹{data.profitSwing.toLocaleString()}</span>
                            )}
                            <span className="text-[10px] text-slate-400 block">Severity: {data.category}</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="swing" name="Yield Swing (kg/ha)" radius={[0, 4, 4, 0]}>
                    {result.tornado_sensitivities.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.primary_risk_driver ? '#f59e0b' : entry.sensitivity_category === 'High' ? '#10b981' : '#38bdf8'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Compound Bounding Scenarios (Worst vs Baseline vs Best) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Worst Case */}
            <div className="agri-card p-5 space-y-3 border-l-4 border-l-rose-500 bg-gradient-to-br from-[#1b0d10] to-[#0d0708]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-400 text-xs uppercase tracking-wider">Compound Worst-Case</span>
                <span className="text-[10px] bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800">
                  {result.worst_case_scenario.risk_level}
                </span>
              </div>
              <div>
                <span className="text-2xl font-black text-white">
                  {result.worst_case_scenario.estimated_yield_kg_ha.toLocaleString()}
                </span>
                <span className="text-slate-400 text-xs ml-1">kg/ha</span>
                <div className="text-rose-400 font-bold text-xs mt-0.5">
                  {result.worst_case_scenario.yield_delta_pct}% harvest decline
                </div>
              </div>
              <div className="pt-2 border-t border-rose-950/60 text-[11px] text-slate-300 space-y-1">
                <div>Net Profit: <strong className="text-amber-300">
                  {result.worst_case_scenario.estimated_net_return_inr ? `₹${result.worst_case_scenario.estimated_net_return_inr.toLocaleString()}` : 'N/A'}
                </strong></div>
                <div className="text-[10px] text-slate-400 leading-tight pt-1">
                  {result.worst_case_scenario.description}
                </div>
              </div>
            </div>

            {/* Baseline */}
            <div className="agri-card p-5 space-y-3 border-l-4 border-l-cyan-500 bg-gradient-to-br from-[#0c2419] to-[#07160d]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400 text-xs uppercase tracking-wider">Planned Baseline</span>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
                  Reference Plan
                </span>
              </div>
              <div>
                <span className="text-2xl font-black text-white">
                  {result.baseline_scenario.estimated_yield_kg_ha.toLocaleString()}
                </span>
                <span className="text-slate-400 text-xs ml-1">kg/ha</span>
                <div className="text-cyan-400 font-bold text-xs mt-0.5">Reference Benchmark</div>
              </div>
              <div className="pt-2 border-t border-cyan-950/60 text-[11px] text-slate-300 space-y-1">
                <div>Net Profit: <strong className="text-amber-300">
                  {result.baseline_scenario.estimated_net_return_inr ? `₹${result.baseline_scenario.estimated_net_return_inr.toLocaleString()}` : 'N/A'}
                </strong></div>
                <div className="text-[10px] text-slate-400 leading-tight pt-1">
                  {result.baseline_scenario.description}
                </div>
              </div>
            </div>

            {/* Best Case */}
            <div className="agri-card p-5 space-y-3 border-l-4 border-l-emerald-500 bg-gradient-to-br from-[#0e291b] to-[#08180f]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 text-xs uppercase tracking-wider">Compound Best-Case</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                  {result.best_case_scenario.risk_level}
                </span>
              </div>
              <div>
                <span className="text-2xl font-black text-white">
                  {result.best_case_scenario.estimated_yield_kg_ha.toLocaleString()}
                </span>
                <span className="text-slate-400 text-xs ml-1">kg/ha</span>
                <div className="text-emerald-400 font-bold text-xs mt-0.5">
                  +{result.best_case_scenario.yield_delta_pct}% harvest upside
                </div>
              </div>
              <div className="pt-2 border-t border-emerald-950/60 text-[11px] text-slate-300 space-y-1">
                <div>Net Profit: <strong className="text-amber-300">
                  {result.best_case_scenario.estimated_net_return_inr ? `₹${result.best_case_scenario.estimated_net_return_inr.toLocaleString()}` : 'N/A'}
                </strong></div>
                <div className="text-[10px] text-slate-400 leading-tight pt-1">
                  {result.best_case_scenario.description}
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Farmer Risk Mitigations Grid */}
          {result.risk_mitigations && result.risk_mitigations.length > 0 && (
            <div className="agri-card p-6 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Targeted Agronomic & Financial Risk Mitigations
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {result.risk_mitigations.map((m, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-[#08180f] border border-[#1b3e26] space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                          {m.risk_domain}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                          m.priority === 'High' ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}>
                          {m.priority} Priority
                        </span>
                      </div>
                      <h5 className="font-bold text-white text-xs">{m.title}</h5>
                      <p className="text-slate-300 text-[11px] leading-relaxed mt-1">{m.description}</p>
                    </div>
                    <div className="pt-2 border-t border-[#153420] flex items-center justify-between text-[10px] text-slate-400">
                      <span>Cost: <strong className="text-slate-200">{m.implementation_cost}</strong></span>
                      <span className="text-emerald-300 font-semibold">{m.expected_impact}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Methodology Disclosure Alert */}
          <div className="p-3.5 rounded-xl bg-[#07170e] border border-[#1b3e26] text-xs text-slate-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong>Methodology Disclosure:</strong> {result.methodology_disclosure}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
