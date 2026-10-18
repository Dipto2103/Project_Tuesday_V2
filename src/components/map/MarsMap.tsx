import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  ImageOverlay,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import type { MarsCoordinate, PlannedRoute } from '../../types/route';
import type { MarsMapLayer } from '../../types/map';
import type { ScienceObservation } from '../../types/science';
import type { HazardRecord } from '../../types/hazards';
import { formatMarsCoordinate, toEastPositiveLongitude } from '../../utils/coordinates';
import { formatElevation, formatSlope } from '../../utils/formatters';
import { Compass, AlertTriangle, Flag, Navigation, ShieldAlert, Layers } from 'lucide-react';
import { ALL_ROVER_TRAVERSES } from '../../data/roverTraverses';
import { lon360ToDisplay, clampLat, normalizeLon360 } from '../../core/geo';
import { getElevationM } from '../../core/dem';
import type { Checkpoint } from '../../core/types';

interface MarsMapProps {
  activeBaseLayer: MarsMapLayer;
  activeOverlays: MarsMapLayer[];
  startCoord: MarsCoordinate | null;
  destCoord: MarsCoordinate | null;
  selectedCoord?: MarsCoordinate | null;
  checkpoints?: Checkpoint[];
  activeCategories?: string[];
  primaryRoute: PlannedRoute | null;
  alternativeRoute: PlannedRoute | null;
  sciencePOIs?: ScienceObservation[];
  hazards?: HazardRecord[];
  onSelectCoordinate: (coord: MarsCoordinate) => void;
  onSetStart: (coord: MarsCoordinate) => void;
  onSetDestination: (coord: MarsCoordinate) => void;
  onCursorMove: (coord: MarsCoordinate) => void;
  selectedPOI?: ScienceObservation | null;
  selectedHazard?: HazardRecord | null;
  centerTarget?: MarsCoordinate | null;
  showRoverTraverses?: boolean;
}

// Bounded Mars Extents (Equirectangular EPSG:4326)
const MARS_BOUNDS: L.LatLngBoundsExpression = [
  [-90, -180],
  [90, 180]
];

