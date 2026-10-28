import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Sliders,
  CheckCircle2,
  Info,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu,
  RefreshCw
} from 'lucide-react';
import {
  SimulationResult,
  FarmProfile,
  AdvisorExplanationResponse,
  AIProviderStatus
} from '../types';
import { fetchAdvisorExplanation, fetchAIProviderStatus } from '../services/api';
import { ExplainableRecommendationCard } from '../components/ExplainableRecommendationCard';
import { ConversationalFarmAssistant } from '../components/ConversationalFarmAssistant';

interface AIAdvisorPageProps {
  currentResult: SimulationResult | null;
  farm: FarmProfile;
  selectedCropId: string;
  onApplyStrategy: (strategy: { irrigation_depth_mm: number; n_kg_ha: number; sowing_date: string }) => void;
  onNavigate: (tab: string) => void;
}

export const AIAdvisorPage: React.FC<AIAdvisorPageProps> = ({
  currentResult,
  farm,
  selectedCropId,
  onApplyStrategy,
  onNavigate
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [explanation, setExplanation] = useState<AdvisorExplanationResponse | null>(null);
  const [providerStatus, setProviderStatus] = useState<AIProviderStatus | null>(null);
  const [selectedObjective, setSelectedObjective] = useState<'balanced' | 'maximize_yield' | 'lower_water' | 'maximize_profit'>('balanced');

  const loadAdvisorData = async () => {
    setLoading(true);
    try {
      const [statusRes, expRes] = await Promise.all([
        fetchAIProviderStatus(),
        fetchAdvisorExplanation({
          baseline_simulation: currentResult || undefined,
          baseline_payload: {
            crop_type: selectedCropId,
            farm_area: farm.total_acres,
            farm_area_unit: 'acres',
            soil_type: farm.soil_type,
            irrigation_method: farm.irrigation_system
          },
          selected_objective: selectedObjective,
          recommended_strategy: {
            strategy_name: selectedObjective === 'lower_water'
              ? 'Water-Conservation Regimen'
              : selectedObjective === 'maximize_yield'
              ? 'High-Input Maximum Yield'
              : selectedObjective === 'maximize_profit'
              ? 'Profit-Maximized Regimen'
              : 'Balanced Multi-Criteria Compromise',
            predicted_yield_kg_ha: currentResult ? (
              selectedObjective === 'lower_water'
                ? currentResult.yield_kg_ha * 0.92
                : selectedObjective === 'maximize_yield'
                ? currentResult.yield_kg_ha * 1.08
                : currentResult.yield_kg_ha * 1.03
            ) : 3400.0,
            irrigation_water_m3: currentResult ? (
              selectedObjective === 'lower_water'
                ? currentResult.total_water_consumed_m3_acre * 2.471 * 0.72
                : selectedObjective === 'maximize_yield'
                ? currentResult.total_water_consumed_m3_acre * 2.471 * 1.25
                : currentResult.total_water_consumed_m3_acre * 2.471 * 0.88
            ) : 3100.0,
            nitrogen_kg_ha: selectedObjective === 'lower_water' ? 90.0 : selectedObjective === 'maximize_yield' ? 140.0 : 115.0,
            irrigation_depth_mm: selectedObjective === 'lower_water' ? 260.0 : selectedObjective === 'maximize_yield' ? 440.0 : 320.0,
            sowing_date: '2026-11-15',
            estimated_net_profit_inr: currentResult && currentResult.net_profit_inr ? (
              selectedObjective === 'maximize_profit'
                ? currentResult.net_profit_inr * 1.15
                : currentResult.net_profit_inr * 1.05
            ) : 41000.0
          }
        })
      ]);

      setProviderStatus(statusRes);
      setExplanation(expRes);
    } catch (e) {
      console.error('Failed to load advisor explanation:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdvisorData();
  }, [currentResult, selectedCropId, selectedObjective]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="agri-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#183a24] pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              AI Agricultural Advisor & Conversational Assistant
            </h3>
            <p className="text-xs text-slate-400">
              Grounded agronomic guidance powered by biophysical simulations, transparent reasoning, and local AI reasoning
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {providerStatus && (
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                providerStatus.provider_mode === 'local_ollama'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : providerStatus.provider_mode === 'external_ai'
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                  : 'bg-amber-950 text-amber-300 border-amber-800'
              }`}>
                {providerStatus.active_provider}
              </span>
            )}
            <button
              onClick={loadAdvisorData}
              disabled={loading}
              className="p-1.5 rounded-lg bg-[#08180f] hover:bg-[#0e2719] border border-[#1b3e26] text-slate-400 hover:text-white transition-all"
              title="Refresh analysis"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Strategy Objective Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
          <span className="text-slate-400 text-[11px] font-semibold mr-1">Strategy Focus:</span>
          {[
            { id: 'balanced', label: 'Balanced Compromise' },
            { id: 'lower_water', label: 'Water Saver' },
            { id: 'maximize_profit', label: 'Maximum Net Profit' },
            { id: 'maximize_yield', label: 'Peak Yield' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedObjective(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedObjective === tab.id
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/80 shadow-md'
                  : 'bg-[#08180f] border border-[#183a24] text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 7-Section Explainable Recommendation Card */}
        <div className="lg:col-span-7 space-y-4">
          {loading ? (
            <div className="agri-card p-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Synthesizing biophysical data & formulating recommendations...</p>
            </div>
          ) : explanation ? (
            <ExplainableRecommendationCard
              recommendation={explanation.recommendation_card}
              showApplyButton={true}
              onApplyStrategy={() =>
                onApplyStrategy({
                  irrigation_depth_mm: explanation.recommendation_card.expected_impact.yield_recommended_kg_ha ? 320 : 360,
                  n_kg_ha: explanation.recommendation_card.expected_impact.nitrogen_recommended_kg_ha || 115,
                  sowing_date: '2026-11-15'
                })
              }
            />
          ) : (
            <div className="agri-card p-8 text-center text-xs text-slate-400">
              Run a simulation to generate personalized agronomic recommendations.
            </div>
          )}
        </div>

        {/* Right Column: Conversational Farm Assistant */}
        <div className="lg:col-span-5">
          <ConversationalFarmAssistant
            currentResult={currentResult}
            simulationContext={{
              crop_name: currentResult ? currentResult.crop_name : selectedCropId,
              farm_area: farm.total_acres,
              farm_area_unit: 'acres',
              soil_type: farm.soil_type,
              irrigation_method: farm.irrigation_system
            }}
          />
        </div>
      </div>
    </div>
  );
};
