import React, { useState } from 'react';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Sprout,
  Droplets,
  CloudSun,
  FlaskConical,
  DollarSign,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Sparkles,
  Layers,
  MapPin
} from 'lucide-react';
import { Crop, SoilType, AgroZone, FarmProfile, ModularFarmInput, WhatIfSuiteResult, SimulationResult } from '../types';
import { executeWhatIfSuite, executeSimulation } from '../services/api';

interface NewSimulationWizardProps {
  crops: Crop[];
  soils: SoilType[];
  zones: AgroZone[];
  activeFarm: FarmProfile;
  onSimulationSuccess: (suite: WhatIfSuiteResult, standardResult?: SimulationResult) => void;
  onNavigate: (tab: string) => void;
}

export const NewSimulationWizard: React.FC<NewSimulationWizardProps> = ({
  crops,
  soils,
  zones,
  activeFarm,
  onSimulationSuccess,
  onNavigate
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<ModularFarmInput>({
    crop_type: 'wheat',
    farm_area: activeFarm.total_acres || 3.0,
    farm_area_unit: 'acres',
    soil_type: activeFarm.soil_type || 'Alluvial Loam',
    irrigation_method: activeFarm.irrigation_system || 'drip',
    sowing_date: '2026-11-15',
    crop_duration_days: 135,
    temperature_c: 24.5,
    tmin_c: 16.0,
    tmax_c: 32.0,
    rainfall_mm: 85.0,
    relative_humidity_pct: 55.0,
    irrigation_depth_mm: 320.0,
    irrigation_frequency: 5,
    nitrogen_kg_ha: 120.0,
    phosphorus_kg_ha: 60.0,
    potassium_kg_ha: 40.0,
    fertilizer_cost_total: 4200.0,
    irrigation_cost_total: 2500.0,
    other_production_costs: 8000.0,
    crop_selling_price_per_quintal: 2275.0,
    mulching_used: false,
    soil_organic_matter_pct: 0.85
  });

  // Selected crop details
  const selectedCrop = crops.find((c) => c.id.toLowerCase() === formData.crop_type.toLowerCase()) || crops[0];

  const steps = [
    { num: 1, title: 'Farm Details', icon: MapPin },
    { num: 2, title: 'Crop Details', icon: Sprout },
    { num: 3, title: 'Weather Inputs', icon: CloudSun },
    { num: 4, title: 'Water Management', icon: Droplets },
    { num: 5, title: 'Nutrients', icon: FlaskConical },
    { num: 6, title: 'Financials', icon: DollarSign },
    { num: 7, title: 'What-If Scenarios', icon: Sliders },
    { num: 8, title: 'Review & Run', icon: Sparkles }
  ];

  // Validation function per step
  const validateStep = (step: number): boolean => {
    setErrorMessage(null);
    if (step === 1) {
      if (formData.farm_area <= 0) {
        setErrorMessage('Farm area must be greater than 0.');
        return false;
      }
    } else if (step === 2) {
      if (!formData.sowing_date) {
        setErrorMessage('Please select a valid sowing date.');
        return false;
      }
    } else if (step === 3) {
      if (formData.rainfall_mm !== undefined && formData.rainfall_mm < 0) {
        setErrorMessage('Rainfall cannot be negative.');
        return false;
      }
    } else if (step === 4) {
      if (formData.irrigation_depth_mm !== undefined && formData.irrigation_depth_mm < 0) {
        setErrorMessage('Irrigation depth cannot be negative.');
        return false;
      }
    } else if (step === 5) {
      if (formData.nitrogen_kg_ha < 0 || formData.phosphorus_kg_ha < 0 || formData.potassium_kg_ha < 0) {
        setErrorMessage('Nutrient application rates cannot be negative.');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(steps.length, prev + 1));
    }
  };

  const prevStep = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Execute the real backend What-If Suite (Scenarios A through H)
      const suiteResult = await executeWhatIfSuite(formData);

      // Also trigger standard simulation to populate legacy tabs
      const standardInput = {
        farm_profile: {
          name: activeFarm.name,
          state: activeFarm.state,
          zone: activeFarm.zone,
          total_acres: formData.farm_area_unit === 'hectares' ? formData.farm_area * 2.471 : formData.farm_area,
          soil_type: formData.soil_type,
          irrigation_system: formData.irrigation_method
        },
        crop_id: formData.crop_type,
        sowing_date: formData.sowing_date,
        soil_organic_matter_pct: formData.soil_organic_matter_pct || 0.8,
        mulching_used: formData.mulching_used,
        irrigation_schedule: [
          { day: 21, amount_mm: 50.0, method: formData.irrigation_method },
          { day: 45, amount_mm: 50.0, method: formData.irrigation_method },
          { day: 75, amount_mm: 50.0, method: formData.irrigation_method }
        ],
        fertilizer_plan: [
          { day: 1, n_kg_acre: Math.round(formData.nitrogen_kg_ha * 0.404 * 0.5), p_kg_acre: 20, k_kg_acre: 15, fertilizer_name: 'Basal Dose' }
        ],
        custom_price_per_quintal: formData.crop_selling_price_per_quintal
      };

      const stdRes = await executeSimulation(standardInput).catch(() => undefined);

      onSimulationSuccess(suiteResult, stdRes);
      onNavigate('scenarios');
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrorMessage(err.message || 'Simulation execution failed. Please verify farm inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Wizard Step Progress Header */}
      <div className="agri-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">
            Step {currentStep} of {steps.length} — {steps[currentStep - 1].title}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {Math.round((currentStep / steps.length) * 100)}% Completed
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#08150d] h-2 rounded-full overflow-hidden border border-[#1b3d27] mb-4">
          <div
            className="bg-gradient-to-r from-emerald-500 to-green-400 h-full rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>

        {/* Step Icons Pill Bar */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center text-[10px]">
          {steps.map((s) => {
            const Icon = s.icon;
            const isDone = s.num < currentStep;
            const isCurr = s.num === currentStep;

            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (s.num <= currentStep) setCurrentStep(s.num);
                }}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  isCurr
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg'
                    : isDone
                    ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                    : 'bg-[#08160e] border-[#183621] text-slate-500'
                }`}
              >
                {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                <span className="truncate w-full font-medium">{s.title.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step Content Container */}
      <div className="agri-card p-6 space-y-6">
        {/* STEP 1: Farm Details */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="border-b border-[#183a24] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                Step 1: Farm Area, Soil & Water Delivery System
              </h3>
              <p className="text-xs text-slate-400">Establish the physical and hydraulic foundation of the simulated plot</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Farm Holding Area</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="50000"
                    value={formData.farm_area}
                    onChange={(e) => setFormData({ ...formData, farm_area: parseFloat(e.target.value) || 0 })}
                    className="agri-input flex-1"
                    required
                  />
                  <select
                    value={formData.farm_area_unit}
                    onChange={(e) => setFormData({ ...formData, farm_area_unit: e.target.value as any })}
                    className="agri-input w-28"
                  >
                    <option value="acres">Acres</option>
                    <option value="hectares">Hectares</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Soil Horizon Type</label>
                <select
                  value={formData.soil_type}
                  onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
                  className="agri-input"
                >
                  {soils.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.hindi_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Primary Irrigation Method</label>
                <select
                  value={formData.irrigation_method}
                  onChange={(e) => setFormData({ ...formData, irrigation_method: e.target.value })}
                  className="agri-input capitalize"
                >
                  <option value="drip">Micro Drip (92% Uniformity Efficiency)</option>
                  <option value="sprinkler">Overhead Sprinkler (80% Efficiency)</option>
                  <option value="furrow">Graded Furrow (65% Efficiency)</option>
                  <option value="flood">Basin / Border Flood (55% Efficiency)</option>
                  <option value="rainfed">Rainfed (Zero Pumping)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Soil Organic Matter (%)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.2"
                  max="3.5"
                  value={formData.soil_organic_matter_pct}
                  onChange={(e) => setFormData({ ...formData, soil_organic_matter_pct: parseFloat(e.target.value) || 0.8 })}
                  className="agri-input"
                />
                <span className="text-[10px] text-slate-500">Determines basal soil mineralization (N, P, K)</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Crop Details */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="border-b border-[#183a24] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sprout className="w-5 h-5 text-emerald-400" />
                Step 2: Crop Selection & Phenological Window
              </h3>
              <p className="text-xs text-slate-400">Select candidate crop and establish sowing calendar</p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300">Select Crop from Validated Catalog</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {crops.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        crop_type: c.id,
                        crop_duration_days: c.duration_days,
                        crop_selling_price_per_quintal: c.msp_inr_per_quintal
                      })
                    }
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.crop_type.toLowerCase() === c.id.toLowerCase()
                        ? 'bg-emerald-950 border-emerald-500 text-white shadow-lg'
                        : 'bg-[#08160e] border-[#183621] text-slate-300 hover:border-emerald-800'
                    }`}
                  >
                    <span className="block font-bold text-xs capitalize">{c.name}</span>
                    <span className="block text-[10px] text-emerald-400">{c.hindi_name}</span>
                    <span className="block text-[9px] text-slate-500 mt-1 capitalize">{c.season}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Sowing Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={formData.sowing_date}
                  onChange={(e) => setFormData({ ...formData, sowing_date: e.target.value })}
                  className="agri-input"
                  required
                />
                <span className="text-[10px] text-slate-500">Evaluates regional thermal window & terminal heat hazard</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Cycle Duration (Days)</label>
                <input
                  type="number"
                  min="45"
                  max="450"
                  value={formData.crop_duration_days}
                  onChange={(e) => setFormData({ ...formData, crop_duration_days: parseInt(e.target.value) || 120 })}
                  className="agri-input"
                />
                <span className="text-[10px] text-slate-500">ICAR default for {selectedCrop.name}: ~{selectedCrop.duration_days} days</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Weather */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="border-b border-[#183a24] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CloudSun className="w-5 h-5 text-emerald-400" />
                Step 3: Meteorological Inputs & Climatology
              </h3>
              <p className="text-xs text-slate-400">Specify expected seasonal weather; unmeasured variables are explicitly flagged</p>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Data Provenance Notice:</strong> Values entered below represent your projected seasonal weather scenario.
                AgriSim AI does not fabricate live weather; if humidity is omitted, FAO-56 dew point approximation is used.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Mean Temperature (°C)</label>
                <input
                  type="number"
                  step="0.5"
                  min="-10"
                  max="52"
                  value={formData.temperature_c}
                  onChange={(e) => setFormData({ ...formData, temperature_c: parseFloat(e.target.value) || 25 })}
                  className="agri-input"
                  required
                />
                <span className="text-[10px] text-slate-500">Regional daily average</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Expected Rainfall (mm)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="3500"
                  value={formData.rainfall_mm}
                  onChange={(e) => setFormData({ ...formData, rainfall_mm: parseFloat(e.target.value) || 0 })}
                  className="agri-input"
                  required
                />
                <span className="text-[10px] text-slate-500">Cumulative seasonal precipitation</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Relative Humidity (%) [Optional]</label>
                <input
                  type="number"
                  step="1"
                  min="5"
                  max="100"
                  value={formData.relative_humidity_pct || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      relative_humidity_pct: e.target.value ? parseFloat(e.target.value) : undefined
                    })
                  }
                  className="agri-input"
                  placeholder="Leave empty if unknown"
                />
                <span className="text-[10px] text-slate-500">Derived from temp if left blank</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Water Management */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="border-b border-[#183a24] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Droplets className="w-5 h-5 text-emerald-400" />
                Step 4: Irrigation Volume & Frequency Schedule
              </h3>
              <p className="text-xs text-slate-400">Configure total irrigation depth and split event frequency</p>
            </div>

            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200">
              <span className="font-semibold block mb-0.5">Physical Volumetric Formula Applied:</span>
              <code className="text-cyan-300 font-mono">
                Water Volume (m³) = Irrigation Depth (mm) × Farm Area (ha) × 10
              </code>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Total Irrigation Depth (mm)</label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  max="2000"
                  value={formData.irrigation_depth_mm}
                  onChange={(e) => setFormData({ ...formData, irrigation_depth_mm: parseFloat(e.target.value) || 0 })}
                  className="agri-input"
                  required
                />
                <span className="text-[10px] text-slate-500">Optimal demand for {selectedCrop.name}: ~400–500 mm</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Number of Irrigation Events</label>
                <input
                  type="number"
                  min="1"
                  max="35"
                  value={formData.irrigation_frequency}
                  onChange={(e) => setFormData({ ...formData, irrigation_frequency: parseInt(e.target.value) || 1 })}
                  className="agri-input"
                />
                <span className="text-[10px] text-slate-500">Evenly distributed across vegetative and grain fill stages</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="mulch_check"
                checked={formData.mulching_used}
                onChange={(e) => setFormData({ ...formData, mulching_used: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-[#08150d] border-[#1d3d28]"
              />
              <label htmlFor="mulch_check" className="text-xs text-slate-300 cursor-pointer">
                <strong>Apply Plastic / Organic Mulching:</strong> Reduces bare soil evaporation by 12%
              </label>
            </div>
          </div>
        )}

        {/* STEP 5: Nutrient Management */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="border-b border-[#183a24] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-emerald-400" />
                Step 5: Nutrient Dosages (Mitscherlich-Baule Law)
              </h3>
              <p className="text-xs text-slate-400">Set mineral fertilizer application rates in kg/ha</p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-200">
              <span className="font-semibold block mb-0.5">Biophysical Safeguard:</span>
              Excessive Nitrogen (&gt; 165 kg/ha for wheat) will trigger lodging and vegetative rankness penalties rather than inflating yield.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Nitrogen N (kg/ha)</label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  max="500"
                  value={formData.nitrogen_kg_ha}
                  onChange={(e) => setFormData({ ...formData, nitrogen_kg_ha: parseFloat(e.target.value) || 0 })}
                  className="agri-input"
                  required
                />
                <span className="text-[10px] text-slate-500">ICAR Rec: ~120 kg/ha</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Phosphorus P₂O₅ (kg/ha)</label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  max="350"
                  value={formData.phosphorus_kg_ha}
                  onChange={(e) => setFormData({ ...formData, phosphorus_kg_ha: parseFloat(e.target.value) || 0 })}
                  className="agri-input"
                  required
                />
                <span className="text-[10px] text-slate-500">ICAR Rec: ~60 kg/ha</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Potassium K₂O (kg/ha)</label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  max="350"
                  value={formData.potassium_kg_ha}
                  onChange={(e) => setFormData({ ...formData, potassium_kg_ha: parseFloat(e.target.value) || 0 })}
                  className="agri-input"
                  required
                />
                <span className="text-[10px] text-slate-500">ICAR Rec: ~40 kg/ha</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Financial Details */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <div className="border-b border-[#183a24] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Step 6: Financial Parameters & Selling Price (INR ₹)
              </h3>
              <p className="text-xs text-slate-400">Supply prices for gross revenue and net return calculations</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-[#1b3d27] text-xs text-slate-300">
              <span className="font-semibold block mb-0.5 text-white">Transparent Financial Accounting:</span>
              Revenues and net returns are only calculated when selling price is supplied. If omitted, partial modeled operating costs will still be displayed without fabricating financial assumptions.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Crop Selling Price (₹ / quintal)</label>
                <input
                  type="number"
                  step="25"
                  min="0"
                  max="50000"
                  value={formData.crop_selling_price_per_quintal || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      crop_selling_price_per_quintal: e.target.value ? parseFloat(e.target.value) : undefined
                    })
                  }
                  className="agri-input"
                  placeholder="e.g. 2275 (MSP for Wheat)"
                />
                <span className="text-[10px] text-slate-500">Configures market / MSP realization</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Other Operational Overhead (₹) [Optional]</label>
                <input
                  type="number"
                  step="500"
                  min="0"
                  value={formData.other_production_costs || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      other_production_costs: e.target.value ? parseFloat(e.target.value) : undefined
                    })
                  }
                  className="agri-input"
                  placeholder="Seeds, labor, tillage overhead"
                />
                <span className="text-[10px] text-slate-500">Unsupplied overhead will be explicitly flagged as partial cost</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: What-If Settings */}
        {currentStep === 7 && (
          <div className="space-y-4">
            <div className="border-b border-[#183a24] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                Step 7: Automated What-If Scenarios Generation
              </h3>
              <p className="text-xs text-slate-400">All 8 standard agronomic scenarios will be simulated independently</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { code: 'A', name: 'Baseline Plan', desc: 'Your specified farming plan' },
                { code: 'B', name: 'Reduced Irrigation (-20%)', desc: 'Assesses water conservation & drought resilience' },
                { code: 'C', name: 'Increased Irrigation (+20%)', desc: 'Tests potential aeration hypoxia on heavy soils' },
                { code: 'D', name: 'Reduced Fertilizer (-25%)', desc: 'Evaluates nutrient cost savings vs yield' },
                { code: 'E', name: 'Balanced ICAR Dose', desc: 'Applies scientifically optimal N-P-K recommendation' },
                { code: 'F', name: 'Earlier Sowing (-14d)', desc: 'Evaluates pre-monsoon heat escape & emergence' },
                { code: 'G', name: 'Later Sowing (+14d)', desc: 'Quantifies terminal heat & late-season drought impact' },
                { code: 'H', name: 'Combined Optimized Changes', desc: 'Integrates drip, balanced fertilizer & optimal sowing' }
              ].map((sc) => (
                <div key={sc.code} className="p-3 rounded-xl bg-[#08170e] border border-[#1b3d27] flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                    {sc.code}
                  </span>
                  <div>
                    <span className="font-bold text-white block">{sc.name}</span>
                    <span className="text-[11px] text-slate-400">{sc.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 8: Review & Run */}
        {currentStep === 8 && (
          <div className="space-y-5">
            <div className="border-b border-[#183a24] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Step 8: Review Parameters Before Execution
              </h3>
              <p className="text-xs text-slate-400">Inspect inputs; submission executes all 8 biophysical scenarios</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#08170e] border border-[#1b3d27]">
                <span className="text-slate-500 block text-[10px]">Crop & Holding</span>
                <span className="font-bold text-white capitalize text-sm">{formData.crop_type}</span>
                <span className="text-emerald-400 block text-[11px]">{formData.farm_area} {formData.farm_area_unit}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#08170e] border border-[#1b3d27]">
                <span className="text-slate-500 block text-[10px]">Soil & Water Method</span>
                <span className="font-bold text-white text-sm truncate block">{formData.soil_type}</span>
                <span className="text-cyan-400 block text-[11px] capitalize">{formData.irrigation_method}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#08170e] border border-[#1b3d27]">
                <span className="text-slate-500 block text-[10px]">Sowing & Duration</span>
                <span className="font-bold text-white text-sm">{formData.sowing_date}</span>
                <span className="text-slate-400 block text-[11px]">~{formData.crop_duration_days} days</span>
              </div>

              <div className="p-3 rounded-xl bg-[#08170e] border border-[#1b3d27]">
                <span className="text-slate-500 block text-[10px]">Nutrient Plan (N-P-K)</span>
                <span className="font-bold text-emerald-300 text-sm">
                  {formData.nitrogen_kg_ha}-{formData.phosphorus_kg_ha}-{formData.potassium_kg_ha}
                </span>
                <span className="text-slate-400 block text-[11px]">kg/ha</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-200">
              <span className="font-semibold block mb-1">Ready for Execution:</span>
              Clicking <strong>Execute Agricultural Simulation</strong> will transmit parameters to the FastAPI backend,
              solve the daily FAO-56 water balance, evaluate Stewart yield functions, and return all 8 What-If scenarios.
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-[#183a24]">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1 || isSubmitting}
            className="agri-btn-secondary px-4 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {currentStep < steps.length ? (
            <button
              type="button"
              onClick={nextStep}
              className="agri-btn-primary px-5 py-2.5"
            >
              <span>Continue to Step {currentStep + 1}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="agri-btn-primary px-6 py-3 text-sm shadow-xl shadow-emerald-950/60"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Computing Biophysical Production Functions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Agricultural Simulation</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
