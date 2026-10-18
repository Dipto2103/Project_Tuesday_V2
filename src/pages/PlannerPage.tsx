import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Car,
  Package,
  ShieldCheck,
  Flame,
  Droplets,
  Apple,
  Save,
  Layers,
  ChevronRight,
  ExternalLink,
  Share2
} from 'lucide-react';
import { SegmentedControl } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';
import { MarsMap } from '../components/map/MarsMap';
import { useMarsLayers } from '../hooks/useMarsLayers';
import { useRoutePlanner } from '../hooks/useRoutePlanner';
import { SCIENCE_CATALOG } from '../data/scienceCatalog';
import { HAZARDS_CATALOG } from '../data/hazardsCatalog';
import { evaluateMissionPlan } from '../core/mission/evaluation';
import { EQUIPMENT_CATALOG } from '../core/mission/objectives';
import { normalizeLon360 } from '../core/geo';
import type { Checkpoint } from '../core/types';

export const PlannerPage: React.FC = () => {
  const navigate = useNavigate();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('jezero-western-delta');
  const [mapMode, setMapMode] = useState<'Terrain' | 'Elevation' | 'Hazard'>('Terrain');

  // Equipment selection
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([
    'rover_pressurised',
    'o2_reserve_tank',
    'water_recycler',
    'first_aid_trauma_kit'
  ]);

  const [crewSize, setCrewSize] = useState<number>(4);
  const [durationSols, setDurationSols] = useState<number>(5);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Map and Routing hooks
  const { activeBaseLayer, activeOverlays, toggleLayer } = useMarsLayers();
  const {
    startCoord,
    destCoord,
    setStartCoord,
    setDestCoord,
    primaryRoute,
    alternativeRoute
  } = useRoutePlanner();

  // Fetch checkpoints
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/checkpoints.json`)
      .then((r) => r.json())
      .then((data: Checkpoint[]) => {
        setCheckpoints(data);
        if (data.length > 0) {
          const defaultStart = data.find((c) => c.id.includes('jezero')) || data[0];
          const defaultDest = data.find((c) => c.id.includes('nili') || c.id.includes('gale')) || data[1] || data[0];
          setStartCoord({ latitude: defaultStart.lat, longitude: defaultStart.lonE });
          setDestCoord({ latitude: defaultDest.lat, longitude: defaultDest.lonE });
          setSelectedDestinationId(defaultDest.id);
        }
      })
      .catch((err) => console.warn('[PLANNER] Failed to load checkpoints:', err));
  }, [setStartCoord, setDestCoord]);

  // Handle destination select change
  const handleDestinationChange = (destId: string) => {
    setSelectedDestinationId(destId);
    const cp = checkpoints.find((c) => c.id === destId);
    if (cp) {
      setDestCoord({ latitude: cp.lat, longitude: cp.lonE });
    }
  };

  const handleModeChange = (mode: 'Terrain' | 'Elevation' | 'Hazard') => {
    setMapMode(mode);
    if (mode === 'Terrain') toggleLayer('nasa-trek-viking');
    else if (mode === 'Elevation') toggleLayer('nasa-trek-mola-color');
    else if (mode === 'Hazard') toggleLayer('nasa-trek-viking');
  };

  // Evaluate mission plan
  const destinationCp = checkpoints.find((c) => c.id === selectedDestinationId);
  const evaluation = useMemo(() => {
    const startLoc = checkpoints.length > 0
      ? { lat: checkpoints[0].lat, lonE: checkpoints[0].lonE, label: checkpoints[0].name }
      : { lat: 18.38, lonE: 77.58, label: 'Jezero Crater' };

    return evaluateMissionPlan(
      {
        id: 'mission-plan-current',
        name: 'Field Mission 001',
        start: startLoc,
        stops: destinationCp
          ? [
              {
                checkpointId: destinationCp.id,
                lat: destinationCp.lat,
                lonE: destinationCp.lonE,
                label: destinationCp.name,
                objectives: ['sample_collection']
              }
            ]
          : [],
        vehicle: 'rover_pressurised',
        crew: crewSize,
        durationSols: durationSols,
        reservePct: 20
      },
      checkpoints
    );
  }, [destinationCp, checkpoints, crewSize, durationSols]);

  // Derived metrics from evaluation or fallback to realistic distance
  const distanceKm = primaryRoute?.distanceKm || evaluation.totalDistanceKm || 428;
  const timeSols = primaryRoute?.estimatedDurationHours
    ? primaryRoute.estimatedDurationHours / 24.66
    : evaluation.totalTransitHours / 24.66 || 3.2;

  const o2Kg = evaluation.budget.o2RequiredKg.toFixed(1);
  const waterKg = evaluation.budget.waterNetKg.toFixed(1);
  const foodKg = evaluation.budget.foodRequiredKg.toFixed(1);

  const toggleEquipment = (id: string) => {
    setSelectedEquipmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSavePlan = () => {
    try {
      const planData = {
        destination: selectedDestinationId,
        equipment: selectedEquipmentIds,
        crew: crewSize,
        sols: durationSols,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('mars_lantern_saved_plan', JSON.stringify(planData));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0D10] text-[#E7E1D8] overflow-hidden select-none">
      {/* Top Planner Sub-Nav */}
      <div className="h-12 border-b border-[rgba(231,225,216,0.10)] bg-[#101114] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-xs font-display">
          <span className="font-bold uppercase tracking-wider text-white">MISSION PLANNER</span>
          <span className="text-[#6B6F76]">•</span>
          <button
            onClick={() => navigate('/planner/route')}
            className="text-[#A0A0A0] hover:text-[#FF7043] transition-colors cursor-pointer"
          >
            Route Planner
          </button>
          <button
            onClick={() => navigate('/planner/compare')}
            className="text-[#A0A0A0] hover:text-[#FF7043] transition-colors cursor-pointer"
          >
            Compare Routes
          </button>
          <button
            onClick={() => navigate('/planner/briefing')}
            className="text-[#A0A0A0] hover:text-[#FF7043] transition-colors cursor-pointer"
          >
            Briefing & Export
          </button>
        </div>

        <ProvenanceBadge type="SIMULATED" source="NASA BVAD Standard" showIcon={false} />
      </div>

      {/* Main 3-Column Layout: Left Steps (320px) + Center Map + Right Overview (320px) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Column (320px): Steps & Configuration */}
        <aside className="w-full lg:w-80 bg-[#101114]/95 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-[rgba(231,225,216,0.12)] p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-5">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#FF7043] uppercase block mb-1">
                STEP CONFIGURATION
              </span>
              <h1 className="font-display font-bold text-base uppercase text-white">
                PLAN YOUR EXPEDITION
              </h1>
            </div>

            {/* 1. DESTINATION */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase font-bold text-[#A0A0A0] flex items-center gap-2">
                <span>1. DESTINATION</span>
              </label>
              <select
                value={selectedDestinationId}
                onChange={(e) => handleDestinationChange(e.target.value)}
                className="w-full bg-[#15181D] border border-[rgba(231,225,216,0.15)] rounded-xl px-3 py-2.5 text-xs font-mono text-[#E7E1D8] focus:outline-none focus:border-[#FF7043]"
              >
                {checkpoints.map((cp) => (
                  <option key={cp.id} value={cp.id}>
                    {cp.name} ({cp.kind})
                  </option>
                ))}
              </select>
              {destinationCp && (
                <p className="text-[11px] text-[#A0A0A0] font-sans line-clamp-2 px-1">
                  {destinationCp.summary}
                </p>
              )}
            </div>

            {/* 2. EQUIPMENT CHECKLIST */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase font-bold text-[#A0A0A0]">
                  2. EQUIPMENT
                </span>
                <span className="text-[10px] font-mono text-[#56D9E8]">
                  {selectedEquipmentIds.length} items
                </span>
              </div>

              <div className="space-y-1.5 bg-[#15181D]/80 rounded-xl p-2 border border-[rgba(231,225,216,0.08)]">
                {Object.values(EQUIPMENT_CATALOG).slice(0, 5).map((eq) => {
                  const isChecked = selectedEquipmentIds.includes(eq.id);
                  return (
                    <label
                      key={eq.id}
                      onClick={() => toggleEquipment(eq.id)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-[#1C2027] cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm">⚙️</span>
                        <span className={isChecked ? 'text-white font-medium' : 'text-[#A0A0A0]'}>
                          {eq.name}
                        </span>
                      </div>
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center text-[10px] border ${
                          isChecked
                            ? 'bg-[#C65D38] border-[#FF7043] text-white'
                            : 'border-[rgba(231,225,216,0.20)]'
                        }`}
                      >
                        {isChecked && '✓'}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => navigate('/manual')}
                  className="text-xs font-mono text-[#FF7043] hover:underline cursor-pointer"
                >
                  Edit Equipment specs →
                </button>
              </div>
            </div>

            {/* Crew & Sol Scrubber */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[rgba(231,225,216,0.08)]">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#A0A0A0] block mb-1">Crew Size</span>
                <select
                  value={crewSize}
                  onChange={(e) => setCrewSize(Number(e.target.value))}
                  className="w-full bg-[#15181D] border border-[rgba(231,225,216,0.12)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#E7E1D8]"
                >
                  <option value={2}>2 Crew</option>
                  <option value={4}>4 Crew</option>
                  <option value={6}>6 Crew</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#A0A0A0] block mb-1">Duration</span>
                <select
                  value={durationSols}
                  onChange={(e) => setDurationSols(Number(e.target.value))}
                  className="w-full bg-[#15181D] border border-[rgba(231,225,216,0.12)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#E7E1D8]"
                >
                  <option value={3}>3 Sols</option>
                  <option value={5}>5 Sols</option>
                  <option value={10}>10 Sols</option>
                  <option value={14}>14 Sols</option>
                </select>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Column: Map Canvas */}
        <main className="flex-1 relative h-64 lg:h-full overflow-hidden">
          {/* Top Floating Segmented Control */}
          <div className="absolute top-4 left-4 z-20">
            <SegmentedControl
              options={[
                { id: 'Terrain', label: 'Terrain' },
                { id: 'Elevation', label: 'Elevation' },
                { id: 'Hazard', label: 'Hazard' }
              ]}
              value={mapMode}
              onChange={handleModeChange}
              size="sm"
            />
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
            onSelectCoordinate={(coord) => setDestCoord(coord)}
            onSetStart={setStartCoord}
            onSetDestination={setDestCoord}
            onCursorMove={() => {}}
            showRoverTraverses={true}
          />

          {/* Bottom Rover Caption */}
          <div className="absolute bottom-4 left-4 z-20 px-3 py-1.5 rounded-lg bg-[#101114]/85 backdrop-blur-md border border-[rgba(231,225,216,0.10)] text-[11px] font-mono text-[#A0A0A0]">
            Rover Route Data — Based on Curiosity & Perseverance paths
          </div>
        </main>

        {/* Right Column (320px): MISSION OVERVIEW Panel */}
        <aside className="w-full lg:w-80 bg-[#101114]/95 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-[rgba(231,225,216,0.12)] p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(231,225,216,0.08)] pb-3">
              <span className="font-display font-bold text-sm uppercase text-white">
                MISSION OVERVIEW
              </span>
              <ProvenanceBadge type="MODELED" source="A* Traversability" showIcon={false} />
            </div>

            {/* Distance & Time */}
            <div className="space-y-3 font-mono">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#15181D]/80 border border-[rgba(231,225,216,0.08)]">
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-[#FF7043]" />
                  <span className="text-xs text-[#A0A0A0]">Distance</span>
                </div>
                <span className="font-bold text-sm text-[#E7E1D8]">{Math.round(distanceKm)} km</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#15181D]/80 border border-[rgba(231,225,216,0.08)]">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#56D9E8]" />
                  <span className="text-xs text-[#A0A0A0]">Estimated Time</span>
                </div>
                <span className="font-bold text-sm text-[#E7E1D8]">{timeSols.toFixed(1)} sols</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#15181D]/80 border border-[rgba(231,225,216,0.08)]">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#4ADE80]" />
                  <span className="text-xs text-[#A0A0A0]">Terrain Safety</span>
                </div>
                <span className="font-bold text-sm text-[#4ADE80]">High</span>
              </div>
            </div>

            {/* Resources Needed Row */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#A0A0A0] font-semibold">
                  RESOURCES NEEDED
                </span>
                <span className="text-[9px] font-mono text-[#B392F0]">SIMULATED</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)] text-center">
                  <span className="text-xs font-bold text-[#FF7043] block">O₂</span>
                  <span className="font-mono text-xs text-[#E7E1D8] mt-1 block">{o2Kg} kg</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)] text-center">
                  <span className="text-xs font-bold text-[#56D9E8] block">H₂O</span>
                  <span className="font-mono text-xs text-[#E7E1D8] mt-1 block">{waterKg} kg</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)] text-center">
                  <span className="text-xs font-bold text-[#4ADE80] block">Food</span>
                  <span className="font-mono text-xs text-[#E7E1D8] mt-1 block">{foodKg} kg</span>
                </div>
              </div>
            </div>

            {/* Four Verdict Chips */}
            <div className="space-y-1.5 pt-2 border-t border-[rgba(231,225,216,0.08)] text-xs font-mono">
              <span className="text-[10px] font-mono uppercase text-[#A0A0A0] block mb-1">
                MISSION FEASIBILITY VERDICTS
              </span>
              <div className="flex items-center justify-between text-[11px] py-1 border-b border-[rgba(231,225,216,0.04)]">
                <span className="text-[#A0A0A0]">Resource Margin:</span>
                <span className="text-[#4ADE80] font-bold">{evaluation.feasibility.resourceVerdict}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] py-1 border-b border-[rgba(231,225,216,0.04)]">
                <span className="text-[#A0A0A0]">Terrain Grade:</span>
                <span className="text-[#4ADE80] font-bold">{evaluation.feasibility.terrainVerdict}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] py-1 border-b border-[rgba(231,225,216,0.04)]">
                <span className="text-[#A0A0A0]">Solar Daylight:</span>
                <span className="text-[#56D9E8] font-bold">OK (11.8 h/sol)</span>
              </div>
              <div className="flex items-center justify-between text-[11px] py-1">
                <span className="text-[#A0A0A0]">MOLA Coverage:</span>
                <span className="text-[#4ADE80] font-bold">HIGH (128 ppd)</span>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-[rgba(231,225,216,0.10)] space-y-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleSavePlan}
              className="w-full text-xs font-bold"
            >
              {saveSuccess ? '✓ Plan Saved to Atlas' : 'Save Mission Plan'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/planner/briefing')}
              className="w-full text-xs font-mono"
            >
              Generate Printable Briefing →
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
};
