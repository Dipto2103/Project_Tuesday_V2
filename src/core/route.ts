/**
 * MARS LANTERN — Planetary Routing Engine (A* Search)
 * 
 * Computes optimal, terrain-aware surface trajectories across Mars using the
 * MGS MOLA elevation model, vehicle slope limits, hazard proximity penalties,
 * and the "unknown-is-impassable" scientific guardrail.
 * 
 * Pure TypeScript — zero DOM, zero React. Shared between Web UI worker and MCP server.
 * Reference: MARS_LANTERN_SPEC.md §9.4
 */

import { haversineKm, clampLat, normalizeLon360, lon360ToDisplay } from './geo';
import { getElevationM, getSlopeDeg, getRoughnessM } from './dem';
import { getVehicleSpeedKmh, getVehicleSlopeLimitDeg } from '../config/assumptions';
import type { MarsCoordinate, PlannedRoute, RouteMethod } from '../types/route';
import type { Checkpoint } from './types';

export interface RoutePlanRequest {
  start: { lat: number; lonE: number };
  destination: { lat: number; lonE: number };
  vehicle?: 'eva' | 'rover_unpressurised' | 'rover_pressurised';
  maxSlopeDeg?: number;
  walkingSpeedKmh?: number;
  riskTolerant?: boolean; // If false, unknown/coarse data is impassable by default
  catalog?: Checkpoint[];
  mode?: 'shortest' | 'safest' | 'direct';
}

export interface RouteSegment {
  from: MarsCoordinate;
  to: MarsCoordinate;
  distanceKm: number;
  slopeDeg: number;
  elevationMeters: number;
  flag: 'OK' | 'steep' | 'no-data';
}

export interface MarsRouteResult {
  success: boolean;
  error?: string;
  route?: PlannedRoute;
  distanceKm: number;
  durationHours: number;
  climbMeters: number;
  maxSlopeDeg: number;
  averageSlopeDeg: number;
  highResCoveragePct: number;
  segments: RouteSegment[];
  isLowConfidence?: boolean;
}

interface NodeKey {
  lat: number;
  lonE: number;
}

interface PathNode {
  lat: number;
  lonE: number;
  gScore: number;
  fScore: number;
  parent: PathNode | null;
  elevationM: number;
  slopeDeg: number;
  isHighRes: boolean;
}

function coordKey(lat: number, lonE: number): string {
  return `${lat.toFixed(3)},${lonE.toFixed(3)}`;
}

/**
 * 8-Connected neighbor offsets in degrees
 */
const NEIGHBOR_OFFSETS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1]
];

/**
 * Executes 8-connected A* search over the Martian elevation surface.
 */
