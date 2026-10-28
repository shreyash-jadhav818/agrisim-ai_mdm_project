import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  Play,
  TrendingUp,
  Droplets,
  DollarSign,
  Wheat,
  CheckCircle,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { SimulationInput, OptimizationResult } from '../types';
import { executeOptimization } from '../services/api';

interface OptimizationViewProps {
  baseSimulation: SimulationInput;
  onApplyOptimizedSchedule?: (optimizedSim: any) => void;
}

export const OptimizationView: React.FC<OptimizationViewProps> = ({
  baseSimulation,
  onApplyOptimizedSchedule
}) => {
  const [objective, setObjective] = useState<string>('maximize_profit');
  const [maxWater, setMaxWater] = useState<number>(220);
  const [maxBudget, setMaxBudget] = useState<number>(28000);
  const [minYield, setMinYield] = useState<number>(18);
  const [loading, setLoading] = useState<boolean>(false);
  const [optResult, setOptResult] = useState<OptimizationResult | null>(null);

  const handleRunOptimizer = async () => {
    setLoading(true);
    try {
      const res = await executeOptimization(
        baseSimulation,
        objective,
        maxWater,
        maxBudget,
        minYield
      );
      setOptResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header Card */}
      <div className="agri-card p-5 space-y-5 border-l-4 border-l-teal-500">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-teal-400" />
              <span>Constrained Agricultural Strategy Optimizer</span>
            </h2>
            <p className="text-xs text-slate-400">
              Formulates non-linear mathematical optimization (SciPy SLSQP) to find the mathematical optimum
              for water and fertilizer efficiency under strict resource quotas.
            </p>
          </div>

          <button
            onClick={handleRunOptimizer}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-teal-950/40 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            <span>Run SciPy Optimization</span>
          </button>
        </div>

        {/* Objective Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            1. Select Primary Target Objective
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: 'maximize_profit', label: 'Maximize Net Profit', icon: DollarSign, desc: 'Optimize margin per acre' },
              { id: 'minimize_water', label: 'Minimize Irrigation Water', icon: Droplets, desc: 'Conserve maximum water' },
              { id: 'maximize_yield', label: 'Maximize Crop Yield', icon: Wheat, desc: 'Close genetic potential gap' },
              { id: 'minimize_cost', label: 'Minimize Cultivation Cost', icon: TrendingUp, desc: 'Budget-first approach' },
            ].map((obj) => {
              const isSelected = objective === obj.id;
              const Icon = obj.icon;
              return (
                <div
                  key={obj.id}
                  onClick={() => setObjective(obj.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-teal-500/15 border-teal-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-teal-400' : 'text-slate-500'}`} />
                  <div className="font-bold text-xs">{obj.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{obj.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Constraint Sliders */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            2. Define Farm Constraints & Policy Ceilings
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80">
            {/* Water Quota Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold">Max Water Quota</span>
                <span className="font-mono text-teal-400 font-bold">{maxWater} mm</span>
              </div>
              <input
                type="range"
                min="80"
                max="450"
                step="10"
                value={maxWater}
                onChange={(e) => setMaxWater(parseInt(e.target.value))}
                className="w-full accent-teal-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Upper limit on total seasonal irrigation applied
              </span>
            </div>

            {/* Budget Ceiling Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold">Budget Ceiling / Acre</span>
                <span className="font-mono text-teal-400 font-bold">₹{maxBudget.toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min="10000"
                max="45000"
                step="1000"
                value={maxBudget}
                onChange={(e) => setMaxBudget(parseInt(e.target.value))}
                className="w-full accent-teal-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Maximum allowable operational cost per acre
              </span>
            </div>

            {/* Minimum Target Yield */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold">Minimum Acceptable Yield</span>
                <span className="font-mono text-teal-400 font-bold">{minYield} q/ac</span>
              </div>
              <input
                type="range"
                min="8"
                max="30"
                step="1"
                value={minYield}
                onChange={(e) => setMinYield(parseInt(e.target.value))}
                className="w-full accent-teal-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Guaranteed production threshold
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Optimization Results */}
      {optResult && (
        <div className="space-y-6">
          {/* Key Improvements Scorecards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="agri-card p-4 border-l-4 border-l-emerald-500">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Net Profit Delta</span>
              <div className="text-lg font-extrabold text-emerald-400 mt-1">
                {optResult.improvements.profit_delta_pct >= 0 ? `+${optResult.improvements.profit_delta_pct}%` : `${optResult.improvements.profit_delta_pct}%`}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                ₹{optResult.optimized_metrics.net_profit_per_acre_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} / ac
              </div>
            </div>

            <div className="agri-card p-4 border-l-4 border-l-blue-500">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Water Saved</span>
              <div className="text-lg font-extrabold text-blue-400 mt-1">
                {optResult.improvements.water_saved_pct >= 0 ? `${optResult.improvements.water_saved_pct}%` : `${optResult.improvements.water_saved_pct}%`}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                {optResult.optimized_metrics.irrigation_water_mm.toFixed(0)} mm Total
              </div>
            </div>

            <div className="agri-card p-4 border-l-4 border-l-amber-500">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Optimized Yield</span>
              <div className="text-lg font-extrabold text-amber-400 mt-1">
                {optResult.optimized_metrics.yield_quintal_acre.toFixed(1)} q/ac
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                {optResult.improvements.yield_delta_pct >= 0 ? `+${optResult.improvements.yield_delta_pct}%` : `${optResult.improvements.yield_delta_pct}%`} vs Base
              </div>
            </div>

            <div className="agri-card p-4 border-l-4 border-l-teal-500">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Water Productivity</span>
              <div className="text-lg font-extrabold text-teal-400 mt-1">
                {optResult.optimized_metrics.water_productivity_kg_m3.toFixed(2)} kg/m³
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                +{optResult.improvements.water_productivity_delta_pct}% Gain
              </div>
            </div>
          </div>

          {/* Strategy Schedules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Optimal Irrigation Schedule */}
            <div className="agri-card p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-400" />
                <span>SciPy Optimal Irrigation Schedule</span>
              </h3>
              <div className="space-y-2">
                {optResult.optimal_schedule.map((evt, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                    <span className="font-semibold text-slate-200">Stage Day {evt.day}</span>
                    <span className="font-mono text-emerald-400 font-bold">{evt.amount_mm.toFixed(0)} mm</span>
                    <span className="text-[11px] text-slate-400 uppercase font-mono">{evt.method}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Optimal Nutrient Schedule */}
            <div className="agri-card p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Wheat className="w-4 h-4 text-amber-400" />
                <span>Optimal Fertilizer Regimes (Split Timing)</span>
              </h3>
              <div className="space-y-2">
                {optResult.optimal_fertilizer.map((fert, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-slate-200">
                      <span>{fert.fertilizer_name}</span>
                      <span className="text-slate-400 font-mono">Day {fert.day}</span>
                    </div>
                    <div className="flex gap-4 font-mono text-[11px]">
                      <span className="text-blue-400">N: {fert.n_kg_acre.toFixed(1)} kg/ac</span>
                      <span className="text-amber-400">P: {fert.p_kg_acre.toFixed(1)} kg/ac</span>
                      <span className="text-purple-400">K: {fert.k_kg_acre.toFixed(1)} kg/ac</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="agri-card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Agronomic Strategy Recommendations</span>
            </h3>
            <div className="space-y-2 text-xs text-slate-300">
              {optResult.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
