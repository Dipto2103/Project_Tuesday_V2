/**
 * MARS LANTERN — Mode C (Historical Rover Reference Router)
 *
 * Implements Spec §8.4:
 * Extracts a validated robotic traverse sub-track between endpoints nearest to start & goal.
 * Enforces mandatory scientific warnings regarding robotic vs human EVA safety.
 */

import { haversineKm, type LatLonE } from '../geo';
import type { RouteRequest, RouteResult, RouteError, RouteSegment, SegmentFlag } from './types';
import type { TrackPoints } from '../rovers/types';
import { nearestApproach, slopeAlongTrack } from '../rovers/traverse';
import type { DemStore } from '../dem/demStore';

export const MODE_C_WARNING_ROBOTIC =
  'Robotic traverse ({rover}). A rover drove here; this does not mean a human on foot or in a suit can walk it.';
export const MODE_C_WARNING_SCIENCE =
  'Rover tracks reflect the science plan, not the safest or shortest path.';

export function planModeC(
  req: RouteRequest,
  track: TrackPoints,
  roverName: 'Curiosity' | 'Perseverance',
  demStore?: DemStore,
  snapRadiusKm: number = 5.0
): RouteResult | RouteError {
  const startApproach = nearestApproach(track, req.from);
  const goalApproach = nearestApproach(track, req.to);

  // Check snap radius
  if (startApproach.minDistanceKm > snapRadiusKm) {
    return {
      mode: 'C',
      ok: false,
      error: 'NO_REFERENCE_TRAVERSE',
      reason: `Start coordinate is ${startApproach.minDistanceKm.toFixed(1)} km from ${roverName}'s traverse (exceeds ${snapRadiusKm} km snap radius). Nearest approach: Sol ${startApproach.sol}.`
    };
  }

  if (goalApproach.minDistanceKm > snapRadiusKm) {
    return {
      mode: 'C',
      ok: false,
      error: 'NO_REFERENCE_TRAVERSE',
      reason: `Destination coordinate is ${goalApproach.minDistanceKm.toFixed(1)} km from ${roverName}'s traverse (exceeds ${snapRadiusKm} km snap radius). Nearest approach: Sol ${goalApproach.sol}.`
    };
  }

  const idxA = startApproach.index;
  const idxB = goalApproach.index;

  // Extract track points in the correct direction
  const isForward = idxA <= idxB;
  const step = isForward ? 1 : -1;
  const count = Math.abs(idxB - idxA) + 1;

  const subPoints: LatLonE[] = [];
  const subElevations: (number | null)[] = [];
  const subSols: number[] = [];

  for (let i = 0; i < count; i++) {
    const idx = idxA + i * step;
    subPoints.push({ lat: track.lat[idx], lonE: track.lonE[idx] });
    subElevations.push(track.elevM[idx]);
    subSols.push(track.sol[idx]);
  }

  // Prepend start and append goal if there is an approach offset
  const fullGeometry: LatLonE[] = [];
  if (startApproach.minDistanceKm > 0.05) {
    fullGeometry.push({ lat: req.from.lat, lonE: req.from.lonE });
  }
  fullGeometry.push(...subPoints);
  if (goalApproach.minDistanceKm > 0.05) {
    fullGeometry.push({ lat: req.to.lat, lonE: req.to.lonE });
  }

  // Build Segments & compute metrics
  const segments: RouteSegment[] = [];
  let totalDistanceKm = 0;
  let climbMeters = 0;
  let maxSlopeDeg = 0;
  let slopeSum = 0;
  let slopeCount = 0;

  for (let i = 0; i < fullGeometry.length - 1; i++) {
    const p1 = fullGeometry[i];
    const p2 = fullGeometry[i + 1];
    const segDist = haversineKm(p1, p2);
    totalDistanceKm += segDist;

    let e1: number | null = null;
    let e2: number | null = null;
    let segSlope: number | null = null;

    if (demStore) {
      e1 = demStore.getElevationAt(p1);
      e2 = demStore.getElevationAt(p2);
      const t = demStore.getTerrainAt(p2);
      segSlope = t.slopeDeg;
    }

    if (e1 !== null && e2 !== null && e2 > e1) {
      climbMeters += e2 - e1;
    }

    if (segSlope !== null) {
      if (segSlope > maxSlopeDeg) maxSlopeDeg = segSlope;
      slopeSum += segSlope;
      slopeCount++;
    }

    let flag: SegmentFlag = 'OK';
    if (segSlope !== null && segSlope >= 15.0) {
      flag = 'STEEP';
    }

    segments.push({
      a: p1,
      b: p2,
      lengthKm: Number(segDist.toFixed(4)),
      slopeDeg: segSlope !== null ? Number(segSlope.toFixed(2)) : null,
      flag,
      elevationM: e2 !== null ? Number(e2.toFixed(1)) : null
    });
  }

  const directDist = haversineKm(req.from, req.to);
  const detourRatio = directDist > 0.01 ? totalDistanceKm / directDist : 1.0;
  const meanSlopeDeg = slopeCount > 0 ? slopeSum / slopeCount : 0;

  // Mandatory warnings
  const warnings: string[] = [
    MODE_C_WARNING_ROBOTIC.replace('{rover}', roverName),
    MODE_C_WARNING_SCIENCE,
    `Track segment spans Sol ${subSols[0]} to Sol ${subSols[subSols.length - 1]} (${Math.abs(subSols[subSols.length - 1] - subSols[0]) + 1} sols).`
  ];

  if (startApproach.minDistanceKm > 0.1) {
    warnings.push(`Start connector: ${startApproach.minDistanceKm.toFixed(2)} km approach to Sol ${startApproach.sol}.`);
  }
  if (goalApproach.minDistanceKm > 0.1) {
    warnings.push(`End connector: ${goalApproach.minDistanceKm.toFixed(2)} km approach to Sol ${goalApproach.sol}.`);
  }

  return {
    mode: 'C',
    ok: true,
    geometry: fullGeometry,
    segments,
    distanceKm: Number(totalDistanceKm.toFixed(3)),
    straightLineKm: Number(directDist.toFixed(3)),
    detourRatio: Number(detourRatio.toFixed(3)),
    climbM: Number(climbMeters.toFixed(1)),
    descentM: 0,
    maxSlopeDeg: Number(maxSlopeDeg.toFixed(2)),
    meanSlopeDeg: Number(meanSlopeDeg.toFixed(2)),
    dataCoveragePct: 100,
    noDataPct: 0,
    passesSlopeLimit: maxSlopeDeg <= (req.vehicle === 'eva' ? 15 : 20),
    timeHours: null, // Mode C does not set an astronaut EVA time automatically
    confidence: 'MEDIUM',
    warnings,
    provenance: 'NASA-DERIVED',
    assumptionsUsed: {
      rover: roverName,
      snapRadiusKm,
      solRange: `${subSols[0]}-${subSols[subSols.length - 1]}`,
      directDistKm: Number(directDist.toFixed(2))
    },
    computedAt: new Date().toISOString()
  };
}
