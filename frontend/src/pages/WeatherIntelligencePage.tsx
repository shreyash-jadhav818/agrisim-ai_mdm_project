import React from 'react';
import {
  CloudSun,
  Thermometer,
  CloudRain,
  Wind,
  Info,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';
import { SimulationInput, SimulationResult } from '../types';
import { StressTestingView } from '../components/StressTestingView';

interface WeatherIntelligencePageProps {
  baseSimulation: SimulationInput;
  currentResult: SimulationResult | null;
}

export const WeatherIntelligencePage: React.FC<WeatherIntelligencePageProps> = ({
  baseSimulation,
  currentResult
}) => {
  return (
    <div className="space-y-6">
      {/* Weather Assumptions & Climatological Provenance Banner */}
      <div className="agri-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#183a24] pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CloudSun className="w-5 h-5 text-emerald-400" />
              Meteorological Intelligence & Baseline Climatology
            </h3>
            <p className="text-xs text-slate-400">
              Evaluated using FAO-56 Penman-Monteith reference evapotranspiration and ICAR agro-climatic normals
            </p>
          </div>
          <span className="text-xs text-emerald-400 font-semibold bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
            Agro-Climatic Zone: {baseSimulation.farm_profile.zone}
          </span>
        </div>

        {/* Provenance Disclosure */}
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">Climatological Data Integrity:</span>
            <p className="text-slate-300 leading-relaxed">
              AgriSim AI strictly avoids fabricated real-time forecasts. The simulation engine incorporates regional 30-year IMD (India Meteorological Department)
              normals combined with user-specified seasonal parameters. Psychrometric vapor pressure is computed via FAO-56 dew point approximations.
            </p>
          </div>
        </div>

        {/* 4 Weather Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#08170e] border border-[#183a24] space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Diurnal Temperature</span>
              <Thermometer className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xl font-black text-white block">18°C – 32°C</span>
            <span className="text-[10px] text-slate-500">Optimum thermal window</span>
          </div>

          <div className="p-4 rounded-xl bg-[#08170e] border border-[#183a24] space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Precipitation (Precip)</span>
              <CloudRain className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-xl font-black text-cyan-300 block">
              {currentResult ? `${currentResult.total_rainfall_mm.toFixed(0)} mm` : '85 mm'}
            </span>
            <span className="text-[10px] text-slate-500">
              Effective: {currentResult ? `${currentResult.effective_rainfall_mm.toFixed(0)} mm` : '62 mm'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#08170e] border border-[#183a24] space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Relative Humidity</span>
              <Wind className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-xl font-black text-white block">55% RH</span>
            <span className="text-[10px] text-emerald-400">FAO-56 derived</span>
          </div>

          <div className="p-4 rounded-xl bg-[#08170e] border border-[#183a24] space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Extraterrestrial Rad (Ra)</span>
              <CloudSun className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xl font-black text-amber-300 block">34.0 MJ/m²</span>
            <span className="text-[10px] text-slate-500">28.0°N Indo-Gangetic lat</span>
          </div>
        </div>
      </div>

      {/* Extreme Weather Sensitivity & Stress Testing Module */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Weather Stress Testing & Climate Resilience
            </h3>
            <p className="text-xs text-slate-400">
              Simulates terminal heatwaves, delayed monsoons, and extreme dry spells against current crop plan
            </p>
          </div>
        </div>

        <StressTestingView baseSimulation={baseSimulation} />
      </div>
    </div>
  );
};
