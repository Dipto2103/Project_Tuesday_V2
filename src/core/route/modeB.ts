/**
 * MARS LANTERN — Mode B: Terrain-Aware Planetary A* Pathfinding
 * 
 * Computes deterministic, terrain-aware surface trajectories across Mars
 * with 8-connected A* search, binary min-heap priority queue, admissible haversine
 * heuristic, start/end snapping, line-of-sight smoothing, and mandatory warnings.
 * 
 * Pure TypeScript — zero DOM, zero React.
 * Reference: MARS_LANTERN_ROUTING_ROVER_SPEC.md §8.3, §9.1, §9.4
 */

import { haversineKm, clampLat, normalizeLon360, MARS_RADIUS_KM } from '../geo';
import { getElevationM, getSlopeDeg, getRoughnessM } from '../dem';
import {
  getVehicleSlopeLimitDeg,
  getVehicleCautionMinDeg,
  getVehicleSpeedKmh,
  DEFAULT_ROUTING_COST_WEIGHTS,
  type RoutingCostWeights
} from '../../config/assumptions';
import {
  type LatLonE,
  type RouteRequest,
  type RouteResult,
  type RouteError,
  type RouteSegment,
  type SegmentFlag,
  type Vehicle
} from './types';
import {
  classifyTerrainCell,
  calculateCellBaseCost,
  type TraversabilityAssessment
} from '../dem/traversability';
import { type TerrainCell } from '../dem/terrainAnalysis';

// Binary Min-Heap Priority Queue for A*
interface HeapNode {
  f: number;
  idx: number;
  lat: number;
  lonE: number;
  slope: number;
}

class BinaryMinHeap {
  private data: HeapNode[] = [];

  public get size(): number {
    return this.data.length;
  }

  public push(node: HeapNode): void {
    this.data.push(node);
    this.bubbleUp(this.data.length - 1);
  }

  public pop(): HeapNode | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const bottom = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(idx: number): void {
    const element = this.data[idx];
    while (idx > 0) {
      const parentIdx = (idx - 1) >> 1;
      const parent = this.data[parentIdx];
      // Compare f-score with deterministic tie-breaking on slope
      if (element.f < parent.f || (element.f === parent.f && element.slope < parent.slope)) {
        this.data[parentIdx] = element;
        this.data[idx] = parent;
        idx = parentIdx;
      } else {
        break;
      }
    }
  }

  private sinkDown(idx: number): void {
    const length = this.data.length;
    const element = this.data[idx];

    while (true) {
      const leftIdx = (idx << 1) + 1;
      const rightIdx = leftIdx + 1;
      let swapIdx: number | null = null;

      if (leftIdx < length) {
        const left = this.data[leftIdx];
        if (left.f < element.f || (left.f === element.f && left.slope < element.slope)) {
          swapIdx = leftIdx;
        }
      }

      if (rightIdx < length) {
        const right = this.data[rightIdx];
        const compareTo = swapIdx === null ? element : this.data[leftIdx];
        if (right.f < compareTo.f || (right.f === compareTo.f && right.slope < compareTo.slope)) {
          swapIdx = rightIdx;
        }
      }

      if (swapIdx === null) break;
      this.data[idx] = this.data[swapIdx];
      this.data[swapIdx] = element;
      idx = swapIdx;
    }
  }
}

export interface AStarGridOptions {
  stepDeg?: number;               // 0.25° coarse global, 0.05° regional
  riskTolerant?: boolean;
  onProgress?: (pct: number) => void;
  shouldCancel?: () => boolean;
}

export interface SnapResult {
  coord: LatLonE;
  offsetKm: number;
  snapped: boolean;
}

/**
 * Searches nearest traversable cell within searchRadiusKm (default 25 km).
 */
