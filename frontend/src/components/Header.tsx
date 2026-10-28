import React from 'react';
import {
  Sprout,
  Layers,
  Sparkles,
  ShieldAlert,
  BarChart3,
  Sliders,
  History,
  Download,
  MapPin,
  Maximize2
} from 'lucide-react';
import { FarmProfile } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  farm: FarmProfile;
  onEditFarm: () => void;
  onOpenHistory: () => void;
  onOpenExport: () => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  farm,
  onEditFarm,
  onOpenHistory,
  onOpenExport,
  historyCount
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard & Twin', icon: Layers },
    { id: 'scenarios', label: 'What-If Scenarios', icon: BarChart3 },
    { id: 'optimizer', label: 'Strategy Optimizer', icon: Sliders },
    { id: 'stress', label: 'Stress Testing', icon: ShieldAlert },
    { id: 'risk', label: 'Risk & Uncertainty', icon: BarChart3 },
    { id: 'ai', label: 'AI Advisor', icon: Sparkles },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center shadow-lg shadow-emerald-950/50">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">AgriSim</span>
                <span className="text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AI Twin
                </span>
                <span className="text-xs text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded">
                  ₹ INR
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Agricultural Digital Twin & What-If Decision Simulator
              </p>
            </div>
          </div>

          {/* Active Farm Profile Pill */}
          <div className="hidden lg:flex items-center">
            <button
              onClick={onEditFarm}
              className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700 hover:border-emerald-500 text-xs transition-colors group"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-slate-200">{farm.name}</span>
              <span className="text-slate-400">({farm.state} • {farm.total_acres} ac • {farm.soil_type})</span>
              <span className="text-emerald-400 font-medium group-hover:underline ml-1">Edit</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors"
              title="Simulation History"
            >
              <History className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">History</span>
              {historyCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  {historyCount}
                </span>
              )}
            </button>

            <button
              onClick={onOpenExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Report</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto py-2 -mb-px scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
