import React from 'react';
import {
  LayoutDashboard,
  Layers,
  PlusCircle,
  GitCompare,
  Sliders,
  CloudSun,
  ShieldAlert,
  History,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sprout,
  MapPin,
  Sparkles
} from 'lucide-react';
import { FarmProfile } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  farm: FarmProfile;
  historyCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  farm,
  historyCount
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, badge: null },
    { id: 'digital-twin', label: 'Farm Digital Twin', icon: Layers, badge: null },
    { id: 'new-simulation', label: 'New Simulation', icon: PlusCircle, badge: 'Wizard', highlight: true },
    { id: 'scenarios', label: 'Scenario Explorer', icon: GitCompare, badge: 'What-If' },
    { id: 'optimizer', label: 'Optimization Lab', icon: Sliders, badge: 'SciPy' },
    { id: 'advisor', label: 'AI Advisor & Chat', icon: Sparkles, badge: 'AI' },
    { id: 'weather', label: 'Weather Intelligence', icon: CloudSun, badge: null },
    { id: 'risk', label: 'Risk Analysis', icon: ShieldAlert, badge: null },
    { id: 'history', label: 'Simulation History', icon: History, badge: historyCount > 0 ? String(historyCount) : null },
    { id: 'reports', label: 'Reports', icon: FileText, badge: 'PDF/CSV' },
    { id: 'settings', label: 'Settings', icon: Settings, badge: null }
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-[#0a1b11] border-r border-[#1a3824] z-40 transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#1a3824]/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center shadow-lg shadow-emerald-950/60 shrink-0">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                AgriSim <span className="text-emerald-400 font-black">AI</span>
              </span>
              <span className="text-[10px] text-emerald-300/80 truncate font-medium">
                Simulate Today. Harvest Smarter.
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-emerald-400 hover:text-white hover:bg-[#153320] transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40 font-semibold'
                  : item.highlight
                  ? 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/50 hover:text-white border border-emerald-800/40'
                  : 'text-slate-300 hover:bg-[#12281b] hover:text-white'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : item.highlight ? 'text-emerald-400' : 'text-emerald-400/80'
                }`}
              />

              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between text-left truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                        isActive
                          ? 'bg-emerald-700/80 text-white'
                          : item.highlight
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-[#153422] text-slate-300 border border-[#234b31]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-800">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active Farm Card in Footer */}
      {!isCollapsed && (
        <div className="p-3 m-3 rounded-xl bg-[#0e2417] border border-[#1b3d27] text-xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400">
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              Active Farm
            </span>
            <span className="text-slate-400 font-normal">{farm.total_acres} ac</span>
          </div>
          <div className="text-white font-medium truncate">{farm.name}</div>
          <div className="text-[10px] text-slate-400 truncate flex items-center justify-between">
            <span>{farm.soil_type}</span>
            <span className="capitalize text-emerald-300 font-semibold">{farm.irrigation_system}</span>
          </div>
        </div>
      )}
    </aside>
  );
};
