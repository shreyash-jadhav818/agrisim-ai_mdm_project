import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  Plus,
  Trash2,
  Calendar,
  Droplet,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  DollarSign
} from 'lucide-react';
import { Crop, SimulationInput, IrrigationEvent, FertilizerApplication } from '../types';

interface SimulatorControlsProps {
  crops: Crop[];
  selectedCropId: string;
  onSelectCrop: (cropId: string) => void;
  simulationInput: SimulationInput;
  onChangeInput: (updated: SimulationInput) => void;
  onRunSimulation: () => void;
  loading: boolean;
}

export const SimulatorControls: React.FC<SimulatorControlsProps> = ({
  crops,
  selectedCropId,
  onSelectCrop,
  simulationInput,
  onChangeInput,
  onRunSimulation,
  loading
}) => {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'irrigation' | 'fertilizer' | 'economics'>('irrigation');

  const selectedCrop = crops.find(c => c.id === selectedCropId) || crops[0];

  const handleAddIrrigation = () => {
    const nextDay = simulationInput.irrigation_schedule.length > 0
      ? Math.min(selectedCrop.duration_days - 5, simulationInput.irrigation_schedule[simulationInput.irrigation_schedule.length - 1].day + 20)
      : 21;
    const newEvent: IrrigationEvent = {
      day: nextDay,
      amount_mm: 50.0,
      method: simulationInput.farm_profile.irrigation_system || 'drip'
    };
    onChangeInput({
      ...simulationInput,
      irrigation_schedule: [...simulationInput.irrigation_schedule, newEvent].sort((a, b) => a.day - b.day)
    });
  };

  const handleRemoveIrrigation = (idx: number) => {
    const updated = simulationInput.irrigation_schedule.filter((_, i) => i !== idx);
    onChangeInput({ ...simulationInput, irrigation_schedule: updated });
  };

  const handleUpdateIrrigation = (idx: number, field: keyof IrrigationEvent, val: any) => {
    const updated = [...simulationInput.irrigation_schedule];
    updated[idx] = { ...updated[idx], [field]: val };
    onChangeInput({ ...simulationInput, irrigation_schedule: updated.sort((a, b) => a.day - b.day) });
  };

  const handleAddFertilizer = () => {
    const nextDay = simulationInput.fertilizer_plan.length > 0 ? 35 : 1;
    const newEvent: FertilizerApplication = {
      day: nextDay,
      n_kg_acre: 15.0,
      p_kg_acre: 0.0,
      k_kg_acre: 0.0,
      fertilizer_name: 'Top Dressing'
    };
    onChangeInput({
      ...simulationInput,
      fertilizer_plan: [...simulationInput.fertilizer_plan, newEvent].sort((a, b) => a.day - b.day)
    });
  };

  const handleRemoveFertilizer = (idx: number) => {
    const updated = simulationInput.fertilizer_plan.filter((_, i) => i !== idx);
    onChangeInput({ ...simulationInput, fertilizer_plan: updated });
  };

  const handleUpdateFertilizer = (idx: number, field: keyof FertilizerApplication, val: any) => {
    const updated = [...simulationInput.fertilizer_plan];
    updated[idx] = { ...updated[idx], [field]: val };
    onChangeInput({ ...simulationInput, fertilizer_plan: updated.sort((a, b) => a.day - b.day) });
  };

  const resetToRecommendedDoses = () => {
    if (!selectedCrop) return;
    const dur = selectedCrop.duration_days;
    const defIrr: IrrigationEvent[] = [
      { day: Math.round(dur * 0.18), amount_mm: 50.0, method: simulationInput.farm_profile.irrigation_system },
      { day: Math.round(dur * 0.38), amount_mm: 50.0, method: simulationInput.farm_profile.irrigation_system },
      { day: Math.round(dur * 0.62), amount_mm: 50.0, method: simulationInput.farm_profile.irrigation_system },
      { day: Math.round(dur * 0.80), amount_mm: 40.0, method: simulationInput.farm_profile.irrigation_system }
    ];
    const defFert: FertilizerApplication[] = [
      {
        day: 1,
        n_kg_acre: Math.round(selectedCrop.default_n_req_kg_acre * 0.4),
        p_kg_acre: selectedCrop.default_p_req_kg_acre,
        k_kg_acre: selectedCrop.default_k_req_kg_acre,
        fertilizer_name: 'Basal Dose'
      },
      {
        day: Math.round(dur * 0.25),
        n_kg_acre: Math.round(selectedCrop.default_n_req_kg_acre * 0.3),
        p_kg_acre: 0,
        k_kg_acre: 0,
        fertilizer_name: 'First Top Dressing'
      },
      {
        day: Math.round(dur * 0.50),
        n_kg_acre: Math.round(selectedCrop.default_n_req_kg_acre * 0.3),
        p_kg_acre: 0,
        k_kg_acre: 0,
        fertilizer_name: 'Second Top Dressing'
      }
    ];
    onChangeInput({
      ...simulationInput,
      crop_id: selectedCrop.id,
      irrigation_schedule: defIrr,
      fertilizer_plan: defFert,
      mulching_used: false,
      custom_price_per_quintal: undefined
    });
  };

  const totalIrrigationMm = simulationInput.irrigation_schedule.reduce((acc, curr) => acc + curr.amount_mm, 0);
  const totalN = simulationInput.fertilizer_plan.reduce((acc, curr) => acc + curr.n_kg_acre, 0);
  const totalP = simulationInput.fertilizer_plan.reduce((acc, curr) => acc + curr.p_kg_acre, 0);
  const totalK = simulationInput.fertilizer_plan.reduce((acc, curr) => acc + curr.k_kg_acre, 0);

  return (
    <div className="agri-card p-5 space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>What-If Decision Simulator</span>
            <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Interactive Controls
            </span>
          </h2>
          <p className="text-xs text-slate-400">Configure agronomic inputs and evaluate impact on yield, water, and profit</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetToRecommendedDoses}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Baseline</span>
          </button>

          <button
            type="button"
            onClick={onRunSimulation}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            <span>Run Simulation</span>
          </button>
        </div>
      </div>

      {/* Crop Selector Grid */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-2">
          Select Crop (14 Indian Agricultural Benchmarks)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {crops.map((crop) => {
            const isSelected = crop.id === selectedCropId;
            return (
              <button
                key={crop.id}
                type="button"
                onClick={() => {
                  onSelectCrop(crop.id);
                  onChangeInput({ ...simulationInput, crop_id: crop.id });
                }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md shadow-emerald-950/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    {crop.season}
                  </span>
                  <span className="text-[10px] text-slate-400">{crop.duration_days}d</span>
                </div>
                <div className="font-bold text-xs truncate">{crop.name.split(' (')[0]}</div>
                <div className="text-[11px] text-slate-400 truncate">{crop.hindi_name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sowing Date, Mulching & Soil OM */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            Sowing Date
          </label>
          <input
            type="date"
            value={simulationInput.sowing_date}
            onChange={(e) => onChangeInput({ ...simulationInput, sowing_date: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
            <span>Soil Organic Matter</span>
            <span className="text-emerald-400 font-bold">{simulationInput.soil_organic_matter_pct}%</span>
          </label>
          <input
            type="range"
            min="0.2"
            max="2.5"
            step="0.1"
            value={simulationInput.soil_organic_matter_pct}
            onChange={(e) => onChangeInput({ ...simulationInput, soil_organic_matter_pct: parseFloat(e.target.value) })}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>0.2% (Low)</span>
            <span>1.0% (Medium)</span>
            <span>2.5% (High)</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Surface Mulching</label>
          <button
            type="button"
            onClick={() => onChangeInput({ ...simulationInput, mulching_used: !simulationInput.mulching_used })}
            className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors ${
              simulationInput.mulching_used
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Plastic / Straw Mulch</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-950">
              {simulationInput.mulching_used ? 'ENABLED (-25% Es)' : 'DISABLED'}
            </span>
          </button>
        </div>
      </div>

      {/* Sub-tabs for Irrigation, Fertilizer, and Economic Overrides */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('irrigation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeSubTab === 'irrigation'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Irrigation Schedule ({totalIrrigationMm.toFixed(0)} mm)
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('fertilizer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeSubTab === 'fertilizer'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Nutrients N-P-K ({totalN.toFixed(0)}-{totalP.toFixed(0)}-{totalK.toFixed(0)} kg)
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('economics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeSubTab === 'economics'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Market & Tariffs (₹)
            </button>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:block">
            {activeSubTab === 'irrigation' && 'Add stage-specific irrigation depths (mm)'}
            {activeSubTab === 'fertilizer' && 'Split application optimizes uptake efficiency'}
            {activeSubTab === 'economics' && 'Minimum Support Price (MSP) benchmarks'}
          </div>
        </div>

        {/* Irrigation Tab Content */}
        {activeSubTab === 'irrigation' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {simulationInput.irrigation_schedule.map((event, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 relative group">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>Irrigation #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveIrrigation(idx)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400">Day (DAS)</span>
                      <input
                        type="number"
                        min="1"
                        max={selectedCrop.duration_days}
                        value={event.day}
                        onChange={(e) => handleUpdateIrrigation(idx, 'day', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Depth (mm)</span>
                      <input
                        type="number"
                        min="0"
                        max="150"
                        step="5"
                        value={event.amount_mm}
                        onChange={(e) => handleUpdateIrrigation(idx, 'amount_mm', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400">Method</span>
                    <select
                      value={event.method}
                      onChange={(e) => handleUpdateIrrigation(idx, 'method', e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="drip">Drip (92%)</option>
                      <option value="sprinkler">Sprinkler (80%)</option>
                      <option value="furrow">Furrow (65%)</option>
                      <option value="flood">Flood (55%)</option>
                    </select>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddIrrigation}
                className="p-4 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/70 hover:bg-emerald-500/5 text-slate-400 hover:text-emerald-400 flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold"
              >
                <Plus className="w-5 h-5" />
                <span>Add Irrigation Event</span>
              </button>
            </div>
          </div>
        )}

        {/* Fertilizer Tab Content */}
        {activeSubTab === 'fertilizer' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {simulationInput.fertilizer_plan.map((event, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <input
                      type="text"
                      value={event.fertilizer_name}
                      onChange={(e) => handleUpdateFertilizer(idx, 'fertilizer_name', e.target.value)}
                      className="bg-transparent border-b border-dashed border-slate-700 text-xs text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFertilizer(idx)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove Application"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Day:</span>
                    <input
                      type="number"
                      min="1"
                      max={selectedCrop.duration_days}
                      value={event.day}
                      onChange={(e) => handleUpdateFertilizer(idx, 'day', parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-blue-400">N (kg/ac)</span>
                      <input
                        type="number"
                        min="0"
                        max="150"
                        value={event.n_kg_acre}
                        onChange={(e) => handleUpdateFertilizer(idx, 'n_kg_acre', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-400">P2O5 (kg/ac)</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={event.p_kg_acre}
                        onChange={(e) => handleUpdateFertilizer(idx, 'p_kg_acre', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-purple-400">K2O (kg/ac)</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={event.k_kg_acre}
                        onChange={(e) => handleUpdateFertilizer(idx, 'k_kg_acre', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddFertilizer}
                className="p-4 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/70 hover:bg-emerald-500/5 text-slate-400 hover:text-emerald-400 flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold"
              >
                <Plus className="w-5 h-5" />
                <span>Add Fertilizer Dose</span>
              </button>
            </div>
          </div>
        )}

        {/* Economics Tab Content */}
        {activeSubTab === 'economics' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Market Price (₹ / Quintal)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-500">₹</span>
                <input
                  type="number"
                  placeholder={`MSP: ₹${selectedCrop.msp_inr_per_quintal}`}
                  value={simulationInput.custom_price_per_quintal || ''}
                  onChange={(e) => onChangeInput({
                    ...simulationInput,
                    custom_price_per_quintal: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                  className="w-full pl-7 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="text-[10px] text-emerald-400 mt-1 block">
                Govt MSP: ₹{selectedCrop.msp_inr_per_quintal} / quintal
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pumping Energy Rate (₹ / m³ water)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-500">₹</span>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Default: ₹1.20 / m³"
                  value={simulationInput.electricity_or_diesel_cost_per_m3 || ''}
                  onChange={(e) => onChangeInput({
                    ...simulationInput,
                    electricity_or_diesel_cost_per_m3: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                  className="w-full pl-7 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Electric tube-well vs Diesel pump
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Seed Cost (₹ / Acre)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-500">₹</span>
                <input
                  type="number"
                  placeholder={`Benchmark: ₹${selectedCrop.economics?.seed_cost_acre || 2000}`}
                  value={simulationInput.custom_seed_cost_per_acre || ''}
                  onChange={(e) => onChangeInput({
                    ...simulationInput,
                    custom_seed_cost_per_acre: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                  className="w-full pl-7 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Certified hybrid vs farm saved seed
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
