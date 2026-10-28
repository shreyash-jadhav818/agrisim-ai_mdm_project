import React, { useState } from 'react';
import { ShieldAlert, Info, Sliders, Dice5, AlertTriangle, TrendingUp } from 'lucide-react';
import { SimulationInput } from '../types';
import { RiskAnalysisView } from '../components/RiskAnalysisView';
import { RiskSensitivityView } from '../components/RiskSensitivityView';

interface RiskAnalysisPageProps {
  baseSimulation: SimulationInput;
}

export const RiskAnalysisPage: React.FC<RiskAnalysisPageProps> = ({ baseSimulation }) => {
  const [activeTab, setActiveTab] = useState<'sensitivity' | 'monte_carlo'>('sensitivity');

  return (
    <div className="space-y-6">
      {/* Risk Architecture Header */}
      <div className="agri-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#183a24] pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-emerald-400" />
              Agronomic Risk, Sensitivity & Stochastic Uncertainty Analysis
            </h3>
            <p className="text-xs text-slate-400">
              Evaluates farm vulnerability across deterministic sensitivity bounds (tornado rankings) and stochastic iterations (Monte Carlo VaR 95%).
            </p>
          </div>
          <span className="text-xs text-emerald-400 font-semibold bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
            Engine: FAO-56 & Mitscherlich-Baule
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 pt-1 border-b border-[#183923] pb-2 text-xs">
          <button
            onClick={() => setActiveTab('sensitivity')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'sensitivity'
                ? 'bg-amber-950/80 border border-amber-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-[#0c2416]'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Scenario Sensitivity & Tornado Analysis</span>
            <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded-full border border-amber-800">
              Recommended
            </span>
          </button>

          <button
            onClick={() => setActiveTab('monte_carlo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'monte_carlo'
                ? 'bg-purple-950/80 border border-purple-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-[#0c2416]'
            }`}
          >
            <Dice5 className="w-4 h-4 text-purple-400" />
            <span>Monte Carlo Stochastic Engine</span>
          </button>
        </div>
      </div>

      {/* Render Selected View */}
      {activeTab === 'sensitivity' ? (
        <RiskSensitivityView baseSimulation={baseSimulation} />
      ) : (
        <RiskAnalysisView baseSimulation={baseSimulation} />
      )}
    </div>
  );
};
