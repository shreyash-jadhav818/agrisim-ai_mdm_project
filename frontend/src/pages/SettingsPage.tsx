import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  CheckCircle2,
  Server,
  Database,
  RefreshCw,
  Globe,
  Sliders,
  DollarSign,
  Info,
  Sparkles,
  ExternalLink,
  Cpu
} from 'lucide-react';
import { checkBackendHealth, fetchAIProviderStatus } from '../services/api';
import { AIProviderStatus } from '../types';

interface SettingsPageProps {
  areaUnit: 'acres' | 'hectares';
  setAreaUnit: (unit: 'acres' | 'hectares') => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ areaUnit, setAreaUnit }) => {
  const [health, setHealth] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<AIProviderStatus | null>(null);
  const [checking, setChecking] = useState<boolean>(false);

  const verifyHealth = async () => {
    setChecking(true);
    try {
      const [hRes, aiRes] = await Promise.all([
        checkBackendHealth(),
        fetchAIProviderStatus()
      ]);
      setHealth(hRes);
      setAiStatus(aiRes);
    } catch (e) {
      console.error('Diagnostics ping failed:', e);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    verifyHealth();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="agri-card p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-[#183a24] pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-400" />
              Platform Settings & System Diagnostics
            </h3>
            <p className="text-xs text-slate-400">
              Configure measurement units, regional currency, and verify backend simulation engine connectivity
            </p>
          </div>
          <span className="text-xs text-emerald-400 font-semibold bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800">
            System Operational
          </span>
        </div>

        {/* Setting 1: Area Measurement Units */}
        <div className="p-4 rounded-xl bg-[#091a10] border border-[#1b3d27] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                Default Land Area Measurement Unit
              </h4>
              <p className="text-xs text-slate-400">
                Choose between Indian standard agricultural Acres or Metric Hectares
              </p>
            </div>
            <div className="flex rounded-xl bg-[#07160d] p-1 border border-[#1b3d27] text-xs">
              <button
                onClick={() => setAreaUnit('acres')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  areaUnit === 'acres' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Acres (ac)
              </button>
              <button
                onClick={() => setAreaUnit('hectares')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  areaUnit === 'hectares' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Hectares (ha)
              </button>
            </div>
          </div>
        </div>

        {/* Setting 2: Currency Configuration */}
        <div className="p-4 rounded-xl bg-[#091a10] border border-[#1b3d27] space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                Active Financial Currency
              </h4>
              <p className="text-xs text-slate-400">Indian Rupees (INR / ₹) with MSP benchmark alignment</p>
            </div>
            <span className="text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-800/60 px-3 py-1.5 rounded-xl">
              ₹ INR (Default)
            </span>
          </div>
        </div>

        {/* Setting 3: AI Advisor Diagnostics */}
        <div className="p-4 rounded-xl bg-[#091a10] border border-[#1b3d27] space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                AI Advisor & Language Model Engine
              </h4>
              <p className="text-xs text-slate-400">
                Current mode: <strong className="text-emerald-300">{aiStatus?.active_provider || 'Inspecting...'}</strong>
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
              aiStatus?.provider_mode === 'local_ollama'
                ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                : aiStatus?.provider_mode === 'external_ai'
                ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
            }`}>
              {aiStatus?.provider_mode === 'local_ollama' ? 'Local Ollama' : aiStatus?.provider_mode === 'external_ai' ? 'External Cloud AI' : 'Deterministic Rule Engine (Offline)'}
            </span>
          </div>
          {aiStatus?.setup_instructions && (
            <p className="text-[11px] text-slate-400 bg-[#07160d] p-2.5 rounded-lg border border-[#183922] leading-relaxed">
              {aiStatus.setup_instructions}
            </p>
          )}
        </div>

        {/* Setting 4: Backend Diagnostics & API Connectivity */}
        <div className="p-5 rounded-xl bg-[#091a10] border border-[#1b3d27] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                Simulation API Server & Database Diagnostics
              </h4>
              <p className="text-xs text-slate-400">Verifies live biophysical solver connection and SQLite storage</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="http://127.0.0.1:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="agri-btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
              >
                <span>Swagger Docs</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <button
                onClick={verifyHealth}
                disabled={checking}
                className="agri-btn-secondary py-1.5 px-3 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                <span>Ping Backend</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#07170e] border border-[#173a23]">
              <span className="text-slate-500 block text-[10px]">API Server Status:</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {health?.status === 'healthy' ? 'Connected (FastAPI)' : 'Offline / Checking'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#07170e] border border-[#173a23]">
              <span className="text-slate-500 block text-[10px]">Database Engine:</span>
              <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                {health?.database || 'SQLite (agrisim.db)'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#07170e] border border-[#173a23]">
              <span className="text-slate-500 block text-[10px]">Biophysical Model:</span>
              <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                AgriSim-YieldEngine-v2.0
              </span>
            </div>
          </div>
        </div>

        {/* Provenance & Agronomic Governance Disclosure */}
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/50 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Info className="w-4 h-4" />
            <span>Scientific Citations & Agricultural Standards</span>
          </div>
          <div className="text-slate-300 space-y-1 text-[11px] leading-relaxed">
            <p>• <strong>FAO Irrigation and Drainage Paper No. 56:</strong> Crop Evapotranspiration Guidelines for Computing Crop Water Requirements.</p>
            <p>• <strong>FAO Irrigation and Drainage Paper No. 33:</strong> Yield Response to Water (Stewart multi-stage deficit functions).</p>
            <p>• <strong>Indian Council of Agricultural Research (ICAR):</strong> Agronomic Handbooks and benchmark crop calendars.</p>
            <p>• <strong>Mitscherlich-Baule:</strong> Nutritional sufficiency and law of diminishing returns with biological upper-bound limits.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