export function snapToTraversable(
  coord: LatLonE,
  vehicle: Vehicle,
  riskTolerant = false,
  searchRadiusKm = 25.0,
  slopeLimitDeg?: number
): SnapResult {
  const cLat = clampLat(coord.lat);
  const nLon = normalizeLon360(coord.lonE);

  const initialElev = getElevationM(cLat, nLon);
  const initialSlope = getSlopeDeg(cLat, nLon);
  const initialRough = getRoughnessM(cLat, nLon);

  const initialCell: TerrainCell = {
    slopeDeg: initialSlope,
    aspectDeg: 90,
    roughnessM: initialRough,
    hasData: true,
    polarDistortion: Math.abs(cLat) > 85
  };

  const initialAssessment = classifyTerrainCell(initialCell, vehicle, { slopeLimitDeg });
  if (initialAssessment.isTraversable || (riskTolerant && initialAssessment.terrainClass === 'UNKNOWN')) {
    return { coord: { lat: cLat, lonE: nLon }, offsetKm: 0, snapped: false };
  }

  // Spiral search outward in radial rings up to searchRadiusKm
  const stepKm = 2.0;
  let bestCoord: LatLonE | null = null;
  let minOffset = Infinity;

  for (let rKm = stepKm; rKm <= searchRadiusKm; rKm += stepKm) {
    const circumferencePoints = Math.max(8, Math.round((2 * Math.PI * rKm) / stepKm));
    for (let i = 0; i < circumferencePoints; i++) {
      const angle = (i / circumferencePoints) * 2 * Math.PI;
      const dLat = (rKm / MARS_RADIUS_KM) * (180 / Math.PI) * Math.cos(angle);
      const cosLat = Math.max(0.1, Math.cos((cLat * Math.PI) / 180));
      const dLon = ((rKm / MARS_RADIUS_KM) * (180 / Math.PI) * Math.sin(angle)) / cosLat;

      const testLat = clampLat(cLat + dLat);
      const testLon = normalizeLon360(nLon + dLon);

      const elev = getElevationM(testLat, testLon);
      const slope = getSlopeDeg(testLat, testLon);
      const rough = getRoughnessM(testLat, testLon);

      const cell: TerrainCell = {
        slopeDeg: slope,
        aspectDeg: 90,
        roughnessM: rough,
        hasData: true,
        polarDistortion: Math.abs(testLat) > 85
      };

      const testAssessment = classifyTerrainCell(cell, vehicle, { slopeLimitDeg });
      if (testAssessment.isTraversable) {
        const offset = haversineKm(cLat, nLon, testLat, testLon);
        if (offset < minOffset) {
          minOffset = offset;
          bestCoord = { lat: testLat, lonE: testLon };
        }
      }
    }

    if (bestCoord) break;
  }

  if (bestCoord) {
    return {
      coord: bestCoord,
      offsetKm: parseFloat(minOffset.toFixed(2)),
      snapped: true
    };
  }

  return { coord: { lat: cLat, lonE: nLon }, offsetKm: 0, snapped: false };
}

/**
 * Executes terrain-aware A* pathfinding.
 */
