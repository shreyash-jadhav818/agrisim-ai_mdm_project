import React, { useState } from 'react';
import {
  Dice5,
  Play,
  TrendingDown,
  DollarSign,
  Wheat,
  ShieldCheck,
  AlertTriangle,
  Info
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
import { SimulationInput, MonteCarloRiskResult } from '../types';
import { executeRiskAnalysis } from '../services/api';

interface RiskAnalysisViewProps {
  baseSimulation: SimulationInput;
}

export const RiskAnalysisView: React.FC<RiskAnalysisViewProps> = ({ baseSimulation }) => {
  const [iterations, setIterations] = useState<number>(300);
  const [rainfallVol, setRainfallVol] = useState<number>(25);
  const [tempAnomaly, setTempAnomaly] = useState<number>(1.8);
  const [priceVol, setPriceVol] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(false);
  const [riskResult, setRiskResult] = useState<MonteCarloRiskResult | null>(null);

  const handleRunRisk = async () => {
    setLoading(true);
    try {
      const res = await executeRiskAnalysis(
        baseSimulation,
        iterations,
        rainfallVol,
        tempAnomaly,
        priceVol
      );
      setRiskResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header Card */}
      <div className="agri-card p-5 space-y-4 border-l-4 border-l-purple-500">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Dice5 className="w-5 h-5 text-purple-400" />
              <span>Monte Carlo Risk & Stochastic Uncertainty Analysis</span>
            </h2>
            <p className="text-xs text-slate-400">
              Runs hundreds of simulated seasons with stochastic rainfall variability, thermal anomalies, and commodity price swings
            </p>
          </div>

          <button
            onClick={handleRunRisk}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-950/40 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            <span>Simulate {iterations} Iterations</span>
          </button>
        </div>

        {/* Uncertainty Parameter Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 font-semibold">Iterations</span>
              <span className="font-mono text-purple-400 font-bold">{iterations}</span>
            </div>
            <input
              type="range"
              min="100"
              max="600"
              step="50"
              value={iterations}
              onChange={(e) => setIterations(parseInt(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 font-semibold">Rainfall Volatility</span>
              <span className="font-mono text-purple-400 font-bold">±{rainfallVol}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              step="5"
              value={rainfallVol}
              onChange={(e) => setRainfallVol(parseInt(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 font-semibold">Max Temp Anomaly</span>
              <span className="font-mono text-purple-400 font-bold">+{tempAnomaly}°C</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.1"
              value={tempAnomaly}
              onChange={(e) => setTempAnomaly(parseFloat(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 font-semibold">Market Price Volatility</span>
              <span className="font-mono text-purple-400 font-bold">±{priceVol}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="40"
              step="5"
              value={priceVol}
              onChange={(e) => setPriceVol(parseInt(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Results View */}
      {riskResult && (
        <div className="space-y-6">
          {/* Executive Risk Scorecards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="agri-card p-4 border-l-4 border-l-rose-500">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Loss Probability</span>
              <div className="text-xl font-extrabold text-rose-400 mt-1 font-mono">
                {riskResult.loss_probability_pct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                P(Net Profit &lt; ₹0)
              </div>
            </div>

            <div className="agri-card p-4 border-l-4 border-l-purple-500">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Value at Risk (95%)</span>
              <div className="text-xl font-extrabold text-white mt-1 font-mono">
                ₹{riskResult.value_at_risk_95_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Worst 5% tail outcome
              </div>
            </div>

            <div className="agri-card p-4 border-l-4 border-l-emerald-500">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Expected Mean Profit</span>
              <div className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">
                ₹{riskResult.mean_profit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                P10: ₹{(riskResult.p10_profit / 1000).toFixed(0)}k • P90: ₹{(riskResult.p90_profit / 1000).toFixed(0)}k
              </div>
            </div>

            <div className="agri-card p-4 border-l-4 border-l-amber-500">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Expected Mean Yield</span>
              <div className="text-xl font-extrabold text-amber-400 mt-1 font-mono">
                {riskResult.mean_yield.toFixed(1)} q/ac
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                P10: {riskResult.p10_yield.toFixed(1)} • P90: {riskResult.p90_yield.toFixed(1)} q/ac
              </div>
            </div>
          </div>

          {/* Risk Summary Ticker */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-slate-200">
            <span className="font-bold text-purple-400 mr-2">Risk Engine Diagnosis ({riskResult.risk_rating}):</span>
            <span>{riskResult.risk_executive_summary}</span>
          </div>

          {/* Profit Distribution Histogram */}
          <div className="agri-card p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
              Net Profit Probability Density Distribution ({iterations} Stochastic Iterations)
            </h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskResult.profit_distribution} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="bin_center"
                    stroke="#64748b"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(val) => `₹${Math.round(val / 1000)}k`}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 10 }}
                    label={{ value: 'Probability Frequency (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, 'Frequency']}
                    labelFormatter={(label) => `Profit Bin Center: ₹${Math.round(label).toLocaleString('en-IN')}`}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="frequency_pct" name="Probability (%)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
