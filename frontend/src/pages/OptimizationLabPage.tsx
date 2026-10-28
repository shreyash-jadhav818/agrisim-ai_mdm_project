import React, { useState } from 'react';
import {
  Sliders,
  Award,
  TrendingUp,
  Droplets,
  DollarSign,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  GitBranch,
  Target,
  Info,
  Maximize2
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import {
  FarmProfile,
  ModularFarmInput,
  GridOptimizationResult,
  ParetoOptimizationResult,
  ParetoStrategyPoint
} from '../types';
import { executeGridOptimization, executeParetoOptimization } from '../services/api';

interface OptimizationLabPageProps {
  farm: FarmProfile;
  selectedCropId: string;
  onApplyStrategy: (strategy: { irrigation_depth_mm: number; n_kg_ha: number; sowing_date: string }) => void;
}

export const OptimizationLabPage: React.FC<OptimizationLabPageProps> = ({
  farm,
  selectedCropId,
  onApplyStrategy
}) => {
  // Optimization mode: Single-Objective Grid Search vs Multi-Objective Pareto Frontier
  const [activeTab, setActiveTab] = useState<'grid' | 'pareto'>('grid');

  // Single-objective Grid Search state
  const [objective, setObjective] = useState<'estimated_yield' | 'estimated_net_return' | 'lower_water'>('estimated_yield');
  const [maxWaterM3, setMaxWaterM3] = useState<number | undefined>(undefined);
  const [maxBudgetInr, setMaxBudgetInr] = useState<number | undefined>(undefined);
  const [minYieldKgHa, setMinYieldKgHa] = useState<number | undefined>(undefined);
  const [gridLoading, setGridLoading] = useState<boolean>(false);
  const [gridResult, setGridResult] = useState<GridOptimizationResult | null>(null);
  const [gridError, setGridError] = useState<string | null>(null);

  // Multi-objective Pareto state
  const [paretoLoading, setParetoLoading] = useState<boolean>(false);
  const [paretoResult, setParetoResult] = useState<ParetoOptimizationResult | null>(null);
  const [paretoError, setParetoError] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<ParetoStrategyPoint | null>(null);
  const [paretoXAxis, setParetoXAxis] = useState<'water' | 'fertilizer' | 'cost'>('water');
  const [paretoYAxis, setParetoYAxis] = useState<'yield' | 'profit' | 'water_prod'>('yield');

  const getBaselinePayload = (): ModularFarmInput => ({
    crop_type: selectedCropId,
    farm_area: farm.total_acres,
    farm_area_unit: 'acres',
    soil_type: farm.soil_type,
    irrigation_method: farm.irrigation_system,
    sowing_date: '2026-11-15',
    nitrogen_kg_ha: 140.0,
    phosphorus_kg_ha: 60.0,
    potassium_kg_ha: 40.0,
    irrigation_depth_mm: 360.0,
    crop_selling_price_per_quintal: 2275.0,
    mulching_used: false
  });

  const handleRunGridOptimizer = async () => {
    setGridLoading(true);
    setGridError(null);
    try {
      const optRes = await executeGridOptimization(
        getBaselinePayload(),
        objective,
        maxWaterM3,
        maxBudgetInr,
        minYieldKgHa
      );
      setGridResult(optRes);
    } catch (e: any) {
      console.error('Grid optimization error:', e);
      setGridError(e.message || 'Grid optimization failed');
    } finally {
      setGridLoading(false);
    }
  };

  const handleRunParetoOptimizer = async () => {
    setParetoLoading(true);
    setParetoError(null);
    try {
      const res = await executeParetoOptimization({
        baseline_input: getBaselinePayload(),
        max_water_m3: maxWaterM3,
        max_budget_inr: maxBudgetInr,
        min_yield_kg_ha: minYieldKgHa
      });
      setParetoResult(res);
      if (res.balanced_strategy) {
        setSelectedPoint(res.balanced_strategy);
      } else if (res.pareto_frontier.length > 0) {
        setSelectedPoint(res.pareto_frontier[0]);
      }
    } catch (e: any) {
      console.error('Pareto optimization error:', e);
      setParetoError(e.message || 'Multi-objective Pareto optimization failed');
    } finally {
      setParetoLoading(false);
    }
  };

  // Prepare data for ScatterChart
  const getScatterDataPoint = (p: ParetoStrategyPoint) => {
    let xVal = p.irrigation_water_m3;
    if (paretoXAxis === 'fertilizer') xVal = p.total_fertilizer_applied_kg;
    if (paretoXAxis === 'cost') xVal = p.modeled_cost_inr || 0;

    let yVal = p.predicted_yield_kg_ha;
    if (paretoYAxis === 'profit') yVal = p.estimated_net_profit_inr || 0;
    if (paretoYAxis === 'water_prod') yVal = p.water_productivity_kg_m3;

    return {
      x: Math.round(xVal),
      y: Math.round(yVal),
      point: p
    };
  };

  const getAxisLabels = () => {
    let xLabel = 'Irrigation Water (m³)';
    if (paretoXAxis === 'fertilizer') xLabel = 'Total Fertilizer Applied (kg)';
    if (paretoXAxis === 'cost') xLabel = 'Modeled Cultivation Cost (₹)';

    let yLabel = 'Predicted Yield (kg/ha)';
    if (paretoYAxis === 'profit') yLabel = 'Estimated Net Profit (₹)';
    if (paretoYAxis === 'water_prod') yLabel = 'Water Productivity (kg/m³)';

    return { xLabel, yLabel };
  };

  const { xLabel, yLabel } = getAxisLabels();

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex border-b border-[#183923] pb-1 gap-2">
        <button
          onClick={() => setActiveTab('grid')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'grid'
              ? 'bg-emerald-950/90 border border-emerald-500 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-[#0c2416]'
          }`}
        >
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>Single-Objective Grid Search</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('pareto');
            if (!paretoResult && !paretoLoading) {
              handleRunParetoOptimizer();
            }
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'pareto'
              ? 'bg-emerald-950/90 border border-emerald-500 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-[#0c2416]'
          }`}
        >
          <GitBranch className="w-4 h-4 text-cyan-400" />
          <span>Multi-Objective Pareto Frontier</span>
          <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-800">
            Advanced
          </span>
        </button>
      </div>

      {/* Constraints Bar (Shared between Grid & Pareto) */}
      <div className="agri-card p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-emerald-400" />
            Operational Quotas & Feasibility Constraints [Optional]
          </span>
          <span className="text-[11px] text-slate-400">Crop: {selectedCropId.toUpperCase()} • Farm: {farm.total_acres} Acres</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Max Water Quota (m³)</label>
            <input
              type="number"
              step="200"
              min="0"
              value={maxWaterM3 || ''}
              onChange={(e) => setMaxWaterM3(e.target.value ? parseFloat(e.target.value) : undefined)}
              className="agri-input text-xs"
              placeholder="e.g. 5000 (quota limit)"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Max Budget Ceiling (₹)</label>
            <input
              type="number"
              step="1000"
              min="0"
              value={maxBudgetInr || ''}
              onChange={(e) => setMaxBudgetInr(e.target.value ? parseFloat(e.target.value) : undefined)}
              className="agri-input text-xs"
              placeholder="e.g. 25000 (cost ceiling)"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Minimum Harvest Floor (kg/ha)</label>
            <input
              type="number"
              step="100"
              min="0"
              value={minYieldKgHa || ''}
              onChange={(e) => setMinYieldKgHa(e.target.value ? parseFloat(e.target.value) : undefined)}
              className="agri-input text-xs"
              placeholder="e.g. 2000 (yield threshold)"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: SINGLE-OBJECTIVE GRID SEARCH */}
      {activeTab === 'grid' && (
        <div className="space-y-6">
          <div className="agri-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#183a24] pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-400" />
                  Target-Driven Constrained Grid Search
                </h3>
                <p className="text-xs text-slate-400">
                  Searches discrete combinations of irrigation depth, N-P-K mineral applications, and sowing dates
                </p>
              </div>
              <button
                onClick={handleRunGridOptimizer}
                disabled={gridLoading}
                className="agri-btn-primary px-6 py-2.5 self-start sm:self-auto"
              >
                {gridLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Evaluating Grid...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Execute Search</span>
                  </>
                )}
              </button>
            </div>

            {/* Objective Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Choose Primary Objective Function</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'estimated_yield',
                    title: 'Maximize Crop Yield',
                    desc: 'Maximizes harvest biomass (kg/ha) while preventing aeration & lodging penalties.',
                    icon: TrendingUp,
                    color: 'text-emerald-400'
                  },
                  {
                    id: 'estimated_net_return',
                    title: 'Maximize Net Return (₹)',
                    desc: 'Maximizes farmer profit margins balancing market revenue against input tariffs.',
                    icon: DollarSign,
                    color: 'text-amber-400'
                  },
                  {
                    id: 'lower_water',
                    title: 'Lower Water Consumption',
                    desc: 'Minimizes irrigation water volume (m³) subject to a minimum harvest threshold.',
                    icon: Droplets,
                    color: 'text-cyan-400'
                  }
                ].map((obj) => {
                  const Icon = obj.icon;
                  const isSelected = objective === obj.id;
                  return (
                    <button
                      key={obj.id}
                      type="button"
                      onClick={() => setObjective(obj.id as any)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-950/90 border-emerald-500 text-white shadow-xl ring-1 ring-emerald-500'
                          : 'bg-[#08170e] border-[#183923] text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className={`w-4 h-4 ${obj.color}`} />
                        <span className="font-bold text-xs text-white">{obj.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{obj.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {gridError && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{gridError}</span>
              </div>
            )}
          </div>

          {/* Grid Optimization Results */}
          {gridResult && (
            <div className="space-y-6">
              {/* Outcome Banner */}
              <div
                className={`p-5 rounded-2xl border flex items-start gap-3.5 ${
                  gridResult.success
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                    : 'bg-amber-950/60 border-amber-800 text-amber-200'
                }`}
              >
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="text-sm font-bold text-white">
                    {gridResult.success ? 'Optimal Strategy Identified' : 'Feasibility Warning'}
                  </h4>
                  <p className="leading-relaxed text-slate-300">{gridResult.status_message}</p>
                  <p className="text-[11px] text-slate-400">
                    Evaluated {gridResult.total_candidates_evaluated} discrete candidate parameter combinations ({gridResult.feasible_candidates_count} feasible).
                  </p>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="agri-card p-4 space-y-2">
                  <span className="text-slate-400 text-[11px] block">Estimated Harvest Yield</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">
                      {gridResult.optimal_metrics.yield_kg_ha.toLocaleString()}
                    </span>
                    <span className="text-slate-400 text-xs">kg/ha</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Base: {gridResult.baseline_metrics.yield_kg_ha.toLocaleString()}</span>
                    <span className="text-emerald-400 font-bold">
                      {gridResult.improvements.yield_delta_pct > 0 ? '+' : ''}{gridResult.improvements.yield_delta_pct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="agri-card p-4 space-y-2">
                  <span className="text-slate-400 text-[11px] block">Irrigation Water Consumption</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-cyan-300">
                      {gridResult.optimal_metrics.water_m3.toLocaleString()}
                    </span>
                    <span className="text-slate-400 text-xs">m³</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Base: {gridResult.baseline_metrics.water_m3.toLocaleString()} m³</span>
                    <span className="text-cyan-400 font-bold">
                      {gridResult.improvements.water_saved_pct.toFixed(1)}% saved
                    </span>
                  </div>
                </div>

                <div className="agri-card p-4 space-y-2">
                  <span className="text-slate-400 text-[11px] block">Modeled Cultivation Cost</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-200">
                      {gridResult.optimal_metrics.cost_inr ? `₹${gridResult.optimal_metrics.cost_inr.toLocaleString()}` : 'N/A'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Base: {gridResult.baseline_metrics.cost_inr ? `₹${gridResult.baseline_metrics.cost_inr.toLocaleString()}` : 'N/A'}
                  </div>
                </div>

                <div className="agri-card p-4 space-y-2">
                  <span className="text-slate-400 text-[11px] block">Estimated Net Profit</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-amber-300">
                      {gridResult.optimal_metrics.net_return_inr ? `₹${gridResult.optimal_metrics.net_return_inr.toLocaleString()}` : 'Not available'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Base: {gridResult.baseline_metrics.net_return_inr ? `₹${gridResult.baseline_metrics.net_return_inr.toLocaleString()}` : 'N/A'}</span>
                    {gridResult.improvements.net_return_delta_pct !== 0 && (
                      <span className="text-amber-400 font-bold">
                        {gridResult.improvements.net_return_delta_pct > 0 ? '+' : ''}{gridResult.improvements.net_return_delta_pct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Recommended Regimen Card */}
              <div className="agri-card p-5 space-y-4 bg-gradient-to-br from-[#0c2617] to-[#07170e] border-[#1d492c]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#183a24] pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-400" />
                      Recommended Operational Regimen
                    </h4>
                    <p className="text-xs text-slate-400">Optimal parameters identified for {objective.replace('_', ' ')}</p>
                  </div>

                  <button
                    onClick={() =>
                      onApplyStrategy({
                        irrigation_depth_mm: gridResult.recommended_parameters.irrigation_depth_mm,
                        n_kg_ha: gridResult.recommended_parameters.nitrogen_kg_ha,
                        sowing_date: gridResult.recommended_parameters.sowing_date
                      })
                    }
                    className="agri-btn-primary py-2 px-4 text-xs"
                  >
                    <span>Apply Strategy to Simulation Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#07160d] border border-[#183a24]">
                    <span className="text-slate-500 block text-[10px]">Recommended Irrigation</span>
                    <span className="text-sm font-bold text-cyan-300">
                      {gridResult.recommended_parameters.irrigation_depth_mm} mm
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      ({(gridResult.recommended_parameters.irrigation_multiplier * 100).toFixed(0)}% benchmark)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#07160d] border border-[#183a24]">
                    <span className="text-slate-500 block text-[10px]">Optimal Nitrogen (N)</span>
                    <span className="text-sm font-bold text-emerald-300">
                      {gridResult.recommended_parameters.nitrogen_kg_ha} kg/ha
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Curbed below lodging risk</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#07160d] border border-[#183a24]">
                    <span className="text-slate-500 block text-[10px]">P & K Dose</span>
                    <span className="text-sm font-bold text-white">
                      {gridResult.recommended_parameters.phosphorus_kg_ha} P₂O₅ - {gridResult.recommended_parameters.potassium_kg_ha} K₂O
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Balanced dose</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#07160d] border border-[#183a24]">
                    <span className="text-slate-500 block text-[10px]">Recommended Sowing</span>
                    <span className="text-sm font-bold text-amber-300">
                      {gridResult.recommended_parameters.sowing_date}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Optimal thermal window</span>
                  </div>
                </div>

                {/* Agronomic Recommendations */}
                {gridResult.agronomic_recommendations.length > 0 && (
                  <div className="pt-2 border-t border-[#163821] space-y-1.5 text-xs text-slate-200">
                    <span className="font-semibold text-emerald-300 block text-[11px] uppercase tracking-wider">
                      Agronomic Advisory & Explanation:
                    </span>
                    {gridResult.agronomic_recommendations.map((rec, i) => (
                      <p key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400">•</span>
                        <span>{rec}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MULTI-OBJECTIVE PARETO FRONTIER */}
      {activeTab === 'pareto' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="agri-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#183a24] pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-cyan-400" />
                  Multi-Objective Pareto Frontier & Non-Dominated Sorting
                </h3>
                <p className="text-xs text-slate-400">
                  Evaluates fundamental trade-offs: Yield (max), Net Profit (max), Irrigation Water (min), and Fertilizer (min).
                </p>
              </div>

              <button
                onClick={handleRunParetoOptimizer}
                disabled={paretoLoading}
                className="agri-btn-primary px-6 py-2.5 self-start sm:self-auto"
              >
                {paretoLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sorting Non-Dominated Frontier...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Recalculate Pareto Frontier</span>
                  </>
                )}
              </button>
            </div>

            {/* Methodology Disclosure Alert */}
            <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Pareto Dominance Principle:</span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  A farming strategy is <strong>Pareto-Optimal</strong> if no other feasible candidate is strictly superior in at least one objective
                  without worsening another. Points on the frontier represent the most efficient operational compromises achievable.
                </p>
              </div>
            </div>

            {paretoError && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{paretoError}</span>
              </div>
            )}
          </div>

          {/* Pareto Visualizer & Strategy Inspection */}
          {paretoResult && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="agri-card p-4">
                  <span className="text-slate-400 text-[11px] block">Total Evaluated</span>
                  <span className="text-2xl font-black text-white">{paretoResult.total_evaluated}</span>
                  <span className="text-[10px] text-slate-500 block">Discrete permutations</span>
                </div>
                <div className="agri-card p-4">
                  <span className="text-slate-400 text-[11px] block">Feasible Candidates</span>
                  <span className="text-2xl font-black text-emerald-400">{paretoResult.feasible_count}</span>
                  <span className="text-[10px] text-slate-500 block">Respecting water/cost limits</span>
                </div>
                <div className="agri-card p-4">
                  <span className="text-slate-400 text-[11px] block">Pareto Frontier Count</span>
                  <span className="text-2xl font-black text-cyan-400">{paretoResult.pareto_frontier_count}</span>
                  <span className="text-[10px] text-slate-500 block">Non-dominated strategies</span>
                </div>
                <div className="agri-card p-4">
                  <span className="text-slate-400 text-[11px] block">Balanced Compromise</span>
                  <span className="text-base font-bold text-amber-300 truncate block mt-1">
                    {paretoResult.balanced_strategy ? paretoResult.balanced_strategy.strategy_name.split('(')[0] : 'Identified'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Min Utopia distance</span>
                </div>
              </div>

              {/* Interactive Scatter Plot */}
              <div className="agri-card p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#183923] pb-4">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Maximize2 className="w-4 h-4 text-emerald-400" />
                      Interactive Pareto Frontier Trade-Off Space
                    </h4>
                    <p className="text-xs text-slate-400">
                      Click any point to inspect detailed strategy inputs and biophysical outcomes
                    </p>
                  </div>

                  {/* Axis Selectors */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">X-Axis:</span>
                      <select
                        value={paretoXAxis}
                        onChange={(e) => setParetoXAxis(e.target.value as any)}
                        className="bg-[#091a10] border border-[#1d492c] rounded-lg px-2.5 py-1 text-slate-200"
                      >
                        <option value="water">Irrigation Water (m³)</option>
                        <option value="fertilizer">Total Fertilizer (kg)</option>
                        <option value="cost">Cultivation Cost (₹)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Y-Axis:</span>
                      <select
                        value={paretoYAxis}
                        onChange={(e) => setParetoYAxis(e.target.value as any)}
                        className="bg-[#091a10] border border-[#1d492c] rounded-lg px-2.5 py-1 text-slate-200"
                      >
                        <option value="yield">Predicted Yield (kg/ha)</option>
                        <option value="profit">Net Profit (₹)</option>
                        <option value="water_prod">Water Productivity (kg/m³)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Legend bar */}
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block shadow-sm shadow-emerald-400/50" />
                    <span className="text-slate-200">Pareto Optimal (Non-dominated)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-white inline-block ring-2 ring-amber-400/50" />
                    <span className="text-amber-200 font-bold">Balanced Strategy Compromise</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-cyan-400 inline-block" />
                    <span className="text-cyan-200">Baseline Strategy</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block opacity-40" />
                    <span>Feasible Background Candidate</span>
                  </div>
                </div>

                <div className="h-80 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#163922" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name={xLabel}
                        unit=""
                        stroke="#64748b"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        label={{ value: xLabel, position: 'bottom', offset: 5, fill: '#94a3b8', fontSize: 11 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name={yLabel}
                        unit=""
                        stroke="#64748b"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        label={{ value: yLabel, angle: -90, position: 'left', offset: 5, fill: '#94a3b8', fontSize: 11 }}
                      />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const pt: ParetoStrategyPoint = data.point;
                            return (
                              <div className="bg-[#06170d] border border-emerald-700/60 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 max-w-xs">
                                <div className="font-bold text-white flex items-center justify-between border-b border-[#183923] pb-1">
                                  <span>{pt.strategy_name}</span>
                                  {pt.is_balanced_option && (
                                    <span className="text-[9px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700">
                                      Balanced
                                    </span>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-300">
                                  <span>Yield: <strong className="text-white">{pt.predicted_yield_kg_ha.toLocaleString()} kg/ha</strong></span>
                                  <span>Water: <strong className="text-cyan-300">{pt.irrigation_water_m3.toLocaleString()} m³</strong></span>
                                  <span>Fertilizer: <strong>{pt.total_fertilizer_applied_kg.toFixed(0)} kg</strong></span>
                                  <span>Profit: <strong className="text-amber-300">{pt.estimated_net_profit_inr ? `₹${pt.estimated_net_profit_inr.toLocaleString()}` : 'N/A'}</strong></span>
                                  <span>Sowing: <strong>{pt.sowing_date}</strong></span>
                                  <span>Irrigation: <strong>{pt.irrigation_depth_mm} mm</strong></span>
                                </div>
                                <p className="text-[10px] text-emerald-400 italic pt-1">
                                  {pt.is_pareto_optimal ? '★ Pareto Optimal Strategy' : 'Feasible candidate'}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />

                      {/* Feasible background points */}
                      <Scatter
                        name="Feasible Candidates"
                        data={paretoResult.all_candidates
                          .filter((c) => !c.is_pareto_optimal && !c.is_balanced_option)
                          .map(getScatterDataPoint)}
                        fill="#475569"
                        opacity={0.35}
                        onClick={(entry) => setSelectedPoint(entry.point)}
                      />

                      {/* Pareto Frontier Points */}
                      <Scatter
                        name="Pareto Frontier"
                        data={paretoResult.pareto_frontier.map(getScatterDataPoint)}
                        fill="#10b981"
                        shape="circle"
                        onClick={(entry) => setSelectedPoint(entry.point)}
                      >
                        {paretoResult.pareto_frontier.map((entry, index) => {
                          const isSelected = selectedPoint && selectedPoint.strategy_id === entry.strategy_id;
                          if (entry.is_balanced_option) {
                            return <Cell key={`cell-${index}`} fill="#f59e0b" stroke="#ffffff" strokeWidth={2} r={8} />;
                          }
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={isSelected ? '#38bdf8' : '#10b981'}
                              stroke={isSelected ? '#ffffff' : '#047857'}
                              strokeWidth={isSelected ? 2 : 1}
                              r={isSelected ? 7 : 5}
                            />
                          );
                        })}
                      </Scatter>

                      {/* Baseline Point */}
                      <Scatter
                        name="Baseline Strategy"
                        data={[getScatterDataPoint(paretoResult.baseline_strategy)]}
                        fill="#38bdf8"
                        shape="diamond"
                        onClick={(entry) => setSelectedPoint(entry.point)}
                      >
                        <Cell fill="#38bdf8" stroke="#ffffff" strokeWidth={2} r={8} />
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Selected Strategy Inspector Panel */}
              {selectedPoint && (
                <div className="agri-card p-5 space-y-4 border border-[#245b37] bg-gradient-to-br from-[#0c2617] to-[#07170e]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#183a24] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{selectedPoint.strategy_name}</h4>
                        {selectedPoint.is_balanced_option && (
                          <span className="text-[10px] bg-amber-950 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-800">
                            ★ Balanced Multi-Criteria Compromise
                          </span>
                        )}
                        {selectedPoint.is_pareto_optimal && !selectedPoint.is_balanced_option && (
                          <span className="text-[10px] bg-emerald-950 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-800">
                            Pareto Frontier Member
                          </span>
                        )}
                        {selectedPoint.strategy_id === 'strat_baseline' && (
                          <span className="text-[10px] bg-cyan-950 text-cyan-300 font-bold px-2 py-0.5 rounded-full border border-cyan-800">
                            Current Baseline Plan
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {selectedPoint.trade_off_notes.length > 0
                          ? selectedPoint.trade_off_notes[0]
                          : 'Non-dominated candidate evaluated across the biophysical simulation engine.'}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        onApplyStrategy({
                          irrigation_depth_mm: selectedPoint.irrigation_depth_mm,
                          n_kg_ha: selectedPoint.nitrogen_kg_ha,
                          sowing_date: selectedPoint.sowing_date
                        })
                      }
                      className="agri-btn-primary py-2 px-4 text-xs"
                    >
                      <span>Adopt This Regimen</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Parameter & Outcome Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#07160d] border border-[#183a24]">
                      <span className="text-slate-500 block text-[10px]">Predicted Yield</span>
                      <span className="text-sm font-bold text-white">
                        {selectedPoint.predicted_yield_kg_ha.toLocaleString()} kg/ha
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        ({selectedPoint.predicted_yield_q_acre.toFixed(1)} q/acre)
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#07160d] border border-[#183a24]">
                      <span className="text-slate-500 block text-[10px]">Water Consumption</span>
                      <span className="text-sm font-bold text-cyan-300">
                        {selectedPoint.irrigation_water_m3.toLocaleString()} m³
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        ({selectedPoint.irrigation_depth_mm} mm depth)
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#07160d] border border-[#183a24]">
                      <span className="text-slate-500 block text-[10px]">Total Fertilizer</span>
                      <span className="text-sm font-bold text-emerald-300">
                        {selectedPoint.total_fertilizer_applied_kg.toFixed(0)} kg
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        ({selectedPoint.nitrogen_kg_ha} N - {selectedPoint.phosphorus_kg_ha} P - {selectedPoint.potassium_kg_ha} K)
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#07160d] border border-[#183a24]">
                      <span className="text-slate-500 block text-[10px]">Cultivation Cost</span>
                      <span className="text-sm font-bold text-slate-200">
                        {selectedPoint.modeled_cost_inr ? `₹${selectedPoint.modeled_cost_inr.toLocaleString()}` : 'N/A'}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">INR modeled</span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#07160d] border border-[#183a24]">
                      <span className="text-slate-500 block text-[10px]">Estimated Net Profit</span>
                      <span className="text-sm font-bold text-amber-300">
                        {selectedPoint.estimated_net_profit_inr ? `₹${selectedPoint.estimated_net_profit_inr.toLocaleString()}` : 'N/A'}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">After input costs</span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#07160d] border border-[#183a24]">
                      <span className="text-slate-500 block text-[10px]">Water Productivity</span>
                      <span className="text-sm font-bold text-cyan-200">
                        {selectedPoint.water_productivity_kg_m3.toFixed(2)} kg/m³
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Crop per drop</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Trade-off Insights Summary */}
              {paretoResult.trade_off_summary.length > 0 && (
                <div className="agri-card p-5 space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Pareto Frontier Trade-Off Insights
                  </h4>
                  <div className="space-y-2 text-xs text-slate-300">
                    {paretoResult.trade_off_summary.map((insight, idx) => (
                      <p key={idx} className="flex items-start gap-2 bg-[#08180f] p-3 rounded-xl border border-[#183a24]">
                        <span className="text-emerald-400 font-bold shrink-0">•</span>
                        <span>{insight}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete Pareto Frontier Table */}
              <div className="agri-card p-5 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Non-Dominated Pareto Optimal Strategies ({paretoResult.pareto_frontier.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#091b10] border-b border-[#1b3d27] text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Strategy</th>
                        <th className="py-2.5 px-3">Irrigation</th>
                        <th className="py-2.5 px-3">Nitrogen</th>
                        <th className="py-2.5 px-3">Sowing</th>
                        <th className="py-2.5 px-3">Yield (kg/ha)</th>
                        <th className="py-2.5 px-3">Water (m³)</th>
                        <th className="py-2.5 px-3">Total Fert (kg)</th>
                        <th className="py-2.5 px-3">Net Profit</th>
                        <th className="py-2.5 px-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#153420] text-slate-300">
                      {paretoResult.pareto_frontier.map((pt, i) => {
                        const isSelected = selectedPoint && selectedPoint.strategy_id === pt.strategy_id;
                        return (
                          <tr
                            key={pt.strategy_id}
                            onClick={() => setSelectedPoint(pt)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-[#0f2e1a] font-semibold text-white' : 'hover:bg-[#0c2214]'
                            }`}
                          >
                            <td className="py-2.5 px-3 flex items-center gap-2">
                              {pt.is_balanced_option && (
                                <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700">
                                  Balanced
                                </span>
                              )}
                              <span>#{i + 1} {pt.strategy_name}</span>
                            </td>
                            <td className="py-2.5 px-3 text-cyan-300">{pt.irrigation_depth_mm} mm</td>
                            <td className="py-2.5 px-3 text-emerald-300">{pt.nitrogen_kg_ha} kg</td>
                            <td className="py-2.5 px-3">{pt.sowing_date}</td>
                            <td className="py-2.5 px-3 font-bold text-white">{pt.predicted_yield_kg_ha.toLocaleString()}</td>
                            <td className="py-2.5 px-3">{pt.irrigation_water_m3.toLocaleString()} m³</td>
                            <td className="py-2.5 px-3">{pt.total_fertilizer_applied_kg.toFixed(0)} kg</td>
                            <td className="py-2.5 px-3 text-amber-300 font-medium">
                              {pt.estimated_net_profit_inr ? `₹${pt.estimated_net_profit_inr.toLocaleString()}` : 'N/A'}
                            </td>
                            <td className="py-2.5 px-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onApplyStrategy({
                                    irrigation_depth_mm: pt.irrigation_depth_mm,
                                    n_kg_ha: pt.nitrogen_kg_ha,
                                    sowing_date: pt.sowing_date
                                  });
                                }}
                                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold underline"
                              >
                                Apply
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
