import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Layers,
  Plus,
  Minus,
  RotateCcw,
  Crosshair,
  Compass,
  MapPin,
  AlertTriangle,
  Flag,
  Navigation,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  FileText,
  Car
} from 'lucide-react';
import { MarsMap } from '../components/map/MarsMap';
import { GlassPanel } from '../components/ui/GlassPanel';
import { SegmentedControl } from '../components/ui/Tabs';
import { Chip } from '../components/ui/Chip';
import { Button } from '../components/ui/Button';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';
import { OriginBadge } from '../components/ui/OriginBadge';
import { LocationReportDrawer } from '../components/location/LocationReportDrawer';
import { useMarsLayers } from '../hooks/useMarsLayers';
import { useRoutePlanner } from '../hooks/useRoutePlanner';
import { useRouteStore } from '../state/routeStore';
import type { RouteResult } from '../core/route/types';
import { SCIENCE_CATALOG } from '../data/scienceCatalog';
import { HAZARDS_CATALOG } from '../data/hazardsCatalog';
import { ALL_ROVER_TRAVERSES } from '../data/roverTraverses';
import { getLocationReport } from '../core/report';
import { searchLocations, parseCoordinateInput } from '../core/search';
import { calculateTerrainQuality } from '../core/terrain';
import { getElevationM, getSlopeDeg } from '../core/dem';
import { normalizeLon360 } from '../core/geo';
import type { Checkpoint, LocationReport } from '../core/types';
import type { MarsCoordinate } from '../types/route';

type MapMode = 'Terrain' | 'Elevation' | 'Hazard';

