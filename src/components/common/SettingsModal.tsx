import React, { useState } from 'react';
import { X, Sliders, RotateCcw, Check, AlertCircle } from 'lucide-react';
import {
  MISSION_ASSUMPTIONS,
  updateAssumptionValue,
  resetAssumptionsToDefaults,
  type AssumptionConstant
} from '../../config/assumptions';
import { ProvenanceBadge } from '../ui/ProvenanceBadge';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChanged?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsChanged
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const assumptionsList = Object.values(MISSION_ASSUMPTIONS);
  const categories = ['all', 'mobility', 'terrain', 'life_support', 'reserve'];

  const filteredAssumptions =
    activeCategory === 'all'
      ? assumptionsList
      : assumptionsList.filter((a) => a.category === activeCategory);

  const handleInputChange = (id: string, valStr: string) => {
    const num = parseFloat(valStr);
    if (!isNaN(num)) {
      setEditValues((prev) => ({ ...prev, [id]: num }));
    }
  };

  const handleSaveItem = (id: string) => {
    const newVal = editValues[id];
    if (typeof newVal === 'number') {
      updateAssumptionValue(id, newVal);
      setStatusMessage(`Updated ${MISSION_ASSUMPTIONS[id]?.label}`);
      onSettingsChanged?.();
      setTimeout(() => setStatusMessage(null), 2500);
    }
  };

  const handleResetAll = () => {
    resetAssumptionsToDefaults();
    setEditValues({});
    setStatusMessage('All assumptions reset to documented defaults.');
    onSettingsChanged?.();
    setTimeout(() => setStatusMessage(null), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0B0D10] border border-[rgba(231,225,216,0.18)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(231,225,216,0.10)] bg-[#12151B]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#FF7043]/10 border border-[#FF7043]/30 text-[#FF7043]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="settings-modal-title"
                className="text-base font-display font-bold text-[#E7E1D8]"
              >
                Simulation Assumptions & Constants
              </h2>
              <p className="text-xs font-mono text-[#A0A0A0]">
                All values carry scientific provenance badges. Edit parameters or reset to baseline.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#A0A0A0] hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Chips & Reset Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-[rgba(231,225,216,0.08)] bg-[#101217]">
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-mono capitalize transition-all ${
                  activeCategory === cat
                    ? 'bg-[#FF7043] text-[#0B0D10] font-bold shadow-sm shadow-[#FF7043]/30'
                    : 'bg-[#181C24] text-[#A0A0A0] hover:text-[#E7E1D8] border border-white/5'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-[#A0A0A0] hover:text-white bg-[#181C24] border border-white/10 hover:border-white/20 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#FF7043]" />
            Reset to defaults
          </button>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className="px-6 py-2 bg-emerald-950/60 border-b border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            {statusMessage}
          </div>
        )}

        {/* Table / List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredAssumptions.map((item) => {
            const currentValue =
              editValues[item.id] !== undefined ? editValues[item.id] : item.value;
            const isDirty =
              editValues[item.id] !== undefined && editValues[item.id] !== item.value;

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-[#13171F] border border-[rgba(231,225,216,0.08)] hover:border-[rgba(231,225,216,0.18)] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-[#E7E1D8]">
                      {item.label}
                    </span>
                    <ProvenanceBadge type={item.source} />
                  </div>
                  <p className="text-xs text-[#A0A0A0] leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 bg-[#0B0D10] border border-white/10 rounded-lg px-2.5 py-1.5 focus-within:border-[#FF7043]">
                    <input
                      type="number"
                      step="any"
                      value={currentValue}
                      onChange={(e) => handleInputChange(item.id, e.target.value)}
                      className="w-20 bg-transparent text-right font-mono text-sm text-white focus:outline-none"
                    />
                    <span className="text-[11px] font-mono text-[#A0A0A0]">
                      {item.unit}
                    </span>
                  </div>

                  {isDirty && (
                    <button
                      type="button"
                      onClick={() => handleSaveItem(item.id)}
                      className="px-2.5 py-1.5 bg-[#FF7043] text-[#0B0D10] rounded-lg text-xs font-mono font-bold hover:bg-[#FF855D] transition-colors"
                      title="Apply change"
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
