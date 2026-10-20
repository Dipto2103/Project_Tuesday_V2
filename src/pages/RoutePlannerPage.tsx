import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Route,
  Play,
  Trash2,
  ArrowRightLeft,
  Compass,
  Clock,
  Mountain,
  Info,
  AlertTriangle,
  Layers,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  GitCompare,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Button } from '../components/ui/Button';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';
import { MarsMap } from '../components/map/MarsMap';
import { useMarsLayers } from '../hooks/useMarsLayers';
import { routeStore, useRouteStore } from '../state/routeStore';
import { planModeA } from '../core/route/modeA';
import { planMultiModeB } from '../core/route/modeB';
import { planModeC } from '../core/route/modeC';
import type {
  RouteRequest,
  RouteResult,
  RouteError,
  Vehicle,
  RouteMode,
  LatLonE,
  SegmentFlag
} from '../core/route/types';
import type { TrackPoints } from '../core/rovers/types';
import { SCIENCE_CATALOG } from '../data/scienceCatalog';
import { HAZARDS_CATALOG } from '../data/hazardsCatalog';
import { DEMO_LOCATIONS } from '../data/demoLocations';
import { parseCoordinateInput } from '../core/search';
import { normalizeLon360, haversineKm } from '../core/geo';
import type { Checkpoint } from '../core/types';
import type { MarsCoordinate, PlannedRoute } from '../types/route';

