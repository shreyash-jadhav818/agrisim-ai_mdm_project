import React, { useState } from 'react';
import {
  GitCompare,
  TrendingUp,
  Droplets,
  DollarSign,
  FlaskConical,
  Award,
  Filter,
  Check,
  Calendar,
  Sparkles,
  Info,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus
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
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { WhatIfSuiteResult, ScenarioDeltaMetrics, SimulationResult } from '../types';

interface ScenarioExplorerPageProps {
  whatIfSuite: WhatIfSuiteResult | null;
  currentResult: SimulationResult | null;
  onNavigate: (tab: string) => void;
}

export const ScenarioExplorerPage: React.FC<ScenarioExplorerPageProps> = ({
  whatIfSuite,
  currentResult,
  onNavigate
}) => {
  const [targetObjective, setTargetObjective] = useState<'yield' | 'profit' | 'water'>('yield');
  const [selectedScenarioCode, setSelectedScenarioCode] = useState<string>('A');

  if (!whatIfSuite) {
    return (
      <div className="agri-card p-10 text-center max-w-xl mx-auto my-12 space-y-4">
        <GitCompare className="w-12 h-12 text-emerald-400 mx-auto" />
        <h3 className="text-xl font-bold text-white">No Active Scenario Exploration</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Run a simulation in the New Simulation Wizard to generate and compare all 8 What-If agricultural scenarios.
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

  const allScenarios: ScenarioDeltaMetrics[] = [whatIfSuite.baseline, ...whatIfSuite.scenarios];
  const activeScenario = allScenarios.find((s) => s.scenario_code === selectedScenarioCode) || whatIfSuite.baseline;
  const baseline = whatIfSuite.baseline;

  // Best scenario identification based on objective
  let bestScenarioCode = 'A';
  if (targetObjective === 'yield') {
    bestScenarioCode = [...allScenarios].sort((a, b) => b.estimated_yield_kg_ha - a.estimated_yield_kg_ha)[0].scenario_code;
  } else if (targetObjective === 'profit') {
    const withProf = allScenarios.filter((s) => s.estimated_net_return_inr !== undefined);
    if (withProf.length > 0) {
      bestScenarioCode = [...withProf].sort((a, b) => (b.estimated_net_return_inr || 0) - (a.estimated_net_return_inr || 0))[0].scenario_code;
    }
  } else {
    // Water savings
    bestScenarioCode = [...allScenarios].sort((a, b) => a.irrigation_water_consumption_m3 - b.irrigation_water_consumption_m3)[0].scenario_code;
  }

  // Chart datasets
  // 1. Yield Comparison Data
  const yieldChartData = allScenarios.map((s) => ({
    name: `${s.scenario_code}: ${s.scenario_name.split(' ')[0]}`,
    fullName: s.scenario_name,
    yield_kg_ha: s.estimated_yield_kg_ha,
    isBaseline: s.scenario_code === 'A'
  }));

  // 2. Water Consumption Data
  const waterChartData = allScenarios.map((s) => ({
    name: `${s.scenario_code}: ${s.scenario_name.split(' ')[0]}`,
    fullName: s.scenario_name,
    water_m3: s.irrigation_water_consumption_m3,
    water_saved_m3: Math.max(0, s.water_savings_m3)
  }));

  // 3. Fertilizer Application Data (N, P, K)
  const fertilizerChartData = allScenarios.map((s) => ({
    name: s.scenario_code,
    fullName: s.scenario_name,
    N: s.n_applied_kg_ha,
    P: s.p_applied_kg_ha,
    K: s.k_applied_kg_ha
  }));

  // 4. Cost Comparison Data
  const costChartData = allScenarios.map((s) => ({
    name: s.scenario_code,
    fullName: s.scenario_name,
    cost_inr: s.modeled_cultivation_costs_inr || 0,
    net_return_inr: s.estimated_net_return_inr || 0
  }));

  // 5. Yield vs Water Trade-Off Scatter Data
  const scatterData = allScenarios.map((s) => ({
    name: s.scenario_name,
    water_m3: s.irrigation_water_consumption_m3,
    yield_kg_ha: s.estimated_yield_kg_ha,
    code: s.scenario_code
  }));

  // 6. Percentage Differences vs Baseline
  const deltaChartData = allScenarios.slice(1).map((s) => ({
    name: `${s.scenario_code}: ${s.scenario_name.split(' ')[0]}`,
    yield_delta: s.yield_delta_pct,
    water_delta: s.water_consumption_delta_pct,
    cost_delta: s.cost_delta_pct || 0
  }));

  return (
    <div className="space-y-6">
      {/* Objective Filter Banner */}
      <div className="agri-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              Optimization Objective Spotlight
            </h3>
            <p className="text-[11px] text-slate-400">
              Highlighting best scenario for: <strong className="text-emerald-300 capitalize">{targetObjective}</strong>
            </p>
          </div>
        </div>

        <div className="flex rounded-xl bg-[#07160d] p-1 border border-[#1b3d27] text-xs">
          <button
            onClick={() => setTargetObjective('yield')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              targetObjective === 'yield' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Max Yield
          </button>
          <button
            onClick={() => setTargetObjective('profit')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              targetObjective === 'profit' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Max Profit (₹)
          </button>
          <button
            onClick={() => setTargetObjective('water')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              targetObjective === 'water' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Lowest Water
          </button>
        </div>
      </div>

      {/* Scenario Selection Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
        {allScenarios.map((sc) => {
          const isSelected = selectedScenarioCode === sc.scenario_code;
          const isBest = sc.scenario_code === bestScenarioCode;

          return (
            <button
              key={sc.scenario_code}
              onClick={() => setSelectedScenarioCode(sc.scenario_code)}
              className={`px-3 py-2 rounded-xl border flex items-center gap-2 shrink-0 transition-all ${
                isSelected
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg'
                  : 'bg-[#091b10] border-[#183923] text-slate-300 hover:border-emerald-800'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                  isSelected ? 'bg-white text-emerald-800' : 'bg-[#153420] text-emerald-400'
                }`}
              >
                {sc.scenario_code}
              </span>
              <span className="font-semibold">{sc.scenario_name.split(' (')[0]}</span>
              {isBest && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-400 text-slate-950 uppercase">
                  Best
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary KPI Cards for Active Selected Scenario */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* KPI 1: Yield / ha */}
        <div className="agri-card p-3.5 space-y-1">
          <span className="text-[10px] text-slate-400 block">Yield / ha</span>
          <span className="text-base font-bold text-white block">
            {activeScenario.estimated_yield_kg_ha.toLocaleString()} kg
          </span>
          <span className="text-[10px] text-slate-400">
            {activeScenario.estimated_yield_quintal_acre.toFixed(1)} q/ac
          </span>
        </div>

        {/* KPI 2: Total Harvest */}
        <div className="agri-card p-3.5 space-y-1">
          <span className="text-[10px] text-slate-400 block">Total Harvest</span>
          <span className="text-base font-bold text-emerald-300 block">
            {activeScenario.estimated_total_harvest_tonnes.toFixed(2)} t
          </span>
          <span className="text-[10px] text-slate-400">
            {activeScenario.estimated_total_harvest_quintals.toFixed(1)} quintals
          </span>
        </div>

        {/* KPI 3: Water Consumed */}
        <div className="agri-card p-3.5 space-y-1">
          <span className="text-[10px] text-slate-400 block">Irrigation Water</span>
          <span className="text-base font-bold text-cyan-300 block">
            {activeScenario.irrigation_water_consumption_m3.toLocaleString()} m³
          </span>
          <span className="text-[10px] text-slate-400">
            Depth: {activeScenario.irrigation_depth_mm} mm
          </span>
        </div>

        {/* KPI 4: Water Delta vs Baseline */}
        <div className="agri-card p-3.5 space-y-1">
          <span className="text-[10px] text-slate-400 block">Water Savings</span>
          <span
            className={`text-base font-bold block ${
              activeScenario.water_savings_m3 > 0
                ? 'text-emerald-400'
                : activeScenario.water_savings_m3 < 0
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}
          >
            {activeScenario.water_savings_m3 > 0 ? `+${activeScenario.water_savings_m3.toLocaleString()} m³` : `${activeScenario.water_savings_m3.toLocaleString()} m³`}
          </span>
          <span className="text-[10px] text-slate-400">
            {activeScenario.water_consumption_delta_pct > 0 ? `+${activeScenario.water_consumption_delta_pct}%` : `${activeScenario.water_consumption_delta_pct}%`}
          </span>
        </div>

        {/* KPI 5: Fertilizer N-P-K */}
        <div className="agri-card p-3.5 space-y-1">
          <span className="text-[10px] text-slate-400 block">Nutrient (N-P-K)</span>
          <span className="text-sm font-bold text-emerald-400 block">
            {activeScenario.n_applied_kg_ha.toFixed(0)}-{activeScenario.p_applied_kg_ha.toFixed(0)}-{activeScenario.k_applied_kg_ha.toFixed(0)}
          </span>
          <span className="text-[10px] text-slate-400">
            N: {activeScenario.total_n_applied_kg.toFixed(0)} kg total
          </span>
        </div>

        {/* KPI 6: Modeled Cultivation Cost */}
        <div className="agri-card p-3.5 space-y-1">
          <span className="text-[10px] text-slate-400 block">Modeled Cost</span>
          <span className="text-base font-bold text-slate-200 block">
            {activeScenario.modeled_cultivation_costs_inr ? `₹${activeScenario.modeled_cultivation_costs_inr.toLocaleString()}` : 'N/A'}
          </span>
          <span className="text-[10px] text-slate-400">
            {activeScenario.is_partial_modeled_cost ? 'Partial modeled' : 'Full cost'}
          </span>
        </div>

        {/* KPI 7: Gross Revenue */}
        <div className="agri-card p-3.5 space-y-1">
          <span className="text-[10px] text-slate-400 block">Gross Revenue</span>
          <span className="text-base font-bold text-emerald-300 block">
            {activeScenario.estimated_revenue_inr ? `₹${activeScenario.estimated_revenue_inr.toLocaleString()}` : 'Not available'}
          </span>
          <span className="text-[10px] text-slate-400 truncate">
            {activeScenario.estimated_revenue_inr ? 'At user selling price' : 'Price missing'}
          </span>
        </div>

        {/* KPI 8: Net Return */}
        <div className="agri-card p-3.5 space-y-1">
          <span className="text-[10px] text-slate-400 block">Net Return</span>
          <span className="text-base font-bold text-amber-300 block">
            {activeScenario.estimated_net_return_inr ? `₹${activeScenario.estimated_net_return_inr.toLocaleString()}` : 'Not available'}
          </span>
          <span className="text-[10px] text-slate-400">
            {activeScenario.net_return_delta_pct !== null && activeScenario.net_return_delta_pct !== undefined
              ? `${activeScenario.net_return_delta_pct > 0 ? '+' : ''}${activeScenario.net_return_delta_pct.toFixed(1)}% vs A`
              : 'N/A'}
          </span>
        </div>
      </div>

      {/* 6 Recharts Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Chart A: Yield Comparison */}
        <div className="agri-card p-4 space-y-2">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            A. Yield Comparison (kg/ha)
          </h4>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yieldChartData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#163823" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#091b10', borderColor: '#1d442b', borderRadius: '10px' }}
                />
                <Bar dataKey="yield_kg_ha" fill="#10b981" radius={[4, 4, 0, 0]} name="Yield (kg/ha)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Water Consumption */}
        <div className="agri-card p-4 space-y-2">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Droplets className="w-4 h-4 text-cyan-400" />
            B. Water Consumption (m³)
          </h4>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterChartData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#163823" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#091b10', borderColor: '#1d442b', borderRadius: '10px' }}
                />
                <Bar dataKey="water_m3" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Water (m³)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart C: Fertilizer Application */}
        <div className="agri-card p-4 space-y-2">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4 text-emerald-400" />
            C. Fertilizer Nutrients (kg/ha)
          </h4>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fertilizerChartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#163823" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#091b10', borderColor: '#1d442b', borderRadius: '10px' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="N" fill="#10b981" name="N" />
                <Bar dataKey="P" fill="#f59e0b" name="P" />
                <Bar dataKey="K" fill="#8b5cf6" name="K" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart D: Cost Comparison */}
        <div className="agri-card p-4 space-y-2">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-amber-400" />
            D. Modeled Cultivation Costs (₹)
          </h4>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#163823" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#091b10', borderColor: '#1d442b', borderRadius: '10px' }}
                />
                <Bar dataKey="cost_inr" fill="#eab308" radius={[4, 4, 0, 0]} name="Modeled Cost (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart E: Yield vs Water Trade-Off */}
        <div className="agri-card p-4 space-y-2">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            E. Yield vs. Water Consumption Trade-Off
          </h4>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 15, left: -10, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#163823" />
                <XAxis
                  type="number"
                  dataKey="water_m3"
                  name="Water (m³)"
                  stroke="#64748b"
                  tick={{ fontSize: 9 }}
                  unit="m³"
                />
                <YAxis
                  type="number"
                  dataKey="yield_kg_ha"
                  name="Yield (kg/ha)"
                  stroke="#64748b"
                  tick={{ fontSize: 9 }}
                  unit="kg"
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#091b10', borderColor: '#1d442b', borderRadius: '10px', fontSize: '11px' }}
                />
                <Scatter name="Scenarios" data={scatterData} fill="#10b981" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart F: Differences vs Baseline */}
        <div className="agri-card p-4 space-y-2">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <GitCompare className="w-4 h-4 text-emerald-400" />
            F. Differences Relative to Baseline (%)
          </h4>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deltaChartData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#163823" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#091b10', borderColor: '#1d442b', borderRadius: '10px' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="yield_delta" fill="#10b981" name="Yield Δ %" />
                <Bar dataKey="water_delta" fill="#06b6d4" name="Water Δ %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Comprehensive Scenario Comparison Table */}
      <div className="agri-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#183a24] pb-3">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Complete What-If Scenario Matrix (Scenarios A through H)
            </h4>
            <p className="text-xs text-slate-400">
              Evaluated with identical baseline environmental constraints and model version: <strong>AgriSim-YieldEngine-v2.0</strong>
            </p>
          </div>

          <span className="text-xs font-semibold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800">
            Highlighted for: {targetObjective.toUpperCase()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#091b10] border-b border-[#1b3d27] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Scenario Name</th>
                <th className="py-2.5 px-3">Irrigation</th>
                <th className="py-2.5 px-3">Fertilizer</th>
                <th className="py-2.5 px-3">Yield (kg/ha)</th>
                <th className="py-2.5 px-3">Yield Δ</th>
                <th className="py-2.5 px-3">Water (m³)</th>
                <th className="py-2.5 px-3">Cost (₹)</th>
                <th className="py-2.5 px-3">Net Return (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#153420] text-slate-300">
              {allScenarios.map((sc) => {
                const isSelected = selectedScenarioCode === sc.scenario_code;
                const isBest = sc.scenario_code === bestScenarioCode;

                return (
                  <tr
                    key={sc.scenario_code}
                    onClick={() => setSelectedScenarioCode(sc.scenario_code)}
                    className={`cursor-pointer transition-colors ${
                      isBest
                        ? 'bg-amber-950/30 hover:bg-amber-950/50'
                        : isSelected
                        ? 'bg-emerald-950/40 hover:bg-emerald-950/60'
                        : 'hover:bg-[#0e2518]'
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-5 h-5 rounded flex items-center justify-center text-[10px] ${
                            isBest
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : isSelected
                              ? 'bg-emerald-500 text-white'
                              : 'bg-[#153420] text-slate-300'
                          }`}
                        >
                          {sc.scenario_code}
                        </span>
                        {isBest && <Award className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-white truncate max-w-[180px]">
                      {sc.scenario_name}
                    </td>
                    <td className="py-3 px-3 text-cyan-300 whitespace-nowrap">
                      {sc.irrigation_depth_mm} mm
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {sc.n_applied_kg_ha.toFixed(0)}-{sc.p_applied_kg_ha.toFixed(0)}-{sc.k_applied_kg_ha.toFixed(0)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">
                      {sc.estimated_yield_kg_ha.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-semibold whitespace-nowrap">
                      {sc.yield_delta_pct > 0 ? (
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          <ArrowUpRight className="w-3.5 h-3.5" /> +{sc.yield_delta_pct}%
                        </span>
                      ) : sc.yield_delta_pct < 0 ? (
                        <span className="text-rose-400 flex items-center gap-0.5">
                          <ArrowDownRight className="w-3.5 h-3.5" /> {sc.yield_delta_pct}%
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-0.5">
                          <Minus className="w-3.5 h-3.5" /> 0% (Base)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {sc.irrigation_water_consumption_m3.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {sc.modeled_cultivation_costs_inr ? `₹${sc.modeled_cultivation_costs_inr.toLocaleString()}` : 'N/A'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-amber-300 whitespace-nowrap">
                      {sc.estimated_net_return_inr ? `₹${sc.estimated_net_return_inr.toLocaleString()}` : 'Not available'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agronomic Synthesis Insights */}
      {whatIfSuite.agronomic_synthesis && whatIfSuite.agronomic_synthesis.length > 0 && (
        <div className="agri-card p-5 space-y-3 bg-[#0a1f13] border-[#1d442b]">
          <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Synthesized Agronomic Findings
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-200">
            {whatIfSuite.agronomic_synthesis.map((syn, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{syn}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
