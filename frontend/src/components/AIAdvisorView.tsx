import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Droplets,
  Wheat,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { SimulationResult, AIExplanationResponse } from '../types';
import { fetchAIExplanation } from '../services/api';

interface AIAdvisorViewProps {
  result: SimulationResult;
}

export const AIAdvisorView: React.FC<AIAdvisorViewProps> = ({ result }) => {
  const [explanation, setExplanation] = useState<AIExplanationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userQuery, setUserQuery] = useState<string>('');

  const handleFetchExplanation = async (query?: string) => {
    setLoading(true);
    try {
      const res = await fetchAIExplanation(result, query);
      setExplanation(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim()) return;
    handleFetchExplanation(userQuery);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="agri-card p-5 border-l-4 border-l-emerald-500">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>AgriSim Explainable AI Agronomic Advisor</span>
            </h2>
            <p className="text-xs text-slate-400">
              Translates complex biophysical equations into transparent, human-understandable agronomic intelligence
            </p>
          </div>

          <button
            onClick={() => handleFetchExplanation()}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Cpu className="w-4 h-4" />
            )}
            <span>Generate Comprehensive AI Diagnosis</span>
          </button>
        </div>
      </div>

      {/* Ask AI Input Field */}
      <div className="agri-card p-4">
        <form onSubmit={handleQuerySubmit} className="flex gap-2">
          <input
            type="text"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Ask a specific farming decision question (e.g. 'How much profit do I lose if I skip the flowering irrigation?')"
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={loading || !userQuery.trim()}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask Advisor</span>
          </button>
        </form>
      </div>

      {/* Explanation Cards View */}
      {explanation ? (
        <div className="space-y-5">
          {/* Engine Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Diagnosis Source Engine:</span>
            <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              {explanation.engine_used}
            </span>
          </div>

          {/* Executive Summary */}
          <div className="agri-card p-5 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Executive Agronomic Summary</span>
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed">{explanation.executive_summary}</p>
          </div>

          {/* 3 Diagnoses Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Limiting Factors */}
            <div className="agri-card p-5 space-y-2 border-l-4 border-l-amber-500">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Liebig's Law Constraints</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">{explanation.limiting_factor_analysis}</p>
            </div>

            {/* Irrigation Diagnosis */}
            <div className="agri-card p-5 space-y-2 border-l-4 border-l-blue-500">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Droplets className="w-4 h-4" />
                <span>Water Management Diagnosis</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">{explanation.irrigation_diagnosis}</p>
            </div>

            {/* Profit Levers */}
            <div className="agri-card p-5 space-y-2 border-l-4 border-l-teal-500">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>Economic Profit Levers</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">{explanation.profit_levers}</p>
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="agri-card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Actionable Decision Steps for Next Season</span>
            </h3>
            <div className="space-y-2">
              {explanation.actionable_recommendations.map((step, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Scientific Disclosures */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Scientific Basis & Model Attribution</div>
            <p>{explanation.scientific_basis}</p>
          </div>
        </div>
      ) : (
        <div className="agri-card p-10 text-center space-y-3">
          <Sparkles className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">AI Agronomist Ready</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Click &quot;Generate Comprehensive AI Diagnosis&quot; to inspect limiting factor bottlenecks, water efficiency, and financial optimization advice for your current simulation run.
          </p>
        </div>
      )}
    </div>
  );
};
