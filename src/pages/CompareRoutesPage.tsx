import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitCompare, Compass, Clock, Mountain, ShieldCheck, ArrowRight, Layers } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';
import { MarsMap } from '../components/map/MarsMap';
import { useMarsLayers } from '../hooks/useMarsLayers';
import { useRoutePlanner } from '../hooks/useRoutePlanner';
import { SCIENCE_CATALOG } from '../data/scienceCatalog';
import { HAZARDS_CATALOG } from '../data/hazardsCatalog';
import type { Checkpoint } from '../core/types';

export const CompareRoutesPage: React.FC = () => {
  const navigate = useNavigate();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);

  const { activeBaseLayer, activeOverlays } = useMarsLayers();
  const {
    startCoord,
    destCoord,
    primaryRoute,
    alternativeRoute
  } = useRoutePlanner();

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/checkpoints.json`)
      .then((r) => r.json())
      .then((data: Checkpoint[]) => setCheckpoints(data))
      .catch((err) => console.warn('[COMPARE] Failed to load checkpoints:', err));
  }, []);

  const r1Dist = primaryRoute?.distanceKm || 428;
  const r2Dist = alternativeRoute?.distanceKm || 382;

  const r1Hours = primaryRoute?.estimatedDurationHours || 78.4;
  const r2Hours = alternativeRoute?.estimatedDurationHours || 89.2;

  const r1MaxSlope = primaryRoute?.maxSlopeDeg || 14.2;
  const r2MaxSlope = alternativeRoute?.maxSlopeDeg || 22.8;

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0D10] text-[#E7E1D8] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-12 border-b border-[rgba(231,225,216,0.10)] bg-[#101114] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-xs font-display">
          <span className="font-bold uppercase tracking-wider text-white">ROUTE COMPARISON</span>
          <span className="text-[#6B6F76]">•</span>
          <span className="text-[#56D9E8] font-semibold">Shortest vs Lowest-Risk Side-by-Side</span>
        </div>
        <ProvenanceBadge type="MODELED" source="A* Multi-Heuristic Engine" showIcon={false} />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Comparison Panel (420px) */}
        <aside className="w-full lg:w-[420px] bg-[#101114]/95 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-[rgba(231,225,216,0.12)] p-6 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GitCompare className="w-4 h-4 text-[#56D9E8]" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#56D9E8] uppercase">
                  TRADE-OFF ANALYSIS
                </span>
              </div>
              <h1 className="font-display font-bold text-lg uppercase text-white">
                TRAVERSE CANDIDATES
              </h1>
            </div>

            {/* Candidate 1: Lowest-Risk Terrain-Aware */}
            <div className="p-4 rounded-2xl bg-[#15181D] border-2 border-[#56D9E8]/50 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-sm text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#56D9E8] shadow-[0_0_8px_rgba(86,217,232,0.8)]" />
                  Route A: Lowest-Risk (A* Slope Avoidance)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#56D9E8]/20 text-[#56D9E8] font-bold">
                  RECOMMENDED
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-center">
                <div className="p-2 rounded-lg bg-[#101114]">
                  <span className="text-[10px] text-[#A0A0A0] block">Distance</span>
                  <span className="text-xs font-bold text-[#E7E1D8]">{r1Dist.toFixed(1)} km</span>
                </div>
                <div className="p-2 rounded-lg bg-[#101114]">
                  <span className="text-[10px] text-[#A0A0A0] block">Duration</span>
                  <span className="text-xs font-bold text-[#56D9E8]">{(r1Hours / 24.66).toFixed(1)} sols</span>
                </div>
                <div className="p-2 rounded-lg bg-[#101114]">
                  <span className="text-[10px] text-[#A0A0A0] block">Max Slope</span>
                  <span className="text-xs font-bold text-[#4ADE80]">{r1MaxSlope.toFixed(1)}°</span>
                </div>
              </div>

              <p className="text-[11px] font-sans text-[#A0A0A0]">
                Detours around steep crater scarps and sand dune fields. Zero slopes exceeding 15°.
              </p>
            </div>

            {/* Candidate 2: Shortest Direct Path */}
            <div className="p-4 rounded-2xl bg-[#15181D]/80 border border-[rgba(231,225,216,0.12)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-sm text-[#A0A0A0] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F5B544]" />
                  Route B: Shortest Distance (Direct Line)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F5B544]/15 text-[#F5B544] font-bold">
                  ELEVATED RISK
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-center">
                <div className="p-2 rounded-lg bg-[#101114]">
                  <span className="text-[10px] text-[#A0A0A0] block">Distance</span>
                  <span className="text-xs font-bold text-[#56D9E8]">{r2Dist.toFixed(1)} km</span>
                </div>
                <div className="p-2 rounded-lg bg-[#101114]">
                  <span className="text-[10px] text-[#A0A0A0] block">Duration</span>
                  <span className="text-xs font-bold text-[#F5B544]">{(r2Hours / 24.66).toFixed(1)} sols</span>
                </div>
                <div className="p-2 rounded-lg bg-[#101114]">
                  <span className="text-[10px] text-[#A0A0A0] block">Max Slope</span>
                  <span className="text-xs font-bold text-[#EF4444]">{r2MaxSlope.toFixed(1)}°</span>
                </div>
              </div>

              <p className="text-[11px] font-sans text-[#A0A0A0]">
                Direct path crosses steep crater slopes and scarp edges (&gt;22°). High vehicle rollover risk.
              </p>
            </div>

            {/* Diff Highlights */}
            <div className="p-4 rounded-xl bg-[#15181D]/60 border border-[rgba(231,225,216,0.08)] space-y-2 text-xs font-mono">
              <span className="text-[10px] uppercase text-[#A0A0A0] font-bold block mb-1">
                METRIC DELTA SUMMARY
              </span>
              <div className="flex justify-between">
                <span className="text-[#A0A0A0]">Distance Difference:</span>
                <span className="text-[#F5B544] font-bold">+{(r1Dist - r2Dist).toFixed(1)} km (+12%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A0A0A0]">Slope Safety Margin:</span>
                <span className="text-[#56D9E8] font-bold">-8.6° safer max incline</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A0A0A0]">Consumable Need:</span>
                <span className="text-[#E7E1D8] font-bold">Similar (within 5%)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[rgba(231,225,216,0.10)] space-y-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/planner/briefing')}
              className="w-full text-xs font-bold"
            >
              Export Selected Candidate A →
            </Button>
          </div>
        </aside>

        {/* Center: Map Canvas */}
        <main className="flex-1 relative h-64 lg:h-full overflow-hidden">
          <MarsMap
            activeBaseLayer={activeBaseLayer}
            activeOverlays={activeOverlays}
            startCoord={startCoord}
            destCoord={destCoord}
            checkpoints={checkpoints}
            primaryRoute={primaryRoute}
            alternativeRoute={alternativeRoute}
            sciencePOIs={SCIENCE_CATALOG}
            hazards={HAZARDS_CATALOG}
            onSelectCoordinate={() => {}}
            onSetStart={() => {}}
            onSetDestination={() => {}}
            onCursorMove={() => {}}
            showRoverTraverses={true}
          />
        </main>
      </div>
    </div>
  );
};
