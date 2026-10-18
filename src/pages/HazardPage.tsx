import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TriangleAlert,
  AlertTriangle,
  Search,
  MapPin,
  ExternalLink,
  ShieldAlert,
  Filter,
  Layers,
  ArrowRight
} from 'lucide-react';
import { MarsMap } from '../components/map/MarsMap';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';
import { Chip } from '../components/ui/Chip';
import { Button } from '../components/ui/Button';
import { useMarsLayers } from '../hooks/useMarsLayers';
import { HAZARDS_CATALOG } from '../data/hazardsCatalog';
import type { Checkpoint } from '../core/types';
import type { MarsCoordinate } from '../types/route';

export const HazardPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedHazardId, setSelectedHazardId] = useState<string>(HAZARDS_CATALOG[0]?.id || '');
  const [centerTarget, setCenterTarget] = useState<MarsCoordinate | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);

  const { activeBaseLayer, activeOverlays } = useMarsLayers();

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/checkpoints.json`)
      .then((r) => r.json())
      .then((data: Checkpoint[]) => setCheckpoints(data))
      .catch((err) => console.warn('[HAZARDS] Failed to load checkpoints:', err));
  }, []);

  const filteredHazards = useMemo(() => {
    if (selectedSeverity === 'all') return HAZARDS_CATALOG;
    return HAZARDS_CATALOG.filter((h) => h.severity.toLowerCase() === selectedSeverity.toLowerCase());
  }, [selectedSeverity]);

  const activeHazard = useMemo(() => {
    return HAZARDS_CATALOG.find((h) => h.id === selectedHazardId) || HAZARDS_CATALOG[0];
  }, [selectedHazardId]);

  const handleSelectHazard = (h: any) => {
    setSelectedHazardId(h.id);
    setCenterTarget({ latitude: h.location.latitude, longitude: h.location.longitude });
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0D10] text-[#E7E1D8] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-12 border-b border-[rgba(231,225,216,0.10)] bg-[#101114] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-xs font-display">
          <span className="font-bold uppercase tracking-wider text-white">HAZARD INTELLIGENCE</span>
          <span className="text-[#6B6F76]">•</span>
          <span className="text-[#EF4444] font-semibold">{HAZARDS_CATALOG.length} Planetary Hazards Logged</span>
        </div>
        <ProvenanceBadge type="NASA-DERIVED" source="HiRISE / MRO Planetary GIS" showIcon={false} />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Column (460px): Filterable Table & Details */}
        <aside className="w-full lg:w-[460px] bg-[#101114]/95 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-[rgba(231,225,216,0.12)] p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#EF4444] uppercase block mb-1">
                TERRAIN RISK REGISTER
              </span>
              <h1 className="font-display font-bold text-base uppercase text-white">
                SURFACE HAZARD DIRECTORY
              </h1>
            </div>

            {/* Severity Filter Chips */}
            <div className="flex flex-wrap gap-1.5">
              {['all', 'critical', 'high', 'moderate'].map((sev) => (
                <Chip
                  key={sev}
                  label={sev.toUpperCase()}
                  selected={selectedSeverity === sev}
                  onToggle={() => setSelectedSeverity(sev)}
                />
              ))}
            </div>

            {/* Hazards List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredHazards.map((h) => {
                const isSelected = h.id === selectedHazardId;
                const isRSL = h.name.toLowerCase().includes('slope lineae') || h.name.toLowerCase().includes('rsl');

                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => handleSelectHazard(h)}
                    className={`w-full p-3 rounded-xl text-left transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#EF4444]/15 border-[#EF4444] text-white shadow-lg'
                        : 'bg-[#15181D]/80 hover:bg-[#1C2027] border-[rgba(231,225,216,0.08)] text-[#A0A0A0]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display font-bold text-xs text-[#E7E1D8] truncate">
                        {h.name}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                          h.severity === 'critical'
                            ? 'bg-[#EF4444]/30 text-[#EF4444] border border-[#EF4444]/40'
                            : h.severity === 'high'
                            ? 'bg-[#F5B544]/20 text-[#F5B544] border border-[#F5B544]/30'
                            : 'bg-[#4ADE80]/20 text-[#4ADE80]'
                        }`}
                      >
                        {h.severity}
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-[#56D9E8]">
                      {h.location.latitude.toFixed(2)}°N, {h.location.longitude.toFixed(2)}°E
                    </p>

                    {isRSL && (
                      <span className="inline-block mt-1.5 text-[9px] font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/40">
                        WATER STATUS: CONTESTED — NOT A RESOURCE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Hazard Detail Card */}
            {activeHazard && (
              <div className="p-4 rounded-2xl bg-[#15181D] border border-[rgba(231,225,216,0.12)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-sm text-white">
                    {activeHazard.name}
                  </span>
                  <ProvenanceBadge type="NASA-DERIVED" source={activeHazard.datasetName} showIcon={false} />
                </div>

                <p className="text-xs font-sans text-[#E7E1D8]/90 leading-relaxed">
                  {activeHazard.description}
                </p>

                <div className="p-3 rounded-xl bg-[#0B0D10] border border-[rgba(231,225,216,0.06)] text-xs font-mono space-y-1.5">
                  <div className="text-[#FF7043] font-bold">OPERATIONAL DIRECTIVE:</div>
                  <div className="text-[#A0A0A0] text-[11px]">{activeHazard.operationalRecommendation}</div>
                </div>

                {activeHazard.sourceUrl && (
                  <a
                    href={activeHazard.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-[#56D9E8] hover:underline"
                  >
                    <span>View NASA Planetary Data System Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Center: Interactive Map with Hazard Pins */}
        <main className="flex-1 relative h-64 lg:h-full overflow-hidden">
          <MarsMap
            activeBaseLayer={activeBaseLayer}
            activeOverlays={activeOverlays}
            startCoord={null}
            destCoord={null}
            checkpoints={checkpoints}
            primaryRoute={null}
            alternativeRoute={null}
            sciencePOIs={[]}
            hazards={HAZARDS_CATALOG}
            onSelectCoordinate={() => {}}
            onSetStart={() => {}}
            onSetDestination={() => {}}
            onCursorMove={() => {}}
            centerTarget={centerTarget}
          />
        </main>
      </div>
    </div>
  );
};