// Custom Leaflet DivIcon helpers
function createMarkerIcon(color: string, glyph: string, size = 30) {
  return L.divIcon({
    className: 'ares-map-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 2px solid #ffffff;
        box-shadow: 0 0 10px ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-family: monospace;
        font-size: 11px;
        font-weight: bold;
      ">
        ${glyph}
      </div>
    `
  });
}

const START_ICON = createMarkerIcon('#22c55e', 'A', 28); // Green Start
const DEST_ICON = createMarkerIcon('#ff6738', 'B', 28); // Orange Destination
const POI_ICON = createMarkerIcon('#38bdf8', '★', 24); // Cyan Science POI
const HAZARD_ICON = createMarkerIcon('#ef4444', '▲', 24); // Red Hazard
const ROVER_ICON = createMarkerIcon('#0284c7', 'R', 22); // Steel Blue Rover Endpoint

function getCheckpointProvenance(cp: Checkpoint): string {
  if (cp.resources && cp.resources.length > 0) {
    return cp.resources[0].provenance;
  }
  if (cp.hazards && cp.hazards.length > 0) {
    return cp.hazards[0].provenance;
  }
  return cp.coordSource === 'memory-verify' ? 'UNKNOWN' : 'NASA-DERIVED';
}

function createCheckpointIcon(kind: string, provenance: string) {
  if (provenance === 'UNKNOWN') {
    return createMarkerIcon('#64748b', '?', 22);
  }
  switch (kind) {
    case 'landing_site':
      return createMarkerIcon('#10b981', '🚀', 26);
    case 'mineral':
      return createMarkerIcon('#a855f7', '💎', 24);
    case 'water_ice':
    case 'resource_zone':
      return createMarkerIcon('#06b6d4', '❄', 25);
    case 'hazard':
      return createMarkerIcon('#ef4444', '▲', 24);
    case 'landmark':
    case 'geology':
    default:
      return createMarkerIcon('#f97316', '★', 24);
  }
}

// MARS LANTERN Pulsing Active Inspection Marker
const LANTERN_ICON = L.divIcon({
  className: 'mars-lantern-pulse-marker',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19],
  html: `
    <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: rgba(240, 138, 80, 0.45);
        box-shadow: 0 0 16px #FFB070, 0 0 32px rgba(240, 138, 80, 0.7);
        animation: pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      "></div>
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
        background: #F08A50;
        border: 2px solid #FFFFFF;
        box-shadow: 0 0 10px #FFB070;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #0B0D10;
        font-family: monospace;
        font-size: 13px;
        font-weight: 900;
      ">
        ✦
      </div>
    </div>
  `
});

// Controller handling scale, zoom events, center target, and throttled cursor telemetry
const MapEngineController: React.FC<{
  centerTarget?: MarsCoordinate | null;
  onCursorMove: (coord: MarsCoordinate) => void;
  onSelectCoordinate: (coord: MarsCoordinate) => void;
  onTileFailureThreshold?: () => void;
}> = ({ centerTarget, onCursorMove, onSelectCoordinate }) => {
  const map = useMap();
  const lastCursorCoordRef = useRef<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const lastThrottleTimeRef = useRef<number>(0);
  const moveEndTimestampsRef = useRef<number[]>([]);
  const loopLockedRef = useRef<boolean>(false);
  const lastTargetRef = useRef<{ lat: number; lng: number } | null>(null);

  // Initialize scale bar once
  useEffect(() => {
    const scaleControl = L.control.scale({
      imperial: false,
      metric: true,
      maxWidth: 140,
      position: 'bottomleft'
    });
    scaleControl.addTo(map);

    return () => {
      scaleControl.remove();
    };
  }, [map]);

  // Handle external zoom events from floating controls
  useEffect(() => {
    const handleZoomIn = () => map.zoomIn();
    const handleZoomOut = () => map.zoomOut();

    window.addEventListener('ares-zoom-in', handleZoomIn);
    window.addEventListener('ares-zoom-out', handleZoomOut);

    return () => {
      window.removeEventListener('ares-zoom-in', handleZoomIn);
      window.removeEventListener('ares-zoom-out', handleZoomOut);
    };
  }, [map]);

  // Dev-only moveend frequency loop guard
  useEffect(() => {
    const handleMoveEnd = () => {
      const now = performance.now();
      moveEndTimestampsRef.current = moveEndTimestampsRef.current.filter((t) => now - t < 1000);
      moveEndTimestampsRef.current.push(now);

      if (moveEndTimestampsRef.current.length > 20) {
        console.error(
          '[MARS LANTERN] MAP LOOP DETECTED: > 20 moveend events/sec. Freezing programmatic recenter.'
        );
        loopLockedRef.current = true;
      }
    };

    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map]);

  // Controlled recenter on target (respecting prefers-reduced-motion)
  useEffect(() => {
    if (!centerTarget || loopLockedRef.current) return;

    // Convert to display longitude if needed (-180..180)
    const targetDisplayLon =
      centerTarget.longitude > 180 ? lon360ToDisplay(centerTarget.longitude) : centerTarget.longitude;
    const targetLat = clampLat(centerTarget.latitude);

    // Prevent redundant recentering if target hasn't moved
    if (
      lastTargetRef.current &&
      Math.abs(lastTargetRef.current.lat - targetLat) < 0.0001 &&
      Math.abs(lastTargetRef.current.lng - targetDisplayLon) < 0.0001
    ) {
      return;
    }

    lastTargetRef.current = { lat: targetLat, lng: targetDisplayLon };

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const targetZoom = Math.max(map.getZoom(), 7);

    if (prefersReducedMotion) {
      map.setView([targetLat, targetDisplayLon], targetZoom);
    } else {
      map.flyTo([targetLat, targetDisplayLon], targetZoom, {
        duration: 1.0
      });
    }
  }, [centerTarget, map]);

  // Throttled cursor movement & click events
  useMapEvents({
    mousemove(e) {
      const now = performance.now();
      // Throttle to max once per 60ms
      if (now - lastThrottleTimeRef.current < 60) {
        return;
      }
      lastThrottleTimeRef.current = now;

      const lat = parseFloat(clampLat(e.latlng.lat).toFixed(5));
      const lng = parseFloat(e.latlng.lng.toFixed(5));

      // Only notify parent when coordinates actually shift
      if (
        Math.abs(lastCursorCoordRef.current.lat - lat) > 0.0005 ||
        Math.abs(lastCursorCoordRef.current.lng - lng) > 0.0005
      ) {
        lastCursorCoordRef.current = { lat, lng };
        onCursorMove({
          latitude: lat,
          longitude: lng
        });
      }
    },
    click(e) {
      const lat = parseFloat(clampLat(e.latlng.lat).toFixed(5));
      const lng = parseFloat(e.latlng.lng.toFixed(5));
      onSelectCoordinate({
        latitude: lat,
        longitude: lng
      });
    }
  });

  return null;
};

// Procedural Martian Graticule Overlay (Lines every 30 degrees)
const MarsGraticule: React.FC = React.memo(() => {
  const graticuleLines = useMemo(() => {
    const lines: [number, number][][] = [];
    // Parallels every 30° from -60° to +60°
    for (let lat = -60; lat <= 60; lat += 30) {
      const line: [number, number][] = [];
      for (let lon = -180; lon <= 180; lon += 10) {
        line.push([lat, lon]);
      }
      lines.push(line);
    }
    // Meridians every 30° from -180° to 180°
    for (let lon = -180; lon <= 180; lon += 30) {
      const line: [number, number][] = [];
      for (let lat = -90; lat <= 90; lat += 10) {
        line.push([lat, lon]);
      }
      lines.push(line);
    }
    return lines;
  }, []);

  return (
    <>
      {graticuleLines.map((pts, idx) => (
        <Polyline
          key={`graticule-${idx}`}
          positions={pts}
          pathOptions={{
            color: '#ffffff',
            weight: 0.5,
            opacity: 0.12,
            dashArray: '3, 6',
            interactive: false
          }}
        />
      ))}
    </>
  );
});

export const MarsMap: React.FC<MarsMapProps> = ({
  activeBaseLayer,
  activeOverlays,
  startCoord,
  destCoord,
  selectedCoord,
  checkpoints = [],
  activeCategories,
  primaryRoute,
  alternativeRoute,
  sciencePOIs,
  hazards,
  onSelectCoordinate,
  onSetStart,
  onSetDestination,
  onCursorMove,
  selectedPOI,
  selectedHazard,
  centerTarget,
  showRoverTraverses = true
}) => {
  const [tileErrorCount, setTileErrorCount] = useState<number>(0);
  const [useFallbackBasemap, setUseFallbackBasemap] = useState<boolean>(false);

  // Filter checkpoints by activeCategories if specified
  const filteredCheckpoints = useMemo(() => {
    if (!checkpoints || checkpoints.length === 0) return [];
    if (!activeCategories || activeCategories.length === 0) return checkpoints;
    return checkpoints.filter((cp) => activeCategories.includes(cp.kind));
  }, [checkpoints, activeCategories]);

  // Check for offline mode via query parameter (?offline=1)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.search) {
      const isOffline = new URLSearchParams(window.location.search).get('offline') === '1';
      if (isOffline) {
        setUseFallbackBasemap(true);
      }
    }
  }, []);

  const handleTileError = useCallback(() => {
    setTileErrorCount((prev) => {
      const next = prev + 1;
      if (next >= 12 && !useFallbackBasemap) {
        console.warn(
          '[MARS LANTERN] Multiple tile errors detected. Switching to offline fallback basemap.'
        );
        setUseFallbackBasemap(true);
      }
      return next;
    });
  }, [useFallbackBasemap]);

  const handleRetryOnline = useCallback(() => {
    setTileErrorCount(0);
    setUseFallbackBasemap(false);
  }, []);

  // Convert route coordinates to Leaflet LatLng tuples
  const primaryRouteLatLngs = useMemo<[number, number][]>(() => {
    if (!primaryRoute) return [];
    return primaryRoute.waypoints.map((w) => [
      w.latitude,
      w.longitude > 180 ? lon360ToDisplay(w.longitude) : w.longitude
    ]);
  }, [primaryRoute]);

  const alternativeRouteLatLngs = useMemo<[number, number][]>(() => {
    if (!alternativeRoute) return [];
    return alternativeRoute.waypoints.map((w) => [
      w.latitude,
      w.longitude > 180 ? lon360ToDisplay(w.longitude) : w.longitude
    ]);
  }, [alternativeRoute]);

  // Start & Destination coordinates formatted for Leaflet display
  const startLatLng = useMemo<[number, number] | null>(() => {
    if (!startCoord) return null;
    const lng = startCoord.longitude > 180 ? lon360ToDisplay(startCoord.longitude) : startCoord.longitude;
    return [startCoord.latitude, lng];
  }, [startCoord]);

  const destLatLng = useMemo<[number, number] | null>(() => {
    if (!destCoord) return null;
    const lng = destCoord.longitude > 180 ? lon360ToDisplay(destCoord.longitude) : destCoord.longitude;
    return [destCoord.latitude, lng];
  }, [destCoord]);

  return (
    <div className="relative w-full h-full bg-mars-darkest" style={{ isolation: 'isolate' }}>
      <MapContainer
        crs={L.CRS.EPSG4326}
        center={[18.4447, 77.4508]} // Default centered on Jezero Crater
        zoom={7}
        minZoom={1}
        maxZoom={Math.max(activeBaseLayer.maxZoom, 7)}
        zoomSnap={0.5}
        bounds={MARS_BOUNDS}
        maxBounds={MARS_BOUNDS}
        maxBoundsViscosity={1.0}
        worldCopyJump={false}
        style={{ width: '100%', height: '100%', background: '#0b0c10' }}
        zoomControl={false}
      >
        <MapEngineController
          centerTarget={centerTarget}
          onCursorMove={onCursorMove}
          onSelectCoordinate={onSelectCoordinate}
        />

        {/* Fallback Static Basemap Image Overlay (shown when offline or >= 12 tile errors) */}
        {useFallbackBasemap ? (
          <ImageOverlay
            url={`${import.meta.env.BASE_URL}tiles/fallback-global.jpg`}
            bounds={MARS_BOUNDS}
            opacity={activeBaseLayer.opacity}
          />
        ) : (
          /* Base Planetary Tile Layer — Equirectangular, bounded, noWrap */
          <TileLayer
            key={`base-${activeBaseLayer.id}`}
            url={activeBaseLayer.url}
            attribution={activeBaseLayer.attribution}
            maxZoom={activeBaseLayer.maxZoom}
            maxNativeZoom={activeBaseLayer.maxZoom}
            minZoom={activeBaseLayer.minZoom}
            opacity={activeBaseLayer.opacity}
            noWrap={true}
            bounds={MARS_BOUNDS}
            eventHandlers={{
              tileerror: handleTileError
            }}
          />
        )}

        {/* Active Overlays (e.g. MOLA Shaded Relief, HiRISE) */}
        {!useFallbackBasemap &&
          activeOverlays.map((overlay) => (
            <TileLayer
              key={`overlay-${overlay.id}`}
              url={overlay.url}
              attribution={overlay.attribution}
              maxZoom={overlay.maxZoom}
              maxNativeZoom={overlay.maxZoom}
              minZoom={overlay.minZoom}
              opacity={overlay.opacity}
              noWrap={true}
              bounds={MARS_BOUNDS}
              eventHandlers={{
                tileerror: handleTileError
              }}
            />
          ))}

        {/* Planetary Graticule Lines */}
        <MarsGraticule />

        {/* Mapped Hazards Footprints */}
        {(hazards || []).map((h) => {
          const color =
            h.severity === 'critical'
              ? '#ef4444'
              : h.severity === 'high'
              ? '#f97316'
              : h.severity === 'moderate'
              ? '#eab308'
              : '#94a3b8';

          const hLng =
            h.location.longitude > 180
              ? lon360ToDisplay(h.location.longitude)
              : h.location.longitude;

          return (
            <React.Fragment key={h.id}>
              {h.radiusKm && (
                <Circle
                  center={[h.location.latitude, hLng]}
                  radius={h.radiusKm * 1000}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.18,
                    weight: 1.5,
                    dashArray: '4, 4'
                  }}
                />
              )}
              <Marker position={[h.location.latitude, hLng]} icon={HAZARD_ICON}>
                <Popup className="ares-popup">
                  <div className="p-1 space-y-2 text-xs font-sans max-w-[240px]">
                    <div className="flex items-center gap-1.5 text-red-400 font-mono font-bold uppercase">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{h.name}</span>
                    </div>
                    <p className="text-mars-muted text-[11px] leading-relaxed">{h.description}</p>
                    <div className="bg-mars-darkest p-2 rounded text-[11px] font-mono space-y-1">
                      <div>
                        Severity: <span className="font-semibold text-white uppercase">{h.severity}</span>
                      </div>
                      {h.slopeAngleDeg && (
                        <div>
                          Slope: <span className="text-amber-300">{h.slopeAngleDeg}°</span>
                        </div>
                      )}
                      <div>Coord: {formatMarsCoordinate(h.location, 3)}</div>
                    </div>
                    <div className="text-[10px] text-mars-orange bg-mars-orange/10 p-1.5 rounded">
                      <strong>Mitigation:</strong> {h.operationalRecommendation}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Science Points of Interest */}
        {(sciencePOIs || []).map((poi) => {
          const pLng =
            poi.coordinates.longitude > 180
              ? lon360ToDisplay(poi.coordinates.longitude)
              : poi.coordinates.longitude;

          return (
            <Marker key={poi.id} position={[poi.coordinates.latitude, pLng]} icon={POI_ICON}>
              <Popup className="ares-popup">
                <div className="p-1 space-y-2 text-xs font-sans max-w-[260px]">
                  <div className="flex items-center gap-1.5 text-mars-cyan font-mono font-bold">
                    <Compass className="w-4 h-4 text-mars-cyan" />
                    <span>{poi.name}</span>
                  </div>
                  <p className="text-mars-muted text-[11px] leading-relaxed">{poi.description}</p>
                  <div className="bg-mars-darkest p-2 rounded text-[11px] font-mono space-y-1 text-slate-300">
                    <div>
                      Mission: <span className="text-white">{poi.mission}</span>
                    </div>
                    <div>
                      Elevation: <span className="text-mars-cyan">{formatElevation(poi.elevationMeters)}</span>
                    </div>
                    <div>Coords: {formatMarsCoordinate(poi.coordinates, 3)}</div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => onSetStart(poi.coordinates)}
                      className="flex-1 py-1 px-2 rounded bg-emerald-950/80 hover:bg-emerald-800 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono transition-colors"
                    >
                      Set as Start
                    </button>
                    <button
                      onClick={() => onSetDestination(poi.coordinates)}
                      className="flex-1 py-1 px-2 rounded bg-mars-orange/20 hover:bg-mars-orange/40 text-mars-orange border border-mars-orange/40 text-[10px] font-mono transition-colors"
                    >
                      Set as Target
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Historical Rover Traverses (Curiosity & Perseverance) */}
        {showRoverTraverses &&
          ALL_ROVER_TRAVERSES.map((trav) => (
            <React.Fragment key={trav.id}>
              {/* Traverse Polyline */}
              <Polyline
                positions={trav.waypoints.map((w) => [
                  w.latitude,
                  w.longitude > 180 ? lon360ToDisplay(w.longitude) : w.longitude
                ])}
                pathOptions={{
                  color: '#0284c7',
                  weight: 3.5,
                  dashArray: '4, 6',
                  opacity: 0.85
                }}
              />

              {/* Major Drive Endpoints */}
              {trav.endpoints.map((ep) => {
                const epLng =
                  ep.coordinate.longitude > 180
                    ? lon360ToDisplay(ep.coordinate.longitude)
                    : ep.coordinate.longitude;

                return (
                  <Marker
                    key={`${trav.id}-sol-${ep.sol}`}
                    position={[ep.coordinate.latitude, epLng]}
                    icon={ROVER_ICON}
                  >
                    <Popup className="ares-popup">
                      <div className="p-1 space-y-1.5 text-xs font-sans max-w-[250px]">
                        <div className="flex items-center gap-1.5 text-sky-400 font-mono font-bold text-xs">
                          <span>
                            {trav.roverName} — Sol {ep.sol}
                          </span>
                        </div>
                        <div className="font-bold text-white text-xs">{ep.site}</div>
                        <p className="text-mars-muted text-[11px] leading-relaxed font-sans">{ep.notes}</p>
                        <div className="bg-mars-darkest p-2 rounded text-[11px] font-mono text-slate-300 space-y-0.5">
                          <div>
                            Elevation: <span className="text-sky-300">{formatElevation(ep.elevationMeters)}</span>
                          </div>
                          <div>Coords: {formatMarsCoordinate(ep.coordinate, 3)}</div>
                        </div>
                        <div className="text-[10px] text-sky-200/80 bg-sky-950/40 p-1.5 rounded border border-sky-500/20">
                          {trav.scientificCaveat}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => onSetStart(ep.coordinate)}
                            className="flex-1 py-1 px-2 rounded bg-emerald-950 hover:bg-emerald-800 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono transition-colors"
                          >
                            Set Start
                          </button>
                          <button
                            onClick={() => onSetDestination(ep.coordinate)}
                            className="flex-1 py-1 px-2 rounded bg-mars-orange/20 hover:bg-mars-orange/40 text-mars-orange border border-mars-orange/40 text-[10px] font-mono transition-colors"
                          >
                            Set Target
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </React.Fragment>
          ))}

        {/* Alternative Route */}
        {alternativeRoute && alternativeRouteLatLngs.length > 0 && (
          <Polyline
            positions={alternativeRouteLatLngs}
            pathOptions={{
              color: '#38bdf8',
              weight: 3,
              dashArray: '6, 6',
              opacity: 0.75
            }}
          />
        )}

        {/* Primary Planned Route */}
        {primaryRoute && primaryRouteLatLngs.length > 0 && (
          <Polyline
            positions={primaryRouteLatLngs}
            pathOptions={{
              color: '#ff6738',
              weight: primaryRoute.method === 'terrain-aware' ? 5 : 4,
              dashArray: primaryRoute.method === 'direct' ? '8, 8' : undefined,
              opacity: 0.95
            }}
          />
        )}

        {/* Start Marker */}
        {startLatLng && (
          <Marker position={startLatLng} icon={START_ICON}>
            <Popup className="ares-popup">
              <div className="p-1 space-y-1.5 text-xs font-mono">
                <div className="font-bold text-emerald-400 flex items-center gap-1">
                  <Flag className="w-3.5 h-3.5" /> START: EVA DEPLOYMENT BASE
                </div>
                <div>{formatMarsCoordinate(startCoord!, 4)}</div>
                <div className="text-[11px] text-mars-sand">
                  {toEastPositiveLongitude(startCoord!.longitude)}°E Areocentric
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {destLatLng && (
          <Marker position={destLatLng} icon={DEST_ICON}>
            <Popup className="ares-popup">
              <div className="p-1 space-y-1.5 text-xs font-mono">
                <div className="font-bold text-mars-orange flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" /> DESTINATION: SCIENCE OBJECTIVE
                </div>
                <div>{formatMarsCoordinate(destCoord!, 4)}</div>
                <div className="text-[11px] text-mars-sand">
                  {toEastPositiveLongitude(destCoord!.longitude)}°E Areocentric
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Catalog Checkpoints (Landing Sites, Minerals, Water-Ice, Hazards, Landmarks) */}
        {filteredCheckpoints.map((cp) => {
          const displayLon = lon360ToDisplay(cp.lonE);
          const prov = getCheckpointProvenance(cp);
          const icon = createCheckpointIcon(cp.kind, prov);
          const elevM = getElevationM(cp.lat, cp.lonE).value;

          return (
            <React.Fragment key={`cp-${cp.id}`}>
              {/* Regional Resource Zone / Likelihood Zone Circle */}
              {cp.kind === 'resource_zone' && cp.radiusKm && (
                <Circle
                  center={[cp.lat, displayLon]}
                  radius={cp.radiusKm * 1000}
                  pathOptions={{
                    color: '#06b6d4',
                    fillColor: '#06b6d4',
                    fillOpacity: 0.12,
                    weight: 1.5,
                    dashArray: '5, 5'
                  }}
                />
              )}

              <Marker position={[cp.lat, displayLon]} icon={icon}>
                <Popup className="ares-popup">
                  <div className="p-1 space-y-1.5 text-xs font-sans max-w-[270px]">
                    <div className="flex items-center justify-between gap-2 border-b border-mars-border/60 pb-1">
                      <span className="font-bold text-white text-xs truncate">{cp.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-mars-darkest text-slate-300 border border-mars-border shrink-0">
                        {prov}
                      </span>
                    </div>
                    <p className="text-mars-muted text-[11px] leading-relaxed font-sans">{cp.summary}</p>
                    <div className="bg-mars-darkest p-2 rounded text-[11px] font-mono text-slate-300 space-y-0.5">
                      <div>
                        Coords: {cp.lat >= 0 ? `${cp.lat.toFixed(2)}°N` : `${Math.abs(cp.lat).toFixed(2)}°S`},{' '}
                        {cp.lonE.toFixed(2)}°E
                      </div>
                      <div>
                        Elevation: <span className="text-sky-300">{formatElevation(elevM)}</span>
                      </div>
                    </div>

                    {cp.resources && cp.resources.length > 0 && (
                      <div className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 p-1.5 rounded border border-cyan-500/20 space-y-0.5">
                        <div className="font-bold text-[9px] text-cyan-400 uppercase tracking-wider">Resources</div>
                        {cp.resources.slice(0, 2).map((r, i) => (
                          <div key={i} className="truncate">
                            • {r.type.replace('_', ' ')}: {r.detail} ({r.provenance})
                          </div>
                        ))}
                      </div>
                    )}

                    {cp.hazards && cp.hazards.length > 0 && (
                      <div className="text-[10px] font-mono text-rose-300 bg-rose-950/40 p-1.5 rounded border border-rose-500/20 space-y-0.5">
                        <div className="font-bold text-[9px] text-rose-400 uppercase tracking-wider">Hazard</div>
                        {cp.hazards.slice(0, 1).map((h, i) => (
                          <div key={i} className="truncate">
                            ▲ {h.label}: {h.detail}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-1.5 pt-1">
                      <button
                        onClick={() => onSelectCoordinate({ latitude: cp.lat, longitude: cp.lonE })}
                        className="flex-1 py-1 px-1.5 rounded bg-amber-950 hover:bg-amber-800 text-amber-300 border border-amber-500/40 text-[10px] font-mono transition-colors font-bold"
                        title="Generate planetary location report"
                      >
                        ✦ Report
                      </button>
                      <button
                        onClick={() => onSetStart({ latitude: cp.lat, longitude: cp.lonE })}
                        className="flex-1 py-1 px-1.5 rounded bg-emerald-950 hover:bg-emerald-800 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono transition-colors"
                      >
                        Start
                      </button>
                      <button
                        onClick={() => onSetDestination({ latitude: cp.lat, longitude: cp.lonE })}
                        className="flex-1 py-1 px-1.5 rounded bg-mars-orange/20 hover:bg-mars-orange/40 text-mars-orange border border-mars-orange/40 text-[10px] font-mono transition-colors"
                      >
                        Target
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Active Selected Location — MARS LANTERN Pulsing Marker */}
        {selectedCoord && (
          <Marker
            position={[
              selectedCoord.latitude,
              selectedCoord.longitude > 180
                ? lon360ToDisplay(selectedCoord.longitude)
                : selectedCoord.longitude
            ]}
            icon={LANTERN_ICON}
          >
            <Popup className="ares-popup">
              <div className="p-1 space-y-1.5 text-xs font-mono">
                <div className="font-bold text-mars-orange flex items-center gap-1.5">
                  <span>✦ MARS LANTERN BEACON</span>
                </div>
                <div className="text-slate-200">
                  Lat: {selectedCoord.latitude.toFixed(4)}° · Lon:{' '}
                  {toEastPositiveLongitude(selectedCoord.longitude)}°E
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => onSetStart(selectedCoord)}
                    className="flex-1 py-1 px-2 rounded bg-emerald-950 hover:bg-emerald-800 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono transition-colors"
                  >
                    Set Start
                  </button>
                  <button
                    onClick={() => onSetDestination(selectedCoord)}
                    className="flex-1 py-1 px-2 rounded bg-mars-orange/20 hover:bg-mars-orange/40 text-mars-orange border border-mars-orange/40 text-[10px] font-mono transition-colors"
                  >
                    Set Target
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Offline Fallback Banner Indicator */}
      {useFallbackBasemap && (
        <div className="absolute top-4 right-16 z-[400] flex items-center gap-2 bg-amber-950/90 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-lg text-xs font-mono shadow-xl backdrop-blur">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>CACHED BASEMAP · Detailed tiles unavailable</span>
          <button
            type="button"
            onClick={handleRetryOnline}
            className="ml-2 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 border border-amber-400/30 text-[10px] font-mono transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};
