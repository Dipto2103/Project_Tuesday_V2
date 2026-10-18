import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Route, Play, Trash2, ArrowRightLeft, Compass, Clock, Mountain, Info, AlertTriangle, Layers } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SegmentedControl } from '../components/ui/Tabs';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';
import { MarsMap } from '../components/map/MarsMap';
import { useMarsLayers } from '../hooks/useMarsLayers';
import { useRoutePlanner } from '../hooks/useRoutePlanner';
import { SCIENCE_CATALOG } from '../data/scienceCatalog';
import { HAZARDS_CATALOG } from '../data/hazardsCatalog';
import { DEMO_LOCATIONS } from '../data/demoLocations';
import type { Checkpoint } from '../core/types';

export const RoutePlannerPage: React.FC = () => {
  const navigate = useNavigate();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);

  const { activeBaseLayer, activeOverlays } = useMarsLayers();
  const [clickMode, setClickMode] = useState<'start' | 'dest'>('start');
  const {
    startCoord,
    destCoord,
    setStartCoord,
    setDestCoord,
    method,
    setMethod,
    walkingSpeedKmh,
    setWalkingSpeedKmh,
    maxSlopeDeg,
    setMaxSlopeDeg,
    primaryRoute,
    alternativeRoute,
    planningError,
    isPlanning,
    generateRoute,
    swapLocations,
    clearRoute
  } = useRoutePlanner();

  const handleMapClick = (coord: { latitude: number; longitude: number }) => {
    if (clickMode === 'start') {
      setStartCoord(coord);
      setClickMode('dest');
    } else {
      setDestCoord(coord);
    }
  };

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/checkpoints.json`)
      .then((r) => r.json())
      .then((data: Checkpoint[]) => {
        setCheckpoints(data);
        if (!startCoord && data.length > 0) {
          setStartCoord({ latitude: data[0].lat, longitude: data[0].lonE });
        }
        if (!destCoord && data.length > 1) {
          setDestCoord({ latitude: data[1].lat, longitude: data[1].lonE });
        }
      })
      .catch((err) => console.warn('[ROUTE PLANNER] Failed to load checkpoints:', err));
  }, [startCoord, destCoord, setStartCoord, setDestCoord]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0D10] text-[#E7E1D8] overflow-hidden select-none">
      {/* Top Bar */}
      <div className="h-12 border-b border-[rgba(231,225,216,0.10)] bg-[#101114] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-xs font-display">
          <span className="font-bold uppercase tracking-wider text-white">ROUTE PLANNER</span>
          <span className="text-[#6B6F76]">•</span>
          <span className="text-[#FF7043] font-semibold">A* Terrain Engine</span>
          <span className="text-[#6B6F76]">•</span>
          <button
            onClick={() => navigate('/planner/compare')}
            className="text-[#A0A0A0] hover:text-[#FF7043] transition-colors cursor-pointer"
          >
            Compare Alternatives
          </button>
        </div>

        <ProvenanceBadge type="MODELED" source="A* Slope Graph Engine" showIcon={false} />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Parameter Panel (340px) */}
        <aside className="w-full lg:w-84 bg-[#101114]/95 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-[rgba(231,225,216,0.12)] p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#FF7043] uppercase block mb-1">
                TRAVERSE WAYPOINTS
              </span>
              <h1 className="font-display font-bold text-sm uppercase text-white">
                SET ORIGIN & TARGET
              </h1>
            </div>

            {/* Presets */}
            <div>
              <span className="text-[11px] font-mono text-[#A0A0A0] block mb-1">PRESET ROUTES:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {DEMO_LOCATIONS.slice(0, 4).map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setStartCoord(preset.coordinates);
                      setDestCoord({
                        latitude: preset.coordinates.latitude + 0.15,
                        longitude: preset.coordinates.longitude + 0.15
                      });
                    }}
                    className="p-2 rounded-lg bg-[#15181D] hover:bg-[#1C2027] border border-[rgba(231,225,216,0.08)] text-left text-[11px] truncate cursor-pointer"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Start and End Coordinates Readout with Mode Toggle */}
            <div className="space-y-2 pt-2 border-t border-[rgba(231,225,216,0.08)]">
              <div
                onClick={() => setClickMode('start')}
                className={`p-3 rounded-xl border text-xs font-mono cursor-pointer transition-all ${
                  clickMode === 'start'
                    ? 'bg-[#15181D] border-[#4ADE80] ring-1 ring-[#4ADE80]/50 shadow-md shadow-[#4ADE80]/10'
                    : 'bg-[#15181D]/60 border-[#4ADE80]/30 hover:border-[#4ADE80]/60'
                }`}
                title="Click to set map click mode to Origin"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#4ADE80] font-bold">ORIGIN (START):</span>
                  {clickMode === 'start' ? (
                    <span className="text-[10px] bg-[#4ADE80]/20 text-[#4ADE80] px-1.5 py-0.5 rounded font-bold uppercase">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#A0A0A0] hover:text-[#E7E1D8]">Click to select</span>
                  )}
                </div>
                <span>
                  {startCoord
                    ? `${startCoord.latitude.toFixed(3)}°N, ${startCoord.longitude.toFixed(3)}°E`
                    : 'Click map or select preset'}
                </span>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={swapLocations}
                  className="p-1.5 rounded-lg bg-[#1C2027] text-[#A0A0A0] hover:text-[#FF7043] border border-[rgba(231,225,216,0.10)] cursor-pointer"
                  title="Swap Start and Destination"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              <div
                onClick={() => setClickMode('dest')}
                className={`p-3 rounded-xl border text-xs font-mono cursor-pointer transition-all ${
                  clickMode === 'dest'
                    ? 'bg-[#15181D] border-[#FF7043] ring-1 ring-[#FF7043]/50 shadow-md shadow-[#FF7043]/10'
                    : 'bg-[#15181D]/60 border-[#FF7043]/30 hover:border-[#FF7043]/60'
                }`}
                title="Click to set map click mode to Destination"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#FF7043] font-bold">DESTINATION:</span>
                  {clickMode === 'dest' ? (
                    <span className="text-[10px] bg-[#FF7043]/20 text-[#FF7043] px-1.5 py-0.5 rounded font-bold uppercase">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#A0A0A0] hover:text-[#E7E1D8]">Click to select</span>
                  )}
                </div>
                <span>
                  {destCoord
                    ? `${destCoord.latitude.toFixed(3)}°N, ${destCoord.longitude.toFixed(3)}°E`
                    : 'Click map or select preset'}
                </span>
              </div>
            </div>

            {/* Sliders for Speed and Slope */}
            <div className="space-y-3 pt-2 border-t border-[rgba(231,225,216,0.08)] text-xs font-mono">
              <div>
                <div className="flex justify-between text-[#A0A0A0] mb-1">
                  <span>Traverse Speed:</span>
                  <span className="font-bold text-[#E7E1D8]">{walkingSpeedKmh} km/h</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="15"
                  step="0.5"
                  value={walkingSpeedKmh}
                  onChange={(e) => setWalkingSpeedKmh(parseFloat(e.target.value))}
                  className="w-full accent-[#FF7043]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[#A0A0A0] mb-1">
                  <span>Max Traversable Slope:</span>
                  <span className="font-bold text-[#E7E1D8]">{maxSlopeDeg}°</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={maxSlopeDeg}
                  onChange={(e) => setMaxSlopeDeg(parseFloat(e.target.value))}
                  className="w-full accent-[#FF7043]"
                />
              </div>
            </div>

            {planningError && (
              <div className="p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 text-xs font-mono text-[#EF4444] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{planningError}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[rgba(231,225,216,0.10)] space-y-2">
            <Button
              variant="primary"
              size="md"
              onClick={generateRoute}
              isLoading={isPlanning}
              className="w-full text-xs font-bold"
            >
              Calculate A* Path
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearRoute}
              className="w-full text-xs font-mono"
            >
              Clear Route
            </Button>
          </div>
        </aside>

        {/* Center: Interactive Map with Route */}
        <main className="flex-1 relative h-64 lg:h-full overflow-hidden">
          {/* Floating Click Mode Guidance */}
          <div className="absolute top-4 left-4 z-30 pointer-events-none">
            <div className="flex items-center gap-2 bg-[#101114]/90 backdrop-blur-md border border-[rgba(231,225,216,0.15)] px-3 py-1.5 rounded-xl text-xs font-mono shadow-xl">
              <span className={`w-2 h-2 rounded-full ${clickMode === 'start' ? 'bg-[#4ADE80]' : 'bg-[#FF7043]'} animate-pulse`} />
              <span className="text-[#A0A0A0]">Map click sets:</span>
              <span className={`font-bold ${clickMode === 'start' ? 'text-[#4ADE80]' : 'text-[#FF7043]'}`}>
                {clickMode === 'start' ? 'ORIGIN (START)' : 'DESTINATION (TARGET)'}
              </span>
            </div>
          </div>

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
            onSelectCoordinate={handleMapClick}
            onSetStart={setStartCoord}
            onSetDestination={setDestCoord}
            onCursorMove={() => {}}
            showRoverTraverses={true}
          />

          {/* Floating Route Metrics Bar */}
          {primaryRoute && (
            <div className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 z-30 p-4 rounded-2xl bg-[#101114]/90 backdrop-blur-xl border border-[#56D9E8]/40 shadow-2xl flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[#A0A0A0] text-[10px] block">TOTAL DISTANCE</span>
                  <span className="text-base font-bold text-[#56D9E8]">{primaryRoute.distanceKm.toFixed(1)} km</span>
                </div>
                <div>
                  <span className="text-[#A0A0A0] text-[10px] block">ESTIMATED DURATION</span>
                  <span className="text-base font-bold text-[#E7E1D8]">
                    {(primaryRoute.estimatedDurationHours ? primaryRoute.estimatedDurationHours / 24.66 : 0).toFixed(1)} sols
                  </span>
                </div>
                <div>
                  <span className="text-[#A0A0A0] text-[10px] block">ELEVATION DELTA</span>
                  <span className="text-base font-bold text-[#FFB070]">{primaryRoute.cumulativeElevationGainMeters?.toFixed(0) || '0'} m</span>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/planner/briefing')}
                className="text-xs"
              >
                View Full Briefing →
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
