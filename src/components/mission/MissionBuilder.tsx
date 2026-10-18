import React, { useState, useMemo, useEffect } from 'react';
import {
  Rocket,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Battery,
  Shield,
  Layers,
  FileText,
  Download,
  Share2,
  Printer,
  ChevronRight,
  Plus,
  Trash2,
  ArrowRight,
  Info,
  Check,
  Compass
} from 'lucide-react';
import type { Checkpoint } from '../../core/types';
import type { MarsCoordinate } from '../../types/route';
import {
  MISSION_OBJECTIVES,
  EQUIPMENT_CATALOG,
  type MissionObjectiveDef
} from '../../core/mission/objectives';
import {
  evaluateMissionPlan,
  type MissionInputConfig,
  type MissionEvaluationResult
} from '../../core/mission/evaluation';
import {
  encodeMissionToHash,
  decodeMissionFromHash,
  generateMissionMarkdown
} from '../../core/mission/share';
import { lon360ToDisplay, formatPlanetocentric } from '../../core/geo';

interface MissionBuilderProps {
  catalog: Checkpoint[];
  onSelectCoordinate?: (coord: MarsCoordinate) => void;
  onCenterMap?: (coord: MarsCoordinate) => void;
}

export const MissionBuilder: React.FC<MissionBuilderProps> = ({
  catalog,
  onSelectCoordinate,
  onCenterMap
}) => {
  // Wizard active step
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // Mission State
  const [missionName, setMissionName] = useState('ARES Expedition 1 — Jezero to Nili');
  const [vehicle, setVehicle] = useState<'eva' | 'rover_unpressurised' | 'rover_pressurised'>(
    'rover_pressurised'
  );
  const [crew, setCrew] = useState<number>(3);
  const [durationSols, setDurationSols] = useState<number>(4);
  const [reservePct, setReservePct] = useState<number>(20);

  // Locations: Start + Stops
  const [startPoint, setStartPoint] = useState<{ lat: number; lonE: number; label: string }>({
    lat: 18.4447,
    lonE: 77.4508,
    label: 'Jezero Crater Base (Perseverance Landing)'
  });

  const [stops, setStops] = useState<
    { checkpointId?: string; lat: number; lonE: number; label: string; objectives: string[] }[]
  >([
    {
      checkpointId: 'jezero-kodiak-mesa',
      lat: 18.397,
      lonE: 77.412,
      label: 'Kodiak Mesa Delta Remnant',
      objectives: ['mineral_survey', 'geology_traverse']
    },
    {
      checkpointId: 'swim-arcadia-planitia',
      lat: 39.3,
      lonE: 189.7,
      label: 'Arcadia Planitia (SWIM Ice Likelihood)',
      objectives: ['water_ice_sample', 'deploy_sensor']
    }
  ]);

  const [selectedCheckpointToAdd, setSelectedCheckpointToAdd] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Restore from URL hash on mount if present
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const decoded = decodeMissionFromHash(window.location.hash);
      if (decoded) {
        if (decoded.name) setMissionName(decoded.name);
        if (decoded.vehicle) setVehicle(decoded.vehicle);
        if (decoded.crew) setCrew(decoded.crew);
        if (decoded.durationSols) setDurationSols(decoded.durationSols);
        if (decoded.reservePct !== undefined) setReservePct(decoded.reservePct);
        if (decoded.start) setStartPoint(decoded.start);
        if (decoded.stops && decoded.stops.length > 0) setStops(decoded.stops as any);
      }
    }
  }, []);

  // Update URL hash when mission state changes
  useEffect(() => {
    const config: MissionInputConfig = {
      id: `expedition-${Date.now()}`,
      name: missionName,
      start: startPoint,
      stops,
      vehicle,
      crew,
      durationSols,
      reservePct
    };
    const hash = encodeMissionToHash(config);
    if (hash && typeof window !== 'undefined') {
      window.history.replaceState(null, '', hash);
    }
  }, [missionName, startPoint, stops, vehicle, crew, durationSols, reservePct]);

  // Execute deterministic evaluation
  const missionConfig = useMemo<MissionInputConfig>(() => {
    return {
      id: `ares-${missionName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: missionName,
      start: startPoint,
      stops,
      vehicle,
      crew,
      durationSols,
      reservePct
    };
  }, [missionName, startPoint, stops, vehicle, crew, durationSols, reservePct]);

  const evalResult = useMemo<MissionEvaluationResult>(() => {
    return evaluateMissionPlan(missionConfig, catalog);
  }, [missionConfig, catalog]);

  // Handlers
  const handleAddStop = (checkpointId: string) => {
    const cp = catalog.find((c) => c.id === checkpointId);
    if (!cp) return;

    setStops((prev) => [
      ...prev,
      {
        checkpointId: cp.id,
        lat: cp.lat,
        lonE: cp.lonE,
        label: cp.name,
        objectives:
          cp.resources?.some((r) => r.type === 'water_ice') || cp.kind === 'resource_zone'
            ? ['water_ice_sample']
            : ['geology_traverse']
      }
    ]);
    setSelectedCheckpointToAdd('');
  };

  const handleRemoveStop = (idx: number) => {
    setStops((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleToggleObjective = (stopIdx: number, objId: string) => {
    setStops((prev) =>
      prev.map((stop, i) => {
        if (i !== stopIdx) return stop;
        const exists = stop.objectives.includes(objId);
        return {
          ...stop,
          objectives: exists
            ? stop.objectives.filter((id) => id !== objId)
            : [...stop.objectives, objId]
        };
      })
    );
  };

  const handleExportMarkdown = () => {
    const md = generateMissionMarkdown(missionConfig, evalResult);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${missionConfig.id}-briefing.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify({ missionConfig, evaluation: evalResult }, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${missionConfig.id}-plan.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Verdict badge colors
  const getOverallBadge = (status: string) => {
    switch (status) {
      case 'FEASIBLE UNDER ASSUMPTIONS':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50';
      case 'FEASIBLE WITH WARNINGS':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/50';
      case 'INFEASIBLE':
        return 'bg-rose-950/80 text-rose-300 border-rose-500/50';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="space-y-6 text-mars-text font-sans pb-12">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-mars-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-mars-orange font-mono text-xs font-bold uppercase tracking-wider mb-1">
            <Rocket className="w-4 h-4" />
            <span>Mission Builder Wizard</span>
          </div>
          <input
            type="text"
            value={missionName}
            onChange={(e) => setMissionName(e.target.value)}
            className="bg-transparent text-lg font-bold font-sans text-white focus:outline-none focus:border-b border-mars-orange"
            placeholder="Mission Expedition Name"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyShareLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mars-surface hover:bg-mars-border text-xs font-mono text-slate-200 border border-mars-border transition-colors shadow"
            title="Copy shareable link with mission configuration in URL hash"
          >
            {copyFeedback ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-mars-orange" />}
            <span>{copyFeedback ? 'Copied URL!' : 'Share Link'}</span>
          </button>
          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mars-surface hover:bg-mars-border text-xs font-mono text-slate-200 border border-mars-border transition-colors shadow"
            title="Download field manual Markdown summary"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export MD</span>
          </button>
          <button
            onClick={() => window.print()}
            className="p-1.5 rounded-lg bg-mars-surface hover:bg-mars-border text-slate-300 border border-mars-border transition-colors"
            title="Print Expedition Briefing"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Wizard Progress Steps Bar */}
      <div className="grid grid-cols-4 gap-2 border-b border-mars-border/60 pb-3">
        {[
          { step: 1, label: 'Locations' },
          { step: 2, label: 'Objectives' },
          { step: 3, label: 'Crew & Vehicle' },
          { step: 4, label: 'Evaluation' }
        ].map((s) => (
          <button
            key={s.step}
            onClick={() => setActiveStep(s.step as any)}
            className={`py-2 px-1 text-center border-b-2 font-mono text-xs transition-colors flex items-center justify-center gap-1.5 ${
              activeStep === s.step
                ? 'border-mars-orange text-mars-orange font-bold'
                : 'border-transparent text-mars-muted hover:text-slate-300'
            }`}
          >
            <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px]">
              {s.step}
            </span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* STEP 1: PICK LOCATIONS */}
      {activeStep === 1 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-mono">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>1. Base Outpost & Waypoint Sequence</span>
            </h3>
            <span className="text-[11px] font-mono text-mars-muted">
              {stops.length + 1} locations planned
            </span>
          </div>

          {/* Start Outpost */}
          <div className="bg-mars-surface/60 border border-emerald-500/30 rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-400">
              <span>BASE OUTPOST (START)</span>
              <span>
                {startPoint.lat.toFixed(2)}°, {startPoint.lonE.toFixed(2)}°E
              </span>
            </div>
            <div className="text-white text-xs font-bold">{startPoint.label}</div>
          </div>

          {/* Expedition Stops Sequence */}
          <div className="space-y-2">
            {stops.map((stop, idx) => (
              <div
                key={idx}
                className="bg-mars-surface/40 border border-mars-border rounded-lg p-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-mars-orange/20 border border-mars-orange text-mars-orange flex items-center justify-center text-xs font-mono font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-white">{stop.label}</div>
                    <div className="text-[11px] font-mono text-mars-muted">
                      Coords: {stop.lat.toFixed(2)}°, {stop.lonE.toFixed(2)}°E •{' '}
                      {stop.objectives.length} objective(s)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onCenterMap && (
                    <button
                      onClick={() =>
                        onCenterMap({
                          latitude: stop.lat,
                          longitude: lon360ToDisplay(stop.lonE)
                        })
                      }
                      className="p-1.5 text-mars-muted hover:text-mars-cyan transition-colors"
                      title="Inspect on map"
                    >
                      <Compass className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveStop(idx)}
                    className="p-1.5 text-mars-muted hover:text-red-400 transition-colors"
                    title="Remove stop"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Stop Dropdown */}
          <div className="flex items-center gap-2 pt-2">
            <select
              value={selectedCheckpointToAdd}
              onChange={(e) => setSelectedCheckpointToAdd(e.target.value)}
              className="flex-1 bg-mars-surface border border-mars-border rounded-lg px-3 py-2 text-xs font-mono text-mars-text focus:outline-none focus:border-mars-orange"
            >
              <option value="">Select checkpoint from catalog to add...</option>
              {catalog.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.name} ({cp.kind.replace('_', ' ')})
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (selectedCheckpointToAdd) handleAddStop(selectedCheckpointToAdd);
              }}
              disabled={!selectedCheckpointToAdd}
              className="px-3 py-2 bg-mars-orange hover:bg-mars-orange/90 disabled:opacity-50 text-mars-darkest font-mono text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stop</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PICK OBJECTIVES PER STOP */}
      {activeStep === 2 && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono">
              2. Assign Mission Objectives Per Location
            </h3>
            <span className="text-[11px] font-mono text-mars-muted">
              Select scientific tasks per waypoint
            </span>
          </div>

          {stops.map((stop, sIdx) => (
            <div
              key={sIdx}
              className="bg-mars-surface/40 border border-mars-border rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-mars-border/60 pb-2">
                <div className="font-bold text-white text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-mars-orange/20 border border-mars-orange text-mars-orange flex items-center justify-center text-xs font-mono">
                    {sIdx + 1}
                  </span>
                  <span>{stop.label}</span>
                </div>
                <span className="text-[11px] font-mono text-mars-muted">
                  {stop.lat.toFixed(2)}°, {stop.lonE.toFixed(2)}°E
                </span>
              </div>

              {/* Objectives Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.values(MISSION_OBJECTIVES).map((obj) => {
                  const isChecked = stop.objectives.includes(obj.id);
                  return (
                    <button
                      key={obj.id}
                      type="button"
                      onClick={() => handleToggleObjective(sIdx, obj.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                        isChecked
                          ? 'bg-mars-orange/15 border-mars-orange/60 text-white shadow'
                          : 'bg-mars-darkest/60 border-mars-border/60 text-slate-300 hover:border-mars-border'
                      }`}
                    >
                      <span className="text-base mt-0.5">{obj.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs truncate">{obj.name}</span>
                          {isChecked && <Check className="w-3.5 h-3.5 text-mars-orange shrink-0" />}
                        </div>
                        <p className="text-[10px] text-mars-muted leading-tight mt-0.5">
                          {obj.description}
                        </p>
                        <div className="flex items-center gap-2 text-[9px] font-mono text-slate-400 mt-1">
                          <span>⏱ {obj.durationHours}h</span>
                          <span>📦 {obj.payloadKg}kg</span>
                          {obj.daylightRequired && <span className="text-amber-400">☀ Daylight</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STEP 3: CREW & VEHICLE */}
      {activeStep === 3 && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <h3 className="text-sm font-bold text-white font-mono">
            3. Vehicle Mobility, Crew & Life Support Parameters
          </h3>

          {/* Vehicle Class Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-slate-300">
              VEHICLE MOBILITY CLASS
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'eva',
                  name: 'Suited EVA on Foot',
                  speed: '0.8 km/h',
                  slopeLimit: '15°',
                  capacity: '45 kg/person'
                },
                {
                  id: 'rover_unpressurised',
                  name: 'Unpressurized LRV',
                  speed: '8 km/h',
                  slopeLimit: '20°',
                  capacity: '250 kg'
                },
                {
                  id: 'rover_pressurised',
                  name: 'Pressurized SEV Rover',
                  speed: '14 km/h',
                  slopeLimit: '25°',
                  capacity: '1,200 kg'
                }
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVehicle(v.id as any)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    vehicle === v.id
                      ? 'bg-mars-orange/20 border-mars-orange text-white shadow-lg'
                      : 'bg-mars-surface/40 border-mars-border text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs mb-1">{v.name}</div>
                  <div className="text-[10px] font-mono space-y-0.5 text-slate-300">
                    <div>Speed: {v.speed}</div>
                    <div>Max Slope: {v.slopeLimit}</div>
                    <div>Payload: {v.capacity}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders: Crew, Duration, Reserve */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-mars-surface/40 p-4 rounded-xl border border-mars-border">
            {/* Crew Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 font-semibold">Crew Size</span>
                <span className="text-mars-orange font-bold">{crew} astronauts</span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                value={crew}
                onChange={(e) => setCrew(parseInt(e.target.value, 10))}
                className="w-full accent-mars-orange"
              />
              <span className="text-[10px] text-mars-muted font-mono block">NASA standard: 2-4 crew</span>
            </div>

            {/* Duration Sols Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 font-semibold">Duration (Sols)</span>
                <span className="text-mars-orange font-bold">{durationSols} sols</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="14"
                step="0.5"
                value={durationSols}
                onChange={(e) => setDurationSols(parseFloat(e.target.value))}
                className="w-full accent-mars-orange"
              />
              <span className="text-[10px] text-mars-muted font-mono block">
                ≈ {(durationSols * 24.66).toFixed(1)} Earth hours
              </span>
            </div>

            {/* Reserve Margin Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 font-semibold">Safety Reserve</span>
                <span className="text-mars-orange font-bold">{reservePct}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={reservePct}
                onChange={(e) => setReservePct(parseInt(e.target.value, 10))}
                className="w-full accent-mars-orange"
              />
              <span className="text-[10px] text-mars-muted font-mono block">Recommended: 20% margin</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: EVALUATION & REPORT */}
      {activeStep === 4 && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Overall Verdict Banner (Spec §9.3) */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl ${getOverallBadge(
              evalResult.feasibility.overall
            )}`}
          >
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider font-bold">
                ARES FEASIBILITY VERDICT
              </div>
              <div className="text-base font-bold font-sans mt-0.5">
                {evalResult.feasibility.overall}
              </div>
            </div>
            <div className="text-xs font-mono text-slate-300">
              Total Transit: <span className="font-bold text-white">{evalResult.totalDistanceKm} km</span> ({evalResult.totalTransitHours}h)
            </div>
          </div>

          {/* Four Distinct Verdict Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-mars-surface/50 p-2.5 rounded-lg border border-mars-border text-xs font-mono space-y-1">
              <span className="text-[10px] text-mars-muted uppercase font-bold">1. Resources</span>
              <div className="text-white font-bold text-[11px] truncate">
                {evalResult.feasibility.resourceVerdict.split(':')[1] || 'PASS'}
              </div>
            </div>
            <div className="bg-mars-surface/50 p-2.5 rounded-lg border border-mars-border text-xs font-mono space-y-1">
              <span className="text-[10px] text-mars-muted uppercase font-bold">2. Terrain</span>
              <div className="text-white font-bold text-[11px] truncate">
                {evalResult.feasibility.terrainVerdict.split(':')[1] || 'PASS'}
              </div>
            </div>
            <div className="bg-mars-surface/50 p-2.5 rounded-lg border border-mars-border text-xs font-mono space-y-1">
              <span className="text-[10px] text-mars-muted uppercase font-bold">3. Schedule</span>
              <div className="text-white font-bold text-[11px] truncate">
                {evalResult.feasibility.scheduleVerdict.split(':')[1] || 'ON-TIME'}
              </div>
            </div>
            <div className="bg-mars-surface/50 p-2.5 rounded-lg border border-mars-border text-xs font-mono space-y-1">
              <span className="text-[10px] text-mars-muted uppercase font-bold">4. Data Quality</span>
              <div className="text-white font-bold text-[11px] truncate">
                {evalResult.feasibility.dataCoverageVerdict.split(':')[1] || 'VERIFIED'}
              </div>
            </div>
          </div>

          {/* Consumable Budget Breakdown Table */}
          <div className="bg-mars-surface/40 p-4 rounded-xl border border-mars-border space-y-3">
            <div className="flex items-center justify-between border-b border-mars-border/60 pb-2">
              <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Battery className="w-4 h-4 text-emerald-400" />
                <span>Consumable Budget & ECLSS Allocation</span>
              </h4>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-500/40">
                SIMULATED ASSUMPTION
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-mars-darkest/60 p-2.5 rounded border border-mars-border/40">
                <span className="text-[10px] text-mars-muted">Oxygen (O₂)</span>
                <div className="text-emerald-300 font-bold text-sm">
                  {evalResult.budget.o2RequiredKg} kg
                </div>
              </div>
              <div className="bg-mars-darkest/60 p-2.5 rounded border border-mars-border/40">
                <span className="text-[10px] text-mars-muted">Water (Net)</span>
                <div className="text-sky-300 font-bold text-sm">
                  {evalResult.budget.waterNetKg} kg
                </div>
              </div>
              <div className="bg-mars-darkest/60 p-2.5 rounded border border-mars-border/40">
                <span className="text-[10px] text-mars-muted">Dry Rations</span>
                <div className="text-amber-300 font-bold text-sm">
                  {evalResult.budget.foodRequiredKg} kg
                </div>
              </div>
              <div className="bg-mars-darkest/60 p-2.5 rounded border border-mars-border/40">
                <span className="text-[10px] text-mars-muted">Total Payload Mass</span>
                <div className="text-white font-bold text-sm">
                  {evalResult.budget.totalPayloadKg} / {evalResult.budget.maxPayloadCapacityKg} kg
                </div>
              </div>
            </div>
          </div>

          {/* Traverse Legs Table */}
          <div className="bg-mars-surface/40 p-4 rounded-xl border border-mars-border space-y-3">
            <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-mars-orange" />
              <span>Evaluated Traverse Legs</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-slate-400 border-b border-mars-border/60 text-[10px]">
                    <th className="pb-1.5">Leg</th>
                    <th className="pb-1.5">Distance</th>
                    <th className="pb-1.5">Transit</th>
                    <th className="pb-1.5">Max Slope</th>
                    <th className="pb-1.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mars-border/30">
                  {evalResult.legs.map((leg, i) => (
                    <tr key={i} className="text-slate-200">
                      <td className="py-2 truncate max-w-[140px] font-bold">
                        {leg.fromId} → {leg.toId}
                      </td>
                      <td className="py-2">{leg.distanceKm} km</td>
                      <td className="py-2">{leg.durationHours} h</td>
                      <td className="py-2 text-amber-300">{leg.maxSlopeDeg}°</td>
                      <td className="py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            leg.status === 'FEASIBLE'
                              ? 'bg-emerald-950 text-emerald-300'
                              : leg.status === 'HIGH_RISK'
                              ? 'bg-amber-950 text-amber-300'
                              : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          {leg.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Why List & Recommendations */}
          {(evalResult.feasibility.reasons.length > 0 ||
            evalResult.feasibility.recommendations.length > 0) && (
            <div className="bg-mars-surface/40 p-4 rounded-xl border border-mars-border space-y-2">
              {evalResult.feasibility.reasons.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-rose-400 font-mono uppercase mb-1">
                    Constraints & Risk Factors
                  </div>
                  <ul className="text-xs font-sans text-slate-300 space-y-1 list-disc list-inside">
                    {evalResult.feasibility.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {evalResult.feasibility.recommendations.length > 0 && (
                <div className="pt-2 border-t border-mars-border/40">
                  <div className="text-xs font-bold text-mars-cyan font-mono uppercase mb-1">
                    Actionable Recommendations
                  </div>
                  <ul className="text-xs font-sans text-slate-300 space-y-1 list-disc list-inside">
                    {evalResult.feasibility.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom Step Navigation Bar */}
      <div className="flex items-center justify-between border-t border-mars-border/80 pt-4">
        <button
          onClick={() => setActiveStep((prev) => Math.max(1, prev - 1) as any)}
          disabled={activeStep === 1}
          className="px-4 py-2 rounded-lg bg-mars-surface hover:bg-mars-border disabled:opacity-40 text-xs font-mono text-slate-300 transition-colors"
        >
          Previous
        </button>

        <span className="text-xs font-mono text-mars-muted">Step {activeStep} of 4</span>

        <button
          onClick={() => setActiveStep((prev) => Math.min(4, prev + 1) as any)}
          disabled={activeStep === 4}
          className="px-4 py-2 rounded-lg bg-mars-orange hover:bg-mars-orange/90 disabled:opacity-40 text-xs font-mono text-mars-darkest font-bold transition-colors flex items-center gap-1"
        >
          <span>{activeStep === 3 ? 'Evaluate Mission' : 'Next Step'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