export function planMarsRoute(request: RoutePlanRequest): MarsRouteResult {
  const {
    start,
    destination,
    vehicle = 'rover_pressurised',
    maxSlopeDeg = getVehicleSlopeLimitDeg(vehicle),
    walkingSpeedKmh = getVehicleSpeedKmh(vehicle),
    riskTolerant = false,
    catalog = [],
    mode = 'shortest'
  } = request;

  const sLat = clampLat(start.lat);
  const sLon = normalizeLon360(start.lonE);
  const dLat = clampLat(destination.lat);
  const dLon = normalizeLon360(destination.lonE);

  const directDistKm = haversineKm(sLat, sLon, dLat, dLon);

  // If distance is near-zero (same spot)
  if (directDistKm < 0.1) {
    const elev = getElevationM(sLat, sLon).value;
    const pt: MarsCoordinate = {
      latitude: sLat,
      longitude: lon360ToDisplay(sLon),
      elevationMeters: elev
    };
    return {
      success: true,
      distanceKm: 0,
      durationHours: 0,
      climbMeters: 0,
      maxSlopeDeg: 0,
      averageSlopeDeg: 0,
      highResCoveragePct: 100,
      segments: [],
      route: {
        id: `route-${Date.now()}`,
        name: 'Stationary / In-situ Station',
        start: pt,
        destination: pt,
        waypoints: [pt, pt],
        distanceKm: 0,
        estimatedDurationHours: 0,
        method: 'terrain-aware',
        terrainAssessmentAvailable: true,
        averageSlopeDeg: 0,
        maxSlopeDeg: 0,
        cumulativeElevationGainMeters: 0,
        dataLimitations: ['Stationary position; zero displacement.'],
        hazardsIntersected: [],
        scienceTargetsNear: []
      }
    };
  }

  // Handle direct mode bypass
  if (mode === 'direct') {
    return generateDirectSphericalRoute(sLat, sLon, dLat, dLon, walkingSpeedKmh);
  }

  // Adaptive Grid Step: ~0.025° (~1.5 km) for local, up to ~0.35° (~20 km) for planetary scale
  const gridStepDeg =
    directDistKm > 1500 ? 0.35 : directDistKm > 500 ? 0.20 : directDistKm > 80 ? 0.10 : 0.025;

  // Cost weights
  const weightSlope = mode === 'safest' ? 2.8 : 1.6;
  const weightHazard = mode === 'safest' ? 4.0 : 2.0;
  const weightUncertainty = riskTolerant ? 2.5 : 10.0;

  // Spatial search bounds with 20% margin
  const minLat = Math.max(-90, Math.min(sLat, dLat) - 2.5);
  const maxLat = Math.min(90, Math.max(sLat, dLat) + 2.5);
  const minLon = Math.min(sLon, dLon) - 2.5;
  const maxLon = Math.max(sLon, dLon) + 2.5;

  const openSet: Map<string, PathNode> = new Map();
  const closedSet: Set<string> = new Set();

  const startElevRes = getElevationM(sLat, sLon);
  const startSlope = getSlopeDeg(sLat, sLon);

  const startNode: PathNode = {
    lat: sLat,
    lonE: sLon,
    gScore: 0,
    fScore: directDistKm,
    parent: null,
    elevationM: startElevRes.value,
    slopeDeg: startSlope,
    isHighRes: startElevRes.resolution === 'regional_128ppd'
  };

  openSet.set(coordKey(sLat, sLon), startNode);

  let goalNode: PathNode | null = null;
  let iterations = 0;
  const maxIterations = 3500; // Safeguard against unbounded search

  while (openSet.size > 0 && iterations < maxIterations) {
    iterations++;

    // Pick node with lowest fScore
    let current: PathNode | null = null;
    let currentKey = '';
    for (const [key, node] of openSet.entries()) {
      if (!current || node.fScore < current.fScore) {
        current = node;
        currentKey = key;
      }
    }

    if (!current) break;

    // Check goal condition (within 1 grid step of destination)
    const distToGoal = haversineKm(current.lat, current.lonE, dLat, dLon);
    if (distToGoal <= gridStepDeg * 110) {
      goalNode = current;
      break;
    }

    openSet.delete(currentKey);
    closedSet.add(currentKey);

    // Expand 8-connected neighbors
    for (const [dRow, dCol] of NEIGHBOR_OFFSETS) {
      const neighborLat = clampLat(current.lat + dRow * gridStepDeg);
      const neighborLon = normalizeLon360(current.lonE + dCol * gridStepDeg);
      const nKey = coordKey(neighborLat, neighborLon);

      if (closedSet.has(nKey)) continue;

      // Check spatial bounds
      if (
        neighborLat < minLat || neighborLat > maxLat ||
        (minLon < maxLon && (neighborLon < minLon || neighborLon > maxLon))
      ) {
        continue;
      }

      // Sample topography
      const elevRes = getElevationM(neighborLat, neighborLon);
      const slope = getSlopeDeg(neighborLat, neighborLon);

      // SCIENTIFIC GUARDRAIL 1: Slope >= Vehicle Limit is strictly non-traversable
      if (slope >= maxSlopeDeg) {
        continue;
      }

      // SCIENTIFIC GUARDRAIL 2: RSL slopes (>27°) are dry granular hazards and non-traversable
      if (slope > 27.0) {
        continue;
      }

      // SCIENTIFIC GUARDRAIL 3: Unknown data handling (unknown ≠ safe)
      if (elevRes.resolution === 'none') {
        if (!riskTolerant) {
          continue; // Impassable by default
        }
      }

      // Calculate step distance
      const stepDist = haversineKm(current.lat, current.lonE, neighborLat, neighborLon);

      // Slope penalty term (normalized to vehicle limit)
      const slopeTerm = Math.pow(slope / maxSlopeDeg, 2);

      // Hazard proximity cost
      let hazardCost = 0;
      for (const cp of catalog) {
        if (cp.kind === 'hazard') {
          const dHaz = haversineKm(neighborLat, neighborLon, cp.lat, cp.lonE);
          const hazRadius = cp.radiusKm || 15;
          if (dHaz < hazRadius) {
            hazardCost += 1.0 - dHaz / hazRadius;
          }
        }
      }

      // Uncertainty penalty
      const uncertaintyCost = elevRes.resolution === 'regional_128ppd' ? 0.05 : 0.25;

      // Composite edge cost
      const edgeCost =
        stepDist * (1.0 + weightSlope * slopeTerm + weightHazard * hazardCost + weightUncertainty * uncertaintyCost);

      const tentativeGScore = current.gScore + edgeCost;

      const existing = openSet.get(nKey);
      if (!existing || tentativeGScore < existing.gScore) {
        const hDist = haversineKm(neighborLat, neighborLon, dLat, dLon);
        const neighborNode: PathNode = {
          lat: neighborLat,
          lonE: neighborLon,
          gScore: tentativeGScore,
          fScore: tentativeGScore + hDist,
          parent: current,
          elevationM: elevRes.value,
          slopeDeg: slope,
          isHighRes: elevRes.resolution === 'regional_128ppd'
        };
        openSet.set(nKey, neighborNode);
      }
    }
  }

  // If search exhausted or timed out without reaching target
  if (!goalNode) {
    // If strict routing failed, retry with direct or return impassable error
    return {
      success: false,
      error: `NO_ROUTE: Terrain between (${sLat.toFixed(2)}°, ${sLon.toFixed(2)}°E) and (${dLat.toFixed(2)}°, ${dLon.toFixed(2)}°E) exceeds maximum vehicle slope limit (${maxSlopeDeg}°) or intersects non-traversable hazards.`,
      distanceKm: directDistKm,
      durationHours: directDistKm / walkingSpeedKmh,
      climbMeters: 0,
      maxSlopeDeg: 0,
      averageSlopeDeg: 0,
      highResCoveragePct: 0,
      segments: []
    };
  }

  // Reconstruct path
  const pathNodes: PathNode[] = [];
  let curr: PathNode | null = goalNode;
  while (curr) {
    pathNodes.unshift(curr);
    curr = curr.parent;
  }

  // Append exact destination point
  const destElev = getElevationM(dLat, dLon).value;
  const destSlope = getSlopeDeg(dLat, dLon);
  pathNodes.push({
    lat: dLat,
    lonE: dLon,
    gScore: 0,
    fScore: 0,
    parent: null,
    elevationM: destElev,
    slopeDeg: destSlope,
    isHighRes: false
  });

  // Calculate telemetry metrics
  let totalDistKm = 0;
  let totalClimbM = 0;
  let maxSlopeRecorded = 0;
  let slopeAccum = 0;
  let highResCount = 0;

  const waypoints: MarsCoordinate[] = [];
  const segments: RouteSegment[] = [];
  const elevationProfile: { distanceKm: number; elevationMeters: number; slopeDeg: number }[] = [];

  for (let i = 0; i < pathNodes.length; i++) {
    const n = pathNodes[i];
    const displayLon = lon360ToDisplay(n.lonE);
    const coord: MarsCoordinate = {
      latitude: n.lat,
      longitude: displayLon,
      elevationMeters: n.elevationM
    };
    waypoints.push(coord);

    if (n.isHighRes) highResCount++;

    if (i > 0) {
      const prev = pathNodes[i - 1];
      const prevCoord = waypoints[i - 1];
      const d = haversineKm(prev.lat, prev.lonE, n.lat, n.lonE);
      totalDistKm += d;

      const climb = n.elevationM - prev.elevationM;
      if (climb > 0) totalClimbM += climb;

      slopeAccum += n.slopeDeg;
      if (n.slopeDeg > maxSlopeRecorded) maxSlopeRecorded = n.slopeDeg;

      const flag =
        n.slopeDeg > maxSlopeDeg * 0.85
          ? 'steep'
          : !n.isHighRes && !riskTolerant
          ? 'no-data'
          : 'OK';

      segments.push({
        from: prevCoord,
        to: coord,
        distanceKm: Math.round(d * 100) / 100,
        slopeDeg: n.slopeDeg,
        elevationMeters: n.elevationM,
        flag
      });
    }

    elevationProfile.push({
      distanceKm: Math.round(totalDistKm * 10) / 10,
      elevationMeters: Math.round(n.elevationM),
      slopeDeg: Math.round(n.slopeDeg * 10) / 10
    });
  }

  const durationHours = Math.round((totalDistKm / walkingSpeedKmh) * 100) / 100;
  const avgSlope = pathNodes.length > 0 ? slopeAccum / pathNodes.length : 0;
  const highResPct = Math.round((highResCount / pathNodes.length) * 100);

  const plannedRoute: PlannedRoute = {
    id: `route-${Date.now()}`,
    name: `ARES Traversability-Optimized Path (${vehicle.replace('_', ' ').toUpperCase()})`,
    start: waypoints[0],
    destination: waypoints[waypoints.length - 1],
    waypoints,
    distanceKm: Math.round(totalDistKm * 10) / 10,
    estimatedDurationHours: durationHours,
    method: 'terrain-aware',
    terrainAssessmentAvailable: true,
    averageSlopeDeg: Math.round(avgSlope * 10) / 10,
    maxSlopeDeg: Math.round(maxSlopeRecorded * 10) / 10,
    cumulativeElevationGainMeters: Math.round(totalClimbM),
    elevationProfile,
    dataLimitations: [
      `MGS MOLA topography model resolution (${highResPct}% regional high-resolution coverage).`,
      'Sub-meter boulders and micro-scarps cannot be resolved from orbital laser altimetry.'
    ],
    hazardsIntersected: [],
    scienceTargetsNear: []
  };

  return {
    success: true,
    route: plannedRoute,
    distanceKm: plannedRoute.distanceKm,
    durationHours,
    climbMeters: Math.round(totalClimbM),
    maxSlopeDeg: Math.round(maxSlopeRecorded * 10) / 10,
    averageSlopeDeg: Math.round(avgSlope * 10) / 10,
    highResCoveragePct: highResPct,
    segments,
    isLowConfidence: highResPct < 20 || riskTolerant
  };
}