export function planModeB(
  request: RouteRequest,
  weights: RoutingCostWeights = DEFAULT_ROUTING_COST_WEIGHTS,
  options: AStarGridOptions = {}
): RouteResult | RouteError {
  const { from, to, vehicle, assumptions, riskTolerant = false } = request;
  const vehicleSlopeLimit = assumptions[`slope_limit_${vehicle}_deg`] ?? getVehicleSlopeLimitDeg(vehicle);

  // 1. Check endpoints & Snap start/dest if on impassable terrain
  const startSnap = snapToTraversable(from, vehicle, riskTolerant, 25.0, vehicleSlopeLimit);
  const destSnap = snapToTraversable(to, vehicle, riskTolerant, 25.0, vehicleSlopeLimit);

  const startCoord = startSnap.coord;
  const destCoord = destSnap.coord;

  const straightLineKm = haversineKm(from, to);

  // Check if endpoints are still impassable after snap
  const startCell: TerrainCell = {
    slopeDeg: getSlopeDeg(startCoord.lat, startCoord.lonE),
    aspectDeg: 90,
    roughnessM: getRoughnessM(startCoord.lat, startCoord.lonE),
    hasData: true,
    polarDistortion: false
  };
  const startAssessment = classifyTerrainCell(startCell, vehicle, { slopeLimitDeg: vehicleSlopeLimit });
  if (!startAssessment.isTraversable && !(riskTolerant && startAssessment.terrainClass === 'UNKNOWN')) {
    return {
      mode: 'B_TERRAIN_ASTAR',
      ok: false,
      error: 'NO_ROUTE',
      reason: `Starting point (${startAssessment.reason ?? 'Impassable'}) cannot find traversable ground within 25 km.`
    };
  }

  // 2. Set grid resolution: 0.25° for long routes, 0.05° for regional routes
  const isRegional = straightLineKm < 150.0;
  const stepDeg = options.stepDeg ?? (isRegional ? 0.05 : 0.25);

  // Bounding box with 1.5° margin
  const minLat = clampLat(Math.min(startCoord.lat, destCoord.lat) - 1.5);
  const maxLat = clampLat(Math.max(startCoord.lat, destCoord.lat) + 1.5);

  // Handle longitude box
  let minLon = Math.min(startCoord.lonE, destCoord.lonE) - 1.5;
  let maxLon = Math.max(startCoord.lonE, destCoord.lonE) + 1.5;
  if (Math.abs(startCoord.lonE - destCoord.lonE) > 180) {
    // Crosses 0/360 boundary
    minLon = 0;
    maxLon = 360;
  }

  const rows = Math.max(4, Math.round((maxLat - minLat) / stepDeg) + 1);
  const cols = Math.max(4, Math.round((maxLon - minLon) / stepDeg) + 1);

  const getIdx = (r: number, c: number) => r * cols + c;
  const getLat = (r: number) => clampLat(maxLat - r * stepDeg);
  const getLon = (c: number) => normalizeLon360(minLon + c * stepDeg);

  // Find start and goal row/col indices
  const startR = Math.max(0, Math.min(rows - 1, Math.round((maxLat - startCoord.lat) / stepDeg)));
  const startC = Math.max(0, Math.min(cols - 1, Math.round((startCoord.lonE - minLon) / stepDeg)));
  const goalR = Math.max(0, Math.min(rows - 1, Math.round((maxLat - destCoord.lat) / stepDeg)));
  const goalC = Math.max(0, Math.min(cols - 1, Math.round((destCoord.lonE - minLon) / stepDeg)));

  const startIndex = getIdx(startR, startC);
  const goalIndex = getIdx(goalR, goalC);

  const totalCells = rows * cols;
  const gScore = new Float32Array(totalCells).fill(Infinity);
  const parent = new Int32Array(totalCells).fill(-1);
  const closedSet = new Uint8Array(totalCells);

  const openSet = new BinaryMinHeap();

  gScore[startIndex] = 0;
  const initH = haversineKm(getLat(startR), getLon(startC), destCoord.lat, destCoord.lonE) * weights.weight_cost_distance;
  openSet.push({
    f: initH,
    idx: startIndex,
    lat: getLat(startR),
    lonE: getLon(startC),
    slope: startCell.slopeDeg ?? 0
  });

  // 8-Connected neighbor offsets
  const NEIGHBORS = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [-1, 1], [1, -1], [1, 1]
  ];

  let iterations = 0;
  let found = false;

  while (openSet.size > 0) {
    if (options.shouldCancel?.()) {
      return {
        mode: 'B_TERRAIN_ASTAR',
        ok: false,
        error: 'NO_ROUTE',
        reason: 'Route computation cancelled by user.'
      };
    }

    iterations++;
    if (iterations % 500 === 0 && options.onProgress) {
      const current = openSet.pop();
      if (!current) break;
      const distRemaining = haversineKm(current.lat, current.lonE, destCoord.lat, destCoord.lonE);
      const pct = Math.max(5, Math.min(95, Math.round((1 - distRemaining / (straightLineKm + 1)) * 100)));
      options.onProgress(pct);
      openSet.push(current);
    }

    const current = openSet.pop()!;
    if (current.idx === goalIndex) {
      found = true;
      break;
    }

    if (closedSet[current.idx] === 1) continue;
    closedSet[current.idx] = 1;

    const currR = Math.floor(current.idx / cols);
    const currC = current.idx % cols;
    const currLat = getLat(currR);
    const currLon = getLon(currC);

    for (const [dr, dc] of NEIGHBORS) {
      const nextR = currR + dr;
      const nextC = currC + dc;

      if (nextR < 0 || nextR >= rows || nextC < 0 || nextC >= cols) continue;
      const nextIdx = getIdx(nextR, nextC);
      if (closedSet[nextIdx] === 1) continue;

      const nextLat = getLat(nextR);
      const nextLon = getLon(nextC);

      const slope = getSlopeDeg(nextLat, nextLon);
      const rough = getRoughnessM(nextLat, nextLon);

      const cell: TerrainCell = {
        slopeDeg: slope,
        aspectDeg: 90,
        roughnessM: rough,
        hasData: true,
        polarDistortion: Math.abs(nextLat) > 85
      };

      const cellCost = calculateCellBaseCost(cell, vehicle, weights, {
        isRegional,
        riskTolerant,
        slopeLimitDeg: vehicleSlopeLimit
      });

      if (!Number.isFinite(cellCost)) continue; // Impassable wall

      // Edge length in km along Martian sphere
      const edgeDistKm = haversineKm(currLat, currLon, nextLat, nextLon);
      const tentativeG = gScore[current.idx] + cellCost * edgeDistKm;

      if (tentativeG < gScore[nextIdx]) {
        gScore[nextIdx] = tentativeG;
        parent[nextIdx] = current.idx;

        // Admissible haversine heuristic: distToGoal * wd
        const h = haversineKm(nextLat, nextLon, destCoord.lat, destCoord.lonE) * weights.weight_cost_distance;
        // Tie breaker: add 1e-6 * slope for determinism
        const f = tentativeG + h + 1e-6 * (slope ?? 0);

        openSet.push({
          f,
          idx: nextIdx,
          lat: nextLat,
          lonE: nextLon,
          slope: slope ?? 0
        });
      }
    }
  }

  if (!found) {
    return {
      mode: 'B_TERRAIN_ASTAR',
      ok: false,
      error: 'NO_ROUTE',
      reason: `No traversable path found under ${vehicle} limits (${getVehicleSlopeLimitDeg(vehicle)}° slope). Try enabling risk-tolerant mode or adjusting start/destination coordinates.`
    };
  }

  // 3. Reconstruct path from goal to start
  const rawPath: LatLonE[] = [];
  let curr = goalIndex;
  while (curr !== -1) {
    const r = Math.floor(curr / cols);
    const c = curr % cols;
    rawPath.push({ lat: getLat(r), lonE: getLon(c) });
    if (curr === startIndex) break;
    curr = parent[curr];
  }
  rawPath.reverse();

  // Prepend snapped start and append snapped destination
  if (startSnap.snapped) rawPath.unshift(from);
  if (destSnap.snapped) rawPath.push(to);

  // 4. Line-of-sight path simplification (shortcuts must not cross blocked cells)
  const smoothedPath: LatLonE[] = [rawPath[0]];
  let anchorIdx = 0;

  while (anchorIdx < rawPath.length - 1) {
    let furthestIdx = anchorIdx + 1;
    // Look ahead up to 5 points
    for (let testIdx = Math.min(rawPath.length - 1, anchorIdx + 5); testIdx > anchorIdx + 1; testIdx--) {
      // Check shortcut feasibility
      const ptA = rawPath[anchorIdx];
      const ptB = rawPath[testIdx];
      const testDist = haversineKm(ptA, ptB);
      const sampleSteps = Math.max(2, Math.round(testDist / (stepDeg * 50)));
      let shortcutClear = true;

      for (let s = 1; s < sampleSteps; s++) {
        const f = s / sampleSteps;
        const midLat = ptA.lat + f * (ptB.lat - ptA.lat);
        const midLon = ptA.lonE + f * (ptB.lonE - ptA.lonE);
        const slope = getSlopeDeg(midLat, midLon);
        const cell: TerrainCell = {
          slopeDeg: slope,
          aspectDeg: 90,
          roughnessM: 50,
          hasData: true,
          polarDistortion: false
        };
        const assessment = classifyTerrainCell(cell, vehicle);
        if (!assessment.isTraversable) {
          shortcutClear = false;
          break;
        }
      }

      if (shortcutClear) {
        furthestIdx = testIdx;
        break;
      }
    }
    smoothedPath.push(rawPath[furthestIdx]);
    anchorIdx = furthestIdx;
  }

  // 5. Build segments, elevation profile, time estimate, and telemetry
  const segments: RouteSegment[] = [];
  let totalDistanceKm = 0;
  let totalTimeHours = 0;
  let climbM = 0;
  let descentM = 0;
  let maxSlopeDeg: number | null = null;
  let slopeSum = 0;
  let prevElev: number | null = null;
  let noDataSegmentCount = 0;
  let highResLengthKm = 0;

  const vehicleCautionMin = getVehicleCautionMinDeg(vehicle);
  const flatSpeedKmh = assumptions[`speed_${vehicle}_kmh`] ?? getVehicleSpeedKmh(vehicle);

  for (let i = 0; i < smoothedPath.length - 1; i++) {
    const ptA = smoothedPath[i];
    const ptB = smoothedPath[i + 1];
    const segLen = haversineKm(ptA, ptB);
    totalDistanceKm += segLen;

    const midLat = (ptA.lat + ptB.lat) / 2;
    const midLon = (ptA.lonE + ptB.lonE) / 2;

    const elevRes = getElevationM(midLat, midLon);
    const slope = getSlopeDeg(midLat, midLon);
    const rough = getRoughnessM(midLat, midLon);

    if (elevRes.resolution === 'regional_128ppd') {
      highResLengthKm += segLen;
    }

    if (prevElev !== null) {
      const dElev = elevRes.value - prevElev;
      if (dElev > 0) climbM += dElev;
      else descentM += Math.abs(dElev);
    }
    prevElev = elevRes.value;

    slopeSum += slope;
    if (maxSlopeDeg === null || slope > maxSlopeDeg) {
      maxSlopeDeg = slope;
    }

    let flag: SegmentFlag = 'OK';
    if (slope >= vehicleSlopeLimit) {
      flag = 'STEEP';
    } else if (slope >= vehicleCautionMin || rough > 300) {
      flag = 'CAUTION';
    }

    // Time estimate: speed derates linearly from flatSpeed to 0.1 km/h at slopeLimit
    const speedRatio = Math.max(0.05, 1 - Math.min(1.0, slope / vehicleSlopeLimit));
    const effectiveSpeed = flatSpeedKmh * speedRatio;
    totalTimeHours += segLen / effectiveSpeed;

    segments.push({
      a: ptA,
      b: ptB,
      lengthKm: parseFloat(segLen.toFixed(3)),
      slopeDeg: slope,
      elevationM: elevRes.value,
      flag
    });
  }

  const meanSlopeDeg = segments.length > 0 ? parseFloat((slopeSum / segments.length).toFixed(1)) : 0;
  const dataCoveragePct = totalDistanceKm > 0 ? parseFloat(((highResLengthKm / totalDistanceKm) * 100).toFixed(1)) : 0;
  const noDataPct = segments.length > 0 ? parseFloat(((noDataSegmentCount / segments.length) * 100).toFixed(1)) : 0;

  // Mandatory warnings per Spec §8.3
  const warnings: string[] = [
    'Computed from 463 m MOLA data. Rocks, small scarps and dunes are not resolved.',
    'Model estimate under stated assumptions. Not a validated EVA route.'
  ];

  if (!isRegional) {
    warnings.push('Coarse global data (~7 km/px).');
  }

  if (startSnap.snapped) {
    warnings.push(`Start moved ${startSnap.offsetKm} km to nearest traversable cell.`);
  }

  if (destSnap.snapped) {
    warnings.push(`Destination moved ${destSnap.offsetKm} km to nearest traversable cell.`);
  }

  if (noDataSegmentCount > 0) {
    warnings.push(`${noDataSegmentCount} segments cross areas with incomplete terrain data.`);
  }

  const detourRatio = straightLineKm > 0 ? parseFloat((totalDistanceKm / straightLineKm).toFixed(2)) : 1.0;

  return {
    mode: 'B_TERRAIN_ASTAR',
    ok: true,
    geometry: smoothedPath,
    segments,
    distanceKm: parseFloat(totalDistanceKm.toFixed(3)),
    straightLineKm: parseFloat(straightLineKm.toFixed(3)),
    detourRatio,
    climbM: Math.round(climbM),
    descentM: Math.round(descentM),
    maxSlopeDeg: maxSlopeDeg !== null ? parseFloat(maxSlopeDeg.toFixed(1)) : null,
    meanSlopeDeg,
    dataCoveragePct,
    noDataPct,
    passesSlopeLimit: maxSlopeDeg !== null ? maxSlopeDeg < vehicleSlopeLimit : 'UNKNOWN',
    timeHours: parseFloat(totalTimeHours.toFixed(2)),
    confidence: isRegional && noDataPct === 0 ? 'HIGH' : 'MEDIUM',
    warnings,
    provenance: 'MODELED',
    assumptionsUsed: {
      ...assumptions,
      vehicle,
      vehicleSlopeLimitDeg: vehicleSlopeLimit,
      routingMode: 'B_TERRAIN_ASTAR'
    },
    computedAt: new Date().toISOString()
  };
}

/**
 * Computes both Shortest (distance priority) and Safest (slope priority) routes.
 */
export function planMultiModeB(
  request: RouteRequest,
  options: AStarGridOptions = {}
): { shortest: RouteResult | RouteError; safest: RouteResult | RouteError } {
  // Shortest: ws = wr = wh = 0.5
  const shortestWeights: RoutingCostWeights = {
    weight_cost_distance: 1.0,
    weight_cost_slope: 0.5,
    weight_cost_roughness: 0.5,
    weight_cost_hazard: 0.5,
    weight_cost_uncertainty: 1.0,
    gap_cost_multiplier: 8.0
  };

  // Safest: ws x 2 (8.0), wh x 1.5 (9.0)
  const safestWeights: RoutingCostWeights = {
    weight_cost_distance: 0.8,
    weight_cost_slope: 8.0,
    weight_cost_roughness: 3.0,
    weight_cost_hazard: 9.0,
    weight_cost_uncertainty: 3.0,
    gap_cost_multiplier: 8.0
  };

  const shortest = planModeB(request, shortestWeights, options);
  const safest = planModeB(request, safestWeights, options);

  return { shortest, safest };
}
