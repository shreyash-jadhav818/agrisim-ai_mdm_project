import React, { useState } from 'react';
import {
  MapPin,
  Layers,
  Sprout,
  Droplets,
  Calendar,
  Save,
  CheckCircle2,
  Sliders,
  Sparkles,
  Info,
  Maximize2,
  RefreshCw
} from 'lucide-react';
import { FarmProfile, Crop, SoilType, AgroZone, SimulationResult } from '../types';

interface FarmDigitalTwinPageProps {
  farm: FarmProfile;
  onSaveFarm: (updatedFarm: FarmProfile) => void;
  crops: Crop[];
  soils: SoilType[];
  zones: AgroZone[];
  selectedCropId: string;
  onSelectCrop: (cropId: string) => void;
  currentResult: SimulationResult | null;
}

export const FarmDigitalTwinPage: React.FC<FarmDigitalTwinPageProps> = ({
  farm,
  onSaveFarm,
  crops,
  soils,
  zones,
  selectedCropId,
  onSelectCrop,
  currentResult
}) => {
  const [formData, setFormData] = useState<FarmProfile>({ ...farm });
  const [areaUnit, setAreaUnit] = useState<'acres' | 'hectares'>('acres');
  const [activeLayer, setActiveLayer] = useState<'crop' | 'soil' | 'moisture' | 'irrigation'>('crop');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const selectedCrop = crops.find((c) => c.id === selectedCropId) || crops[0];
  const selectedSoil = soils.find((s) => s.name === formData.soil_type) || soils[0];

  const handleUnitToggle = (unit: 'acres' | 'hectares') => {
    if (unit === areaUnit) return;
    if (unit === 'hectares') {
      // acres to hectares
      setFormData((prev) => ({
        ...prev,
        total_acres: Math.round(prev.total_acres * 0.404686 * 100) / 100
      }));
    } else {
      // hectares to acres
      setFormData((prev) => ({
        ...prev,
        total_acres: Math.round(prev.total_acres * 2.47105 * 100) / 100
      }));
    }
    setAreaUnit(unit);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveFarm(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Convert displayed area to standard acres for calculation
  const standardAcres = areaUnit === 'hectares' ? formData.total_acres * 2.47105 : formData.total_acres;
  const standardHa = standardAcres * 0.404686;

  return (
    <div className="space-y-6">
      {/* Top Banner Alert / Guidance */}
      <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 flex items-start gap-3 text-xs text-emerald-200">
        <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-emerald-300">
            Biophysical Digital Twin Profile
          </p>
          <p className="text-slate-300 leading-relaxed">
            The Digital Twin synchronizes your spatial farm profile with validated FAO-56 crop parameters, ICAR agro-climatic zones, and soil hydraulic retention limits.
            Physical metrics are computed by the backend simulation engine.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Farm Profile Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="agri-card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#183a24] pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  Farm Identity & Soil Horizon
                </h3>
                <p className="text-xs text-slate-400">Configure land parcels, boundary area, and hydraulic parameters</p>
              </div>
              {isSaved && (
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Farm Name */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Farm Name / Holding Title</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="agri-input"
                  placeholder="e.g. Malwa Agro Holdings Plot-A"
                  required
                />
              </div>

              {/* Area & Unit Switcher */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-medium">Farm Area</label>
                    <div className="flex rounded-lg bg-[#07170e] p-0.5 border border-[#1b3d27]">
                      <button
                        type="button"
                        onClick={() => handleUnitToggle('acres')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          areaUnit === 'acres' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        Acres
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnitToggle('hectares')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          areaUnit === 'hectares' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        Hectares
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10000"
                      value={formData.total_acres}
                      onChange={(e) => setFormData({ ...formData, total_acres: parseFloat(e.target.value) || 0 })}
                      className="agri-input pr-14"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold uppercase">
                      {areaUnit}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Equates to ≈ {standardHa.toFixed(2)} hectares / {standardAcres.toFixed(2)} acres
                  </span>
                </div>

                {/* State / Region */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium">State / Agricultural Region</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="agri-input capitalize"
                  >
                    {['Punjab', 'Haryana', 'Uttar Pradesh', 'Maharashtra', 'Gujarat', 'Madhya Pradesh', 'Rajasthan', 'Karnataka', 'Telangana', 'Andhra Pradesh', 'Tamil Nadu', 'Bihar', 'West Bengal'].map(
                      (st) => (
                        <option key={st} value={st} className="bg-[#0b1c11]">
                          {st}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* Agro-Climatic Zone & Soil Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium">Agro-Climatic Zone</label>
                  <select
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    className="agri-input"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.name} className="bg-[#0b1c11]">
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium">Soil Horizon & Texture</label>
                  <select
                    value={formData.soil_type}
                    onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
                    className="agri-input"
                  >
                    {soils.map((s) => (
                      <option key={s.id} value={s.name} className="bg-[#0b1c11]">
                        {s.name} ({s.hindi_name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Irrigation Delivery System */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Primary Irrigation Infrastructure</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'drip', name: 'Micro Drip', eff: '92% eff' },
                    { id: 'sprinkler', name: 'Sprinkler', eff: '80% eff' },
                    { id: 'furrow', name: 'Furrow', eff: '65% eff' },
                    { id: 'flood', name: 'Basin / Flood', eff: '55% eff' }
                  ].map((sys) => (
                    <button
                      key={sys.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, irrigation_system: sys.id })}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        formData.irrigation_system === sys.id
                          ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-lg'
                          : 'bg-[#08170e] border-[#183923] text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="block font-semibold text-xs">{sys.name}</span>
                      <span className="block text-[10px] text-emerald-400">{sys.eff}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Soil Properties Card */}
              {selectedSoil && (
                <div className="p-3.5 rounded-xl bg-[#07160d] border border-[#183b24] space-y-2 text-xs">
                  <span className="text-emerald-400 font-semibold block text-[11px] uppercase tracking-wider">
                    Soil Hydraulic Retention Profile ({selectedSoil.name})
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-slate-300 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Field Capacity (FC):</span>
                      <span className="font-semibold text-white">{(selectedSoil.field_capacity_vol * 100).toFixed(0)}% vol</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Wilting Point (PWP):</span>
                      <span className="font-semibold text-white">{(selectedSoil.wilting_point_vol * 100).toFixed(0)}% vol</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Available Water (AWC):</span>
                      <span className="font-semibold text-white">{selectedSoil.available_water_mm_per_m} mm/m</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button type="submit" className="agri-btn-primary px-5 py-2.5">
                  <Save className="w-4 h-4" />
                  <span>Save Farm Profile</span>
                </button>
              </div>
            </form>
          </div>

          {/* Supported Indian Crops Catalog Selection */}
          <div className="agri-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#183a24] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-emerald-400" />
                  Crop Selection & Benchmark Potential
                </h3>
                <p className="text-xs text-slate-400">Validated agronomic benchmarks for Indian crops</p>
              </div>
              <span className="text-xs text-emerald-400 font-semibold">
                {crops.length} crops loaded
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {crops.map((crop) => (
                <button
                  key={crop.id}
                  onClick={() => onSelectCrop(crop.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedCropId === crop.id
                      ? 'bg-emerald-950 border-emerald-500 text-white shadow-lg'
                      : 'bg-[#08170e] border-[#183923] text-slate-300 hover:border-emerald-800'
                  }`}
                >
                  <span className="block font-bold text-xs truncate capitalize">{crop.name}</span>
                  <span className="block text-[10px] text-emerald-400 font-medium">{crop.hindi_name}</span>
                  <span className="block text-[10px] text-slate-500 mt-1 capitalize">{crop.season}</span>
                </button>
              ))}
            </div>

            {selectedCrop && (
              <div className="p-4 rounded-xl bg-[#07160d] border border-[#183b24] space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#153420] pb-2">
                  <div>
                    <span className="text-sm font-bold text-white capitalize">{selectedCrop.name}</span>
                    <span className="text-slate-400 ml-2 italic">({selectedCrop.hindi_name})</span>
                  </div>
                  <div className="text-[11px] text-emerald-300 font-medium">
                    Duration: ~{selectedCrop.duration_days} days • Season: {selectedCrop.season}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Reference Potential:</span>
                    <span className="font-bold text-emerald-300">{selectedCrop.potential_yield_quintal_acre} q/ac</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Optimum Temperature:</span>
                    <span className="font-semibold text-white">{selectedCrop.opt_temp_c}°C (Max {selectedCrop.max_temp_c}°C)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Optimal N-P-K (kg/ac):</span>
                    <span className="font-semibold text-white">{selectedCrop.default_n_req_kg_acre}-{selectedCrop.default_p_req_kg_acre}-{selectedCrop.default_k_req_kg_acre}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">MSP Benchmark:</span>
                    <span className="font-semibold text-amber-300">₹{selectedCrop.msp_inr_per_quintal}/q</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 2D Digital Twin Interactive Canvas (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="agri-card p-5 space-y-4 sticky top-24">
            <div className="flex items-center justify-between border-b border-[#183a24] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Field Horizon Canvas (2D Digital Twin)
                </h3>
                <p className="text-[11px] text-slate-400">Layered visualization of root zone & canopy</p>
              </div>

              {/* Layer Selection Pills */}
              <div className="flex rounded-lg bg-[#07160d] p-0.5 border border-[#1b3d27] text-[10px]">
                <button
                  onClick={() => setActiveLayer('crop')}
                  className={`px-2 py-0.5 rounded font-medium ${
                    activeLayer === 'crop' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Canopy
                </button>
                <button
                  onClick={() => setActiveLayer('soil')}
                  className={`px-2 py-0.5 rounded font-medium ${
                    activeLayer === 'soil' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Soil
                </button>
                <button
                  onClick={() => setActiveLayer('moisture')}
                  className={`px-2 py-0.5 rounded font-medium ${
                    activeLayer === 'moisture' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Moisture
                </button>
              </div>
            </div>

            {/* Interactive 2D Field Diagram */}
            <div className="relative w-full h-80 rounded-2xl overflow-hidden bg-gradient-to-b from-[#091b10] via-[#0b2416] to-[#121c13] border border-[#183d25] p-4 flex flex-col justify-between shadow-inner">
              {/* Decorative Atmosphere / Sunshine Layer */}
              <div className="flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                  <Sprout className="w-4 h-4" />
                  <span className="capitalize">{selectedCrop?.name || 'Wheat'} Canopy</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Solar Rad: 19.5 MJ/m²
                </div>
              </div>

              {/* 2D Field Visualization Canvas */}
              <div className="relative flex-1 my-3 flex flex-col justify-end">
                {/* Visual Field Rows */}
                <div className="w-full h-28 rounded-xl bg-gradient-to-t from-[#1b3821] to-[#254f2f] relative overflow-hidden border border-[#2b5835] shadow-lg flex items-center justify-around px-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center space-y-1">
                      <div className="w-6 h-12 rounded-t-full bg-gradient-to-t from-emerald-600 to-green-400 animate-pulse opacity-90 shadow-sm" />
                      <div className="w-1.5 h-3 bg-amber-700 rounded-b" />
                    </div>
                  ))}

                  {/* Layer Overlay Display */}
                  <div className="absolute inset-x-0 bottom-0 py-1 bg-[#0a1b10]/80 backdrop-blur-xs text-center text-[10px] text-emerald-300 font-semibold border-t border-[#1f472a]">
                    {activeLayer === 'crop' && `Canopy Ground Cover: ~82% • Kc: ${selectedCrop?.stages[1]?.kc || 0.85}`}
                    {activeLayer === 'soil' && `Soil Texture: ${formData.soil_type} • Bulk Density: 1.35 g/cm³`}
                    {activeLayer === 'moisture' && `Root Zone Depletion: RAW compliant (No drought stress)`}
                    {activeLayer === 'irrigation' && `Drip Uniformity: 92% • Depth: ~50 mm / cycle`}
                  </div>
                </div>

                {/* Subsurface Root Zone Layer */}
                <div className="w-full h-24 rounded-b-xl bg-gradient-to-b from-[#2a241b] to-[#1a1510] border-t-2 border-emerald-500/40 p-2 flex flex-col justify-between text-[10px]">
                  <div className="flex justify-between text-amber-200/90 font-medium">
                    <span>Root Depth Horizon: {selectedCrop?.root_depth_min_m || 0.2}m to {selectedCrop?.root_depth_max_m || 1.2}m</span>
                    <span>Ksat: {selectedSoil?.ksat_mm_day || 350} mm/d</span>
                  </div>
                  <div className="w-full bg-[#120f0b] rounded-full h-2 overflow-hidden border border-[#3b3226]">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                      style={{ width: '68%' }}
                    />
                  </div>
                  <div className="flex justify-between text-slate-400 text-[9px]">
                    <span>Wilting Point (PWP)</span>
                    <span className="text-cyan-400 font-semibold">Available Moisture: ~68%</span>
                    <span>Field Capacity (FC)</span>
                  </div>
                </div>
              </div>

              {/* Legend & Scientific Disclaimer */}
              <div className="text-[10px] text-slate-400 text-center flex items-center justify-between border-t border-[#183b24] pt-2">
                <span className="text-emerald-400 font-medium">FAO-56 Soil Moisture Layer</span>
                <span className="italic text-slate-500">Visual mockup; real ET/depletion solved by backend</span>
              </div>
            </div>

            {/* Quick Farm Summary Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#091b10] border border-[#1b3d27]">
                <span className="text-slate-400 block text-[10px]">Farm Total Area</span>
                <span className="font-bold text-white text-sm">
                  {formData.total_acres} {areaUnit}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#091b10] border border-[#1b3d27]">
                <span className="text-slate-400 block text-[10px]">Water Method</span>
                <span className="font-bold text-emerald-400 text-sm capitalize">
                  {formData.irrigation_system}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