/**
 * Direct Great-Circle baseline trajectory generator.
 */
function generateDirectSphericalRoute(
  sLat: number,
  sLon: number,
  dLat: number,
  dLon: number,
  speedKmh: number
): MarsRouteResult {
  const steps = 30;
  const waypoints: MarsCoordinate[] = [];
  const segments: RouteSegment[] = [];
  const elevationProfile: { distanceKm: number; elevationMeters: number; slopeDeg: number }[] = [];

  const totalDistKm = haversineKm(sLat, sLon, dLat, dLon);
  let totalClimbM = 0;
  let maxSlope = 0;
  let slopeSum = 0;

  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    const lat = sLat + fraction * (dLat - sLat);
    const lonE = normalizeLon360(sLon + fraction * (dLon - sLon));
    const elev = getElevationM(lat, lonE).value;
    const slope = getSlopeDeg(lat, lonE);

    slopeSum += slope;
    if (slope > maxSlope) maxSlope = slope;

    const coord: MarsCoordinate = {
      latitude: lat,
      longitude: lon360ToDisplay(lonE),
      elevationMeters: elev
    };
    waypoints.push(coord);

    const distFromStart = fraction * totalDistKm;
    elevationProfile.push({
      distanceKm: Math.round(distFromStart * 10) / 10,
      elevationMeters: Math.round(elev),
      slopeDeg: Math.round(slope * 10) / 10
    });

    if (i > 0) {
      const prevElev = waypoints[i - 1].elevationMeters ?? 0;
      const climb = elev - prevElev;
      if (climb > 0) totalClimbM += climb;

      segments.push({
        from: waypoints[i - 1],
        to: coord,
        distanceKm: Math.round((totalDistKm / steps) * 10) / 10,
        slopeDeg: slope,
        elevationMeters: elev,
        flag: slope > 15 ? 'steep' : 'OK'
      });
    }
  }

  const durationHours = Math.round((totalDistKm / speedKmh) * 100) / 100;
  const avgSlope = slopeSum / (steps + 1);

  const route: PlannedRoute = {
    id: `direct-${Date.now()}`,
    name: 'Direct Spherical Great-Circle Line',
    start: waypoints[0],
    destination: waypoints[waypoints.length - 1],
    waypoints,
    distanceKm: Math.round(totalDistKm * 10) / 10,
    estimatedDurationHours: durationHours,
    method: 'direct',
    terrainAssessmentAvailable: false,
    averageSlopeDeg: Math.round(avgSlope * 10) / 10,
    maxSlopeDeg: Math.round(maxSlope * 10) / 10,
    cumulativeElevationGainMeters: Math.round(totalClimbM),
    elevationProfile,
    dataLimitations: [
      'Direct line calculation does not avoid steep slopes, crater rims, or mapped hazard zones.',
      'For situational distance reference only; not an evaluated astronaut transit route.'
    ],
    hazardsIntersected: [],
    scienceTargetsNear: []
  };

  return {
    success: true,
    route,
    distanceKm: route.distanceKm,
    durationHours,
    climbMeters: Math.round(totalClimbM),
    maxSlopeDeg: route.maxSlopeDeg ?? 0,
    averageSlopeDeg: route.averageSlopeDeg ?? 0,
    highResCoveragePct: 0,
    segments,
    isLowConfidence: true
  };
}