export const MapPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Map state
  const [mode, setMode] = useState<MapMode>('Terrain');
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Filter toggles
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    landing: true,
    poi: true,
    rovers: true,
    route: true,
    hazards: true
  });

  const [activeResources, setActiveResources] = useState<string[]>([]);

  // Selection & Coordinates
  const [cursorCoord, setCursorCoord] = useState<MarsCoordinate | null>(null);
  const [selectedCoord, setSelectedCoord] = useState<MarsCoordinate | null>({
    latitude: 18.4447,
    longitude: 77.4508
  });
  const [centerTarget, setCenterTarget] = useState<MarsCoordinate | null>(null);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);

  // Drawer
  const [activeReport, setActiveReport] = useState<LocationReport | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Mars layers & routing hooks
  const { layers, activeBaseLayer, activeOverlays, toggleLayer, setActiveBaseLayer } = useMarsLayers();
  const store = useRouteStore();
  const {
    startCoord,
    destCoord,
    setStartCoord,
    setDestCoord,
    primaryRoute,
    alternativeRoute
  } = useRoutePlanner();

  const storedPrimaryRoute: PlannedRoute | null = useMemo(() => {
    const successRoute = store.results.find((r): r is RouteResult => (r as any).ok === true);
    if (!successRoute || successRoute.geometry.length === 0) return null;
    const waypoints = successRoute.geometry.map((pt) => ({ latitude: pt.lat, longitude: pt.lonE }));
    return {
      id: 'stored-route',
      name: `${successRoute.mode} Route`,
      start: waypoints[0],
      destination: waypoints[waypoints.length - 1],
      waypoints,
      distanceKm: successRoute.distanceKm,
      estimatedDurationHours: successRoute.timeHours,
      method: successRoute.mode === 'A_DIRECT' ? 'direct' : successRoute.mode === 'C_ROVER_REFERENCE' ? 'historical-rover-reference' : 'terrain-aware',
      terrainAssessmentAvailable: true,
      maxSlopeDeg: successRoute.maxSlopeDeg ?? undefined,
      averageSlopeDeg: successRoute.meanSlopeDeg ?? undefined,
      cumulativeElevationGainMeters: successRoute.climbM || 0,
      dataLimitations: successRoute.warnings,
      hazardsIntersected: [],
      scienceTargetsNear: []
    };
  }, [store.results]);

  const activePrimaryRoute = storedPrimaryRoute || primaryRoute;

  // Load checkpoints
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/checkpoints.json`)
      .then((r) => r.json())
      .then((data: Checkpoint[]) => {
        setCheckpoints(data);
        // Find default or param checkpoint
        const latParam = searchParams.get('lat');
        const lonParam = searchParams.get('lon');
        if (latParam && lonParam) {
          const lat = parseFloat(latParam);
          const lon = parseFloat(lonParam);
          if (!isNaN(lat) && !isNaN(lon)) {
            const coord = { latitude: lat, longitude: lon };
            setSelectedCoord(coord);
            setCenterTarget(coord);
            const found = data.find(
              (c) => Math.abs(c.lat - lat) < 0.2 && Math.abs(c.lonE - normalizeLon360(lon)) < 0.2
            );
            if (found) setSelectedCheckpoint(found);
          }
        } else if (data.length > 0) {
          const jezero = data.find((c) => c.id.includes('jezero')) || data[0];
          setSelectedCheckpoint(jezero);
        }
      })
      .catch((err) => console.warn('[MAP] Failed to load checkpoints:', err));
  }, [searchParams]);

  // Handle segmented mode change (Terrain / Elevation / Hazard)
  const handleModeChange = (newMode: MapMode) => {
    setMode(newMode);
    if (newMode === 'Terrain') {
      setActiveBaseLayer('nasa-trek-viking');
    } else if (newMode === 'Elevation') {
      setActiveBaseLayer('nasa-trek-mola-color');
    } else if (newMode === 'Hazard') {
      setActiveBaseLayer('nasa-trek-viking');
      setActiveLayers((prev) => ({ ...prev, hazards: true }));
    }
  };

  // Search autocomplete
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    const res = searchLocations(searchQuery, checkpoints, 6);
    setSearchResults(res);
    setShowSearchResults(true);
  }, [searchQuery, checkpoints]);

  const handleSelectCoordinate = useCallback(
    (coord: MarsCoordinate) => {
      setSelectedCoord(coord);
      const lonE = normalizeLon360(coord.longitude);
      const report = getLocationReport({ lat: coord.latitude, lonE }, checkpoints);
      setActiveReport(report);

      // Match closest checkpoint if within 15 km
      const closest = checkpoints.find((c) => {
        const dLat = Math.abs(c.lat - coord.latitude);
        const dLon = Math.abs(c.lonE - lonE);
        return dLat < 0.25 && dLon < 0.25;
      });
      setSelectedCheckpoint(closest || null);
    },
    [checkpoints]
  );

  const handleSetStart = useCallback(
    (coord: MarsCoordinate) => {
      setStartCoord(coord);
    },
    [setStartCoord]
  );

  const handleSetDestination = useCallback(
    (coord: MarsCoordinate) => {
      setDestCoord(coord);
    },
    [setDestCoord]
  );

  const handleZoomIn = () => {
    window.dispatchEvent(new CustomEvent('ares-zoom-in'));
  };

  const handleZoomOut = () => {
    window.dispatchEvent(new CustomEvent('ares-zoom-out'));
  };

  const handleResetView = () => {
    const jezero = { latitude: 18.4447, longitude: 77.4508 };
    setCenterTarget({ ...jezero });
    setSelectedCoord(jezero);
  };

  const handleLocatePrompt = () => {
    const input = window.prompt('Enter Martian coordinates (e.g. "18.44N, 77.45E" or "-4.59, 137.44"):');
    if (input) {
      const parsed = parseCoordinateInput(input);
      if (parsed) {
        const coord = { latitude: parsed.lat, longitude: parsed.lonE };
        setSelectedCoord(coord);
        setCenterTarget(coord);
        handleSelectCoordinate(coord);
      } else {
        alert('Could not parse coordinate format. Please use "Lat, Lon" e.g. 18.44, 77.45');
      }
    }
  };

  // Filter categories passed to MarsMap
  const activeCategories = useMemo(() => {
    const list: string[] = [];
    if (activeLayers.landing) list.push('landing_site', 'human_base');
    if (activeLayers.poi) list.push('geology', 'crater', 'volcano', 'canyon');
    if (activeLayers.hazards) list.push('hazard', 'rsl', 'scarp', 'dunes');
    return [...list, ...activeResources];
  }, [activeLayers, activeResources]);

  // Selected location metrics
  const selectedElev = useMemo(() => {
    if (!selectedCoord) return null;
    return getElevationM(selectedCoord.latitude, normalizeLon360(selectedCoord.longitude));
  }, [selectedCoord]);

  const selectedSlope = useMemo(() => {
    if (!selectedCoord) return 0;
    return getSlopeDeg(selectedCoord.latitude, normalizeLon360(selectedCoord.longitude));
  }, [selectedCoord]);

  const terrainAssessment = useMemo(() => {
    return calculateTerrainQuality({
      slopeDeg: selectedSlope,
      roughnessM: 0.2
    });
  }, [selectedSlope]);

  const terrainDifficultyText =
    terrainAssessment.class === 'Favourable' ? 'Low' : terrainAssessment.class === 'Moderate' ? 'Moderate' : 'High';

  const resourceTypes = [
    { id: 'water_ice', label: 'Water-ice', color: '#56D9E8' },
    { id: 'clay', label: 'Clays', color: '#F5B544' },
    { id: 'sulfate', label: 'Sulfates', color: '#B392F0' },
    { id: 'iron_oxide', label: 'Iron oxides', color: '#FF7043' },
    { id: 'volcanic', label: 'Volcanic', color: '#EF4444' },
    { id: 'carbonate', label: 'Carbonates', color: '#4ADE80' },
    { id: 'metal', label: 'Metal', color: '#A0A0A0' }
  ];

  return (
    <div className="relative w-full h-full flex overflow-hidden bg-[#0B0D10] select-none">
      {/* Left Control & Filter Panel (320px) */}
      <aside
        className={`absolute lg:relative z-20 top-0 bottom-0 left-0 w-80 bg-[#101114]/95 backdrop-blur-xl border-r border-[rgba(231,225,216,0.12)] shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-out ${
          isLeftPanelOpen ? 'translate-x-0' : '-translate-x-full lg:-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-[rgba(231,225,216,0.08)] pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#FF7043]" />
              <h1 className="font-display font-bold text-lg uppercase tracking-wider text-[#E7E1D8]">
                MAP
              </h1>
            </div>
            <button
              onClick={() => setIsLeftPanelOpen(false)}
              className="p-1 rounded-lg text-[#A0A0A0] hover:text-[#E7E1D8] lg:hidden"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Segmented Control: Terrain · Elevation · Hazard */}
          <div>
            <span className="text-[11px] font-mono uppercase text-[#A0A0A0] block mb-1.5 font-semibold">
              BASE VIEW
            </span>
            <SegmentedControl
              options={[
                { id: 'Terrain', label: 'Terrain' },
                { id: 'Elevation', label: 'Elevation' },
                { id: 'Hazard', label: 'Hazard' }
              ]}
              value={mode}
              onChange={handleModeChange}
              className="w-full"
            />
          </div>

          {/* Search Field */}
          <div className="relative">
            <span className="text-[11px] font-mono uppercase text-[#A0A0A0] block mb-1.5 font-semibold">
              SEARCH LOCATIONS
            </span>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.12)] focus-within:border-[#FF7043]/60">
              <Search className="w-4 h-4 text-[#A0A0A0] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchResults(searchResults.length > 0)}
                placeholder="Search landmarks or coordinates..."
                className="w-full bg-transparent text-xs text-[#E7E1D8] placeholder-[#6B6F76] focus:outline-none"
              />
            </div>

            {/* Autocomplete Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#15181D] border border-[rgba(231,225,216,0.15)] rounded-xl shadow-2xl p-1.5 z-50 max-h-56 overflow-y-auto">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const coord = { latitude: res.lat, longitude: res.lonE };
                      setSelectedCoord(coord);
                      setCenterTarget(coord);
                      handleSelectCoordinate(coord);
                      setShowSearchResults(false);
                      setSearchQuery(res.title);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#1C2027] text-left text-xs text-[#E7E1D8] cursor-pointer"
                  >
                    <span className="truncate font-medium">{res.title}</span>
                    <span className="text-[10px] font-mono text-[#56D9E8] ml-2 shrink-0">
                      {res.lat.toFixed(1)}°, {res.lonE.toFixed(1)}°E
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Legend / Layer Toggles */}
          <div>
            <span className="text-[11px] font-mono uppercase text-[#A0A0A0] block mb-2 font-semibold">
              MAP LAYERS & LEGEND
            </span>
            <div className="space-y-1.5 text-xs font-sans">
              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-[#15181D] cursor-pointer">
                <div className="flex items-center gap-2">
                  <Flag className="w-3.5 h-3.5 text-[#56D9E8]" />
                  <span>Landing Sites</span>
                </div>
                <input
                  type="checkbox"
                  checked={activeLayers.landing}
                  onChange={(e) => setActiveLayers((p) => ({ ...p, landing: e.target.checked }))}
                  className="accent-[#FF7043]"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-[#15181D] cursor-pointer">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#FF7043]" />
                  <span>Points of Interest</span>
                </div>
                <input
                  type="checkbox"
                  checked={activeLayers.poi}
                  onChange={(e) => setActiveLayers((p) => ({ ...p, poi: e.target.checked }))}
                  className="accent-[#FF7043]"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-[#15181D] cursor-pointer">
                <div className="flex items-center gap-2">
                  <Car className="w-3.5 h-3.5 text-[#F5B544]" />
                  <span>Rover Tracks</span>
                </div>
                <input
                  type="checkbox"
                  checked={activeLayers.rovers}
                  onChange={(e) => setActiveLayers((p) => ({ ...p, rovers: e.target.checked }))}
                  className="accent-[#FF7043]"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-[#15181D] cursor-pointer">
                <div className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-[#4ADE80]" />
                  <span>Safe Route</span>
                </div>
                <input
                  type="checkbox"
                  checked={activeLayers.route}
                  onChange={(e) => setActiveLayers((p) => ({ ...p, route: e.target.checked }))}
                  className="accent-[#FF7043]"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-[#15181D] cursor-pointer">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
                  <span>Hazard Zone</span>
                </div>
                <input
                  type="checkbox"
                  checked={activeLayers.hazards}
                  onChange={(e) => setActiveLayers((p) => ({ ...p, hazards: e.target.checked }))}
                  className="accent-[#FF7043]"
                />
              </label>
            </div>
          </div>

          {/* Resource Chips */}
          <div>
            <span className="text-[11px] font-mono uppercase text-[#A0A0A0] block mb-2 font-semibold">
              SCIENTIFIC RESOURCES
            </span>
            <div className="flex flex-wrap gap-1.5">
              {resourceTypes.map((res) => {
                const isSelected = activeResources.includes(res.id);
                return (
                  <Chip
                    key={res.id}
                    label={res.label}
                    color={res.color}
                    selected={isSelected}
                    onToggle={() =>
                      setActiveResources((prev) =>
                        isSelected ? prev.filter((x) => x !== res.id) : [...prev, res.id]
                      )
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Location Card (Bottom of Left Panel) */}
        <div className="p-4 border-t border-[rgba(231,225,216,0.12)] bg-[#15181D]/90">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#FF7043] font-bold">
              SELECTED LOCATION
            </span>
            <ProvenanceBadge type="NASA-DERIVED" source="MOLA Altimetry" showIcon={false} />
          </div>

          <div className="flex items-start gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#56D9E8]/15 text-[#56D9E8] flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-sm text-[#E7E1D8] truncate">
                {selectedCheckpoint?.name || 'Martian Coordinate'}
              </h2>
              <p className="text-[11px] text-[#A0A0A0] truncate">
                {selectedCheckpoint?.summary ||
                  `${selectedCoord?.latitude.toFixed(2)}°N, ${selectedCoord ? normalizeLon360(selectedCoord.longitude).toFixed(2) : ''}°E`}
              </p>
            </div>
          </div>

          <div className="space-y-1.5 py-2 border-y border-[rgba(231,225,216,0.08)] mb-3 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-[#A0A0A0]">Elevation</span>
              <span className="font-bold text-[#E7E1D8]">
                {selectedElev !== null ? `${selectedElev.value > 0 ? '+' : ''}${selectedElev.value.toLocaleString()} m` : 'Calculating...'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#A0A0A0]">Terrain Difficulty</span>
              <span
                className={`font-semibold ${
                  terrainDifficultyText === 'Low'
                    ? 'text-[#4ADE80]'
                    : terrainDifficultyText === 'Moderate'
                    ? 'text-[#F5B544]'
                    : 'text-[#EF4444]'
                }`}
              >
                {terrainDifficultyText}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (selectedCoord) {
                  handleSetDestination(selectedCoord);
                  navigate('/planner/route');
                }
              }}
              className="flex-1 text-xs"
            >
              Set as Destination
            </Button>
            <button
              type="button"
              onClick={() => {
                if (selectedCoord) {
                  const lonE = normalizeLon360(selectedCoord.longitude);
                  const report = getLocationReport({ lat: selectedCoord.latitude, lonE }, checkpoints);
                  setActiveReport(report);
                  setIsReportOpen(true);
                }
              }}
              className="px-3 py-2 rounded-lg text-xs font-display font-semibold text-[#56D9E8] hover:bg-[#1C2027] border border-[#56D9E8]/30 transition-all cursor-pointer"
            >
              Full report
            </button>
          </div>
        </div>
      </aside>

      {/* Floating Panel Toggle (Desktop & Mobile) */}
      {!isLeftPanelOpen && (
        <button
          type="button"
          onClick={() => setIsLeftPanelOpen(true)}
          className="absolute top-4 left-4 z-30 p-2.5 rounded-xl bg-[#101114]/90 backdrop-blur-md border border-[rgba(231,225,216,0.15)] text-[#E7E1D8] hover:text-[#FF7043] shadow-xl cursor-pointer"
          title="Open Map Controls & Legend"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Centre: Bounded Mars Map Canvas */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
        <MarsMap
          activeBaseLayer={activeBaseLayer}
          activeOverlays={activeOverlays}
          startCoord={startCoord}
          destCoord={destCoord}
          selectedCoord={selectedCoord}
          checkpoints={checkpoints}
          activeCategories={activeCategories}
          primaryRoute={activePrimaryRoute}
          alternativeRoute={alternativeRoute}
          sciencePOIs={SCIENCE_CATALOG}
          hazards={HAZARDS_CATALOG}
          onSelectCoordinate={handleSelectCoordinate}
          onSetStart={handleSetStart}
          onSetDestination={handleSetDestination}
          onCursorMove={setCursorCoord}
          centerTarget={centerTarget}
          showRoverTraverses={activeLayers.rovers}
        />

        {/* Right Map Controls (Vertical Stack of Glass Icon Buttons) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleModeChange(mode === 'Terrain' ? 'Elevation' : mode === 'Elevation' ? 'Hazard' : 'Terrain')}
            className="p-3 rounded-xl bg-[#101114]/85 backdrop-blur-md border border-[rgba(231,225,216,0.12)] text-[#E7E1D8] hover:text-[#FF7043] hover:bg-[#1C2027] shadow-xl transition-all cursor-pointer"
            title={`Toggle Basemap Mode (Current: ${mode})`}
          >
            <Layers className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-3 rounded-xl bg-[#101114]/85 backdrop-blur-md border border-[rgba(231,225,216,0.12)] text-[#E7E1D8] hover:text-white hover:bg-[#1C2027] shadow-xl transition-all cursor-pointer"
            title="Zoom In"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-3 rounded-xl bg-[#101114]/85 backdrop-blur-md border border-[rgba(231,225,216,0.12)] text-[#E7E1D8] hover:text-white hover:bg-[#1C2027] shadow-xl transition-all cursor-pointer"
            title="Zoom Out"
          >
            <Minus className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="p-3 rounded-xl bg-[#101114]/85 backdrop-blur-md border border-[rgba(231,225,216,0.12)] text-[#E7E1D8] hover:text-[#FF7043] hover:bg-[#1C2027] shadow-xl transition-all cursor-pointer"
            title="Recentre to Jezero Crater"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleLocatePrompt}
            className="p-3 rounded-xl bg-[#101114]/85 backdrop-blur-md border border-[rgba(231,225,216,0.12)] text-[#E7E1D8] hover:text-[#56D9E8] hover:bg-[#1C2027] shadow-xl transition-all cursor-pointer"
            title="Locate by Coordinates"
          >
            <Crosshair className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom-Right Mini Card: Rover Tracks Curiosity */}
        <div className="absolute bottom-6 right-4 z-20 hidden sm:block">
          <div
            onClick={() => setActiveLayers((p) => ({ ...p, rovers: !p.rovers }))}
            className={`flex items-center gap-3 p-3 rounded-2xl bg-[#101114]/90 backdrop-blur-xl border transition-all cursor-pointer shadow-2xl hover:border-[#FF7043]/50 ${
              activeLayers.rovers
                ? 'border-[#FF7043]/40 ring-1 ring-[#FF7043]/20'
                : 'border-[rgba(231,225,216,0.12)] opacity-70'
            }`}
          >
            <div className="w-12 h-10 rounded-lg overflow-hidden bg-[#1C2027] shrink-0 border border-[rgba(231,225,216,0.10)] flex items-center justify-center">
              <img
                src={`${import.meta.env.BASE_URL}brand/icon-64.png`}
                alt="Rover"
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-display font-bold text-[#E7E1D8]">
                  Rover Tracks
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
              </div>
              <p className="text-[11px] font-mono text-[#A0A0A0]">
                Curiosity & Perseverance ({activeLayers.rovers ? 'Visible' : 'Hidden'})
              </p>
            </div>
          </div>
        </div>

        {/* Map HUD: Bottom-Left Cursor Readout & OriginBadge */}
        <div className="absolute bottom-6 left-4 z-20 flex items-center gap-3 bg-[#101114]/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-[rgba(231,225,216,0.12)] text-xs font-mono text-[#E7E1D8] shadow-xl">
          <div className="flex items-center gap-2">
            <span className="text-[#A0A0A0]">CURSOR:</span>
            <span>
              {cursorCoord
                ? `${cursorCoord.latitude.toFixed(2)}°N, ${normalizeLon360(cursorCoord.longitude).toFixed(2)}°E`
                : 'Over surface'}
            </span>
          </div>
          <span className="text-[#6B6F76]">•</span>
          <OriginBadge origin="CACHED" />
        </div>

        {/* Bottom Route Bar (When Route Exists) */}
        {activePrimaryRoute && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-6 py-2.5 rounded-2xl bg-[#101114]/90 backdrop-blur-xl border border-[#56D9E8]/40 shadow-2xl flex items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-[#A0A0A0] text-[10px] uppercase block">TRAVERSE</span>
              <span className="font-bold text-[#56D9E8]">{activePrimaryRoute.distanceKm.toFixed(1)} km</span>
            </div>
            <div>
              <span className="text-[#A0A0A0] text-[10px] uppercase block">TIME</span>
              <span className="font-bold text-[#E7E1D8]">{((activePrimaryRoute.estimatedDurationHours || 78.4) / 24.66).toFixed(1)} sols</span>
            </div>
            <div>
              <span className="text-[#A0A0A0] text-[10px] uppercase block">SLOPE RISK</span>
              <span className="font-bold text-[#4ADE80]">{(activePrimaryRoute.maxSlopeDeg || 14) < 15 ? 'Safe' : 'Caution'}</span>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/planner/briefing')}
              className="text-xs"
            >
              Mission Briefing
            </Button>
          </div>
        )}
      </main>

      {/* Location Report Drawer (Spec §8) */}
      <LocationReportDrawer
        report={activeReport}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onSetStart={handleSetStart}
        onSetDestination={handleSetDestination}
        onRadiusChange={(radiusKm) => {
          if (selectedCoord) {
            const lonE = normalizeLon360(selectedCoord.longitude);
            const updated = getLocationReport(
              { lat: selectedCoord.latitude, lonE },
              checkpoints,
              { radiusKm }
            );
            setActiveReport(updated);
          }
        }}
      />
    </div>
  );
};
