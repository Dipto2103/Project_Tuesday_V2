import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Layers,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Filter,
  Search,
  Mountain,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  GitCompare,
  Sliders,
  CheckCircle2
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
import { MarsMap } from '../components/map/MarsMap';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';
import { Button } from '../components/ui/Button';
import { useMarsLayers } from '../hooks/useMarsLayers';
import { routeStore, useRouteStore } from '../state/routeStore';
import {
  positionAtSol,
  stats,
  slopeEnvelope,
  slopeAlongTrack
} from '../core/rovers/traverse';
import { computeProximityMetrics } from '../core/route/compare';
import type { TrackPoints, Milestone, TraverseIndexEntry } from '../core/rovers/types';
import type { Checkpoint } from '../core/types';
import type { MarsCoordinate, PlannedRoute } from '../types/route';
import type { RouteResult } from '../core/route/types';
import { SCIENCE_CATALOG } from '../data/scienceCatalog';
import { HAZARDS_CATALOG } from '../data/hazardsCatalog';

export const RoverExplorerPage: React.FC = () => {
  const navigate = useNavigate();
  const store = useRouteStore();
  const { activeBaseLayer, activeOverlays } = useMarsLayers();

  const [rover, setRover] = useState<'Curiosity' | 'Perseverance'>(store.activeRover || 'Curiosity');
  const [currentSol, setCurrentSol] = useState<number>(store.currentSol || 0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(10); // sols per tick

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [trackPoints, setTrackPoints] = useState<TrackPoints | null>(null);
  const [isLoadingTrack, setIsLoadingTrack] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [centerTarget, setCenterTarget] = useState<MarsCoordinate | null>(null);

  // Load checkpoints for context
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/checkpoints.json`)
      .then((r) => r.json())
      .then((data: Checkpoint[]) => setCheckpoints(data))
      .catch((err) => console.warn('[ROVER] Failed to load checkpoints:', err));
  }, []);

  // Fetch track and milestones on rover change
  useEffect(() => {
    let isSubscribed = true;
    setIsLoadingTrack(true);
    setLoadError(null);
    setIsPlaying(false);

    const roverKey = rover.toLowerCase();

    // Load Milestones
    fetch(`${import.meta.env.BASE_URL}data/milestones/${roverKey}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((ms: Milestone[]) => {
        if (isSubscribed) setMilestones(ms);
      })
      .catch((err) => console.warn(`[ROVER] Failed to load ${rover} milestones:`, err));

    // Load Track Points
    if (store.loadedTracks[roverKey]) {
      setTrackPoints(store.loadedTracks[roverKey]);
      setIsLoadingTrack(false);
      const track = store.loadedTracks[roverKey];
      if (track.sol.length > 0) {
        setCurrentSol(track.sol[track.sol.length - 1]);
      }
    } else {
      fetch(`${import.meta.env.BASE_URL}data/tracks/${roverKey}.points.json`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((pts: TrackPoints) => {
          if (isSubscribed) {
            setTrackPoints(pts);
            routeStore.setLoadedTrack(rover, pts);
            setIsLoadingTrack(false);
            if (pts.sol.length > 0) {
              const maxSol = pts.sol[pts.sol.length - 1];
              setCurrentSol(maxSol);
            }
          }
        })
        .catch((err) => {
          if (isSubscribed) {
            setIsLoadingTrack(false);
            setLoadError(`Could not load PDS track for ${rover}: ${err.message}`);
          }
        });
    }

    return () => {
      isSubscribed = false;
    };
  }, [rover]);

  // Compute track summary statistics
  const trackStats = useMemo(() => {
    if (!trackPoints || trackPoints.sol.length === 0) return null;
    return stats(trackPoints);
  }, [trackPoints]);

  const solMin = trackPoints && trackPoints.sol.length > 0 ? trackPoints.sol[0] : 0;
  const solMax = trackPoints && trackPoints.sol.length > 0 ? trackPoints.sol[trackPoints.sol.length - 1] : 0;

  // Rover position at currentSol
  const currentPos = useMemo(() => {
    if (!trackPoints || trackPoints.sol.length === 0) return null;
    return positionAtSol(trackPoints, currentSol);
  }, [trackPoints, currentSol]);

  // Autoplay ticker
  useEffect(() => {
    if (!isPlaying || !trackPoints || trackPoints.sol.length === 0) return;

    const timer = setInterval(() => {
      setCurrentSol((prev) => {
        const next = prev + playSpeed;
        if (next >= solMax) {
          setIsPlaying(false);
          return solMax;
        }
        return next;
      });
    }, 150);

    return () => clearInterval(timer);
  }, [isPlaying, playSpeed, solMax, trackPoints]);

  // Filtered milestones
  const filteredMilestones = useMemo(() => {
    return milestones.filter((m) => {
      const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
      const matchQuery =
        searchQuery.trim() === '' ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.geology.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.whyItMatters.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [milestones, selectedCategory, searchQuery]);

  // Slope Envelope
  const envelope = useMemo(() => {
    if (!trackPoints || trackPoints.sol.length === 0) return null;
    return slopeEnvelope(trackPoints);
  }, [trackPoints]);

  // Elevation along track chart data (sampled every ~15 points)
  const elevationChartData = useMemo(() => {
    if (!trackPoints || trackPoints.odomKm.length === 0) return [];
    const step = Math.max(1, Math.floor(trackPoints.odomKm.length / 80));
    const data: { odomKm: number; elevM: number; sol: number }[] = [];
    for (let i = 0; i < trackPoints.odomKm.length; i += step) {
      if (trackPoints.elevM[i] !== null) {
        data.push({
          odomKm: parseFloat(trackPoints.odomKm[i].toFixed(2)),
          elevM: trackPoints.elevM[i] as number,
          sol: trackPoints.sol[i]
        });
      }
    }
    return data;
  }, [trackPoints]);

  // Check if store has a route calculated to offer "Compare with my route"
  const userPlannedRoute = useMemo(() => {
    const success = store.results.find((r): r is RouteResult => (r as any).ok === true);
    return success || null;
  }, [store.results]);

  const proximityMetrics = useMemo(() => {
    if (!userPlannedRoute || !trackPoints || trackPoints.lat.length === 0) return null;
    const roverGeom = trackPoints.lat.map((lat, i) => ({ lat, lonE: trackPoints.lonE[i] }));
    return computeProximityMetrics(userPlannedRoute.geometry, roverGeom);
  }, [userPlannedRoute, trackPoints]);

  // Filtered track for map trail up to currentSol
  const visibleTrail = useMemo<PlannedRoute | null>(() => {
    if (!trackPoints || trackPoints.lat.length === 0) return null;
    const waypoints: MarsCoordinate[] = [];
    for (let i = 0; i < trackPoints.sol.length; i++) {
      if (trackPoints.sol[i] <= currentSol) {
        waypoints.push({
          latitude: trackPoints.lat[i],
          longitude: trackPoints.lonE[i]
        });
      } else {
        break;
      }
    }
    if (waypoints.length === 0) return null;

    return {
      id: `${rover}-trail`,
      name: `${rover} Trail to Sol ${currentSol}`,
      start: waypoints[0],
      destination: waypoints[waypoints.length - 1],
      waypoints,
      distanceKm: trackPoints.odomKm[waypoints.length - 1] || 0,
      estimatedDurationHours: 0,
      method: 'historical-rover-reference',
      terrainAssessmentAvailable: true,
      dataLimitations: ['NASA-DERIVED localized positions from PDS Analyst Notebook'],
      hazardsIntersected: [],
      scienceTargetsNear: []
    };
  }, [trackPoints, currentSol, rover]);

  const handleUseInRoute = (m: Milestone) => {
    if (m.lat === null || m.lonE === null) return;
    if (currentPos) {
      routeStore.useInRoute(
        { lat: currentPos.point.lat, lonE: currentPos.point.lonE },
        { lat: m.lat, lonE: m.lonE }
      );
    } else {
      routeStore.setFrom({ lat: m.lat, lonE: m.lonE });
    }
    navigate('/planner/route');
  };

  const handleFlyTo = (lat: number | null, lonE: number | null) => {
    if (lat === null || lonE === null) return;
    setCenterTarget({ latitude: lat, longitude: lonE });
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0D10] text-[#E7E1D8] overflow-hidden select-none">
      {/* Top Bar */}
      <div className="h-12 border-b border-[rgba(231,225,216,0.10)] bg-[#101114] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-xs font-display">
          <span className="font-bold uppercase tracking-wider text-white">ROVER EXPLORER</span>
          <span className="text-[#6B6F76]">•</span>
          <span className="text-[#F5B544] font-semibold">{rover} Mission Telemetry</span>
          <span className="text-[#6B6F76]">•</span>
          <span className="text-[#A0A0A0]">PDS Analyst's Notebook Ground Truth</span>
        </div>

        <ProvenanceBadge
          type="NASA-DERIVED"
          source="NASA PDS MSL / Mars 2020 Localization"
          showIcon={false}
        />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Drawer / Panel (460px) */}
        <aside className="w-full lg:w-[460px] bg-[#101114]/98 backdrop-blur-2xl border-b lg:border-b-0 lg:border-r border-[rgba(231,225,216,0.12)] p-4 flex flex-col justify-between shrink-0 overflow-y-auto z-20 space-y-4">
          <div className="space-y-4">
            {/* Rover Selector Switcher */}
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#F5B544] uppercase block mb-1.5">
                SELECT ROBOTIC MISSION
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRover('Curiosity');
                    routeStore.setActiveRover('Curiosity');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    rover === 'Curiosity'
                      ? 'bg-[#15181D] border-[#F5B544] ring-1 ring-[#F5B544]/50 shadow-md'
                      : 'bg-[#15181D]/50 border-[rgba(231,225,216,0.08)] hover:border-[rgba(231,225,216,0.2)]'
                  }`}
                >
                  <span className="text-xs font-bold text-white block">Curiosity (MSL)</span>
                  <span className="text-[10px] font-mono text-[#F5B544] block">Gale Crater · 2012–Present</span>
                  <span className="text-[10px] text-[#A0A0A0] block mt-0.5">Mount Sharp Ascent</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRover('Perseverance');
                    routeStore.setActiveRover('Perseverance');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    rover === 'Perseverance'
                      ? 'bg-[#15181D] border-[#F5B544] ring-1 ring-[#F5B544]/50 shadow-md'
                      : 'bg-[#15181D]/50 border-[rgba(231,225,216,0.08)] hover:border-[rgba(231,225,216,0.2)]'
                  }`}
                >
                  <span className="text-xs font-bold text-white block">Perseverance (M2020)</span>
                  <span className="text-[10px] font-mono text-[#F5B544] block">Jezero Crater · 2021–Present</span>
                  <span className="text-[10px] text-[#A0A0A0] block mt-0.5">Western Fan Delta</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Banner */}
            {trackStats && (
              <div className="grid grid-cols-4 gap-1.5 font-mono text-center text-xs">
                <div className="p-2 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)]">
                  <span className="text-[9px] text-[#A0A0A0] block">ODOMETRY</span>
                  <span className="text-xs font-bold text-[#F5B544]">{trackStats.totalOdometryKm.toFixed(1)} km</span>
                </div>
                <div className="p-2 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)]">
                  <span className="text-[9px] text-[#A0A0A0] block">MAX SOL</span>
                  <span className="text-xs font-bold text-white">{trackStats.solRange[1]}</span>
                </div>
                <div className="p-2 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)]">
                  <span className="text-[9px] text-[#A0A0A0] block">CLIMB GAIN</span>
                  <span className="text-xs font-bold text-[#4ADE80]">+{trackStats.elevationGainM.toFixed(0)} m</span>
                </div>
                <div className="p-2 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)]">
                  <span className="text-[9px] text-[#A0A0A0] block">RECORDS</span>
                  <span className="text-xs font-bold text-[#56D9E8]">{trackStats.pointCount}</span>
                </div>
              </div>
            )}

            {/* Sol Scrubber (Spec §13.1) */}
            <div className="p-3.5 rounded-2xl bg-[#15181D] border border-[rgba(231,225,216,0.12)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#F5B544] uppercase">
                  TIMELINE SCRUBBER
                </span>
                <span className="text-xs font-mono font-bold text-white bg-[#101114] px-2 py-0.5 rounded border border-[rgba(231,225,216,0.1)]">
                  Sol {currentSol}
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={solMin}
                max={solMax}
                value={currentSol}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setCurrentSol(val);
                  routeStore.setCurrentSol(val);
                }}
                className="w-full accent-[#F5B544] cursor-pointer"
              />

              {/* Playback Controls */}
              <div className="flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentSol(solMin)}
                    className="p-1.5 rounded-lg bg-[#1C2027] text-[#A0A0A0] hover:text-white"
                    title="Jump to Sol 0 (Landing)"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="px-3 py-1.5 rounded-lg bg-[#F5B544] text-[#0B0D10] font-bold flex items-center gap-1 hover:brightness-110"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-[#0B0D10]" />}
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentSol(solMax)}
                    className="p-1.5 rounded-lg bg-[#1C2027] text-[#A0A0A0] hover:text-white"
                    title="Jump to Latest Sol"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>

                {currentPos && (
                  <span className="text-[11px] text-[#A0A0A0]">
                    {currentPos.point.lat.toFixed(3)}°N, {currentPos.point.lonE.toFixed(3)}°E
                  </span>
                )}
              </div>
            </div>

            {/* Milestones Browser (Spec §13.1) */}
            <div className="space-y-2 pt-2 border-t border-[rgba(231,225,216,0.08)]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-widest text-white uppercase">
                  VERIFIED MISSION MILESTONES ({filteredMilestones.length})
                </span>
              </div>

              {/* Category Filter Chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono">
                {['all', 'landing', 'science_site', 'sample', 'hazard'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg shrink-0 capitalize ${
                      selectedCategory === cat
                        ? 'bg-[#F5B544] text-[#0B0D10] font-bold'
                        : 'bg-[#15181D] text-[#A0A0A0] hover:text-white border border-[rgba(231,225,216,0.08)]'
                    }`}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Milestones Cards List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {filteredMilestones.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)] hover:border-[#F5B544]/50 transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white font-display flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#F5B544]" />
                        {m.name}
                      </span>
                      <span className="text-[10px] font-mono bg-[#1C2027] text-[#F5B544] px-1.5 py-0.5 rounded font-bold">
                        Sol {m.sol}
                      </span>
                    </div>

                    <p className="text-[11px] font-sans text-[#A0A0A0] leading-snug">
                      {m.geology}
                    </p>

                    <div className="text-[11px] font-sans text-[#56D9E8] bg-[#56D9E8]/10 p-2 rounded-lg border border-[#56D9E8]/20">
                      <strong className="block text-[10px] font-mono uppercase text-[#56D9E8]">Survival Relevance:</strong>
                      {m.whyItMatters}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => handleFlyTo(m.lat, m.lonE)}
                        className="text-[11px] font-mono text-[#A0A0A0] hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <Compass className="w-3 h-3 text-[#56D9E8]" />
                        <span>Fly to</span>
                      </button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleUseInRoute(m)}
                        className="text-[10px] py-1 font-mono"
                      >
                        Use in Route →
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Analytics & Slope Envelope (§11) */}
            {envelope && (
              <div className="p-3.5 rounded-2xl bg-[#15181D] border border-[rgba(231,225,216,0.08)] space-y-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#A0A0A0] uppercase block">
                  WHAT A ROVER PROVES (SLOPE ENVELOPE)
                </span>

                <div className="grid grid-cols-4 gap-1.5 font-mono text-center text-xs">
                  <div className="p-2 rounded-lg bg-[#101114]">
                    <span className="text-[9px] text-[#A0A0A0] block">P50 SLOPE</span>
                    <span className="font-bold text-white">{envelope.p50.toFixed(1)}°</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#101114]">
                    <span className="text-[9px] text-[#A0A0A0] block">P90 SLOPE</span>
                    <span className="font-bold text-[#F5B544]">{envelope.p90.toFixed(1)}°</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#101114]">
                    <span className="text-[9px] text-[#A0A0A0] block">P99 SLOPE</span>
                    <span className="font-bold text-[#FFB070]">{envelope.p99.toFixed(1)}°</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#101114]">
                    <span className="text-[9px] text-[#A0A0A0] block">MAX DRIVEN</span>
                    <span className="font-bold text-[#EF4444]">{envelope.max.toFixed(1)}°</span>
                  </div>
                </div>

                <p className="text-[10px] font-sans italic text-[#A0A0A0] pt-1 border-t border-[rgba(231,225,216,0.06)]">
                  "Robotic vehicles have driven up to this slope at this data resolution. This does not set a human safety limit."
                </p>
              </div>
            )}

            {/* Compare with My Route (§8.4) */}
            {userPlannedRoute && proximityMetrics && (
              <div className="p-3.5 rounded-2xl bg-[#56D9E8]/10 border border-[#56D9E8]/30 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-white font-bold">
                  <span className="flex items-center gap-1.5">
                    <GitCompare className="w-3.5 h-3.5 text-[#56D9E8]" />
                    <span>CORRIDOR PROXIMITY VS YOUR ROUTE</span>
                  </span>
                  <button
                    onClick={() => navigate('/planner/compare')}
                    className="text-[10px] text-[#56D9E8] hover:underline"
                  >
                    View in Compare →
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-[#101114]">
                    <span className="text-[#A0A0A0] block text-[10px]">MEAN OFFSET</span>
                    <span className="font-bold text-[#56D9E8]">{proximityMetrics.meanOffsetKm.toFixed(2)} km</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#101114]">
                    <span className="text-[#A0A0A0] block text-[10px]">WITHIN 2 KM</span>
                    <span className="font-bold text-[#4ADE80]">{proximityMetrics.pctWithin2km}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Side: Map Canvas */}
        <main className="flex-1 relative h-64 lg:h-full overflow-hidden">
          <MarsMap
            activeBaseLayer={activeBaseLayer}
            activeOverlays={activeOverlays}
            startCoord={currentPos ? { latitude: currentPos.point.lat, longitude: currentPos.point.lonE } : null}
            destCoord={null}
            centerTarget={centerTarget}
            checkpoints={checkpoints}
            primaryRoute={visibleTrail}
            alternativeRoute={null}
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
