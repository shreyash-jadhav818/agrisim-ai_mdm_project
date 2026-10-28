import React, { useState, useEffect } from 'react';
import {
  Menu,
  Activity,
  PlusCircle,
  FileDown,
  History,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { FarmProfile } from '../types';
import { checkBackendHealth } from '../services/api';

interface TopNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  farm: FarmProfile;
  onEditFarm: () => void;
  onOpenExport: () => void;
  onOpenHistory: () => void;
  historyCount: number;
  toggleSidebar: () => void;
  onLaunchDemo?: () => void;
  isDemoMode?: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  farm,
  onEditFarm,
  onOpenExport,
  onOpenHistory,
  historyCount,
  toggleSidebar,
  onLaunchDemo,
  isDemoMode
}) => {
  const [backendHealth, setBackendHealth] = useState<{ status: string; version: string }>({
    status: 'checking',
    version: '1.0.0'
  });

  useEffect(() => {
    let mounted = true;
    async function verify() {
      const h = await checkBackendHealth();
      if (mounted) {
        setBackendHealth({ status: h.status, version: h.version });
      }
    }
    verify();
    const interval = setInterval(verify, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const pageHeaders: Record<string, { title: string; desc: string }> = {
    overview: {
      title: 'Executive Farm Overview',
      desc: 'Real-time agronomic simulation telemetry, harvest forecasts, and resource consumption trends.'
    },
    'digital-twin': {
      title: 'Farm Digital Twin',
      desc: 'Configure field dimensions, soil hydraulic horizons, irrigation distribution, and canopy layers.'
    },
    'new-simulation': {
      title: 'New Simulation Wizard',
      desc: 'Step-by-step biophysical modeling of crop water requirements, Mitscherlich-Baule nutrition, and weather stress.'
    },
    scenarios: {
      title: 'Scenario Explorer & What-If Studio',
      desc: 'Side-by-side comparison of 8 agronomic variations (Scenarios A through H) with delta analytics.'
    },
    optimizer: {
      title: 'Constrained Optimization Lab',
      desc: 'SciPy & deterministic grid-search solver balancing harvest yields, pumping quotas, and budget ceilings.'
    },
    advisor: {
      title: 'AI Agricultural Advisor & Conversational Assistant',
      desc: 'Explainable biophysical recommendations, quantitative impact deltas, and multi-turn agronomic advisory.'
    },
    weather: {
      title: 'Weather Intelligence & Stress Testing',
      desc: 'Climatological inputs, daily reference ET0 Penman-Monteith demands, and extreme weather sensitivity.'
    },
    risk: {
      title: 'Risk & Uncertainty Analysis',
      desc: 'Monte Carlo stochastic modeling (300+ iterations) of rainfall anomalies and yield confidence bands.'
    },
    history: {
      title: 'Simulation History & Audit Vault',
      desc: 'Search, filter, inspect, and compare previously executed biophysical simulation runs.'
    },
    reports: {
      title: 'Audit-Grade Reports & Export',
      desc: 'Generate downloadable CSV data sheets and publication-ready PDF reports with full model provenance.'
    },
    settings: {
      title: 'Platform Settings & Diagnostics',
      desc: 'Configure unit systems (acres/hectares), currency, and inspect backend biophysical engine versions.'
    }
  };

  const currentHeader = pageHeaders[activeTab] || {
    title: 'AgriSim AI Dashboard',
    desc: 'Intelligent Agricultural Digital Twin & What-If Simulator'
  };

  const isOnline = backendHealth.status === 'healthy';

  return (
    <header className="h-20 bg-[#09170e]/90 border-b border-[#183622] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
      {/* Left: Mobile Toggle & Page Context */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-emerald-400 hover:text-white hover:bg-[#153420] transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 truncate">
            {currentHeader.title}
          </h1>
          <p className="text-xs text-slate-400 truncate hidden md:block">
            {currentHeader.desc}
          </p>
        </div>
      </div>

      {/* Right: Actions & Indicators */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Backend Connectivity Status Pill */}
        <div
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isOnline
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
              : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
          }`}
          title={isOnline ? 'Connected to FastAPI simulation server' : 'Backend connection warning'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="text-[11px] font-semibold">
            {isOnline ? `Engine Online (v${backendHealth.version})` : 'Backend Offline'}
          </span>
        </div>

        {/* Active Farm Pill */}
        <button
          onClick={onEditFarm}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e2518] hover:bg-[#163824] border border-[#1d442b] text-slate-200 text-xs font-medium transition-colors"
          title="Click to edit farm parameters"
        >
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="max-w-[120px] sm:max-w-[150px] truncate">{farm.name}</span>
          <span className="text-emerald-400 font-semibold text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/50 hidden sm:inline">
            {farm.total_acres} ac
          </span>
        </button>

        {/* History Quick Link */}
        <button
          onClick={onOpenHistory}
          className="p-2 rounded-xl bg-[#0e2518] hover:bg-[#163824] border border-[#1d442b] text-slate-300 hover:text-white transition-colors relative"
          title="View simulation history"
        >
          <History className="w-4 h-4" />
          {historyCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
              {historyCount > 9 ? '9+' : historyCount}
            </span>
          )}
        </button>

        {/* Export Report Quick Trigger */}
        <button
          onClick={onOpenExport}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e2518] hover:bg-[#163824] border border-[#1d442b] text-slate-200 text-xs font-medium transition-colors"
          title="Export CSV or PDF audit report"
        >
          <FileDown className="w-4 h-4 text-emerald-400" />
          <span>Export</span>
        </button>

        {/* Demonstration Mode Trigger */}
        <button
          onClick={onLaunchDemo}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-md ${
            isDemoMode
              ? 'bg-amber-950/90 border-amber-500 text-amber-200 shadow-amber-950/50 ring-1 ring-amber-500'
              : 'bg-[#0f2818] hover:bg-[#183d25] border-emerald-700/60 text-emerald-300 hover:text-white'
          }`}
          title="Load repeatable demonstration scenario with benchmark parameters"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">{isDemoMode ? 'Demo Active' : 'Demo Tour'}</span>
        </button>

        {/* New Simulation Wizard Primary CTA */}
        <button
          onClick={() => setActiveTab('new-simulation')}
          className="agri-btn-primary py-2 px-3.5"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">New Simulation</span>
        </button>
      </div>
    </header>
  );
};
