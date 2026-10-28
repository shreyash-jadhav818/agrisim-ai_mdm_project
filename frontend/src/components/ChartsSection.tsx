import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Activity, PieChart as PieIcon, Droplet, Sprout } from 'lucide-react';
import { SimulationResult } from '../types';

interface ChartsSectionProps {
  result: SimulationResult;
}

const COST_COLORS = [
  '#10b981', // Seeds (emerald)
  '#6366f1', // Land prep (indigo)
  '#f59e0b', // Fertilizer (amber)
  '#3b82f6', // Energy/Diesel (blue)
  '#ec4899', // Crop Protection (pink)
  '#8b5cf6'  // Labor/Harvest (purple)
];

export const ChartsSection: React.FC<ChartsSectionProps> = ({ result }) => {
  const [activeChart, setActiveChart] = useState<'water' | 'soil' | 'biomass' | 'costs'>('water');

  const costData = [
    { name: 'Seeds & Treatment', value: result.costs.seed_cost },
    { name: 'Land Preparation', value: result.costs.land_prep_cost },
    { name: 'Fertilizers & Nutrients', value: result.costs.fertilizer_cost },
    { name: 'Irrigation Pumping Energy', value: result.costs.irrigation_energy_cost },
    { name: 'Crop Protection', value: result.costs.crop_protection_cost },
    { name: 'Labor & Harvesting', value: result.costs.labor_harvest_cost }
  ].filter(item => item.value > 0);

  // Sample every few steps if duration is long to keep charting crisp and fast
  const chartSteps = result.daily_steps.map((step) => ({
    day: `Day ${step.day}`,
    date: step.date,
    stage: step.stage_name,
    et0: step.et0_mm,
    etc: step.etc_mm,
    eta: step.eta_mm,
    rain: step.precipitation_mm,
    irrigation: step.irrigation_mm,
    water_stress: Math.round(step.water_stress_ks * 100),
    root_depth_cm: Math.round(step.root_depth_m * 100),
    depletion: step.soil_depletion_mm,
    biomass: step.biomass_accumulated_kg_acre
  }));

  return (
    <div className="agri-card p-5 space-y-4">
      {/* Chart Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Daily Simulation Analytics</h3>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {[
            { id: 'water', label: 'Water Balance & ET', icon: Droplet },
            { id: 'soil', label: 'Soil Depletion & Roots', icon: Activity },
            { id: 'biomass', label: 'Biomass Accumulation', icon: Sprout },
            { id: 'costs', label: 'Cost Breakdown', icon: PieIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeChart === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveChart(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  isCurrent
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart View Area */}
      <div className="h-[360px] w-full pt-2">
        {activeChart === 'water' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartSteps} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                label={{ value: 'Daily Depth (mm)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                labelStyle={{ fontWeight: 'bold', color: '#f8fafc' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar yAxisId="left" dataKey="rain" name="Natural Rainfall (mm)" fill="#38bdf8" opacity={0.7} />
              <Bar yAxisId="left" dataKey="irrigation" name="Irrigation Applied (mm)" fill="#0ea5e9" />
              <Line yAxisId="left" type="monotone" dataKey="et0" name="Reference ET0" stroke="#94a3b8" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
              <Line yAxisId="left" type="monotone" dataKey="etc" name="Potential ETc" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="eta" name="Actual ETa" stroke="#10b981" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {activeChart === 'soil' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartSteps} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                label={{ value: 'Depletion (mm)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                label={{ value: 'Root Depth (cm)', angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Area yAxisId="left" type="monotone" dataKey="depletion" name="Root Zone Depletion Dr (mm)" fill="#ef4444" stroke="#dc2626" fillOpacity={0.25} />
              <Line yAxisId="right" type="monotone" dataKey="root_depth_cm" name="Root Depth Zr (cm)" stroke="#10b981" strokeWidth={2.5} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="water_stress" name="Water Stress Factor Ks (%)" stroke="#38bdf8" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {activeChart === 'biomass' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartSteps} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="biomassGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} label={{ value: 'Cumulative Biomass (kg/acre)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Area type="monotone" dataKey="biomass" name="Accumulated Dry Biomass" stroke="#10b981" fillOpacity={1} fill="url(#biomassGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {activeChart === 'costs' && (
          <div className="flex flex-col md:flex-row items-center justify-around h-full">
            <div className="h-[280px] w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {costData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COST_COLORS[index % COST_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Cost']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full md:w-1/2 space-y-2 p-4">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Cost Breakdown Summary</div>
              {costData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COST_COLORS[idx % COST_COLORS.length] }} />
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                  <div className="font-mono text-white font-semibold">
                    ₹{item.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}{' '}
                    <span className="text-slate-400 font-normal">
                      ({((item.value / result.costs.total_cost) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs pt-2 font-bold text-emerald-400">
                <span>Total Expenditure</span>
                <span>₹{result.costs.total_cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
