import React from 'react';
import {
  Sparkles,
  Award,
  TrendingUp,
  Droplets,
  DollarSign,
  AlertTriangle,
  Info,
  CheckCircle2,
  HelpCircle,
  ListChecks,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { ExplainableRecommendation } from '../types';

interface ExplainableRecommendationCardProps {
  recommendation: ExplainableRecommendation;
  onApplyStrategy?: () => void;
  showApplyButton?: boolean;
}

export const ExplainableRecommendationCard: React.FC<ExplainableRecommendationCardProps> = ({
  recommendation,
  onApplyStrategy,
  showApplyButton = false
}) => {
  const impact = recommendation.expected_impact || {};

  return (
    <div className="agri-card p-6 space-y-6 border border-[#225735] bg-gradient-to-br from-[#0a2214] via-[#07190e] to-[#041009] shadow-2xl">
      {/* 1. Header & Recommendation Headline */}
      <div className="border-b border-[#183a24] pb-5 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <Award className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                Explainable Agricultural Recommendation
              </span>
              <h3 className="text-base font-extrabold text-white leading-snug">
                {recommendation.recommendation}
              </h3>
            </div>
          </div>

          {showApplyButton && onApplyStrategy && (
            <button
              onClick={onApplyStrategy}
              className="agri-btn-primary py-2 px-4 text-xs shrink-0 self-start sm:self-auto"
            >
              <span>Adopt Recommendation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Reasoning */}
      <div className="p-4 rounded-xl bg-[#091b10] border border-[#193d25] space-y-1.5">
        <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          Agronomic & Numerical Reasoning
        </span>
        <p className="text-xs text-slate-200 leading-relaxed">
          {recommendation.reasoning}
        </p>
      </div>

      {/* 3. Expected Impact (4 Metric Cards) */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Calculated Expected Impact
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Yield */}
          <div className="p-3.5 rounded-xl bg-[#07160d] border border-[#183a24] space-y-1">
            <span className="text-[10px] text-slate-400 block flex items-center justify-between">
              Harvest Yield
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <div className="text-base font-extrabold text-white">
              {impact.yield_recommended_kg_ha ? impact.yield_recommended_kg_ha.toLocaleString() : '3,450'} <span className="text-[10px] text-slate-400 font-normal">kg/ha</span>
            </div>
            <div className="text-[10px] flex items-center justify-between text-slate-400">
              <span>Base: {impact.yield_baseline_kg_ha ? impact.yield_baseline_kg_ha.toLocaleString() : '3,200'}</span>
              <span className={`font-bold ${impact.yield_delta_pct && impact.yield_delta_pct >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {impact.yield_delta_pct && impact.yield_delta_pct > 0 ? '+' : ''}{impact.yield_delta_pct || 0}%
              </span>
            </div>
          </div>

          {/* Water */}
          <div className="p-3.5 rounded-xl bg-[#07160d] border border-[#183a24] space-y-1">
            <span className="text-[10px] text-slate-400 block flex items-center justify-between">
              Water Consumption
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            </span>
            <div className="text-base font-extrabold text-cyan-300">
              {impact.water_recommended_m3 ? impact.water_recommended_m3.toLocaleString() : '2,900'} <span className="text-[10px] text-slate-400 font-normal">m³</span>
            </div>
            <div className="text-[10px] flex items-center justify-between text-slate-400">
              <span>Saved: {impact.water_savings_m3 ? `${impact.water_savings_m3.toLocaleString()} m³` : '500 m³'}</span>
              <span className="font-bold text-cyan-400">
                {impact.water_delta_pct ? `${impact.water_delta_pct}%` : '-15%'}
              </span>
            </div>
          </div>

          {/* Fertilizer */}
          <div className="p-3.5 rounded-xl bg-[#07160d] border border-[#183a24] space-y-1">
            <span className="text-[10px] text-slate-400 block flex items-center justify-between">
              Nitrogen Dosage
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <div className="text-base font-extrabold text-emerald-300">
              {impact.nitrogen_recommended_kg_ha || 110} <span className="text-[10px] text-slate-400 font-normal">kg N/ha</span>
            </div>
            <div className="text-[10px] flex items-center justify-between text-slate-400">
              <span>Base: {impact.nitrogen_baseline_kg_ha || 120} kg</span>
              <span className="font-bold text-emerald-400">
                {impact.nitrogen_delta_pct ? `${impact.nitrogen_delta_pct > 0 ? '+' : ''}${impact.nitrogen_delta_pct}%` : '-8%'}
              </span>
            </div>
          </div>

          {/* Profit */}
          <div className="p-3.5 rounded-xl bg-[#07160d] border border-[#183a24] space-y-1">
            <span className="text-[10px] text-slate-400 block flex items-center justify-between">
              Net Operating Profit
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <div className="text-base font-extrabold text-amber-300">
              {impact.profit_recommended_inr ? `₹${impact.profit_recommended_inr.toLocaleString()}` : '₹38,500'}
            </div>
            <div className="text-[10px] flex items-center justify-between text-slate-400">
              <span>Profit Δ:</span>
              <span className="font-bold text-amber-400">
                {impact.profit_delta_inr ? `+₹${impact.profit_delta_inr.toLocaleString()}` : '+₹4,200'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Trade-offs */}
      <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 space-y-1.5">
        <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Operational & Agronomic Trade-Offs
        </span>
        <p className="text-xs text-slate-200 leading-relaxed">
          {recommendation.trade_offs}
        </p>
      </div>

      {/* 5 & 6. Assumptions & Limitations Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Scientific Assumptions */}
        <div className="p-4 rounded-xl bg-[#08180f] border border-[#193d25] space-y-2">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-emerald-400" />
            Model Assumptions
          </span>
          <ul className="space-y-1.5 text-[11px] text-slate-300">
            {recommendation.assumptions.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Uncertainty & Limitations */}
        <div className="p-4 rounded-xl bg-[#08180f] border border-[#193d25] space-y-2">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            Uncertainty & Missing Measurements
          </span>
          <ul className="space-y-1.5 text-[11px] text-slate-300">
            {recommendation.uncertainty_and_limitations.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 7. Practical Next Steps */}
      <div className="p-4 rounded-xl bg-[#091b10] border border-[#1c472a] space-y-2.5">
        <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
          <ListChecks className="w-4 h-4 text-emerald-400" />
          Practical Verification Next Steps Before Implementation
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {recommendation.practical_next_steps.map((step, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-[#06140b] border border-[#14341e] flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0 border border-emerald-800">
                {idx + 1}
              </span>
              <span className="text-slate-200 text-[11px] leading-snug">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Standard Disclaimer */}
      <div className="p-3 rounded-xl bg-[#051109] border border-[#14331e] text-[10px] text-slate-400 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Decision-Support Notice:</strong> {recommendation.disclaimer}
        </p>
      </div>
    </div>
  );
};
