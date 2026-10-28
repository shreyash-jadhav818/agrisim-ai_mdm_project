import React, { useState } from 'react';
import {
  Layers,
  Thermometer,
  Droplets,
  Sun,
  Wind,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Sliders,
  Sparkles
} from 'lucide-react';
import { SimulationResult, FarmProfile } from '../types';

interface DigitalTwinViewProps {
  result: SimulationResult;
  farm: FarmProfile;
}

interface SectorInfo {
  id: string;
  name: string;
  area_acres: number;
  soil_moisture_pct: number;
  ndvi: number;
  status: 'Optimal' | 'Adequate' | 'Moisture Stress' | 'High Vigor';
  canopy_temp_c: number;
  irrigation_status: 'Scheduled' | 'Active' | 'Resting';
}

export const DigitalTwinView: React.FC<DigitalTwinViewProps> = ({ result, farm }) => {
  const [selectedSectorId, setSelectedSectorId] = useState<string>('sector_1');
  const [activeDepthLayer, setActiveDepthLayer] = useState<'all' | 'top' | 'mid' | 'deep'>('all');

  // Derive dynamic sectors based on farm total acreage
  const totalAcres = farm.total_acres;
  const sectorCount = 6;
  const sectorAcres = Number((totalAcres / sectorCount).toFixed(2));

  // Synthesize realistic sector states from simulation result
  const baseMoisture = Math.max(35, Math.min(88, Math.round(100 - (result.total_water_consumed_mm / Math.max(1, result.total_irrigation_applied_mm + result.total_rainfall_mm)) * 40)));
  const baseNdvi = Number((0.45 + (result.yield_quintal_acre / result.potential_yield_quintal_acre) * 0.40).toFixed(2));

  const sectors: SectorInfo[] = [
    { id: 'sector_1', name: 'North Field A1', area_acres: sectorAcres, soil_moisture_pct: baseMoisture, ndvi: baseNdvi, status: 'Optimal', canopy_temp_c: 24.2, irrigation_status: 'Resting' },
    { id: 'sector_2', name: 'North Field A2', area_acres: sectorAcres, soil_moisture_pct: Math.max(25, baseMoisture - 6), ndvi: Number((baseNdvi - 0.04).toFixed(2)), status: 'Adequate', canopy_temp_c: 24.8, irrigation_status: 'Scheduled' },
    { id: 'sector_3', name: 'Central Pivot B1', area_acres: sectorAcres, soil_moisture_pct: Math.min(95, baseMoisture + 8), ndvi: Number((baseNdvi + 0.05).toFixed(2)), status: 'High Vigor', canopy_temp_c: 23.5, irrigation_status: 'Active' },
    { id: 'sector_4', name: 'Central Pivot B2', area_acres: sectorAcres, soil_moisture_pct: baseMoisture, ndvi: baseNdvi, status: 'Optimal', canopy_temp_c: 24.0, irrigation_status: 'Resting' },
    { id: 'sector_5', name: 'South Terrace C1', area_acres: sectorAcres, soil_moisture_pct: Math.max(20, baseMoisture - 14), ndvi: Number((baseNdvi - 0.09).toFixed(2)), status: 'Moisture Stress', canopy_temp_c: 26.5, irrigation_status: 'Scheduled' },
    { id: 'sector_6', name: 'South Terrace C2', area_acres: sectorAcres, soil_moisture_pct: Math.max(30, baseMoisture - 4), ndvi: baseNdvi, status: 'Adequate', canopy_temp_c: 24.6, irrigation_status: 'Resting' },
  ];

  const currentSector = sectors.find(s => s.id === selectedSectorId) || sectors[0];

  // Depth layers data
  const depthLayers = [
    {
      name: 'Topsoil Zone (0 - 30 cm)',
      desc: 'Rapid evaporation and seed emergence zone. Subject to direct diurnal thermal fluctuations.',
      moisture: currentSector.soil_moisture_pct,
      status: currentSector.soil_moisture_pct > 50 ? 'Optimal Field Capacity' : 'Moderate Depletion',
      color: 'bg-emerald-500'
    },
    {
      name: 'Mid Root Zone (30 - 60 cm)',
      desc: 'Principal active root density extracting bulk transpiration water. Highly responsive to drip fertigation.',
      moisture: Math.min(90, currentSector.soil_moisture_pct + 10),
      status: 'High Water Availability',
      color: 'bg-teal-500'
    },
    {
      name: 'Deep Subsoil Reserve (60 - 120 cm)',
      desc: 'Capillary fringe and moisture reservoir buffering periods of drought stress.',
      moisture: Math.min(95, currentSector.soil_moisture_pct + 18),
      status: 'Subsoil Buffer Stable',
      color: 'bg-blue-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="agri-card p-5 border-l-4 border-l-emerald-500">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Farm Digital Twin & Spatial Micro-Twin</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Active Vigor Map
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Spatial plot simulation mapping soil moisture depth profiles, simulated NDVI canopy vigor, and telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Total Farm Area:</span>
            <span className="text-xs font-bold text-emerald-400 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
              {farm.total_acres} Acres ({sectorCount} Plot Sectors)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Sector Plot Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="agri-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>Field Layout & Sector Vigor (Simulated NDVI)</span>
              </h3>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> High Vigor (NDVI &gt; 0.75)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-teal-600" /> Optimal (0.60 - 0.75)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500" /> Stress (&lt; 0.55)
                </span>
              </div>
            </div>

            {/* 3x2 Grid Plot Map */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {sectors.map((sector) => {
                const isSelected = sector.id === selectedSectorId;
                const isStressed = sector.status === 'Moisture Stress';
                const isHigh = sector.status === 'High Vigor';

                return (
                  <div
                    key={sector.id}
                    onClick={() => setSelectedSectorId(sector.id)}
                    className={`p-4 rounded-xl border cursor-pointer relative overflow-hidden transition-all group ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-slate-900 shadow-xl'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/70'
                    }`}
                  >
                    {/* Top status bar indicator */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1.5 ${
                        isStressed ? 'bg-amber-500' : isHigh ? 'bg-emerald-400' : 'bg-teal-500'
                      }`}
                    />

                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-white">{sector.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{sector.area_acres} ac</span>
                    </div>

                    <div className="space-y-1.5 my-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Simulated NDVI:</span>
                        <span className="font-mono font-bold text-emerald-400">{sector.ndvi}</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${sector.ndvi * 100}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-400">Soil Moisture:</span>
                        <span className="font-mono text-slate-200">{sector.soil_moisture_pct}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
                      <span className={`px-2 py-0.5 rounded font-medium text-[10px] ${
                        isStressed
                          ? 'bg-amber-500/20 text-amber-300'
                          : isHigh
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-teal-500/20 text-teal-300'
                      }`}>
                        {sector.status}
                      </span>
                      <span className="text-slate-400 text-[10px] font-mono">{sector.canopy_temp_c}°C</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Virtual In-Field Sensor Bar */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Tensiometer</div>
                  <div className="font-bold text-white font-mono">-32 kPa</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Thermometer className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Canopy Temp</div>
                  <div className="font-bold text-white font-mono">{currentSector.canopy_temp_c}°C</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Solar PAR</div>
                  <div className="font-bold text-white font-mono">18.4 MJ/m²</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                  <Wind className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Drip Pressure</div>
                  <div className="font-bold text-white font-mono">1.85 Bar</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Deep Soil Layer Column Profile */}
        <div className="space-y-4">
          <div className="agri-card p-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Depth Layer Profile: {currentSector.name}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Multi-layer root water saturation in {farm.soil_type}
              </p>
            </div>

            {/* Depth Zones */}
            <div className="space-y-3">
              {depthLayers.map((layer, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                    <span>{layer.name}</span>
                    <span className="text-emerald-400 font-mono">{layer.moisture}% Vol</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${layer.color} h-full rounded-full transition-all`}
                      style={{ width: `${layer.moisture}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">{layer.desc}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
                    <span>Status: {layer.status}</span>
                    <span>Ks Stress: 1.00 (No Stress)</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Twin Agronomic Summary */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-slate-300 space-y-1.5">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Digital Twin Diagnostic</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                The {result.crop_name} crop in {currentSector.name} is currently in the active growth phase with an average root depth of{' '}
                <span className="text-white font-bold font-mono">
                  {(result.daily_steps[result.daily_steps.length - 1]?.root_depth_m * 100 || 80).toFixed(0)} cm
                </span>
                . Soil profile water buffering is sufficient for the next 4-6 days under normal evapotranspiration demand.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
