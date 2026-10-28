import React from 'react';
import {
  TrendingUp,
  Droplets,
  DollarSign,
  Gauge,
  Wheat,
  AlertTriangle,
  CheckCircle2,
  Leaf,
  Layers
} from 'lucide-react';
import { SimulationResult } from '../types';

interface ResultsOverviewProps {
  result: SimulationResult;
}

export const ResultsOverview: React.FC<ResultsOverviewProps> = ({ result }) => {
  const isProfitable = result.net_profit_inr >= 0;

  return (
    <div className="space-y-4">
      {/* 6 Key Performance Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Yield */}
        <div className="agri-card p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Estimated Yield</span>
            <Wheat className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-white">
            {result.yield_quintal_acre.toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-400">q/ac</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center justify-between font-mono">
            <span>{result.yield_kg_ha.toFixed(0)} kg/ha</span>
            <span className="text-slate-400">Gap: {result.yield_gap_pct.toFixed(0)}%</span>
          </div>
        </div>

        {/* 2. Net Operating Profit */}
        <div className={`agri-card p-4 border-l-4 ${isProfitable ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Net Profit (Farm)</span>
            <DollarSign className={`w-4 h-4 ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div className={`text-xl font-extrabold ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
            ₹{result.net_profit_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            ₹{result.profit_per_acre_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} / ac
          </div>
        </div>

        {/* 3. Return on Investment (ROI) */}
        <div className="agri-card p-4 border-l-4 border-l-teal-500">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Return on Cost</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl font-extrabold text-white">
            {result.return_on_investment_roi_pct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Rev: ₹{(result.gross_revenue_inr / 1000).toFixed(1)}k
          </div>
        </div>

        {/* 4. Water Consumed (ETa) */}
        <div className="agri-card p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Water Consumed</span>
            <Droplets className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-extrabold text-white">
            {result.total_water_consumed_mm.toFixed(0)}{' '}
            <span className="text-xs font-normal text-slate-400">mm ETa</span>
          </div>
          <div className="text-[11px] text-blue-400 mt-1 font-mono">
            {result.total_water_consumed_m3_acre.toFixed(0)} m³/ac
          </div>
        </div>

        {/* 5. Water Productivity */}
        <div className="agri-card p-4 border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Water Prod.</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-extrabold text-white">
            {result.water_productivity_kg_m3.toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-400">kg/m³</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Irrig: {result.total_irrigation_applied_mm.toFixed(0)} mm
          </div>
        </div>

        {/* 6. Total Cultivation Cost */}
        <div className="agri-card p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Cost</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-white">
            ₹{result.costs.total_cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-amber-400/90 mt-1 font-mono">
            Fert: ₹{(result.costs.fertilizer_cost / 1000).toFixed(1)}k
          </div>
        </div>
      </div>

      {/* Limiting Factors & Scientific Diagnostic Banner */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="flex-1 text-xs space-y-1">
          <div className="font-bold text-slate-200 flex items-center gap-2">
            <span>Agronomic Limiting Factors (Liebig's Law of the Minimum)</span>
            <span className="text-[10px] text-slate-400 font-normal">
              • Run: {result.run_id} ({result.crop_name})
            </span>
          </div>
          <div className="text-slate-300 space-y-0.5">
            {result.limiting_factors.map((factor, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-emerald-400">•</span>
                <span>{factor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
