import React, { useState } from 'react';
import { X, MapPin, CheckCircle, Droplets, Mountain, ShieldCheck } from 'lucide-react';
import { FarmProfile, SoilType, AgroZone } from '../types';

interface FarmProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  farm: FarmProfile;
  onSave: (updated: FarmProfile) => void;
  soils: SoilType[];
  zones: AgroZone[];
}

const INDIAN_STATES = [
  'Punjab', 'Haryana', 'Uttar Pradesh', 'Maharashtra', 'Madhya Pradesh',
  'Rajasthan', 'Gujarat', 'Karnataka', 'Telangana', 'Andhra Pradesh',
  'Tamil Nadu', 'West Bengal', 'Bihar', 'Odisha', 'Chhattisgarh'
];

export const FarmProfileModal: React.FC<FarmProfileModalProps> = ({
  isOpen,
  onClose,
  farm,
  onSave,
  soils,
  zones
}) => {
  const [formData, setFormData] = useState<FarmProfile>({ ...farm });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const selectedSoil = soils.find(s => s.name === formData.soil_type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Farm Profile Configuration</h2>
              <p className="text-xs text-slate-400">Set geographical, soil, and irrigation baselines for simulation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Farm Name & State */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Farm / Holding Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-emerald-500 text-sm text-white focus:outline-none"
                placeholder="e.g. Kisan Smart Agro Farm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">State</label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-emerald-500 text-sm text-white focus:outline-none"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Agro-Climatic Zone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Agro-Climatic Zone (IMD Normals)</label>
            <select
              value={formData.zone}
              onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-emerald-500 text-sm text-white focus:outline-none"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} (Rainfall: {z.annual_rainfall_mm} mm/yr)
                </option>
              ))}
            </select>
          </div>

          {/* Acreage & Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Total Cultivable Area (Acres)</label>
              <span className="text-xs text-emerald-400 font-bold">{formData.total_acres} Acres (~{(formData.total_acres * 0.4047).toFixed(2)} Hectares)</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0.5"
                max="500"
                step="0.5"
                value={formData.total_acres}
                onChange={(e) => setFormData({ ...formData, total_acres: parseFloat(e.target.value) || 1 })}
                className="w-32 px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-emerald-500 text-sm text-white focus:outline-none"
              />
              <div className="flex gap-1.5">
                {[1.0, 2.5, 5.0, 10.0, 25.0].map((ac) => (
                  <button
                    key={ac}
                    type="button"
                    onClick={() => setFormData({ ...formData, total_acres: ac })}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium border ${
                      formData.total_acres === ac
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {ac} ac
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Soil Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Soil Texture Order</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {soils.map((s) => {
                const isSelected = formData.soil_type === s.name;
                return (
                  <div
                    key={s.id}
                    onClick={() => setFormData({ ...formData, soil_type: s.name })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs">{s.name}</span>
                      <span className="text-[10px] text-slate-400">{s.hindi_name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{s.description}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-emerald-400/90 font-mono">
                      <span>AWC: {s.available_water_mm_per_m} mm/m</span>
                      <span>Ksat: {s.ksat_mm_day} mm/d</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Irrigation System */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Primary Irrigation System</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'drip', label: 'Drip System', eff: '92% Efficiency', desc: 'Micro-irrigation' },
                { id: 'sprinkler', label: 'Sprinkler', eff: '80% Efficiency', desc: 'Overhead spray' },
                { id: 'furrow', label: 'Furrow', eff: '65% Efficiency', desc: 'Ridge channels' },
                { id: 'flood', label: 'Flood / Basin', eff: '55% Efficiency', desc: 'Traditional check-basin' },
              ].map((irr) => {
                const isSelected = formData.irrigation_system === irr.id;
                return (
                  <div
                    key={irr.id}
                    onClick={() => setFormData({ ...formData, irrigation_system: irr.id })}
                    className={`p-2.5 rounded-lg border cursor-pointer text-center transition-all ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500 text-white font-medium'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Droplets className={`w-4 h-4 mx-auto mb-1 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <div className="text-xs">{irr.label}</div>
                    <div className="text-[10px] text-emerald-400">{irr.eff}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-950/40 transition-colors"
            >
              Save Farm Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
