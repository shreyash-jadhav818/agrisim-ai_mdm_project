import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { OverviewPage } from './pages/OverviewPage';
import { FarmDigitalTwinPage } from './pages/FarmDigitalTwinPage';
import { NewSimulationWizard } from './pages/NewSimulationWizard';
import { ScenarioExplorerPage } from './pages/ScenarioExplorerPage';
import { OptimizationLabPage } from './pages/OptimizationLabPage';
import { AIAdvisorPage } from './pages/AIAdvisorPage';
import { WeatherIntelligencePage } from './pages/WeatherIntelligencePage';
import { RiskAnalysisPage } from './pages/RiskAnalysisPage';
import { SimulationHistoryPage } from './pages/SimulationHistoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

import { FarmProfileModal } from './components/FarmProfileModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ExportModal } from './components/ExportModal';

import {
  Crop,
  SoilType,
  AgroZone,
  FarmProfile,
  SimulationInput,
  SimulationResult,
  WhatIfSuiteResult,
  ModularFarmInput
} from './types';
import {
  fetchCrops,
  fetchSoils,
  fetchZones,
  executeSimulation,
  fetchHistory,
  executeWhatIfSuite
} from './services/api';

export const App: React.FC = () => {
  // Navigation active tab: 'overview' | 'digital-twin' | 'new-simulation' | 'scenarios' | 'optimizer' | 'weather' | 'risk' | 'history' | 'reports' | 'settings'
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [areaUnit, setAreaUnit] = useState<'acres' | 'hectares'>('acres');

  // Catalogs
  const [crops, setCrops] = useState<Crop[]>([]);
  const [soils, setSoils] = useState<SoilType[]>([]);
  const [zones, setZones] = useState<AgroZone[]>([]);
  const [selectedCropId, setSelectedCropId] = useState<string>('wheat');
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // Modals state
  const [isFarmModalOpen, setIsFarmModalOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Active Farm Profile
  const [farm, setFarm] = useState<FarmProfile>({
    name: 'Green Punjab Agro Holding',
    state: 'Punjab',
    zone: 'Trans-Gangetic Plain',
    total_acres: 5.0,
    soil_type: 'Alluvial Loam',
    irrigation_system: 'drip'
  });

  // Base Simulation Input for legacy components
  const [simulationInput, setSimulationInput] = useState<SimulationInput>({
    farm_profile: {
      name: 'Green Punjab Agro Holding',
      state: 'Punjab',
      zone: 'Trans-Gangetic Plain',
      total_acres: 5.0,
      soil_type: 'Alluvial Loam',
      irrigation_system: 'drip'
    },
    crop_id: 'wheat',
    sowing_date: '2026-11-15',
    soil_organic_matter_pct: 0.8,
    mulching_used: false,
    irrigation_schedule: [
      { day: 21, amount_mm: 50.0, method: 'drip' },
      { day: 45, amount_mm: 50.0, method: 'drip' },
      { day: 75, amount_mm: 55.0, method: 'drip' },
      { day: 95, amount_mm: 45.0, method: 'drip' }
    ],
    fertilizer_plan: [
      { day: 1, n_kg_acre: 20.0, p_kg_acre: 25.0, k_kg_acre: 16.0, fertilizer_name: 'Basal Dose' },
      { day: 25, n_kg_acre: 15.0, p_kg_acre: 0.0, k_kg_acre: 0.0, fertilizer_name: 'Top Dressing 1' },
      { day: 55, n_kg_acre: 15.0, p_kg_acre: 0.0, k_kg_acre: 0.0, fertilizer_name: 'Top Dressing 2' }
    ]
  });

  // Latest Standard Simulation Result & What-If Suite Result
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [whatIfSuite, setWhatIfSuite] = useState<WhatIfSuiteResult | null>(null);

  // Initial Data Load
  useEffect(() => {
    async function init() {
      try {
        const [cropsData, soilsData, zonesData, historyData] = await Promise.all([
          fetchCrops(),
          fetchSoils(),
          fetchZones(),
          fetchHistory()
        ]);
        setCrops(cropsData);
        setSoils(soilsData);
        setZones(zonesData);
        setHistoryCount(historyData.length);

        // Run baseline simulation to populate dashboard
        const initialRes = await executeSimulation(simulationInput);
        setSimulationResult(initialRes);

        // Also run What-If Suite (Scenarios A through H)
        const modularInput: ModularFarmInput = {
          crop_type: 'wheat',
          farm_area: 5.0,
          farm_area_unit: 'acres',
          soil_type: 'Alluvial Loam',
          irrigation_method: 'drip',
          sowing_date: '2026-11-15',
          crop_duration_days: 135,
          nitrogen_kg_ha: 120.0,
          phosphorus_kg_ha: 60.0,
          potassium_kg_ha: 40.0,
          irrigation_depth_mm: 320.0,
          crop_selling_price_per_quintal: 2275.0,
          mulching_used: false
        };
        const suite = await executeWhatIfSuite(modularInput);
        setWhatIfSuite(suite);
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setInitialLoading(false);
      }
    }
    init();
  }, []);

  // Farm profile update handler
  const handleSaveFarm = (updatedFarm: FarmProfile) => {
    setFarm(updatedFarm);
    setSimulationInput((prev) => ({
      ...prev,
      farm_profile: updatedFarm,
      irrigation_schedule: prev.irrigation_schedule.map((evt) => ({
        ...evt,
        method: updatedFarm.irrigation_system
      }))
    }));
  };

  // Restore simulation handler from history
  const handleRestoreSimulation = async (detail: { input: any; output: SimulationResult }) => {
    setSimulationInput(detail.input);
    setSimulationResult(detail.output);
    setSelectedCropId(detail.output.crop_id);
    if (detail.input.farm_profile) {
      setFarm(detail.input.farm_profile);
    }
    // Also regenerate What-If suite so Scenario Explorer is immediately populated
    try {
      const modInput: ModularFarmInput = {
        crop_type: detail.output.crop_id,
        farm_area: detail.input.farm_profile?.total_acres || 5.0,
        farm_area_unit: 'acres',
        soil_type: detail.input.farm_profile?.soil_type || 'Alluvial Loam',
        irrigation_method: detail.input.farm_profile?.irrigation_system || 'drip',
        sowing_date: detail.input.sowing_date || '2026-11-15',
        crop_duration_days: detail.output.duration_days,
        nitrogen_kg_ha: 120.0,
        phosphorus_kg_ha: 60.0,
        potassium_kg_ha: 40.0,
        mulching_used: detail.input.mulching_used || false
      };
      const suite = await executeWhatIfSuite(modInput);
      setWhatIfSuite(suite);
    } catch (e) {
      console.warn('Could not regenerate What-If suite for restored run:', e);
    }
  };

  // Launch repeatable demonstration workflow
  const handleLaunchDemo = async () => {
    setIsDemoMode(true);
    const demoFarm: FarmProfile = {
      id: 'demo_punjab_holding',
      name: '[DEMO] Punjab Precision Wheat Holding (Illustrative)',
      state: 'Punjab',
      zone: 'Trans-Gangetic Plain',
      total_acres: 5.0,
      soil_type: 'Alluvial Loam',
      irrigation_system: 'drip'
    };
    setFarm(demoFarm);
    setSelectedCropId('wheat');

    const demoModularInput: ModularFarmInput = {
      crop_type: 'wheat',
      farm_area: 5.0,
      farm_area_unit: 'acres',
      soil_type: 'Alluvial Loam',
      irrigation_method: 'drip',
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
      mulching_used: true,
      soil_organic_matter_pct: 0.85
    };

    const demoSimInput: SimulationInput = {
      farm_profile: demoFarm,
      crop_id: 'wheat',
      sowing_date: '2026-11-15',
      soil_organic_matter_pct: 0.85,
      mulching_used: true,
      irrigation_schedule: [
        { day: 21, amount_mm: 50.0, method: 'drip' },
        { day: 45, amount_mm: 50.0, method: 'drip' },
        { day: 75, amount_mm: 55.0, method: 'drip' },
        { day: 95, amount_mm: 45.0, method: 'drip' }
      ],
      fertilizer_plan: [
        { day: 1, n_kg_acre: 24.0, p_kg_acre: 24.0, k_kg_acre: 16.0, fertilizer_name: 'Basal Dose' },
        { day: 25, n_kg_acre: 18.0, p_kg_acre: 0.0, k_kg_acre: 0.0, fertilizer_name: 'Top Dressing 1' },
        { day: 55, n_kg_acre: 18.0, p_kg_acre: 0.0, k_kg_acre: 0.0, fertilizer_name: 'Top Dressing 2' }
      ],
      custom_price_per_quintal: 2275.0
    };

    try {
      const [suiteRes, stdRes] = await Promise.all([
        executeWhatIfSuite(demoModularInput),
        executeSimulation(demoSimInput)
      ]);
      setWhatIfSuite(suiteRes);
      setSimulationResult(stdRes);
      setSimulationInput(demoSimInput);
      setActiveTab('scenarios');
    } catch (e) {
      console.error('Failed to run demo simulation:', e);
    }
  };

  // Applied strategy handler from Optimizer
  const handleApplyStrategy = (strategy: { irrigation_depth_mm: number; n_kg_ha: number; sowing_date: string }) => {
    setSimulationInput((prev) => ({
      ...prev,
      sowing_date: strategy.sowing_date
    }));
    setActiveTab('scenarios');
  };

  // Success handler from Wizard
  const handleSimulationSuccess = (suite: WhatIfSuiteResult, stdRes?: SimulationResult) => {
    setWhatIfSuite(suite);
    if (stdRes) {
      setSimulationResult(stdRes);
    }
    setHistoryCount((prev) => prev + 1);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#07130b] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-sm font-bold text-emerald-200">
          Initializing AgriSim AI Digital Twin Engine...
        </div>
        <div className="text-xs text-slate-400">
          Connecting to FastAPI backend, loading FAO-56 crop tables and Indian agro-climatic normals
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07130b] text-slate-100 flex font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        farm={farm}
        historyCount={historyCount}
      />

      {/* Main Content Layout */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* 2. Top Navigation Bar */}
        <TopNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          farm={farm}
          onEditFarm={() => setIsFarmModalOpen(true)}
          onOpenExport={() => setIsExportOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          historyCount={historyCount}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onLaunchDemo={handleLaunchDemo}
          isDemoMode={isDemoMode}
        />

        {/* Demonstration Mode Illustrative Banner */}
        {isDemoMode && (
          <div className="bg-gradient-to-r from-amber-950/90 via-emerald-950/90 to-amber-950/90 border-b border-amber-600/70 px-4 sm:px-6 py-2.5 text-xs text-amber-200 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">
                <strong className="font-bold text-amber-300">[DEMO MODE — ILLUSTRATIVE DATA]</strong> Standardized Punjab wheat benchmark loaded. Calculations performed locally by FAO-56 biophysical engine.
              </span>
            </div>
            <button
              onClick={() => setIsDemoMode(false)}
              className="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/90 text-amber-300 hover:text-white border border-amber-700/60 transition-colors text-[11px] font-semibold shrink-0 ml-3"
            >
              Exit Demo
            </button>
          </div>
        )}

        {/* 3. Main Views Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Navigation Item 1: Overview Dashboard */}
          {activeTab === 'overview' && (
            <OverviewPage
              currentResult={simulationResult}
              onNavigate={setActiveTab}
              onRestoreSimulation={handleRestoreSimulation}
              onLaunchDemo={handleLaunchDemo}
            />
          )}

          {/* Navigation Item 2: Farm Digital Twin */}
          {activeTab === 'digital-twin' && (
            <FarmDigitalTwinPage
              farm={farm}
              onSaveFarm={handleSaveFarm}
              crops={crops}
              soils={soils}
              zones={zones}
              selectedCropId={selectedCropId}
              onSelectCrop={setSelectedCropId}
              currentResult={simulationResult}
            />
          )}

          {/* Navigation Item 3: New Simulation Wizard */}
          {activeTab === 'new-simulation' && (
            <NewSimulationWizard
              crops={crops}
              soils={soils}
              zones={zones}
              activeFarm={farm}
              onSimulationSuccess={handleSimulationSuccess}
              onNavigate={setActiveTab}
            />
          )}

          {/* Navigation Item 4: Scenario Explorer & What-If Studio */}
          {activeTab === 'scenarios' && (
            <ScenarioExplorerPage
              whatIfSuite={whatIfSuite}
              currentResult={simulationResult}
              onNavigate={setActiveTab}
            />
          )}

          {/* Navigation Item 5: Optimization Lab */}
          {activeTab === 'optimizer' && (
            <OptimizationLabPage
              farm={farm}
              selectedCropId={selectedCropId}
              onApplyStrategy={handleApplyStrategy}
            />
          )}

          {/* Navigation Item 6: AI Agricultural Advisor & Assistant */}
          {activeTab === 'advisor' && (
            <AIAdvisorPage
              currentResult={simulationResult}
              farm={farm}
              selectedCropId={selectedCropId}
              onApplyStrategy={handleApplyStrategy}
              onNavigate={setActiveTab}
            />
          )}

          {/* Navigation Item 6: Weather Intelligence */}
          {activeTab === 'weather' && (
            <WeatherIntelligencePage
              baseSimulation={simulationInput}
              currentResult={simulationResult}
            />
          )}

          {/* Navigation Item 7: Risk Analysis */}
          {activeTab === 'risk' && (
            <RiskAnalysisPage baseSimulation={simulationInput} />
          )}

          {/* Navigation Item 8: Simulation History */}
          {activeTab === 'history' && (
            <SimulationHistoryPage
              onRestoreSimulation={handleRestoreSimulation}
              onNavigate={setActiveTab}
            />
          )}

          {/* Navigation Item 9: Reports */}
          {activeTab === 'reports' && (
            <ReportsPage
              currentResult={simulationResult}
              whatIfSuite={whatIfSuite}
              onNavigate={setActiveTab}
            />
          )}

          {/* Navigation Item 10: Settings */}
          {activeTab === 'settings' && (
            <SettingsPage
              areaUnit={areaUnit}
              setAreaUnit={setAreaUnit}
            />
          )}
        </main>

        {/* Professional Footer */}
        <footer className="border-t border-[#14321f] bg-[#06110a] py-6 text-xs text-slate-500 text-center">
          <div className="max-w-7xl mx-auto px-4 space-y-1">
            <p className="font-semibold text-emerald-400">
              AgriSim AI — Intelligent Agricultural Digital Twin & What-If Simulator
            </p>
            <p>
              "Simulate Today. Harvest Smarter Tomorrow." • Validated FAO-56, FAO-33 & ICAR Biophysical Foundations
            </p>
            <p className="text-[10px] text-slate-600">
              Supporting Indian Agriculture, Farmers & Climate Agronomists • Currency: ₹ INR • Version: 2.0.0
            </p>
          </div>
        </footer>
      </div>

      {/* Global Modals */}
      <FarmProfileModal
        isOpen={isFarmModalOpen}
        onClose={() => setIsFarmModalOpen(false)}
        farm={farm}
        onSave={handleSaveFarm}
        soils={soils}
        zones={zones}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onRestoreSimulation={handleRestoreSimulation}
      />

      {simulationResult && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          result={simulationResult}
        />
      )}
    </div>
  );
};

export default App;
