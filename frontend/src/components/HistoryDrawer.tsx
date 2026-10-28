import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  RotateCcw,
  Calendar,
  Wheat,
  DollarSign,
  Droplets,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { HistoryRecord, SimulationResult } from '../types';
import { fetchHistory, fetchHistoryDetail } from '../services/api';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSimulation: (detail: { input: any; output: SimulationResult }) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  onRestoreSimulation
}) => {
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const records = await fetchHistory();
      setHistoryList(records);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRun = async (runId: string) => {
    try {
      const detail = await fetchHistoryDetail(runId);
      onRestoreSimulation(detail);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const filtered = historyList.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.crop_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Simulation History</h3>
              <p className="text-[11px] text-slate-400">Past What-If runs recorded in SQLite</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter input */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/50">
          <input
            type="text"
            placeholder="Search by crop or run ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Records list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-xs text-slate-400">Loading history records...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">No simulation records found.</div>
          ) : (
            filtered.map((record) => (
              <div
                key={record.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{record.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{record.id}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-300">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-sans">Yield</span>
                    <span className="text-emerald-400 font-bold">{record.yield_quintal_acre.toFixed(1)} q/ac</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-sans">Profit</span>
                    <span className="text-white">₹{(record.profit_inr / 1000).toFixed(0)}k</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-sans">Water Prod</span>
                    <span className="text-cyan-400">{record.water_productivity_kg_m3.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                  <span>{new Date(record.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleSelectRun(record.id)}
                    className="flex items-center gap-1 text-emerald-400 font-semibold hover:underline"
                  >
                    <span>Load Run</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
