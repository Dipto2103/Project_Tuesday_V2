import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Footprints,
  Calendar,
  Radio,
  ExternalLink,
  ChevronRight,
  MapPin,
  Sparkles,
  Layers
} from 'lucide-react';
import { MarsMap } from '../components/map/MarsMap';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';
import { Button } from '../components/ui/Button';
import { useMarsLayers } from '../hooks/useMarsLayers';
import {
  ALL_ROVER_TRAVERSES,
  CURIOSITY_TRAVERSE,
  HistoricalRoverTraverse
} from '../data/roverTraverses';
import type { Checkpoint } from '../core/types';
import type { MarsCoordinate } from '../types/route';

export const RoverExplorerPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRoverId, setSelectedRoverId] = useState<string>('curiosity-historical');
  const [centerTarget, setCenterTarget] = useState<MarsCoordinate | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);

  const { activeBaseLayer, activeOverlays } = useMarsLayers();

  const currentTraverse: HistoricalRoverTraverse =
    ALL_ROVER_TRAVERSES.find((r) => r.id === selectedRoverId) || CURIOSITY_TRAVERSE;

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/checkpoints.json`)
      .then((r) => r.json())
      .then((data: Checkpoint[]) => setCheckpoints(data))
      .catch((err) => console.warn('[ROVER] Failed to load checkpoints:', err));
  }, []);

  // Update center when rover changes
  useEffect(() => {
    if (currentTraverse.waypoints.length > 0) {
      const firstWp = currentTraverse.waypoints[0];
      setCenterTarget({ latitude: firstWp.latitude, longitude: firstWp.longitude });
    }
  }, [currentTraverse]);

  const roversList = [
    {
      id: 'curiosity-historical',
      name: 'Curiosity (MSL)',
      years: '2012 – Present',
      status: 'Active',
      site: 'Gale Crater (Mount Sharp)',
      odometer: '32.4 km',
      desc: 'Exploring ancient habitable lake environments in Gale Crater.'
    },
    {
      id: 'perseverance-historical',
      name: 'Perseverance (Mars 2020)',
      years: '2021 – Present',
      status: 'Active',
      site: 'Jezero Crater (Delta Front)',
      odometer: '29.1 km',
      desc: 'Seeking signs of ancient life and caching core samples for return.'
    },
    {
      id: 'opportunity-historical',
      name: 'Opportunity (MER-B)',
      years: '2004 – 2018',
      status: 'Mission Complete',
      site: 'Meridiani Planum',
      odometer: '45.16 km',
      desc: 'First off-world marathon traverse, discovered hematite spherules.'
    },
    {
      id: 'spirit-historical',
      name: 'Spirit (MER-A)',
      years: '2004 – 2010',
      status: 'Mission Complete',
      site: 'Gusev Crater',
      odometer: '7.73 km',
      desc: 'Discovered evidence of ancient volcanic hydrothermal activity.'
    }
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0D10] text-[#E7E1D8] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-12 border-b border-[rgba(231,225,216,0.10)] bg-[#101114] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-xs font-display">
          <span className="font-bold uppercase tracking-wider text-white">ROVER EXPLORER</span>
          <span className="text-[#6B6F76]">•</span>
          <span className="text-[#F5B544] font-semibold">{currentTraverse.roverName} Path</span>
        </div>
        <ProvenanceBadge type="NASA-DERIVED" source="NASA PDS Analyst's Notebook" showIcon={false} />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Column (320px): Rover Selection */}
        <aside className="w-full lg:w-80 bg-[#101114]/95 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-[rgba(231,225,216,0.12)] p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#FF7043] uppercase block mb-1">
                FLEET DIRECTORY
              </span>
              <h1 className="font-display font-bold text-sm uppercase text-white">
                SELECT A MARS ROVER
              </h1>
            </div>

            <div className="space-y-2">
              {roversList.map((rover) => {
                const isSelected = selectedRoverId === rover.id;
                return (
                  <button
                    key={rover.id}
                    type="button"
                    onClick={() => setSelectedRoverId(rover.id)}
                    className={`w-full p-3.5 rounded-xl text-left transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#C65D38]/20 border-[#FF7043] text-white shadow-lg'
                        : 'bg-[#15181D]/80 hover:bg-[#1C2027] border-[rgba(231,225,216,0.08)] text-[#A0A0A0]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display font-bold text-sm text-[#E7E1D8]">
                        {rover.name}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          rover.status === 'Active'
                            ? 'bg-[#4ADE80]/20 text-[#4ADE80]'
                            : 'bg-[#6B6F76]/20 text-[#A0A0A0]'
                        }`}
                      >
                        {rover.status}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-[#56D9E8]">{rover.site}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(231,225,216,0.06)] text-[10px] font-mono text-[#A0A0A0]">
                      <span>{rover.years}</span>
                      <span className="text-[#E7E1D8] font-bold">{rover.odometer}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Center: Interactive Map with Rover Traverses */}
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
            hazards={[]}
            onSelectCoordinate={() => {}}
            onSetStart={() => {}}
            onSetDestination={() => {}}
            onCursorMove={() => {}}
            centerTarget={centerTarget}
            showRoverTraverses={true}
          />
        </main>

        {/* Right Column (340px): Rover Milestones & Science */}
        <aside className="w-full lg:w-84 bg-[#101114]/95 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-[rgba(231,225,216,0.12)] p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-5">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#FF7043] uppercase block mb-1">
                MISSION DOSSIER
              </span>
              <h2 className="font-display font-bold text-base uppercase text-white">
                {currentTraverse.roverName}
              </h2>
              <p className="text-xs text-[#A0A0A0] mt-1 font-sans">
                {currentTraverse.scientificCaveat}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)] space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[#A0A0A0]">Total Distance:</span>
                <span className="font-bold text-[#56D9E8]">{currentTraverse.totalDistanceKm.toFixed(1)} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A0A0A0]">Waypoints:</span>
                <span className="font-bold text-[#E7E1D8]">{currentTraverse.waypoints.length} logged</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A0A0A0]">Landing Site:</span>
                <span className="text-xs text-[#E7E1D8] font-bold">{currentTraverse.landingSiteName}</span>
              </div>
            </div>

            {/* Milestones */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-[#A0A0A0] font-bold block">
                TRAVERSE MILESTONES
              </span>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {currentTraverse.endpoints.slice(0, 6).map((ep, i) => (
                  <div
                    key={i}
                    onClick={() => setCenterTarget(ep.coordinate)}
                    className="p-2.5 rounded-lg bg-[#15181D]/60 hover:bg-[#1C2027] border border-[rgba(231,225,216,0.06)] cursor-pointer text-xs transition-colors"
                  >
                    <div className="flex justify-between text-[#FF7043] font-mono text-[11px] font-bold">
                      <span>SOL {ep.sol}</span>
                      <span>{ep.elevationMeters} m</span>
                    </div>
                    <p className="text-[#E7E1D8] font-medium mt-0.5 truncate">{ep.site}</p>
                    <p className="text-[11px] text-[#A0A0A0] mt-0.5 line-clamp-1">{ep.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[rgba(231,225,216,0.10)]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/map')}
              className="w-full text-xs font-mono"
            >
              Open in Layers Map →
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
};