export const RoutePlannerPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const store = useRouteStore();

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const { activeBaseLayer, activeOverlays } = useMarsLayers();
  const [clickMode, setClickMode] = useState<'start' | 'dest'>('start');

  // Local Form state synced from store
  const [fromLat, setFromLat] = useState<number>(store.request.from.lat);
  const [fromLonE, setFromLonE] = useState<number>(store.request.from.lonE);
  const [toLat, setToLat] = useState<number>(store.request.to.lat);
  const [toLonE, setToLonE] = useState<number>(store.request.to.lonE);
  const [vehicle, setVehicle] = useState<Vehicle>(store.request.vehicle || 'eva');
  const [mode, setMode] = useState<RouteMode>(store.request.mode || 'B_TERRAIN_ASTAR');
  const [riskTolerant, setRiskTolerant] = useState<boolean>(!!store.request.riskTolerant);
  const [roverChoice, setRoverChoice] = useState<'Curiosity' | 'Perseverance'>('Curiosity');

  const [activeTab, setActiveTab] = useState<number>(0);
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [computeProgress, setComputeProgress] = useState<{ pct: number; phase: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cancelRef = useRef<boolean>(false);

  // Load checkpoints catalog
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/checkpoints.json`)
      .then((r) => r.json())
      .then((data: Checkpoint[]) => setCheckpoints(data))
      .catch((err) => console.warn('[ROUTE PLANNER] Failed to load checkpoints:', err));
  }, []);

  // Sync from URL search params on initial mount
  useEffect(() => {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const modeParam = searchParams.get('mode');
    const vehParam = searchParams.get('veh');

    if (fromParam) {
      const parsed = parseCoordinateInput(fromParam);
      if (parsed) {
        setFromLat(parsed.lat);
        setFromLonE(parsed.lonE);
        routeStore.setFrom({ lat: parsed.lat, lonE: parsed.lonE });
      }
    }
    if (toParam) {
      const parsed = parseCoordinateInput(toParam);
      if (parsed) {
        setToLat(parsed.lat);
        setToLonE(parsed.lonE);
        routeStore.setTo({ lat: parsed.lat, lonE: parsed.lonE });
      }
    }
    if (modeParam) {
      if (modeParam === 'A' || modeParam === 'A_DIRECT') {
        setMode('A_DIRECT');
        routeStore.setMode('A_DIRECT');
      } else if (modeParam === 'B' || modeParam === 'B_TERRAIN_ASTAR') {
        setMode('B_TERRAIN_ASTAR');
        routeStore.setMode('B_TERRAIN_ASTAR');
      } else if (modeParam === 'C' || modeParam === 'C_ROVER_REFERENCE') {
        setMode('C_ROVER_REFERENCE');
        routeStore.setMode('C_ROVER_REFERENCE');
      }
    }
    if (vehParam) {
      if (vehParam === 'eva' || vehParam === 'rover_unpressurised' || vehParam === 'rover_pressurised') {
        setVehicle(vehParam as Vehicle);
        routeStore.setVehicle(vehParam as Vehicle);
      }
    }
  }, []);

  // Update URL params when form inputs change (without navigating)
  const updateUrlParams = (newFrom: LatLonE, newTo: LatLonE, newMode: RouteMode, newVeh: Vehicle) => {
    const params = new URLSearchParams(searchParams);
    params.set('from', `${newFrom.lat.toFixed(4)},${newFrom.lonE.toFixed(4)}`);
    params.set('to', `${newTo.lat.toFixed(4)},${newTo.lonE.toFixed(4)}`);
    params.set('mode', newMode === 'A_DIRECT' ? 'A' : newMode === 'C_ROVER_REFERENCE' ? 'C' : 'B');
    params.set('veh', newVeh);
    setSearchParams(params, { replace: true });
  };

  const handleMapClick = (coord: { latitude: number; longitude: number }) => {
    const lonE = normalizeLon360(coord.longitude);
    if (clickMode === 'start') {
      setFromLat(coord.latitude);
      setFromLonE(lonE);
      routeStore.setFrom({ lat: coord.latitude, lonE });
      updateUrlParams({ lat: coord.latitude, lonE }, { lat: toLat, lonE: toLonE }, mode, vehicle);
      setClickMode('dest');
    } else {
      setToLat(coord.latitude);
      setToLonE(lonE);
      routeStore.setTo({ lat: coord.latitude, lonE });
      updateUrlParams({ lat: fromLat, lonE: fromLonE }, { lat: coord.latitude, lonE }, mode, vehicle);
    }
  };

  const handleSwap = () => {
    const tempLat = fromLat;
    const tempLon = fromLonE;
    setFromLat(toLat);
    setFromLonE(toLonE);
    setToLat(tempLat);
    setToLonE(tempLon);
    routeStore.setFrom({ lat: toLat, lonE: toLonE });
    routeStore.setTo({ lat: tempLat, lonE: tempLon });
    updateUrlParams({ lat: toLat, lonE: toLonE }, { lat: tempLat, lonE: tempLon }, mode, vehicle);
  };

  // Perform Calculation
  const handleCalculate = async () => {
    setIsComputing(true);
    setErrorMessage(null);
    cancelRef.current = false;
    setComputeProgress({ pct: 15, phase: 'Loading DEM and terrain parameters' });

    const req: RouteRequest = {
      mode,
      from: { lat: fromLat, lonE: fromLonE },
      to: { lat: toLat, lonE: toLonE },
      vehicle,
      riskTolerant,
      assumptions: {}
    };

    try {
      if (mode === 'A_DIRECT') {
        setComputeProgress({ pct: 60, phase: 'Generating Great-Circle Arc' });
        const resA = planModeA(req);
        routeStore.setResults([resA]);
      } else if (mode === 'B_TERRAIN_ASTAR') {
        setComputeProgress({ pct: 30, phase: 'Constructing 8-Connected Cost Raster' });
        const multiB = planMultiModeB(req, {
          onProgress: (pct) => {
            if (!cancelRef.current) {
              setComputeProgress({ pct, phase: 'Executing A* Multi-Heuristic Search' });
            }
          },
          shouldCancel: () => cancelRef.current
        });

        if (cancelRef.current) {
          routeStore.cancelCalculation();
          return;
        }

        const resList: (RouteResult | RouteError)[] = [];
        if (multiB.shortest) resList.push(multiB.shortest);
        if (multiB.safest) resList.push(multiB.safest);

        if (resList.length === 0) {
          throw new Error('No traversable path found under vehicle slope limit. Try enabling Risk-Tolerant mode or adjusting coordinates.');
        }

        routeStore.setResults(resList);
      } else if (mode === 'C_ROVER_REFERENCE') {
        setComputeProgress({ pct: 35, phase: `Loading ${roverChoice} PDS Localization Points` });
        
        let track: TrackPoints | undefined = store.loadedTracks[roverChoice.toLowerCase()];
        if (!track) {
          const resp = await fetch(`${import.meta.env.BASE_URL}data/tracks/${roverChoice.toLowerCase()}.points.json`);
          if (!resp.ok) throw new Error(`Could not load ${roverChoice} reference points from PDS track dataset.`);
          track = await resp.json();
          if (track) routeStore.setLoadedTrack(roverChoice, track);
        }

        if (!track) throw new Error('Reference traverse dataset is not available.');

        setComputeProgress({ pct: 75, phase: 'Aligning traverse and computing proximity' });
        const resC = planModeC(req, track, roverChoice);
        routeStore.setResults([resC]);
      }

      setActiveTab(0);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Route calculation failed');
    } finally {
      setIsComputing(false);
      setComputeProgress(null);
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
    setIsComputing(false);
    setComputeProgress(null);
    routeStore.cancelCalculation();
  };

  // Active Result for display
  const results = store.results;
  const activeResult: RouteResult | RouteError | undefined = results[activeTab] || results[0];
  const isResultSuccess = activeResult && (activeResult as any).ok === true;
  const currentRouteResult = isResultSuccess ? (activeResult as RouteResult) : null;

  // Format elevation chart profile
  const profileChartData = useMemo(() => {
    if (!currentRouteResult || !currentRouteResult.segments) return [];
    let cumDist = 0;
    return currentRouteResult.segments.map((seg, idx) => {
      cumDist += seg.lengthKm;
      return {
        distKm: parseFloat(cumDist.toFixed(2)),
        elevM: seg.elevationM ?? 0,
        slopeDeg: seg.slopeDeg ?? 0,
        flag: seg.flag
      };
    });
  }, [currentRouteResult]);

  // Convert active route geometry to Leaflet format for MarsMap
  const primaryPlannedRoute: PlannedRoute | null = useMemo(() => {
    if (!currentRouteResult || currentRouteResult.geometry.length === 0) return null;
    const waypoints = currentRouteResult.geometry.map((pt) => ({
      latitude: pt.lat,
      longitude: pt.lonE
    }));
    return {
      id: `route-${activeTab}`,
      name: `${currentRouteResult.mode} Traverse`,
      start: waypoints[0],
      destination: waypoints[waypoints.length - 1],
      waypoints,
      distanceKm: currentRouteResult.distanceKm,
      estimatedDurationHours: currentRouteResult.timeHours,
      method: currentRouteResult.mode === 'A_DIRECT' ? 'direct' : currentRouteResult.mode === 'C_ROVER_REFERENCE' ? 'historical-rover-reference' : 'terrain-aware',
      terrainAssessmentAvailable: true,
      maxSlopeDeg: currentRouteResult.maxSlopeDeg ?? undefined,
      averageSlopeDeg: currentRouteResult.meanSlopeDeg ?? undefined,
      cumulativeElevationGainMeters: currentRouteResult.climbM || 0,
      dataLimitations: currentRouteResult.warnings,
      hazardsIntersected: [],
      scienceTargetsNear: []
    };
  }, [currentRouteResult, activeTab]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0D10] text-[#E7E1D8] overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="h-12 border-b border-[rgba(231,225,216,0.10)] bg-[#101114] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-xs font-display">
          <span className="font-bold uppercase tracking-wider text-white">ROUTE PLANNER</span>
          <span className="text-[#6B6F76]">•</span>
          <span className="text-[#FF7043] font-semibold">Multi-Mode Spherical Navigation</span>
          <span className="text-[#6B6F76]">•</span>
          <button
            onClick={() => navigate('/planner/compare')}
            className="text-[#A0A0A0] hover:text-[#56D9E8] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Compare Matrix</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {store.stale && (
            <span className="text-[10px] font-mono bg-[#EAB308]/20 border border-[#EAB308]/40 text-[#EAB308] px-2 py-0.5 rounded-full font-bold animate-pulse">
              Inputs Changed — Recalculate
            </span>
          )}
          <ProvenanceBadge
            type={mode === 'C_ROVER_REFERENCE' ? 'NASA-DERIVED' : 'MODELED'}
            source="MOLA MEGDR 463m Slope Engine"
            showIcon={false}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Side: Parameters & Results Panel (440px) */}
        <aside className="w-full lg:w-[440px] bg-[#101114]/98 backdrop-blur-2xl border-b lg:border-b-0 lg:border-r border-[rgba(231,225,216,0.12)] p-4 flex flex-col justify-between shrink-0 overflow-y-auto z-20">
          <div className="space-y-4">
            {/* Mode Selector */}
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#FF7043] uppercase block mb-1.5">
                1. PLANNING MODE
              </span>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#15181D] rounded-xl border border-[rgba(231,225,216,0.08)]">
                <button
                  type="button"
                  onClick={() => {
                    setMode('A_DIRECT');
                    routeStore.setMode('A_DIRECT');
                    updateUrlParams({ lat: fromLat, lonE: fromLonE }, { lat: toLat, lonE: toLonE }, 'A_DIRECT', vehicle);
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-mono font-bold transition-all text-center ${
                    mode === 'A_DIRECT'
                      ? 'bg-[#FF7043] text-white shadow-md'
                      : 'text-[#A0A0A0] hover:text-white hover:bg-[#1C2027]'
                  }`}
                  title="Direct Spherical Great-Circle arc. Lower bound distance; not terrain checked."
                >
                  Mode A: Direct
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('B_TERRAIN_ASTAR');
                    routeStore.setMode('B_TERRAIN_ASTAR');
                    updateUrlParams({ lat: fromLat, lonE: fromLonE }, { lat: toLat, lonE: toLonE }, 'B_TERRAIN_ASTAR', vehicle);
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-mono font-bold transition-all text-center ${
                    mode === 'B_TERRAIN_ASTAR'
                      ? 'bg-[#56D9E8] text-[#0B0D10] shadow-md'
                      : 'text-[#A0A0A0] hover:text-white hover:bg-[#1C2027]'
                  }`}
                  title="Terrain-Aware A* pathfinding. Multi-heuristic slope avoidance on MOLA DEM."
                >
                  Mode B: A*
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('C_ROVER_REFERENCE');
                    routeStore.setMode('C_ROVER_REFERENCE');
                    updateUrlParams({ lat: fromLat, lonE: fromLonE }, { lat: toLat, lonE: toLonE }, 'C_ROVER_REFERENCE', vehicle);
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-mono font-bold transition-all text-center ${
                    mode === 'C_ROVER_REFERENCE'
                      ? 'bg-[#F5B544] text-[#0B0D10] shadow-md'
                      : 'text-[#A0A0A0] hover:text-white hover:bg-[#1C2027]'
                  }`}
                  title="Reference against verified Curiosity or Perseverance robotic traverses."
                >
                  Mode C: Rover
                </button>
              </div>

              {/* Mode Description Banner */}
              <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-[#15181D]/60 border border-[rgba(231,225,216,0.06)] text-[11px] font-sans text-[#A0A0A0]">
                {mode === 'A_DIRECT' && 'Great-circle geodesic arc. Baseline distance; no terrain obstacles avoided.'}
                {mode === 'B_TERRAIN_ASTAR' && 'A* slope cost optimization on 463m MOLA grid. Computes Shortest + Safest.'}
                {mode === 'C_ROVER_REFERENCE' && 'Validated NASA robotic track extract with proximity & corridor analysis.'}
              </div>
            </div>

            {/* Vehicle Selector */}
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#A0A0A0] uppercase block mb-1.5">
                2. VEHICLE MOBILITY LIMIT
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'eva', label: 'Astronaut EVA', limit: '15° Limit', desc: 'Suit fall risk' },
                  { id: 'rover_unpressurised', label: 'Light Rover', limit: '20° Limit', desc: 'Agile 4x4' },
                  { id: 'rover_pressurised', label: 'Pressurised', limit: '15° Limit', desc: 'Heavy chassis' }
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setVehicle(v.id as Vehicle);
                      routeStore.setVehicle(v.id as Vehicle);
                      updateUrlParams({ lat: fromLat, lonE: fromLonE }, { lat: toLat, lonE: toLonE }, mode, v.id as Vehicle);
                    }}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      vehicle === v.id
                        ? 'bg-[#15181D] border-[#FF7043] ring-1 ring-[#FF7043]/40'
                        : 'bg-[#15181D]/50 border-[rgba(231,225,216,0.08)] hover:border-[rgba(231,225,216,0.2)]'
                    }`}
                  >
                    <span className="text-xs font-bold text-white block">{v.label}</span>
                    <span className="text-[10px] font-mono text-[#FF7043] block">{v.limit}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode C Rover Choice */}
            {mode === 'C_ROVER_REFERENCE' && (
              <div className="p-3 rounded-xl bg-[#15181D] border border-[#F5B544]/30 space-y-2">
                <span className="text-[10px] font-mono font-bold text-[#F5B544] uppercase block">
                  REFERENCE ROVER TRACK
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRoverChoice('Curiosity')}
                    className={`p-2 rounded-lg text-xs font-mono font-bold ${
                      roverChoice === 'Curiosity'
                        ? 'bg-[#F5B544] text-[#0B0D10]'
                        : 'bg-[#1C2027] text-[#E7E1D8] border border-[rgba(231,225,216,0.1)]'
                    }`}
                  >
                    Curiosity (Gale)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoverChoice('Perseverance')}
                    className={`p-2 rounded-lg text-xs font-mono font-bold ${
                      roverChoice === 'Perseverance'
                        ? 'bg-[#F5B544] text-[#0B0D10]'
                        : 'bg-[#1C2027] text-[#E7E1D8] border border-[rgba(231,225,216,0.1)]'
                    }`}
                  >
                    Perseverance (Jezero)
                  </button>
                </div>
              </div>
            )}

            {/* Origin & Destination Waypoints */}
            <div className="space-y-2 pt-2 border-t border-[rgba(231,225,216,0.08)]">
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#A0A0A0] uppercase block">
                3. WAYPOINTS
              </span>

              {/* Presets */}
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {DEMO_LOCATIONS.slice(0, 4).map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFromLat(preset.coordinates.latitude);
                      setFromLonE(preset.coordinates.longitude);
                      setToLat(preset.coordinates.latitude + 0.12);
                      setToLonE(preset.coordinates.longitude + 0.12);
                      routeStore.setFrom({ lat: preset.coordinates.latitude, lonE: preset.coordinates.longitude });
                      routeStore.setTo({ lat: preset.coordinates.latitude + 0.12, lonE: preset.coordinates.longitude + 0.12 });
                      updateUrlParams(
                        { lat: preset.coordinates.latitude, lonE: preset.coordinates.longitude },
                        { lat: preset.coordinates.latitude + 0.12, lonE: preset.coordinates.longitude + 0.12 },
                        mode,
                        vehicle
                      );
                    }}
                    className="p-1.5 rounded-lg bg-[#15181D] hover:bg-[#1C2027] border border-[rgba(231,225,216,0.08)] text-left text-[11px] font-mono text-[#A0A0A0] hover:text-white truncate"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              {/* Start & End Card */}
              <div
                onClick={() => setClickMode('start')}
                className={`p-2.5 rounded-xl border text-xs font-mono cursor-pointer transition-all ${
                  clickMode === 'start'
                    ? 'bg-[#15181D] border-[#4ADE80] ring-1 ring-[#4ADE80]/50'
                    : 'bg-[#15181D]/60 border-[#4ADE80]/30 hover:border-[#4ADE80]/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#4ADE80] font-bold">START (ORIGIN):</span>
                  <span className="text-[10px] text-[#A0A0A0]">{clickMode === 'start' ? '● Active' : 'Click to set'}</span>
                </div>
                <div className="text-white font-bold">
                  {fromLat.toFixed(4)}°N, {fromLonE.toFixed(4)}°E
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="p-1.5 rounded-lg bg-[#1C2027] text-[#A0A0A0] hover:text-[#FF7043] border border-[rgba(231,225,216,0.10)]"
                  title="Swap Origin & Destination"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              <div
                onClick={() => setClickMode('dest')}
                className={`p-2.5 rounded-xl border text-xs font-mono cursor-pointer transition-all ${
                  clickMode === 'dest'
                    ? 'bg-[#15181D] border-[#FF7043] ring-1 ring-[#FF7043]/50'
                    : 'bg-[#15181D]/60 border-[#FF7043]/30 hover:border-[#FF7043]/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#FF7043] font-bold">TARGET (DESTINATION):</span>
                  <span className="text-[10px] text-[#A0A0A0]">{clickMode === 'dest' ? '● Active' : 'Click to set'}</span>
                </div>
                <div className="text-white font-bold">
                  {toLat.toFixed(4)}°N, {toLonE.toFixed(4)}°E
                </div>
              </div>
            </div>

            {/* Mode B Advanced Options */}
            {mode === 'B_TERRAIN_ASTAR' && (
              <div className="pt-2 border-t border-[rgba(231,225,216,0.08)] flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-[#A0A0A0]">
                  <input
                    type="checkbox"
                    checked={riskTolerant}
                    onChange={(e) => {
                      setRiskTolerant(e.target.checked);
                      routeStore.setRiskTolerant(e.target.checked);
                    }}
                    className="accent-[#56D9E8] rounded"
                  />
                  <span>Risk-Tolerant (Traverse UNKNOWN Gaps at 8× Cost)</span>
                </label>
              </div>
            )}

            {/* Calculate / Cancel Controls */}
            <div className="pt-3 border-t border-[rgba(231,225,216,0.10)] space-y-2">
              {isComputing ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#56D9E8] animate-pulse">{computeProgress?.phase || 'Computing path...'}</span>
                    <span className="font-bold text-white">{computeProgress?.pct || 0}%</span>
                  </div>
                  <div className="w-full bg-[#1C2027] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#56D9E8] h-full transition-all duration-300"
                      style={{ width: `${computeProgress?.pct || 15}%` }}
                    />
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleCancel}
                    className="w-full text-xs font-mono"
                  >
                    Cancel Calculation
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCalculate}
                  className="w-full text-xs font-bold uppercase tracking-wider"
                >
                  <Play className="w-3.5 h-3.5 mr-1.5 fill-white" />
                  Calculate Route
                </Button>
              )}

              {errorMessage && (
                <div className="p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 text-xs font-mono text-[#EF4444] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Results Section (When routes exist) */}
            {results.length > 0 && (
              <div className="pt-4 border-t border-[rgba(231,225,216,0.12)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-white uppercase">
                    CALCULATED ALTERNATIVES
                  </span>
                  <button
                    onClick={() => routeStore.clearResults()}
                    className="text-[10px] font-mono text-[#A0A0A0] hover:text-[#EF4444] flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>

                {/* Results Tabs */}
                <div className="flex gap-1.5 p-1 bg-[#15181D] rounded-xl border border-[rgba(231,225,216,0.08)]">
                  {results.map((res, idx) => {
                    const r = res as RouteResult;
                    let tabLabel = `Route ${idx + 1}`;
                    if (r.mode === 'A_DIRECT' || r.mode === 'A') tabLabel = 'A: Direct';
                    else if (r.mode === 'B_TERRAIN_ASTAR' || r.mode === 'B') {
                      tabLabel = idx === 0 ? 'B: Shortest' : 'B: Safest';
                    } else if (r.mode === 'C_ROVER_REFERENCE' || r.mode === 'C') {
                      tabLabel = 'C: Rover Ref';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActiveTab(idx);
                          routeStore.setSelectedRouteIndex(idx);
                        }}
                        className={`flex-1 py-1.5 text-xs font-mono font-bold rounded-lg transition-all ${
                          activeTab === idx
                            ? 'bg-[#1C2027] text-white border border-[rgba(231,225,216,0.2)]'
                            : 'text-[#A0A0A0] hover:text-white'
                        }`}
                      >
                        {tabLabel}
                      </button>
                    );
                  })}
                </div>

                {/* Mandatory Warnings Banner (Spec §8.2–§8.4) */}
                {currentRouteResult && currentRouteResult.warnings.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#EAB308]/15 border border-[#EAB308]/40 space-y-1">
                    <div className="flex items-center gap-1.5 text-[#EAB308] text-xs font-bold font-mono">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>MANDATORY SCIENTIFIC WARNINGS:</span>
                    </div>
                    {currentRouteResult.warnings.map((warn, wIdx) => (
                      <p key={wIdx} className="text-[11px] font-sans text-[#E7E1D8] pl-5">
                        • {warn}
                      </p>
                    ))}
                  </div>
                )}

                {/* Key Metrics Grid */}
                {currentRouteResult && (
                  <div className="space-y-3 font-mono">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)]">
                        <span className="text-[10px] text-[#A0A0A0] block">TOTAL DISTANCE</span>
                        <span className="text-base font-bold text-[#56D9E8]">
                          {currentRouteResult.distanceKm.toFixed(2)} km
                        </span>
                        <span className="text-[10px] text-[#A0A0A0] block">
                          Detour: {currentRouteResult.detourRatio.toFixed(2)}×
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)]">
                        <span className="text-[10px] text-[#A0A0A0] block">ESTIMATED DURATION</span>
                        <span className="text-base font-bold text-[#E7E1D8]">
                          {currentRouteResult.timeHours !== null
                            ? `${currentRouteResult.timeHours.toFixed(1)} hrs`
                            : 'N/A (Geometric)'}
                        </span>
                        <span className="text-[10px] text-[#FF7043] block">SIMULATED ASSUMPTION</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)]">
                        <span className="text-[10px] text-[#A0A0A0] block">MAX SLOPE / MEAN</span>
                        <span className="text-sm font-bold text-[#FFB070]">
                          {currentRouteResult.maxSlopeDeg !== null ? `${currentRouteResult.maxSlopeDeg.toFixed(1)}°` : 'N/A'} / {currentRouteResult.meanSlopeDeg !== null ? `${currentRouteResult.meanSlopeDeg.toFixed(1)}°` : 'N/A'}
                        </span>
                        <span className="text-[10px] text-[#A0A0A0] block">
                          Climb: +{currentRouteResult.climbM.toFixed(0)}m
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)]">
                        <span className="text-[10px] text-[#A0A0A0] block">SLOPE LIMIT VERDICT</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {currentRouteResult.passesSlopeLimit === true && (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#4ADE80]" />
                              <span className="text-xs font-bold text-[#4ADE80]">PASSES</span>
                            </>
                          )}
                          {currentRouteResult.passesSlopeLimit === false && (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-[#EF4444]" />
                              <span className="text-xs font-bold text-[#EF4444]">FAILS</span>
                            </>
                          )}
                          {currentRouteResult.passesSlopeLimit === 'UNKNOWN' && (
                            <>
                              <HelpCircle className="w-3.5 h-3.5 text-[#EAB308]" />
                              <span className="text-xs font-bold text-[#EAB308]">UNVERIFIED</span>
                            </>
                          )}
                        </div>
                        <span className="text-[10px] text-[#A0A0A0] block">
                          Limit: {vehicle === 'rover_unpressurised' ? '20°' : '15°'}
                        </span>
                      </div>
                    </div>

                    {/* Data Coverage Bar */}
                    <div className="p-2.5 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)] space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#A0A0A0]">Regional DEM Coverage:</span>
                        <span className="font-bold text-[#56D9E8]">{currentRouteResult.dataCoveragePct}%</span>
                      </div>
                      <div className="w-full bg-[#1C2027] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#56D9E8] h-full"
                          style={{ width: `${currentRouteResult.dataCoveragePct}%` }}
                        />
                      </div>
                    </div>

                    {/* Elevation Profile Chart */}
                    {profileChartData.length > 1 && (
                      <div className="p-3 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)] space-y-2">
                        <span className="text-[10px] text-[#A0A0A0] block uppercase">
                          TOPOGRAPHY & SLOPE PROFILE (MOLA 463m)
                        </span>
                        <div className="h-28 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={profileChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#22272E" />
                              <XAxis dataKey="distKm" stroke="#6B6F76" fontSize={9} />
                              <YAxis stroke="#6B6F76" fontSize={9} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#101114', borderColor: '#30363D', fontSize: '11px' }}
                                formatter={(val: any, name: any) => [
                                  name === 'elevM' ? `${val} m` : `${val}°`,
                                  name === 'elevM' ? 'Elevation' : 'Slope'
                                ]}
                                labelFormatter={(label) => `Distance: ${label} km`}
                              />
                              <Area type="monotone" dataKey="elevM" stroke="#56D9E8" fill="#56D9E8" fillOpacity={0.2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Right Side: Map Canvas */}
        <main className="flex-1 relative h-64 lg:h-full overflow-hidden">
          {/* Floating Map Guidance */}
          <div className="absolute top-4 left-4 z-30 pointer-events-none">
            <div className="flex items-center gap-2 bg-[#101114]/90 backdrop-blur-md border border-[rgba(231,225,216,0.15)] px-3 py-1.5 rounded-xl text-xs font-mono shadow-xl">
              <span className={`w-2 h-2 rounded-full ${clickMode === 'start' ? 'bg-[#4ADE80]' : 'bg-[#FF7043]'} animate-pulse`} />
              <span className="text-[#A0A0A0]">Map click sets:</span>
              <span className={`font-bold ${clickMode === 'start' ? 'text-[#4ADE80]' : 'text-[#FF7043]'}`}>
                {clickMode === 'start' ? 'START (ORIGIN)' : 'TARGET (DESTINATION)'}
              </span>
            </div>
          </div>

          <MarsMap
            activeBaseLayer={activeBaseLayer}
            activeOverlays={activeOverlays}
            startCoord={{ latitude: fromLat, longitude: fromLonE }}
            destCoord={{ latitude: toLat, longitude: toLonE }}
            checkpoints={checkpoints}
            primaryRoute={primaryPlannedRoute}
            alternativeRoute={null}
            sciencePOIs={SCIENCE_CATALOG}
            hazards={HAZARDS_CATALOG}
            onSelectCoordinate={handleMapClick}
            onSetStart={(coord) => {
              setFromLat(coord.latitude);
              setFromLonE(normalizeLon360(coord.longitude));
            }}
            onSetDestination={(coord) => {
              setToLat(coord.latitude);
              setToLonE(normalizeLon360(coord.longitude));
            }}
            onCursorMove={() => {}}
            showRoverTraverses={mode === 'C_ROVER_REFERENCE'}
          />

          {/* Quick Nav to Compare / Briefing */}
          {results.length > 0 && (
            <div className="absolute bottom-6 right-6 z-30 flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/planner/compare')}
                className="text-xs font-mono bg-[#101114]/90 backdrop-blur-md shadow-2xl"
              >
                <GitCompare className="w-3.5 h-3.5 mr-1 text-[#56D9E8]" />
                Compare Candidates
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/planner/briefing')}
                className="text-xs font-mono shadow-2xl"
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                Mission Briefing
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
